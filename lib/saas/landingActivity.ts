import {landingReviewSchema,type LandingActivity,type LandingCard} from '../landingActivity';
import {NETWORK_ACTIVITY_ID} from './activityTypes';
import {db, key} from './store';

const ACCOUNT_BATCH = 100;

// Sum existing lifetime counters for accounts in the current index.
const READ_ACTIVITY = `
local requested,completed=0,0
for _,counter in ipairs(KEYS) do
  local totals=redis.call('HMGET',counter,'analyze_started','analyze_success')
  requested=requested+(tonumber(totals[1]) or 0)
  completed=completed+(tonumber(totals[2]) or 0)
end
return cjson.encode({requested=requested,completed=completed})
`;

export async function readLandingActivity(namespace = key('')): Promise<LandingActivity> {
  const activity = {requested: 0, completed: 0};
  const redis = db();
  for (let offset = 0; ; offset += ACCOUNT_BATCH) {
    const accounts = await redis.zrange<string[]>(namespace + 'accounts', offset, offset + ACCOUNT_BATCH - 1);
    const ids = offset === 0 ? [NETWORK_ACTIVITY_ID, ...accounts] : accounts;
    if (!ids.length) break;
    const keys = ids.map(id => namespace + 'activity-total:' + id);
    const batch = await redis.eval<[], LandingActivity>(READ_ACTIVITY, keys, []);
    activity.requested += batch.requested;
    activity.completed += batch.completed;
    if (accounts.length < ACCOUNT_BATCH) break;
  }
  return activity;
}

export function publicLandingReviews(raw = process.env.SCANNER_PUBLIC_REVIEWS_JSON): LandingCard[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const reviews = data.slice(0, 20).flatMap(entry => {
      const parsed = landingReviewSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
    return reviews.filter((review, index) => reviews.findIndex(item => item.text === review.text) === index)
      .map((review, index) => ({...review, id:`review-${index}`, kind:'review'}));
  } catch {
    return [];
  }
}
