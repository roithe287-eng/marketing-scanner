import {db,key} from './saas/store';
import {REPORT_RETENTION_SECONDS} from './reportRetention';
export const reportPrefix=()=>process.env.VERCEL_ENV==='preview'?'ms:preview:report:':'ms:report:';
export const reportKey=(id:string)=>reportPrefix()+id;

// Enforce original creation time and earlier Redis TTL. Follow saved comparison references
// so embedded snapshots cannot outlive their original report. All checks/expiry are atomic.
export const RETENTION_LUA=`
local clock=redis.call('TIME');local now=tonumber(clock[1])*1000+math.floor(tonumber(clock[2])/1000);local duration=tonumber(ARGV[1])
local seen={}
local function read(k,depth)
 if depth>12 or seen[k] then return nil end
 seen[k]=true
 local raw=redis.call('GET',k);if not raw then seen[k]=nil;return nil end
 local ok,data=pcall(cjson.decode,raw);if not ok or type(data)~='table' then redis.call('DEL',k);seen[k]=nil;return nil end
 local ttl=redis.call('PTTL',k)
 local wrapped=data.version==2 and type(data.report)=='table'
 local created=wrapped and tonumber(data.createdAt) or nil
 if not created or created>now+60000 then redis.call('DEL',k);seen[k]=nil;return nil end
 local expiry=created+duration
 if tonumber(data.expiresAt) then expiry=math.min(expiry,tonumber(data.expiresAt)) end
 if ttl>=0 then expiry=math.min(expiry,now+ttl) end
 local report=wrapped and data.report or data
 for _,field in ipairs({'diagnosisBaseline','geoBaseline'}) do
  local baseline=report[field]
  if type(baseline)=='table' then
   local id=baseline.reportId
   if type(id)~='string' or not string.match(id,'^[A-Za-z0-9]+$') or #id<4 or #id>12 then expiry=now
   else local previous=read(ARGV[2]..id,depth+1);expiry=math.min(expiry,previous and previous.expiresAt or now) end
  end
 end
 seen[k]=nil
 if expiry<=now then redis.call('DEL',k);return nil end
 redis.call('PEXPIREAT',k,math.floor(expiry))
 return {raw=raw,ownerId=data.ownerId,createdAt=created,expiresAt=expiry}
end
local data=read(KEYS[1],0)
`;
export const READ_REPORT_LUA=RETENTION_LUA+`if not data then return nil end;return {data.raw,data.createdAt,data.expiresAt,data.ownerId}`;
export const retentionArgs=()=>[REPORT_RETENTION_SECONDS*1000,reportPrefix()];

/** Deployment migration: private report keys only, bounded SCAN batches, no report contents logged. */
export async function migrateReportRetention() {
 let cursor=0,checked=0,removed=0;
 do {
  const page=await db().scan(cursor,{match:reportPrefix()+'*',count:100});cursor=Number(page[0]);
  for(const name of page[1]) {
   const result=await db().eval(READ_REPORT_LUA,[name],retentionArgs());checked++;if(!result)removed++;
  }
 }while(cursor!==0);
 // Trim owner indexes too; indexes contain IDs only, but must not persist indefinitely.
 cursor=0;
 do {
  const page=await db().scan(cursor,{match:key('reports:*'),count:100});cursor=Number(page[0]);
  for(const name of page[1])await db().eval(`redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]);local ttl=redis.call('TTL',KEYS[1]);if ttl==-1 or ttl>tonumber(ARGV[2]) then redis.call('EXPIRE',KEYS[1],ARGV[2]) end;return 1`,[name],[Date.now()-REPORT_RETENTION_SECONDS*1000,REPORT_RETENTION_SECONDS]);
 }while(cursor!==0);
 // Old generated-question caches used 21 days. Shorten relative to their original age.
 cursor=0;
 const citationPrefix=process.env.VERCEL_ENV==='preview'?'ms:preview:citation:':'ms:citation:';
 do {
  const page=await db().scan(cursor,{match:citationPrefix+'*:questions',count:100});cursor=Number(page[0]);
  for(const name of page[1]) {
   if(name.includes('geo-v2.6-openai'))continue;
   await db().del(name); // Retired cache namespace: regenerate under the new 7-day policy.
  }
 }while(cursor!==0);
 return {checked,removed};
}
