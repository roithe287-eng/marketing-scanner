import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { NextRequest } from 'next/server';
import { startRedisBridge } from './helpers/redisBridge';
import { db, key, createAdmin, createSession, saveInquiry, listInquiries, INQUIRY_SECONDS } from '../lib/saas/store';
import { inquiryEmailContent, inquiryEmailSettings, notifyInquiry } from '../lib/saas/inquiryNotification';
import type { Inquiry, InquiryNotification } from '../lib/saas/types';
import { SESSION_COOKIE } from '../lib/saas/auth';
import { GET as adminGet, POST as adminPost } from '../app/api/admin/route';
import { POST as leadPost } from '../app/api/lead/route';

let bridge: Awaited<ReturnType<typeof startRedisBridge>>;
let cookie: string;
const input = {name:'테스트 문의', company:'테스트 회사', email:'customer@example.com', contact:'test only', url:'https://example.com', message:'PRIVATE FULL MESSAGE', services:['naver-ads','meta-ads'] as const, planId:'agency', consent:true as const};
const fresh = () => saveInquiry({...input, services:[...input.services]});
const savedStatus = (id:string) => db().get<InquiryNotification>(key('inquiry-email:'+id));
const request = (path:string, body?:unknown, authenticated=true) => new NextRequest('https://scanner.example'+path, {
  method:body===undefined?'GET':'POST',
  headers:{'Content-Type':'application/json',origin:'https://scanner.example','x-vercel-forwarded-for':'203.0.113.10',cookie:authenticated?cookie:''},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
});

before(async () => {
  bridge = await startRedisBridge();
  process.env.UPSTASH_REDIS_REST_URL=bridge.url;
  process.env.UPSTASH_REDIS_REST_TOKEN='local-test-token';
  process.env.VERCEL='1';
  process.env.VERCEL_ENV='production';
  process.env.ALLOWED_IPS='203.0.113.10';
  delete process.env.RESEND_API_KEY;
  delete process.env.INQUIRY_EMAIL_FROM;
  delete process.env.INQUIRY_NOTIFY_TO;
  const owner=await createAdmin({email:'owner@example.com',name:'Test Owner',password:'test password for isolated redis only'});
  cookie=`${SESSION_COOKIE}=${await createSession(owner)}`;
});
after(async () => bridge?.close());

test('missing email setup preserves inquiry and exposes an honest admin state', async () => {
  const response=await leadPost(request('/api/lead',input,false));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{ok:true});
  const responseAdmin=await adminGet(request('/api/admin'));
  const body=await responseAdmin.json();
  assert.equal(body.inquiryEmail.configured,false);
  assert.equal(body.inquiryEmail.recipient,'owner@example.com');
  assert.equal(body.inquiries[0].notification.status,'unconfigured');
  assert.equal(body.inquiries[0].message,input.message);
  assert.deepEqual(body.inquiries[0].services,['naver-ads','meta-ads']);
});

test('a visitor outside allowed IPs can submit scanner-only interest that survives admin and email rendering', async () => {
  const submit = (services: string[], email: string) => leadPost(new NextRequest('https://scanner.example/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'https://scanner.example', 'x-vercel-forwarded-for': '203.0.113.90' },
    body: JSON.stringify({ ...input, services, email, planId: 'single' }),
  }));
  const accepted = await submit(['no-agency'], 'scanner-only@example.com');
  assert.equal(accepted.status, 200);
  const admin = await (await adminGet(request('/api/admin'))).json();
  const inquiry = admin.inquiries.find((item: Inquiry) => item.email === 'scanner-only@example.com');
  assert.deepEqual(inquiry.services, ['no-agency']);
  assert.equal(inquiry.status, 'pending', 'an inquiry does not grant account access');
  assert.equal(inquiry.planId, 'single');
  const email = inquiryEmailContent(inquiry).text;
  assert.match(email, /광고대행 상담 선택: 대행문의 필요없음/);
  assert.doesNotMatch(email, /네이버 광고대행 문의|메타 광고대행 문의/);
  const rejected = await submit(['no-agency', 'meta-ads'], 'invalid-choice@example.com');
  assert.equal(rejected.status, 400);
  assert.ok(!(await listInquiries()).some(item => item.email === 'invalid-choice@example.com'));
});

