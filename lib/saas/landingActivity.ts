import {isIP} from 'node:net';
import {z} from 'zod';
import type {LandingActivity, LandingCard} from '../landingActivity';
import {activityDay} from './activity';
import {NETWORK_ACTIVITY_ID} from './activityTypes';
import {db, key} from './store';

const DAY_MS = 86_400_000;
const RECENT_LIMIT = 3;
const ACCOUNT_BATCH = 40;

/** Stored activity targets are hostnames or storefront hostnames plus a store ID. */
export function maskActivityTarget(target: string) {
  const host = target.split(/[/?#]/, 1)[0].toLowerCase();
  const labels = host.split('.');
  if (isIP(host) || !labels.every(label => /^[a-z0-9-]+$/.test(label)) || labels.length < 2) return '••••';
  if (host === 'smartstore.naver.com') return '스마트스토어 · ••••';
  if (host === 'brand.naver.com') return '브랜드스토어 · ••••';
  const countrySuffix = /\.(?:co\.kr|or\.kr|ne\.kr)$/.exec(host)?.[0];
  const suffix = countrySuffix || (/\.(?:com|net|org|kr|shop|store|io)$/.exec(host)?.[0] ?? '');
  const label = suffix ? host.slice(0, -suffix.length).split('.').at(-1) : undefined;
  const initial = label && label.length >= 4 && !label.startsWith('xn--') && /^[a-z]/.test(label) ? label[0] : '';
  return `${initial}••••${suffix}`;
}

// Reuse account totals and retained activity. Deleted account records disappear
// from the next snapshot. Return only the fields needed to mask the latest targets.
const READ_ACTIVITY = `
local requested,completed=0,0
local recent={}
local days=tonumber(ARGV[1])
local limit=tonumber(ARGV[2])
for base=1,#KEYS,1+2*days do
  local totals=redis.call('HMGET',KEYS[base],'analyze_started','analyze_success')
  requested=requested+(tonumber(totals[1]) or 0)
  completed=completed+(tonumber(totals[2]) or 0)
  local found=0
  for day=1,days do
    if found>=limit then break end
    local counts=KEYS[base+2*day-1]
    if (tonumber(redis.call('HGET',counts,'analyze_success')) or 0)>0 then
      local timeline=KEYS[base+2*day]
      local offset=0
      while found<limit do
        local rows=redis.call('ZREVRANGEBYSCORE',timeline,'+inf',ARGV[3],'LIMIT',offset,32)
        for _,row in ipairs(rows) do
          local event=cjson.decode(row)
          if event.action=='analyze_success' and type(event.target)=='string' and type(event.at)=='number' then
            recent[#recent+1]={target=event.target,at=event.at}
            found=found+1
            if found>=limit then break end
          end
        end
        if #rows<32 then break end
        offset=offset+#rows
      end
    end
  end
end
table.sort(recent,function(a,b) return a.at>b.at end)
while #recent>limit do recent[#recent]=nil end
return cjson.encode({requested=requested,completed=completed,recent=recent})
`;

type ActivityBatch = {
  requested: number;
  completed: number;
  recent: {target: string; at: number}[] | Record<string, never>;
};

export async function readLandingActivity(namespace = key('')): Promise<LandingActivity> {
  const checkedAt = Date.now();
  const days = Array.from({length:4}, (_, index) => activityDay(checkedAt - index * DAY_MS));
  let requested = 0;
  let completed = 0;
  let recent: {label: string; at: number}[] = [];
  const redis = db();
  for (let offset = 0; ; offset += ACCOUNT_BATCH) {
    const accounts = await redis.zrange<string[]>(namespace + 'accounts', offset, offset + ACCOUNT_BATCH - 1);
    const ids = offset === 0 ? [NETWORK_ACTIVITY_ID, ...accounts] : accounts;
    if (!ids.length) break;
    const keys = ids.flatMap(id => [
      namespace + 'activity-total:' + id,
      ...days.flatMap(day => [
        namespace + `activity-counts:${id}:${day}`, namespace + `activity:${id}:${day}`,
      ]),
    ]);
    const batch = await redis.eval<unknown[], ActivityBatch>(READ_ACTIVITY, keys, [days.length, RECENT_LIMIT, checkedAt - 3 * DAY_MS]);
    requested += batch.requested;
    completed += batch.completed;
    if (Array.isArray(batch.recent)) {
      recent = [...recent, ...batch.recent.map(({target, at}) => ({label: maskActivityTarget(target), at}))]
        .sort((a, b) => b.at - a.at).slice(0, RECENT_LIMIT);
    }
    if (accounts.length < ACCOUNT_BATCH) break;
  }
  return {requested, completed, recent: recent.map(row => row.label), checkedAt};
}

const reviewSchema = z.object({
  title: z.string().trim().min(1).max(70),
  text: z.string().trim().min(1).max(240),
  byline: z.string().trim().min(1).max(40),
  sourceUrl: z.string().url().max(512).refine(value => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }).optional(),
});

export function publicLandingReviews(raw = process.env.SCANNER_PUBLIC_REVIEWS_JSON): LandingCard[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const reviews = data.slice(0, 20).flatMap(entry => {
      const parsed = reviewSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
    return reviews.filter((review, index) => reviews.findIndex(item => item.text === review.text) === index)
      .map((review, index) => ({...review, id:`review-${index}`, kind:'review'}));
  } catch {
    return [];
  }
}
