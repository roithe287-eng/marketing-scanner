import { db, key } from './store';
import { activityDay } from './activity';
import { ACTIVITY_DAYS, NETWORK_ACTIVITY_ID, ACTIVITY_LABELS, type ActivityStats, type AdminOverview, type ActivityAction, type AdminCustomerActivity } from './activityTypes';

function add(target:ActivityStats,source:ActivityStats){
  for(const action of Object.keys(ACTIVITY_LABELS) as ActivityAction[])if(source[action])target[action]=(target[action]||0)+Number(source[action]);
  if(source.firstTrackedAt)target.firstTrackedAt=Math.min(target.firstTrackedAt||Infinity,Number(source.firstTrackedAt));
  if(source.lastSeenAt)target.lastSeenAt=Math.max(target.lastSeenAt||0,Number(source.lastSeenAt));
}
// Read account/status and counters in bounded Redis batches. All pages count;
// deleted users cannot linger in a separately maintained global total.
export async function adminOverview(ownerId:string):Promise<AdminOverview>{
  const now=Date.now(),days=Array.from({length:ACTIVITY_DAYS},(_,i)=>activityDay(now-(ACTIVITY_DAYS-1-i)*86400000));
  const series=()=>({totals:{} as ActivityStats,daily:days.map(day=>({day,counts:{} as ActivityStats}))});
  const result:AdminOverview={updatedAt:now,customers:[],accounts:{approved:0,inactive:0,unactivated:0,total:0},groups:{owner:series(),customers:series(),network:series()}};
  let offset=0;
  while(true){
    const ids=await db().zrange<string[]>(key('accounts'),offset,offset+99);
    if(!ids.length)break;
    const rows=await db().eval<unknown[],{group:'owner'|'customers';active:boolean;unactivated:boolean;identity:Omit<AdminCustomerActivity,'periods'|'activated'>;counts:ActivityStats[]}[]>(`
local rows={}
for n,id in ipairs(cjson.decode(ARGV[1])) do
  local base=(n-1)*32
  local raw=redis.call('GET',KEYS[base+1])
  if raw then
    local u=cjson.decode(raw)
    if u.role=='customer' or u.id==ARGV[2] then
      local counts={}
      for i=2,32 do
        local values=redis.call('HGETALL',KEYS[base+i]);local parsed={}
        for j=1,#values,2 do parsed[values[j]]=tonumber(values[j+1]) end
        counts[#counts+1]=parsed
      end
      rows[#rows+1]={group=u.id==ARGV[2] and 'owner' or 'customers',active=u.status=='approved' and u.expiresAt>tonumber(ARGV[3]),unactivated=u.passwordHash==cjson.null or not u.passwordHash,identity={id=u.id,name=u.name,email=u.email,company=u.company,status=u.status,expiresAt=u.expiresAt},counts=counts}
    end
  end
end
return cjson.encode(rows)`,ids.flatMap(id=>[key('account:'+id),key('activity-total:'+id),...days.map(day=>key(`activity-counts:${id}:${day}`))]),[JSON.stringify(ids),ownerId,now]);
    for(const row of (Array.isArray(rows)?rows:[])){
      const group=result.groups[row.group];add(group.totals,row.counts[0]);
      row.counts.slice(1).forEach((counts,i)=>add(group.daily[i].counts,counts));
      if(row.group==='customers'){
        const periods:AdminCustomerActivity['periods']={'all':row.counts[0],'1':{},'7':{},'30':{}};
        for(const period of ['1','7','30'] as const)for(const counts of row.counts.slice(-Number(period)))add(periods[period],counts);
        result.customers.push({...row.identity,activated:!row.unactivated,periods});
        result.accounts.total++;result.accounts[row.active?'approved':'inactive']++;
        if(row.active&&row.unactivated)result.accounts.unactivated++;
      }
    }
    offset+=ids.length;if(ids.length<100)break;
  }
  result.customers.sort((a,b)=>a.name.localeCompare(b.name,'ko')||a.email.localeCompare(b.email)||a.id.localeCompare(b.id));
  const p=db().pipeline();p.hgetall(key('activity-total:'+NETWORK_ACTIVITY_ID));
  for(const day of days)p.hgetall(key(`activity-counts:${NETWORK_ACTIVITY_ID}:${day}`));
  const counts=await p.exec<(ActivityStats|null)[]>();
  add(result.groups.network.totals,counts[0]||{});
  counts.slice(1).forEach((count,i)=>add(result.groups.network.daily[i].counts,count||{}));
  return result;
}