test('successful delivery goes only to owner, includes both channels, and deduplicates concurrent/repeated sends', async t => {
  process.env.RESEND_API_KEY='test-only-key';
  process.env.INQUIRY_EMAIL_FROM='alerts@example.com';
  const id=await fresh();
  const realFetch=globalThis.fetch;
  let calls=0;
  t.mock.method(globalThis,'fetch',async (url:Parameters<typeof fetch>[0], options?:RequestInit) => {
    if(String(url)!=='https://api.resend.com/emails')return realFetch(url,options);
    calls++;
    const body=JSON.parse(String(options?.body));
    assert.deepEqual(body.to,['owner@example.com']);
    assert.match(body.text,/네이버 광고대행 문의 · 메타 광고대행 문의/);
    assert.match(body.text,/네이버\/메타 광고 대행 시 무료 제공/);
    assert.match(body.text,/https:\/\/www\.mktscanner\.com\/manage#admin-inquiries/);
    assert.ok(!body.text.includes(input.message));
    assert.ok(!body.text.includes(input.contact));
    assert.ok(!body.text.includes(input.email));
    assert.equal(new Headers(options?.headers).get('Idempotency-Key'),'scanner-inquiry/'+id);
    assert.equal(options?.redirect,'error');
    return Response.json({id:'provider-test-id'});
  });
  const statuses=await Promise.all([notifyInquiry(id),notifyInquiry(id)]);
  assert.ok(statuses.includes('sent'));
  assert.equal(await notifyInquiry(id),'sent');
  assert.equal(calls,1);
  assert.equal((await savedStatus(id))?.status,'sent');
  assert.equal((await listInquiries()).find(i=>i.id===id)?.notification?.attempts,1);
});

test('provider failure cannot undo receipt; authenticated admin retry preserves TTL and succeeds', async t => {
  const realFetch=globalThis.fetch;
  let failing=true,calls=0;
  t.mock.method(globalThis,'fetch',async (url:Parameters<typeof fetch>[0],options?:RequestInit) => {
    if(String(url)!=='https://api.resend.com/emails')return realFetch(url,options);
    calls++;
    return failing ? Response.json({message:'private-provider-detail'},{status:503}) : Response.json({id:'retry-test-id'});
  });
  const accepted=await leadPost(request('/api/lead',{...input,email:'retry@example.com'},false));
  assert.equal(accepted.status,200);
  const inquiry=(await listInquiries()).find(i=>i.email==='retry@example.com')!;
  assert.equal(inquiry.notification?.status,'failed');
  // Historical inquiry keeps its original expiry when a notification is retried.
  const oldCreatedAt=Date.now()-86400000;
  await db().set(key('inquiry:'+inquiry.id),{...inquiry,createdAt:oldCreatedAt},{ex:INQUIRY_SECONDS-86400});
  const forbidden=await adminPost(request('/api/admin',{action:'notify-inquiry',inquiryId:inquiry.id},false));
  assert.ok([401,403].includes(forbidden.status));
  assert.equal(calls,1);
  failing=false;
  const retried=await adminPost(request('/api/admin',{action:'notify-inquiry',inquiryId:inquiry.id}));
  assert.equal(retried.status,200);
  assert.equal((await retried.json()).ok,true);
  assert.equal((await savedStatus(inquiry.id))?.status,'sent');
  assert.equal((await savedStatus(inquiry.id))?.attempts,2);
  assert.ok(Number(await db().ttl(key('inquiry-email:'+inquiry.id))) <= INQUIRY_SECONDS-86400);
  assert.equal(calls,2);
});

test('preview never sends mail even with configured credentials; malformed addresses are disabled', async t => {
  const realFetch=globalThis.fetch;
  t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0],options?:RequestInit)=>{
    assert.notEqual(String(url),'https://api.resend.com/emails');
    return realFetch(url,options);
  });
  process.env.VERCEL_ENV='preview';
  try {assert.equal(await notifyInquiry(await fresh()),'disabled');}
  finally {process.env.VERCEL_ENV='production';}
  process.env.INQUIRY_NOTIFY_TO='owner@example.com,another@example.com';
  assert.equal(inquiryEmailSettings('owner@example.com').configured,false);
  assert.equal(await notifyInquiry(await fresh()),'unconfigured');
  delete process.env.INQUIRY_NOTIFY_TO;
  assert.equal(inquiryEmailSettings('owner@example.com').enabled,true);
});

test('transport timeout/rejection is recorded and subjects cannot contain injected header lines',async t=>{
  const realFetch=globalThis.fetch;
  t.mock.method(globalThis,'fetch',async(url:Parameters<typeof fetch>[0],options?:RequestInit)=>{
    if(String(url)==='https://api.resend.com/emails')throw new DOMException('Timeout','TimeoutError');
    return realFetch(url,options);
  });
  const id=await fresh();
  assert.equal(await notifyInquiry(id),'failed');
  assert.equal((await savedStatus(id))?.status,'failed');
  assert.ok(await db().get(key('inquiry:'+id)));
  const content=inquiryEmailContent({...input,services:[...input.services],id,createdAt:Date.now(),status:'pending',name:'name\nBCC: external@example.com'} as Inquiry);
  assert.ok(!content.subject.includes('\n'));
});
