/** Actual API/auth/quota/storage flow with isolated Redis and synthetic providers. */
import assert from 'node:assert/strict';
import {before,after,beforeEach,test} from 'node:test';
import {NextRequest} from 'next/server';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {POST} from '../app/api/analyze/route';
import {websiteHttp} from '../lib/security/safeFetch';
import {digest} from '../lib/security/request';
import {saveSharedReport,getSharedReport} from '../lib/shareStore';
import {MarketingReportSchema} from '../lib/reportSchema';
import {reportForPresentation} from '../lib/reportPresentation';
import {startRedisBridge} from './helpers/redisBridge';
import {fixture} from './fixtures/report';
import {generalEvidenceCases,generalPageResponse} from './fixtures/general-evidence';
import {noncommerceCases,noncommerceResponse} from './fixtures/noncommerce';

const office='203.0.113.64',principal={kind:'internal'} as const;
const envNames=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','VERCEL','VERCEL_ENV','LOGIN_FREE_IP_HASHES','OPENAI_API_KEY','OPENAI_BASE_URL','ENABLE_LLM_CITATION','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const;
const previous=Object.fromEntries(envNames.map(k=>[k,process.env[k]]));
let bridge:Awaited<ReturnType<typeof startRedisBridge>>;
before(async()=>{
  bridge=await startRedisBridge();
  Object.assign(process.env,{UPSTASH_REDIS_REST_URL:bridge.url,UPSTASH_REDIS_REST_TOKEN:'local-test-token',VERCEL:'1',VERCEL_ENV:'preview',LOGIN_FREE_IP_HASHES:digest(office),OPENAI_API_KEY:'synthetic-provider-only',ENABLE_LLM_CITATION:'false'});
  delete process.env.OPENAI_BASE_URL;delete process.env.NAVER_CLIENT_ID;delete process.env.NAVER_CLIENT_SECRET;
});
beforeEach(async()=>{await bridge.command(['FLUSHDB']);});
after(async()=>{await bridge?.close();for(const name of envNames){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}});

const cases=process.env.EVIDENCE_CASE_FAMILY==='noncommerce'?noncommerceCases:process.env.EVIDENCE_CASE_FAMILY==='general'?generalEvidenceCases:[...generalEvidenceCases,...noncommerceCases];
for(const site of cases)test(`general API returns and stores shared evidence for ${'kind' in site?'purpose:':''}${site.id}`,async t=>{
  const nativeFetch=globalThis.fetch;
  t.mock.method(console,'log',()=>{});t.mock.method(console,'warn',()=>{});
  const fetched:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{fetched.push(String(input));return 'kind' in site?noncommerceResponse(input):generalPageResponse(input);});
  t.mock.method(globalThis,'fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);
    if(url.origin===new URL(bridge.url).origin)return nativeFetch(input,init);
    assert.equal(url.hostname,'api.openai.com','all external provider calls are intercepted');
    assert.equal(url.pathname,'/v1/chat/completions');
    const body=JSON.parse(String(init?.body));
    const value=body.messages[0].content.includes('업종 분류 도우미')?{category:'etc'}:fixture;
    return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(value)},finish_reason:'stop'}]});
  });
  const request=new NextRequest('https://scanner.example/api/analyze',{method:'POST',headers:{origin:'https://scanner.example','content-type':'application/json','x-vercel-forwarded-for':office},body:JSON.stringify({url:site.url})});
  const response=await POST(request),body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const report=MarketingReportSchema.parse(body);
  assert.equal(report.url,site.url);
  assert.equal(report.evidenceReview?.sourceUrl,'finalUrl' in site?site.finalUrl:new URL(site.url).href);
  assert.ok(report.diagnosisMethod?.includes('general-evidence'));
  assert.equal(report.evidenceReview?.axes.filter(a=>a.status==='unmeasured').length,4);
  assert.ok(report.checklist?.every(c=>c.sourceUrl===report.evidenceReview?.sourceUrl));
  if('kind' in site){
    assert.equal(report.sitePurpose?.kind,site.kind);assert.equal(report.sitePurpose?.goal.key,site.goal);
    if(!['mixed','unknown'].includes(site.kind))assert.ok(fetched.every(u=>new URL(u).pathname==='/robots.txt'||new URL(u).pathname===new URL(site.url).pathname),'clear non-commerce pages do not trigger product recovery crawls');
    if(site.kind==='content'||site.kind==='public_service')assert.equal(report.checklist?.find(c=>c.id==='price_info')?.status,'not_applicable');
  }
  const id=await saveSharedReport(report,principal);assert.ok(id);
  const stored=await getSharedReport(id!,principal);assert.ok(stored);
  assert.deepEqual(stored!.evidenceReview,report.evidenceReview);
  assert.deepEqual(stored!.sitePurpose,report.sitePurpose);
  assert.deepEqual(reportForPresentation(stored!).keywordFrequency,report.keywordFrequency);
  if(site.id==='long-html')assert.equal(stored!.pageEvidence?.metadataTruncated?.title,true);
  if(process.env.GENERAL_EVIDENCE_QA_DIR){
    await mkdir(process.env.GENERAL_EVIDENCE_QA_DIR,{recursive:true});
    await writeFile(join(process.env.GENERAL_EVIDENCE_QA_DIR,site.id+'.json'),JSON.stringify(report));
  }
});
