import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {isSmartstoreUrl,parseSmartstoreUrl,SmartstoreReportSchema,type SmartstoreReport} from '../lib/smartstore';
import {analyzeSmartstore,inspectSmartstoreHtml} from '../lib/analyzeSmartstore';
import {targetHost} from '../lib/saas/activity';
import {websiteHttp} from '../lib/security/safeFetch';
import SmartstoreReportView from '../components/report/SmartstoreReport';
import {ActivityMetrics} from '../components/access/AdminActivityDashboard';
import {ActivityHistory} from '../components/access/UserActivityView';
import {reserve} from '../lib/saas/store';
import {digest} from '../lib/security/request';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/analyze/route';
import {DEFAULT_FEATURES,type Account} from '../lib/saas/types';

const base:SmartstoreReport={kind:'smartstore',version:1,url:'https://smartstore.naver.com/wodkq',storeUrl:'https://smartstore.naver.com/wodkq',storeId:'wodkq',observedAt:'2026-10-14T01:00:00Z',status:'limited',reason:'',observations:[]};
const html='<html><head><title>우리가게 공식 스토어</title><meta name="description" content="직접 만든 상품을 소개합니다"><meta property="og:title" content="우리가게"></head><body>스토어 소개</body></html>';

test('store and product URLs preserve tenant identity and omit tracking data',()=>{
  for(const id of ['wodkq','store123','my-store_2']){
    const result=parseSmartstoreUrl(`smartstore.naver.com/${id}?secret=private#tracking`)!;
    assert.equal(result.storeId,id);assert.equal(result.url,`https://smartstore.naver.com/${id}`);
    assert.equal(targetHost(result.url),`smartstore.naver.com/${id}`);
  }
  assert.equal(parseSmartstoreUrl('https://m.smartstore.naver.com/wodkq/products/123?NaPm=private')?.url,'https://smartstore.naver.com/wodkq/products/123');
  assert.equal(targetHost('https://brand.naver.com/brand123/products/456?token=secret'),'brand.naver.com/brand123');
  assert.equal(targetHost('https://example.com/private?token=secret'),'example.com');
  assert.notEqual(targetHost('https://smartstore.naver.com/store1'),targetHost('https://smartstore.naver.com/store2'));
});
test('missing tenant, encoded delimiters, credentials, spoofed hosts cannot become store identities',()=>{
  for(const value of ['https://smartstore.naver.com','https://smartstore.naver.com/products/123','https://smartstore.naver.com/a%2Fb','https://user:pass@smartstore.naver.com/test','https://smartstore.naver.com:8080/test'])assert.throws(()=>parseSmartstoreUrl(value));
  for(const value of ['https://smartstore.naver.com.evil.example/shop','https://evil.example/smartstore.naver.com/shop','javascript:alert(1)'])assert.equal(isSmartstoreUrl(value),false);
  assert.equal(targetHost('https://user:secret@smartstore.naver.com/shop'),undefined);
});
test('public metadata is observed without synthetic SEO scores or absent-field failures',()=>{
  const result=SmartstoreReportSchema.parse(inspectSmartstoreHtml(base,html));
  assert.equal(result.status,'observed');assert.equal(result.observations.length,3);
  assert.ok(result.observations.some(x=>x.id==='description'));
  assert.ok(!JSON.stringify(result).includes('score'));assert.ok(!JSON.stringify(result).includes('diagnosis'));
});
test('platform shell, access challenge and other stores are never treated as store content',()=>{
  for(const value of ['<title>스마트스토어</title>','<title>접근이 제한되었습니다</title><meta name="description" content="보안 확인">',html.replace('<head>','<head><link rel="canonical" href="https://smartstore.naver.com/another">'),'<title>정상 제목</title><body><div id="captcha">보안 확인</div></body>'])assert.equal(inspectSmartstoreHtml(base,value).observations.length,0);
});
test('public Product data is scoped to the product URL, not the whole shop',()=>{
  const content=html+'<script type="application/ld+json">{"@type":"Product","name":"테스트 상품","description":"실제 상품 설명"}</script>';
  assert.ok(!inspectSmartstoreHtml(base,content).observations.some(x=>x.id==='productName'));
  assert.ok(inspectSmartstoreHtml({...base,productId:'123',url:base.url+'/products/123'},content).observations.some(x=>x.id==='productName'&&x.value==='테스트 상품'));
});
for(const robots of ['User-agent: *\nDisallow: /','User-agent: JinjjaScanner\nDisallow: /wodkq\nUser-agent: *\nAllow: /'])test('robots exclusion prevents the content request: '+robots.split('\n')[0],async t=>{
  const calls:string[]=[];t.mock.method(websiteHttp,'fetch',async(input:string)=>{calls.push(input);return new Response(robots,{headers:{'content-type':'text/plain'}});});
  const result=await analyzeSmartstore(base.url);assert.equal(result.status,'limited');assert.equal(result.observations.length,0);assert.deepEqual(calls,['https://smartstore.naver.com/robots.txt']);
});
for(const status of [403,429,503])test(`unavailable robots (${status}) never becomes permission to collect`,async t=>{
  let count=0;t.mock.method(websiteHttp,'fetch',async()=>{count++;return new Response('',{status});});
  assert.equal((await analyzeSmartstore(base.url)).status,'limited');assert.equal(count,1);
});
test('allowed page is requested exactly once with full product path and transparent UA',async t=>{
  const calls:string[]=[];t.mock.method(websiteHttp,'fetch',async(input:string,init:RequestInit)=>{calls.push(input);assert.match(new Headers(init.headers).get('user-agent')! ,/^JinjjaScanner/);return input.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(html,{headers:{'content-type':'text/html'}});});
  const result=await analyzeSmartstore(base.url+'/products/123?NaPm=secret');assert.equal(result.status,'observed');assert.equal(calls[1],base.url+'/products/123');assert.equal(calls.length,2);
});
for(const status of [403,404,429,503])test(`HTTP ${status} remains a bounded limited result without fallback requests`,async t=>{
  let count=0;t.mock.method(websiteHttp,'fetch',async(input:string)=>{count++;return input.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('',{status});});
  const result=await analyzeSmartstore(base.url);assert.equal(result.status,'limited');assert.equal(result.httpStatus,status);assert.equal(count,2);
});
test('redirects to login, another tenant or private IP are never followed',async t=>{
  for(const location of ['https://nid.naver.com/login','https://smartstore.naver.com/other','http://127.0.0.1/private']){
    let count=0;const mock=t.mock.method(websiteHttp,'fetch',async(input:string)=>{count++;return input.endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(null,{status:302,headers:{location}});});
    const result=await analyzeSmartstore(base.url);assert.equal(result.observations.length,0);assert.equal(count,2);mock.mock.restore();
  }
});
test('limited UI explains exclusions, keeps store ID and does not render general report charts',()=>{
  const output=renderToStaticMarkup(React.createElement(SmartstoreReportView,{report:{...base,reason:'수집 제한'}}));
  for(const label of ['wodkq','네이버가 운영하는 별도 플랫폼','0점이나 개선 필요로 표시하지 않습니다','진단 한도에서 차감하지 않습니다'])assert.ok(output.includes(label),label);
  assert.ok(!output.includes('recharts'));assert.ok(!output.includes('PDF'));
  const escaped=renderToStaticMarkup(React.createElement(SmartstoreReportView,{report:inspectSmartstoreHtml(base,html.replace('우리가게 공식 스토어','&lt;script&gt;alert(1)&lt;/script&gt;'))}));assert.ok(!escaped.includes('<script>'));
});
test('admin lists distinct stores and limited outcomes without counting them as pending',()=>{
  const metrics=renderToStaticMarkup(React.createElement(ActivityMetrics,{stats:{analyze_started:2,analyze_limited:2}}));assert.ok(metrics.includes('결과 미확인 0'));assert.ok(metrics.includes('제한 분석 2'));
  const output=renderToStaticMarkup(React.createElement(ActivityHistory,{activity:{sites:[{target:'smartstore.naver.com/wodkq',counts:{analyze_limited:1}},{target:'smartstore.naver.com/other',counts:{}}],events:[],daily:[],ips:[],retentionDays:30,truncated:false}}));assert.ok(output.includes('smartstore.naver.com/wodkq'));assert.ok(output.includes('smartstore.naver.com/other'));assert.ok(output.includes('복원할 수 없으며'));
});

