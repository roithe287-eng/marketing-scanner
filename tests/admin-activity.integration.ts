import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { startRedisBridge } from './helpers/redisBridge';
import { db,key,token,createSession,createCustomer,activate,getAccount,reserve,usage,updateAccount,deleteAccount,migrateLegacyAudit } from '../lib/saas/store';
import { SESSION_COOKIE,getPrincipal,requireAdmin } from '../lib/saas/auth';
import { digest } from '../lib/security/request';
import { DEFAULT_FEATURES,type Account } from '../lib/saas/types';
import { activityDetail,activityTotals,activityDay,activityExpiry,recordActivity } from '../lib/saas/activity';
import * as setup from '../app/api/setup/route';
import * as admin from '../app/api/admin/route';
import * as telemetry from '../app/api/activity/route';
import * as login from '../app/api/login/route';
import * as access from '../app/api/access/route';
import * as share from '../app/api/share/route';
import {saveSharedReport,listOwnReports} from '../lib/shareStore';
import { fixture } from './fixtures/report';
let bridge:Awaited<ReturnType<typeof startRedisBridge>>,owner:Account,user:Account,second:Account;
let ownerToken='',userToken='',secondToken='';
const password='test-only owner and customer password';
const grant={expiresAt:Date.now()+86400000,monthlyLimit:10,features:DEFAULT_FEATURES};
const request=(path:string,body?:unknown,session='',ip='203.0.113.20',extra:Record<string,string>={})=>new NextRequest('https://scanner.example'+path,{
  method:body===undefined?'GET':'POST',headers:{origin:'https://scanner.example','content-type':'application/json','x-vercel-forwarded-for':ip,'user-agent':'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0','cookie':`${SESSION_COOKIE}=${session}`,...extra},...(body===undefined?{}:{body:JSON.stringify(body)})
});
before(async()=>{
  bridge=await startRedisBridge();process.env.UPSTASH_REDIS_REST_URL=bridge.url;process.env.UPSTASH_REDIS_REST_TOKEN='local-test-token';process.env.VERCEL='1';process.env.VERCEL_ENV='preview';process.env.ALLOWED_IPS='203.0.113.10';
});
after(async()=>bridge?.close());
test('owner setup requires the secret and registered network; creation is exactly once',async()=>{
  const secret=token();process.env.SAAS_SETUP_TOKEN_HASH=digest(secret);process.env.SAAS_SETUP_EXPIRES_AT=String(Date.now()+600000);
  const body={token:secret,email:'owner@example.com',name:'소유자',password};
  assert.equal((await setup.POST(request('/api/setup',body))).status,403);
  assert.equal((await setup.POST(request('/api/setup',{...body,token:token()},'','203.0.113.10'))).status,403);
  const response=await setup.POST(request('/api/setup',body,'','203.0.113.10'));assert.equal(response.status,200);
  ownerToken=response.cookies.get(SESSION_COOKIE)!.value;owner=(await requireAdmin(request('/api/admin',undefined,ownerToken,'203.0.113.10')))!;
  assert.equal((await setup.POST(request('/api/setup',{...body,email:'attacker@example.com'},'','203.0.113.10'))).status,409);
  assert.equal(await getPrincipal(request('/api/access',undefined,'','203.0.113.10')),null);
  assert.equal((await getPrincipal(request('/api/access',undefined,ownerToken,'203.0.113.10')))?.kind,'account');
});
test('owner creates customers, customers cannot create or promote accounts, and duplicate email is rejected',async()=>{
  const input={action:'create',email:'customer@example.com',name:'고객',company:'회사',contactVerified:true,...grant};
  assert.equal((await admin.POST(request('/api/admin',input,'','203.0.113.10'))).status,403);
  const created=await admin.POST(request('/api/admin',input,ownerToken,'203.0.113.10'));assert.equal(created.status,200);
  const result=await created.json();assert.equal(result.account.role,'customer');assert.equal('passwordHash' in result.account,false);assert.equal(result.account.approvedBy,owner.id);
  assert.equal((await login.POST(request('/api/login',{email:input.email,password}))).status,401,'not activated');
  user=await activate(result.activationPath.split('#')[1],password);userToken=await createSession(user);
  const secondCreated=await createCustomer({...grant,email:'second@example.com',name:'Second',company:''},owner.id);second=await activate(secondCreated.invite,password);secondToken=await createSession(second);
  assert.equal((await admin.POST(request('/api/admin',input,userToken,'203.0.113.10'))).status,403);
  assert.equal((await admin.POST(request('/api/admin',{...input,email:'new@example.com',role:'admin'},ownerToken,'203.0.113.10'))).status,400);
  assert.equal((await admin.POST(request('/api/admin',input,ownerToken,'203.0.113.10'))).status,409);
  const forged={...user,id:randomUUID(),role:'admin' as const};await db().set(key('account:'+forged.id),forged);const forgedToken=await createSession(forged);
  await assert.rejects(()=>requireAdmin(request('/api/admin',undefined,forgedToken,'203.0.113.10')),{status:403});
});
test('admin metrics and IPs are private and cannot be requested by customers or cross-site clients',async()=>{
  assert.equal((await admin.GET(request('/api/admin?id='+user.id,undefined,userToken,'203.0.113.10'))).status,403);
  assert.equal((await admin.GET(request('/api/admin?id='+user.id,undefined,ownerToken))).status,403);
  const r=await admin.GET(request('/api/admin?id='+user.id,undefined,ownerToken,'203.0.113.10'));assert.equal(r.status,200);assert.match(r.headers.get('cache-control')!,/no-store/);
  const body=await r.json();assert.equal(body.account.id,user.id);assert.equal('passwordHash' in body.account,false);
  const own=await (await access.GET(request('/api/access',undefined,userToken))).json();assert.equal(own.account.id,user.id);assert.equal('activity' in own,false);
  assert.equal((await telemetry.POST(request('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:fixture.url},userToken,'203.0.113.20',{origin:'https://evil.example'}))).status,403);
});
test('analysis attempts, completion, refund and duplicate completion are counted correctly',async()=>{
  const principal={kind:'account' as const,account:user},context={headers:request('/').headers,url:'https://example.com/private?password=never-log'};
  const success=await reserve(principal,'analyze',context);await success();await success();
  const failed=await reserve(principal,'analyze',context);await failed(true);await failed(true);
  assert.equal((await usage(user.id)).analyze,1);
  const [stats]=await activityTotals([user.id]);assert.equal(stats.analyze_started,2);assert.equal(stats.analyze_success,1);assert.equal(stats.analyze_failed,1);
  const activity=await activityDetail(user.id);assert.equal(activity.events.find(e=>e.action==='analyze_success')?.target,'example.com');assert.doesNotMatch(JSON.stringify(activity),/password=|never-log/);
  assert.equal(activity.events.find(e=>e.action==='analyze_success')?.ip,'203.0.113.20');
});
test('PDF receipts bind identity, enforce ordering and deduplicate retries',async()=>{
  const eventId=randomUUID();const body={action:'pdf_start',eventId,scope:'summary',url:fixture.url};
  const first=await telemetry.POST(request('/api/activity',body,userToken));assert.equal(first.status,200);const {ticket}=await first.json();
  const retry=await telemetry.POST(request('/api/activity',body,userToken));assert.equal((await retry.json()).ticket,ticket);
  const phase=(name:string,eventId=randomUUID(),session=userToken)=>telemetry.POST(request('/api/activity',{action:'pdf_event',ticket,phase:name,eventId},session));
  assert.equal((await phase('save')).status,409);assert.equal((await phase('ready',randomUUID(),secondToken)).status,403);
  assert.equal((await phase('ready')).status,200);assert.equal((await phase('ready')).status,200);
  const saveId=randomUUID();assert.equal((await phase('save',saveId)).status,200);assert.equal((await phase('save',saveId)).status,200);
  assert.equal((await phase('open')).status,200);assert.equal((await phase('failed')).status,409);
  const [stats]=await activityTotals([user.id]);assert.equal(stats.pdf_requested,1);assert.equal(stats.pdf_ready,1);assert.equal(stats.pdf_save,1);assert.equal(stats.pdf_open,1);
  const events=(await activityDetail(user.id)).events;assert.ok(events.filter(e=>e.action==='pdf_save').every(e=>e.accountId===user.id&&e.source==='browser'));
  assert.equal((await telemetry.POST(request('/api/activity',{...body,eventId:randomUUID(),accountId:second.id,ip:'1.1.1.1'},userToken))).status,400);
});
test('share creation is attributed to its owner and expired links do not remain active',async()=>{
  const oldInternalId=await saveSharedReport(fixture,{kind:'internal'});
  assert.ok((await listOwnReports({kind:'account',account:owner})).some(r=>r.id===oldInternalId),'owner can still find legacy network reports');
  assert.ok(!(await listOwnReports({kind:'account',account:user})).some(r=>r.id===oldInternalId),'legacy reports never become customer-accessible');
  const created=await share.POST(request('/api/share',{report:fixture},userToken));assert.equal(created.status,200);const {id}=await created.json();
  const detail=await (await admin.GET(request('/api/admin?id='+user.id,undefined,ownerToken,'203.0.113.10'))).json();assert.ok(detail.reports.some((r:any)=>r.id===id));assert.equal(detail.totals.share_created,1);
  assert.equal((await telemetry.POST(request('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:fixture.url,reportId:id},secondToken))).status,404);
  await db().pexpire('ms:preview:report:'+id,1);
  await new Promise(r=>setTimeout(r,20));
  const after=await (await admin.GET(request('/api/admin?id='+user.id,undefined,ownerToken,'203.0.113.10'))).json();assert.equal(after.reports.length,0);assert.equal(after.totals.share_created,1);
});
test('activity is idempotent under concurrency and daily expiry never extends old IP records',async t=>{
  const id=randomUUID(),h=request('/').headers;
  await Promise.all(Array.from({length:8},()=>recordActivity(second.id,'report_view',h,{},id)));
  assert.equal((await activityTotals([second.id]))[0].report_view,1);
  const now=Date.now(),old=now-28*86400000;
  t.mock.method(Date,'now',()=>old);await recordActivity(second.id,'login',h);
  const oldKey=key(`activity:${second.id}:${activityDay(old)}`),ttl=await db().ttl(oldKey);assert.ok(Number(ttl)>86400&&Number(ttl)<=2*86400);
  t.mock.restoreAll();await recordActivity(second.id,'login',h);
  assert.ok(Number(await db().ttl(oldKey))<=Number(ttl));
  assert.ok(activityExpiry(now)*1000-now<=30*86400000);
  assert.equal((await activityDetail(second.id)).events.filter(e=>e.action==='login').length,2);
});
test('suspension invalidates sessions and prevents tracking or report actions immediately',async()=>{
  const active=await getAccount(second.id);assert.ok(active);
  await updateAccount(second.id,active.version,{...grant,status:'suspended'},owner.id);
  assert.equal(await getPrincipal(request('/api/access',undefined,secondToken,'203.0.113.10')),null);
  assert.equal((await telemetry.POST(request('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:fixture.url},secondToken))).status,401);
  assert.equal((await share.POST(request('/api/share',{report:fixture},secondToken))).status,401);
  assert.equal((await login.POST(request('/api/login',{email:second.email,password}))).status,401);
});
test('account deletion removes personal activity timelines and lifetime counters',async()=>{
  const current=await getAccount(second.id);assert.ok(current);
  await deleteAccount(second.id,current.version,owner.id);
  assert.equal(await getAccount(second.id),null);assert.deepEqual((await activityTotals([second.id]))[0],{});assert.equal((await activityDetail(second.id)).events.length,0);
  await recordActivity(second.id,'analyze_success',request('/').headers);
  assert.deepEqual((await activityTotals([second.id]))[0],{},'a late completion cannot recreate deleted personal counters');
});
test('legacy administrator audit records migrate to absolute expiry and do not restart retention',async()=>{
  const at=Date.now()-5*86400000,day=Math.floor(at/86400000);
  await db().lpush(key('audit'),JSON.stringify({actor:owner.id,action:'test',target:user.id,at}),JSON.stringify({actor:owner.id,action:'expired',target:user.id,at:Date.now()-181*86400000}));
  assert.equal(await migrateLegacyAudit(),1);assert.equal(await db().exists(key('audit')),0);
  assert.ok(Number(await db().ttl(key('audit-day:'+day)))<175*86400);
  assert.equal(await migrateLegacyAudit(),0);
});
