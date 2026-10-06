import { randomUUID } from 'node:crypto';
import { db, key, token, decode } from './store';
import { AccessError, clientIp, digest } from '../security/request';
import { ACTIVITY_DAYS, type ActivityAction, type ActivityEvent, type ActivityStats } from './activityTypes';
export { ACTIVITY_DAYS } from './activityTypes';

const DAY = 86_400_000, KST = 9 * 3_600_000;
export function activityDay(at = Date.now()) { return new Date(at + KST).toISOString().slice(0, 10); }
export function activityExpiry(at = Date.now()) {
  return Math.floor((Math.floor((at + KST) / DAY) * DAY - KST + ACTIVITY_DAYS * DAY) / 1000);
}
function deviceLabel(headers: Headers) {
  const ua = headers.get('user-agent') || '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '기타';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '미확인';
  return `${browser} / ${os}`;
}
export function targetHost(value?: string) {
  try { return value ? new URL(value).hostname.slice(0,253) : undefined; } catch { return undefined; }
}
type Details = Pick<Partial<ActivityEvent>, 'target' | 'reportId' | 'expiresAt' | 'scope' | 'subjectId' | 'source'>;
// Each day has an absolute expiry. Repeated access cannot extend old IP records.
// Event idempotency, timeline and counters are committed together in Redis.
const WRITE_LUA = `
if redis.call('EXISTS',KEYS[5])==0 then return 0 end
local previous=redis.call('GET',KEYS[1]);if previous then return 0 end
redis.call('SET',KEYS[1],'1','EXAT',ARGV[3])
redis.call('ZADD',KEYS[2],ARGV[1],ARGV[2]);redis.call('ZREMRANGEBYRANK',KEYS[2],0,-1001);redis.call('EXPIREAT',KEYS[2],ARGV[3])
redis.call('HINCRBY',KEYS[3],ARGV[4],1);redis.call('EXPIREAT',KEYS[3],ARGV[3])
redis.call('HINCRBY',KEYS[4],ARGV[4],1);redis.call('HSETNX',KEYS[4],'firstTrackedAt',ARGV[1]);redis.call('HSET',KEYS[4],'lastSeenAt',ARGV[1]);return 1`;
function entry(accountId: string, action: ActivityAction, headers: Headers, details: Details = {}, id: string = randomUUID()) {
  const at = Date.now();
  const event: ActivityEvent = { ...details, id, accountId, action, at, ip: clientIp(headers) || null, device: deviceLabel(headers), source: details.source || 'server' };
  const day = activityDay(at);
  return {
    event,
    keys: [key(`event-once:${accountId}:${digest(id+':'+action)}`),key(`activity:${accountId}:${day}`),key(`activity-counts:${accountId}:${day}`),key(`activity-total:${accountId}`),key('account:'+accountId)],
    args: [at,JSON.stringify(event),activityExpiry(at),action],
  };
}
export async function recordActivity(accountId: string, action: ActivityAction, headers: Headers, details: Details = {}, id?: string) {
  const e = entry(accountId,action,headers,details,id);
  await db().eval(WRITE_LUA,e.keys,e.args);
}
/** Telemetry must not turn a successfully completed analysis into a billed failure. */
export async function captureActivity(...args: Parameters<typeof recordActivity>) {
  try { await recordActivity(...args); }
  catch { console.error('[activity] write unavailable'); }
}
export async function activityTotals(ids: string[]) {
  if (!ids.length) return [];
  const p = db().pipeline();
  for (const id of ids) p.hgetall(key(`activity-total:${id}`));
  const results = await p.exec();
  return results.map(raw => decode<ActivityStats>(raw) || {});
}
export async function activityDetail(accountId: string) {
  const now = Date.now();
  const days = Array.from({length:ACTIVITY_DAYS},(_,i)=>activityDay(now-i*DAY));
  const [rawEvents,rawCounts] = await db().eval<unknown[],[unknown[],unknown[][]]>(`
local events={};local counts={}
for i=1,#KEYS,2 do
  counts[#counts+1]=redis.call('HGETALL',KEYS[i+1])
  if #events<201 then
    local rows=redis.call('ZREVRANGE',KEYS[i],0,200-#events)
    for _,row in ipairs(rows) do events[#events+1]=row end
  end
end
return {events,counts}`,days.flatMap(day=>[key(`activity:${accountId}:${day}`),key(`activity-counts:${accountId}:${day}`)]),[]);
  const events = rawEvents.map(raw=>decode<ActivityEvent>(raw)).filter((e):e is ActivityEvent=>!!e&&e.accountId===accountId);
  const daily = days.map((day,i) => {
    const counts:ActivityStats={};const values=rawCounts[i]||[];
    for(let n=0;n<values.length;n+=2)counts[String(values[n]) as ActivityAction]=Number(values[n+1]);
    return {day,counts};
  });
  events.sort((a,b)=>b.at-a.at || b.id.localeCompare(a.id));
  const selected = events.slice(0,200);
  return {events:selected,daily:daily.reverse(),retentionDays:ACTIVITY_DAYS,
    timelineLimit:200,truncated:events.length>200,
    ips:[...new Set(selected.map(e=>e.ip).filter((ip):ip is string=>!!ip))]};
}
type PdfTicket = { accountId: string; version: number; scope: 'full' | 'summary'; reportId?: string; target?: string; state: 'started' | 'ready' | 'failed' };
export async function startPdf(accountId: string, version: number, headers: Headers, details: Details, requestId: string) {
  const ticket = token(), ticketKey = key('pdf-ticket:'+digest(ticket));
  const value: PdfTicket = {accountId,version,scope:details.scope || 'full',reportId:details.reportId,target:details.target,state:'started'};
  const e = entry(accountId,'pdf_requested',headers,details,requestId);
  const requestKey = key(`pdf-request:${accountId}:${requestId}`);
  const result = await db().eval<unknown[],string>(`
local rawUser=redis.call('GET',KEYS[5]);if not rawUser then return '' end
local u=cjson.decode(rawUser);local info=cjson.decode(ARGV[5])
if u.status~='approved' or u.version~=info.version or (u.role~='admin' and u.expiresAt<=tonumber(ARGV[1])) then return '' end
local t=redis.call('GET',KEYS[7]);if t then return t end
redis.call('SET',KEYS[6],ARGV[5],'EX',3600);redis.call('SET',KEYS[7],ARGV[6],'EX',3600)
local function write() ${WRITE_LUA} end
write();return ARGV[6]`,[...e.keys,ticketKey,requestKey],[...e.args,JSON.stringify(value),ticket]);
  if(!result)throw new AccessError(401,'계정 이용 상태를 확인해 주세요.');
  return result;
}
export async function finishPdf(accountId: string, version: number, headers: Headers, ticket: string, phase: 'ready'|'failed'|'save'|'open', eventId: string) {
  const ticketKey=key('pdf-ticket:'+digest(ticket));
  const original=decode<PdfTicket>(await db().get(ticketKey));
  if (!original || original.accountId!==accountId || original.version!==version) throw new AccessError(403,'PDF 기록 요청의 이용 권한을 확인해 주세요. 다시 생성해 주세요.');
  const e=entry(accountId,`pdf_${phase}`,headers,{scope:original.scope,reportId:original.reportId,target:original.target,source:'browser'},eventId);
  const ok=await db().eval<unknown[],number>(`
local rawUser=redis.call('GET',KEYS[5]);if not rawUser then return -1 end
local u=cjson.decode(rawUser)
if u.status~='approved' or u.version~=tonumber(ARGV[6]) or (u.role~='admin' and u.expiresAt<=tonumber(ARGV[1])) then return -1 end
local raw=redis.call('GET',KEYS[6]);if not raw then return -1 end
local t=cjson.decode(raw);if t.accountId~=ARGV[5] or t.version~=tonumber(ARGV[6]) then return -1 end
local phase=ARGV[7]
if phase=='ready' or phase=='failed' then
  if t.state==phase then return 0 end
  if t.state~='started' then return -2 end
  t.state=phase;redis.call('SET',KEYS[6],cjson.encode(t),'KEEPTTL')
elseif t.state~='ready' then return -2 end
${WRITE_LUA}`,[...e.keys,ticketKey],[...e.args,accountId,version,phase]);
  if(ok<0) throw new AccessError(409,'PDF 생성 상태를 확인할 수 없습니다. 다시 생성해 주세요.');
}
export function activityStorageKeys(accountId: string) {
  const days=Array.from({length:ACTIVITY_DAYS},(_,i)=>activityDay(Date.now()-i*DAY));
  return [key(`activity-total:${accountId}`),...days.flatMap(day=>[key(`activity:${accountId}:${day}`),key(`activity-counts:${accountId}:${day}`)])];
}