function fakeRedis(t:TestContext) {
  const names=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','VERCEL','LOGIN_FREE_IP_HASHES','OPENAI_API_KEY'] as const;
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  t.after(()=>{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}});
  process.env.UPSTASH_REDIS_REST_URL='https://redis-test.example';process.env.UPSTASH_REDIS_REST_TOKEN='test-only';
  const calls:{script:string;args:unknown[]}[]=[];
  t.mock.method(globalThis,'fetch',async(_input:unknown,init:RequestInit)=>{
    const body=JSON.parse(String(init.body));
    const pipeline=Array.isArray(body[0]);
    const results=(pipeline?body:[body]).map((command:unknown[])=>{assert.equal(String(command[0]).toLowerCase(),'eval');calls.push({script:String(command[1]),args:command.slice(3+Number(command[2]))});return {result:1};});
    return new Response(JSON.stringify(pipeline?results:results[0]),{headers:{'content-type':'application/json'}});
  });
  return calls;
}
test('no-content quota refund records one limited event, distinct from failures and duplicate finishes',async t=>{
  const calls=fakeRedis(t);
  const account:Account={id:'00000000-0000-4000-8000-000000000001',role:'customer',status:'approved',passwordHash:null,email:'test@example.com',name:'Test',company:'',version:1,createdAt:Date.now(),expiresAt:Date.now()+86400000,monthlyLimit:10,features:DEFAULT_FEATURES};
  const finish=await reserve({kind:'account',account},'analyze',{headers:new Headers(),url:base.url+'?token=never-log'});
  await finish(true,true);await finish(true,true);
  assert.equal(calls.filter(c=>c.args[1]==='refund').length,1);
  const events=calls.filter(c=>typeof c.args[1]==='string'&&String(c.args[1]).includes('"action"')).map(c=>JSON.parse(String(c.args[1])));
  assert.deepEqual(events.map(e=>e.action),['analyze_started','analyze_limited']);assert.ok(events.every(e=>e.target==='smartstore.naver.com/wodkq'));
});
test('API selects limited mode without OpenAI, validates store paths and preserves authorization',async t=>{
  const calls=fakeRedis(t);process.env.VERCEL='1';process.env.LOGIN_FREE_IP_HASHES=digest('203.0.113.10');delete process.env.OPENAI_API_KEY;
  t.mock.method(websiteHttp,'fetch',async()=>new Response('User-agent: *\nDisallow: /'));
  const request=(url:string,ip='203.0.113.10')=>new NextRequest('https://scanner.example/api/analyze',{method:'POST',headers:{origin:'https://scanner.example','content-type':'application/json','x-vercel-forwarded-for':ip},body:JSON.stringify({url})});
  const response=await POST(request(base.url));assert.equal(response.status,200);assert.equal((await response.json()).kind,'smartstore');assert.match(response.headers.get('cache-control')!,/no-store/);
  assert.ok(calls.some(c=>String(c.args[1]).includes('analyze_limited')));
  assert.equal((await POST(request('https://smartstore.naver.com'))).status,400);
  assert.equal((await POST(request(base.url,'203.0.113.11'))).status,401);
  assert.equal((await POST(request('https://example.com'))).status,500,'normal sites retain their existing OpenAI pipeline');
});
