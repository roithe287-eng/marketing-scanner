import assert from 'node:assert/strict';
import { test, before, after, beforeEach } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { startRedisBridge } from './helpers/redisBridge';
import { digest } from '../lib/security/request';
import { isLoginFreeNetwork } from '../lib/security/networkAccess';
import { getPrincipal, requireAdmin, SESSION_COOKIE } from '../lib/saas/auth';
import { db, key, createSession } from '../lib/saas/store';
import { DEFAULT_FEATURES, type Account } from '../lib/saas/types';
import { saveSharedReport, getSharedReport, updateSharedReportCompetitor, listReportsForOwner } from '../lib/shareStore';
import * as access from '../app/api/access/route';
import * as analyze from '../app/api/analyze/route';
import * as competitor from '../app/api/competitor/route';
import * as deepdive from '../app/api/deepdive/route';
import * as share from '../app/api/share/route';
import * as activity from '../app/api/activity/route';
import * as admin from '../app/api/admin/route';
import { fixture } from './fixtures/report';

const office = '203.0.113.42', outside = '203.0.113.43';
const network = {kind:'internal'} as const;
let bridge: Awaited<ReturnType<typeof startRedisBridge>>;
function request(path: string, body?: unknown, ip = office, session = '', extra: Record<string,string> = {}) {
  return new NextRequest('https://scanner.example'+path, {
    method:body === undefined?'GET':'POST',
    headers:{origin:'https://scanner.example','content-type':'application/json','x-vercel-forwarded-for':ip,
      cookie:SESSION_COOKIE+'='+session,...extra},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
}
before(async()=>{
  bridge = await startRedisBridge();
  process.env.UPSTASH_REDIS_REST_URL=bridge.url;process.env.UPSTASH_REDIS_REST_TOKEN='local-test-token';
  process.env.VERCEL='1';process.env.VERCEL_ENV='preview';
  process.env.LOGIN_FREE_IP_HASHES=digest(office);
  process.env.ALLOWED_IPS=office;
});
beforeEach(async()=>{await bridge.command(['FLUSHDB']);});
after(async()=>bridge?.close());

test('only the exact trusted network receives login-free access; missing, spoofed and malformed addresses fail closed',async()=>{
  const env={NODE_ENV:'test' as const,VERCEL:'1',LOGIN_FREE_IP_HASHES:digest(office)};
  assert.equal(isLoginFreeNetwork(request('/').headers,env),true);
  assert.equal(isLoginFreeNetwork(request('/',undefined,'::ffff:'+office).headers,env),true);
  for(const ip of [outside,'',office+', '+outside])assert.equal(isLoginFreeNetwork(request('/',undefined,ip).headers,env),false);
  assert.equal(isLoginFreeNetwork(request('/',undefined,outside,'',{'x-forwarded-for':office,'x-real-ip':office}).headers,env),false);
  assert.equal(isLoginFreeNetwork(request('/').headers,{...env,VERCEL:undefined}),false);
  assert.equal(isLoginFreeNetwork(request('/').headers,{...env,LOGIN_FREE_IP_HASHES:''}),false);
  assert.equal((await getPrincipal(request('/api/access')))?.kind,'internal');
  assert.equal(await getPrincipal(request('/api/access',undefined,outside)),null);
  const response=await access.GET(request('/api/access'));
  assert.deepEqual(await response.json(),{kind:'internal',admin:false});
  assert.match(response.headers.get('cache-control')!,/no-store/);
  assert.equal(response.cookies.get(SESSION_COOKIE),undefined,'no fabricated login or account');
});

test('network access reaches each analysis input validator and retains same-origin enforcement',async()=>{
  for(const [path,handler] of [['analyze',analyze],['competitor',competitor],['deepdive',deepdive]] as const){
    assert.equal((await handler.POST(request('/api/'+path,{}))).status,400,path+' passes auth without calling paid providers');
    assert.equal((await handler.POST(request('/api/'+path,{},outside))).status,401);
    assert.equal((await handler.POST(request('/api/'+path,{},office,'',{origin:'https://other.example'}))).status,403);
  }
});

test('login-free networks never gain account management or setup-owner privileges',async()=>{
  await assert.rejects(()=>requireAdmin(request('/api/admin')),{status:403});
  assert.equal((await admin.GET(request('/api/admin'))).status,403);
  assert.equal((await admin.POST(request('/api/admin',{action:'create',email:'denied@example.com'}))).status,403);
});

test('network reports can be saved, reopened, compared and updated, but cannot access customer reports',async()=>{
  const saved=await share.POST(request('/api/share',{report:fixture}));assert.equal(saved.status,200);
  const {id}=await saved.json();assert.ok(id);
  assert.ok((await getSharedReport(id,network))?.sharedRetention);
  assert.equal((await share.GET(request('/api/share?id='+id+'&mode=diagnosis'))).status,200);
  assert.equal((await share.GET(request('/api/share?id='+id+'&mode=diagnosis',undefined,outside))).status,401);
  const own=await (await access.GET(request('/api/access?reports=1'))).json();assert.equal(own.reports[0].id,id);
  assert.equal(await updateSharedReportCompetitor(id,{searchKeyword:'test',competitors:[]},network),true);
  const account:Account={id:randomUUID(),email:'customer@example.com',name:'Customer',company:'',role:'customer',status:'approved',
    expiresAt:Date.now()+86400000,monthlyLimit:10,features:DEFAULT_FEATURES,passwordHash:'test-only',version:1,createdAt:Date.now()};
  const customer={kind:'account',account} as const;
  const privateId=await saveSharedReport(fixture,customer);assert.ok(privateId);
  assert.equal(await getSharedReport(privateId,network),null);
  assert.equal(await updateSharedReportCompetitor(privateId,{searchKeyword:'denied',competitors:[]},network),false);
  await assert.rejects(()=>listReportsForOwner(account.id,network),{status:403});
  assert.equal(await getSharedReport(id,customer),null);
  assert.ok(await getSharedReport(id,{kind:'account',account:{...account,role:'admin'}}));
  assert.equal((await activity.POST(request('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:fixture.url,reportId:privateId}))).status,404);
});

test('network PDF receipts allow generation/save/open, bind the network, expire, and cannot be reused as account receipts',async()=>{
  const payload={action:'pdf_start',eventId:randomUUID(),scope:'summary',url:fixture.url};
  const start=await activity.POST(request('/api/activity',payload));assert.equal(start.status,200);
  const {ticket}=await start.json();assert.match(ticket,/^[\w-]{43}$/);
  assert.equal((await (await activity.POST(request('/api/activity',payload))).json()).ticket,ticket);
  const phase=(value:string,ip=office,t=ticket)=>activity.POST(request('/api/activity',{action:'pdf_event',eventId:randomUUID(),ticket:t,phase:value},ip));
  assert.equal((await phase('save')).status,409);
  assert.equal((await phase('ready',outside)).status,401);
  process.env.LOGIN_FREE_IP_HASHES=digest(office)+','+digest(outside);
  try{assert.equal((await phase('ready',outside)).status,403);}finally{process.env.LOGIN_FREE_IP_HASHES=digest(office);}
  assert.equal((await phase('ready')).status,200);assert.equal((await phase('ready')).status,200);
  assert.equal((await phase('save')).status,200);assert.equal((await phase('open')).status,200);
  assert.equal((await phase('failed')).status,409);
  const ticketKey=key('network-pdf-ticket:'+digest(ticket));
  assert.ok(Number(await db().ttl(ticketKey))<=3600);
  const account:Account={id:randomUUID(),email:'pdf@example.com',name:'PDF',company:'',role:'customer',status:'approved',expiresAt:Date.now()+86400000,
    monthlyLimit:10,features:DEFAULT_FEATURES,passwordHash:'test-only',version:1,createdAt:Date.now()};
  await db().set(key('account:'+account.id),account);const session=await createSession(account);
  assert.equal((await activity.POST(request('/api/activity',{action:'pdf_event',eventId:randomUUID(),ticket,phase:'save'},office,session))).status,403);
  await db().del(ticketKey);assert.equal((await phase('save')).status,403);
});

test('approved account sessions retain identity and feature restrictions on the login-free network',async()=>{
  const account:Account={id:randomUUID(),email:'signed-in@example.com',name:'Signed in',company:'',role:'customer',status:'approved',expiresAt:Date.now()+86400000,
    monthlyLimit:10,features:{...DEFAULT_FEATURES,reports:false},passwordHash:'test-only',version:1,createdAt:Date.now()};
  await db().set(key('account:'+account.id),account);const session=await createSession(account);
  const principal=await getPrincipal(request('/api/access',undefined,office,session));
  assert.equal(principal?.kind,'account');assert.equal(principal?.kind==='account'&&principal.account.id,account.id);
  assert.equal((await share.POST(request('/api/share',{report:fixture},office,session))).status,403);
  const pdf=await activity.POST(request('/api/activity',{action:'pdf_start',eventId:randomUUID(),scope:'full',url:fixture.url},office,session));
  assert.equal(pdf.status,200);
  const {activityTotals}=await import('../lib/saas/activity');
  assert.equal((await activityTotals([account.id]))[0].pdf_requested,1);
});
