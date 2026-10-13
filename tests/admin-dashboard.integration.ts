import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { startRedisBridge } from './helpers/redisBridge';
import { db,key,createSession,reserve,deleteAccount } from '../lib/saas/store';
import { SESSION_COOKIE } from '../lib/saas/auth';
import { digest } from '../lib/security/request';
import { DEFAULT_FEATURES,type Account } from '../lib/saas/types';
import { NETWORK_ACTIVITY_ID } from '../lib/saas/activityTypes';
import { activityDay,activityDetail,activityTotals,recordActivity } from '../lib/saas/activity';
import * as admin from '../app/api/admin/route';
import * as telemetry from '../app/api/activity/route';
const office='203.0.113.10',outside='203.0.113.20';
let bridge:Awaited<ReturnType<typeof startRedisBridge>>,owner:Account,ownerToken:string,customerToken:string;
const customers:Account[]=[];
const req=(path:string,body?:unknown,session=ownerToken,ip=office,extra:Record<string,string>={})=>new NextRequest('https://scanner.example'+path,{method:body?'POST':'GET',headers:{origin:'https://scanner.example','content-type':'application/json','x-vercel-forwarded-for':ip,cookie:SESSION_COOKIE+'='+session,...extra},...(body?{body:JSON.stringify(body)}:{})});
before(async()=>{
  bridge=await startRedisBridge();process.env.UPSTASH_REDIS_REST_URL=bridge.url;process.env.UPSTASH_REDIS_REST_TOKEN='local-test-token';process.env.VERCEL='1';process.env.VERCEL_ENV='preview';process.env.ALLOWED_IPS=office;process.env.LOGIN_FREE_IP_HASHES=digest(office);
  const base={email:'owner@example.com',name:'Owner',company:'',role:'admin' as const,status:'approved' as const,expiresAt:Date.now()+86400000,monthlyLimit:1000,features:DEFAULT_FEATURES,passwordHash:'test-only',version:1,createdAt:Date.now()};
  owner={...base,id:randomUUID()};await db().set(key('admin-initialized'),owner.id);
  const p=db().pipeline();p.set(key('account:'+owner.id),owner);p.zadd(key('accounts'),{member:owner.id,score:owner.createdAt});
  for(let i=0;i<105;i++){
    const user:Account={...base,id:randomUUID(),email:`user${i}@example.com`,role:'customer',status:i===0?'suspended':'approved',expiresAt:i===1?Date.now()-1000:base.expiresAt,passwordHash:i===2?null:'test-only'};
    customers.push(user);p.set(key('account:'+user.id),user);p.zadd(key('accounts'),{member:user.id,score:base.createdAt+i+1});
  }
  await p.exec();ownerToken=await createSession(owner);customerToken=await createSession(customers[3]);
});
after(async()=>bridge?.close());
test('overview counts all account pages, and separates owner, customers and login-free network',async()=>{
  for(const [accountId,count] of [[owner.id,3],[customers[3].id,4],[customers[104].id,5],[NETWORK_ACTIVITY_ID,2]] as const)
    for(let i=0;i<count;i++)await recordActivity(accountId,'analyze_success',req('/').headers,{target:'example.com'});
  const response=await admin.GET(req('/api/admin?view=overview'));assert.equal(response.status,200);assert.match(response.headers.get('cache-control')!,/no-store/);
  const data=await response.json();assert.deepEqual(data.accounts,{approved:103,inactive:2,unactivated:1,total:105});
  assert.equal(data.groups.owner.totals.analyze_success,3);assert.equal(data.groups.customers.totals.analyze_success,9);assert.equal(data.groups.network.totals.analyze_success,2);
  assert.equal(data.groups.customers.daily.at(-1).counts.analyze_success,9);assert.equal(data.groups.owner.daily.length,30);
  assert.doesNotMatch(JSON.stringify(data),/passwordHash|test-only|@example.com/);
});
test('all admin read modes deny customers, unlogged networks, outside owner sessions, cross-site and forged forwarding requests',async()=>{
  for(const path of ['/api/admin','/api/admin?view=overview','/api/admin?id='+NETWORK_ACTIVITY_ID,'/api/admin?id='+customers[3].id]){
    for(const [session,ip,headers] of [[customerToken,office,{}],['',office,{}],[ownerToken,outside,{}],[ownerToken,office,{'sec-fetch-site':'cross-site'}],[ownerToken,office,{origin:'https://attacker.example'}],[ownerToken,'',{'x-forwarded-for':office,'x-middleware-subrequest':'middleware:middleware'}]] as const){
      const r=await admin.GET(req(path,undefined,session,ip,headers));assert.equal(r.status,403,path);assert.doesNotMatch(await r.text(),/owner@example|counts|passwordHash/);
    }
  }
});
test('network analysis now records accepted URL calls, completion, duration and deduplicates finish',async()=>{
  const finish=await reserve({kind:'internal'},'analyze',{headers:req('/').headers,url:'https://example.com/private?token=secret'});
  await finish();await finish();
  const activity=await activityDetail(NETWORK_ACTIVITY_ID);
  assert.equal((await activityTotals([NETWORK_ACTIVITY_ID]))[0].analyze_started,1);
  assert.equal(activity.events.filter(e=>e.action==='analyze_success').length,3);
  assert.ok(activity.events.some(e=>e.action==='analyze_success'&&typeof e.durationMs==='number'));
  assert.doesNotMatch(JSON.stringify(activity),/private|token=|secret/);
});
test('PDF counts preserve outcome ordering, attempt identity, metrics, retries and separate fallback downloads',async()=>{
  const start=()=>telemetry.POST(req('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:'https://pdf.example.com/?secret=hidden'},customerToken));
  const {ticket}=await (await start()).json();
  const event=(phase:string,id=randomUUID(),metrics?:unknown)=>telemetry.POST(req('/api/activity',{action:'pdf_event',eventId:id,ticket,phase,...(metrics?{metrics}:{})},customerToken));
  assert.equal((await event('saved')).status,409);
  assert.equal((await event('ready',randomUUID(),{pages:12,bytes:1048576,durationMs:1400})).status,200);
  assert.equal((await event('saved')).status,409,'an unstarted save cannot finish');
  const id=randomUUID();assert.equal((await event('save_started',id)).status,200);
  const replies=await Promise.all([event('saved',id),event('saved',id)]);assert.ok(replies.every(r=>r.status===200));
  assert.equal((await event('save_cancelled',id)).status,409,'cannot change an already saved outcome');
  const cancelled=randomUUID();await event('save_started',cancelled);await event('save_cancelled',cancelled);
  assert.equal((await event('saved',cancelled)).status,409,'cancellation never becomes a save');
  const fallback=randomUUID();await event('save',fallback);await event('save',fallback);
  const [stats]=await activityTotals([customers[3].id]);assert.equal(stats.pdf_saved,1);assert.equal(stats.pdf_save,1);assert.equal(stats.pdf_save_cancelled,1);assert.equal(stats.pdf_save_started,2);
  const detail=await activityDetail(customers[3].id),ready=detail.events.find(e=>e.action==='pdf_ready');assert.equal(ready?.pages,12);assert.equal(ready?.bytes,1048576);assert.equal(ready?.durationMs,1400);
  assert.equal(detail.sites.find(s=>s.target==='pdf.example.com')?.counts.pdf_saved,1);assert.doesNotMatch(JSON.stringify(detail),/secret=|hidden/);
});
test('network PDF stages are counted without an account and receipts remain bound to the approved IP',async()=>{
  const eventId=randomUUID(),startBody={action:'pdf_start',eventId,scope:'summary',url:'https://network.example.com'};
  const {ticket}=await (await telemetry.POST(req('/api/activity',startBody,''))).json();
  assert.equal((await (await telemetry.POST(req('/api/activity',startBody,''))).json()).ticket,ticket);
  const id=randomUUID();
  for(const phase of ['ready','save_started','saved','saved'])assert.equal((await telemetry.POST(req('/api/activity',{action:'pdf_event',ticket,eventId:id,phase},''))).status,200);
  const stats=(await activityTotals([NETWORK_ACTIVITY_ID]))[0];assert.equal(stats.pdf_requested,1);assert.equal(stats.pdf_ready,1);assert.equal(stats.pdf_saved,1);
  const detail=await (await admin.GET(req('/api/admin?id='+NETWORK_ACTIVITY_ID))).json();assert.equal(detail.network,true);assert.equal(detail.account,null);assert.ok(detail.activity.sites.some((s:{target:string})=>s.target==='network.example.com'));
});
test('URL totals survive timeline truncation and old-day retention remains absolute',async t=>{
  const accountId=customers[100].id,h=req('/').headers;
  for(let i=0;i<205;i++)await recordActivity(accountId,'analyze_success',h,{target:'busy.example.com'});
  const detail=await activityDetail(accountId);assert.equal(detail.events.length,200);assert.equal(detail.truncated,true);assert.equal(detail.sites[0].counts.analyze_success,205);
  const old=Date.now()-28*86400000;t.mock.method(Date,'now',()=>old);await recordActivity(accountId,'analyze_success',h,{target:'old.example.com'});t.mock.restoreAll();
  const oldKey=key(`activity-sites:${accountId}:${activityDay(old)}`),ttl=Number(await db().ttl(oldKey));assert.ok(ttl>0&&ttl<=2*86400);
  await recordActivity(accountId,'analyze_success',h,{target:'old.example.com'});assert.ok(Number(await db().ttl(oldKey))<=ttl);
  await deleteAccount(accountId,1,owner.id);assert.equal((await activityDetail(accountId)).sites.length,0);
  const overview=await (await admin.GET(req('/api/admin?view=overview'))).json();assert.equal(overview.accounts.total,104);assert.equal(overview.groups.customers.totals.analyze_success,9,'deleted activity is excluded');
});
