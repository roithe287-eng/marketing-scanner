import {beforeEach as transportSetup} from 'node:test';
import {websiteHttp} from '../lib/security/safeFetch';
transportSetup(t=>{t.mock.method(websiteHttp,'fetch',(input:string|URL,init?:RequestInit)=>globalThis.fetch(input,init));});
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {extractWebsite} from '../lib/extractWebsite';
import {capturePageEvidence} from '../lib/pageEvidence';
import {googleDirectives} from '../lib/growthEvidence';
import {buildGrowthPlan,growthBrief} from '../lib/growthPlan';
import {calculateGrowthKpi,EMPTY_KPI,DEMO_KPI} from '../lib/growthKpi';
import {MarketingReportSchema,type PageEvidence} from '../lib/reportSchema';
import {evaluateRobots} from '../lib/robotsRules';
import {observeRobots} from '../lib/observeRobots';
import {buildGrowthDocument} from '../lib/growthDocument';
import GrowthPlanPanel from '../components/report/GrowthPlanPanel';
import GrowthKpiPanel from '../components/report/GrowthKpiPanel';

const evidence:PageEvidence={version:1,requestedUrl:fixture.url,finalUrl:fixture.url+'/service',capturedAt:'2026-10-03T08:00:00.000Z',title:'확인한 제목',description:'확인한 설명',h1:['대표 제목','두 번째 제목'],h2:['진행 과정'],ctaButtons:['문의'],bodyText:'실제 서비스 안내',bodyTruncated:false,searchSignals:{version:1,httpStatus:200,titleCount:1,descriptionCount:1,canonicals:[],googleDirectives:[],crawlers:[{agent:'Googlebot',allowed:false,detail:'Disallow: /service'},{agent:'Yeti',allowed:true,detail:'Allow: /'},{agent:'OAI-SearchBot',allowed:null,detail:'미확인'}],schemaTypes:['FAQPage'],jsonLdErrors:0,internalLinkCount:0,isJsHeavy:false,bodyTextLength:100}};
const report={...fixture,pageEvidence:evidence};
test('new technical evidence survives schema/share roundtrip without requiring it on old reports',()=>{
  assert.deepEqual(MarketingReportSchema.parse(JSON.parse(JSON.stringify(report))).pageEvidence,evidence);
  assert.equal(MarketingReportSchema.parse(fixture).pageEvidence,undefined);
  assert.ok(buildGrowthPlan(fixture).tasks.every(t=>t.status==='manual'));
});
test('URL mismatch and unsafe evidence never become technical findings for another site',()=>{
  for(const p of [{...evidence,requestedUrl:'https://different.example'}, {...evidence,finalUrl:'javascript:alert(1)'}]) {
    const plan=buildGrowthPlan({...fixture,pageEvidence:p});
    assert.equal(plan.hasTechnicalEvidence,false);assert.ok(plan.tasks.every(t=>t.status==='manual'));
  }
  assert.equal(buildGrowthPlan({...fixture,url:'javascript:alert(1)'}).url,null);
});
test('agent-specific noindex and parameterized directives are interpreted without leaking scope',()=>{
  assert.deepEqual(googleDirectives([{agent:'Yeti',content:'noindex'},{agent:'Googlebot',content:'MAX-SNIPPET: 0'}],'yeti: noindex, nofollow'),['max-snippet:0']);
  assert.deepEqual(googleDirectives([],'noindex, googlebot: max-snippet: 0, nofollow, yeti: nosnippet'),['noindex','max-snippet:0','nofollow']);
  assert.deepEqual(googleDirectives([],'yeti: nofollow, max-snippet: 0, noindex'),[]);
  assert.deepEqual(googleDirectives([],'max-snippet: -1, noindex'),['max-snippet:-1','noindex']);
});
test('Google, Naver and OpenAI path findings remain independent; unsupported encoded paths are unknown',()=>{
  const robots='User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /service\nUser-agent: OAI-SearchBot\nAllow: /service\nUser-agent: GPTBot\nDisallow: /';
  assert.equal(evaluateRobots(robots,'Googlebot','/service').allowed,false);
  assert.equal(evaluateRobots(robots,'Yeti','/service').allowed,true);
  assert.equal(evaluateRobots(robots,'OAI-SearchBot','/service').allowed,true);
  assert.equal(evaluateRobots(robots,'Googlebot','/%EC%98%88').allowed,null);
  const plan=buildGrowthPlan(report);
  assert.equal(plan.tasks.find(t=>t.id==='google-crawl')?.status,'action');
  assert.equal(plan.tasks.find(t=>t.id==='naver-crawl')?.status,'observed');
  assert.equal(plan.tasks.find(t=>t.id==='openai-crawl')?.status,'manual');
});
test('snippet exclusion is actionable but H1 counts and FAQ markup alone never imply failure',()=>{
  const plan=buildGrowthPlan({...report,pageEvidence:{...evidence,searchSignals:{...evidence.searchSignals!,googleDirectives:['max-snippet:0 nofollow']}}});
  assert.equal(plan.tasks.find(t=>t.id==='google-snippet')?.status,'action');
  assert.equal(plan.tasks.find(t=>t.id==='title-heading')?.status,'manual');
  assert.equal(plan.tasks.find(t=>t.id==='structured-data')?.status,'manual');
  assert.match(plan.tasks.find(t=>t.id==='structured-data')!.steps.join(' '),/기존 제안은 제외/);
});
test('extraction captures Googlebot meta and reuses existing fetch for stored signals',async t=>{
  const calls:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{const url=String(input);calls.push(url);return url.endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /service'):new Response('<html><head><title>서비스</title><meta name="googlebot" content="nosnippet"></head><body><h1>서비스 안내</h1><p>고객을 위한 실제 서비스 안내입니다. 문의 절차와 제공 범위, 일정 및 비용의 확인 방법을 상세히 설명하는 테스트 페이지입니다.</p></body></html>',{headers:{'content-type':'text/html','x-robots-tag':'yeti: noindex'}});});
  const data=await extractWebsite('https://fixture.example/service'),count=calls.length,p=capturePageEvidence(data);
  assert.ok(p.searchSignals?.googleDirectives.includes('nosnippet'));assert.ok(!p.searchSignals?.googleDirectives.includes('noindex'));
  assert.equal(p.searchSignals?.crawlers.find(c=>c.agent==='Googlebot')?.allowed,false);assert.equal(calls.length,count);
});
test('HTTP 429 robots responses are not declared missing or crawlable',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('rate limited',{status:429}));
  assert.equal((await observeRobots('https://fixture.example','scanner')).status,'http_error');
});
test('KPI blank and zero denominators stay unmeasured rather than invented growth',()=>{
  const blank=calculateGrowthKpi(EMPTY_KPI);assert.equal(blank.clicks,null);assert.equal(blank.converted,null);assert.equal(blank.ctr,null);
  const zero=calculateGrowthKpi({...EMPTY_KPI,impressions:'0',clicks:'0',sessions:'0',converted:'0',targetImpressions:'0',targetCtr:'0'});
  assert.equal(zero.ctr,null);assert.equal(zero.cvr,null);assert.equal(zero.clicks,0);assert.equal(zero.clickDelta,0);assert.equal(zero.converted,null);
});
test('KPI target math separates clicks and sessions; percentages are absolute rates',()=>{
  const r=calculateGrowthKpi(DEMO_KPI);
  assert.equal(r.ctr,3);assert.equal(r.cvr,2.5);assert.equal(r.clicks,480);assert.equal(r.converted,10.8);assert.equal(r.clickDelta,180);
  assert.equal(calculateGrowthKpi({...DEMO_KPI,targetSessions:''}).converted,null);
  assert.equal(calculateGrowthKpi({...DEMO_KPI,targetCtr:'0'}).clicks,0);
  assert.equal(calculateGrowthKpi({...DEMO_KPI,targetCtr:'1'}).clickDelta,-180);
});
test('KPI rejects impossible counts, unbounded rates and nonfinite inputs',()=>{
  for(const delta of [{clicks:'10001'},{converted:'241'},{targetCtr:'101'},{targetCvr:'-1'},{impressions:'NaN'},{targetSessions:'1.5'},{targetImpressions:'1e309'}]) {
    const r=calculateGrowthKpi({...DEMO_KPI,...delta});assert.ok(Object.keys(r.errors).length);assert.equal(r.clicks,null);assert.equal(r.converted,null);
  }
});
test('all tasks carry executable steps, actual source URL, change, KPI and full PDF content',()=>{
  const plan=buildGrowthPlan(report),doc=buildGrowthDocument(report).map(b=>b.text).join('\n');
  assert.equal(plan.tasks.length,14);
  for(const task of plan.tasks){assert.ok(task.steps.length>=3);assert.ok(task.change&&task.kpi&&task.verify);const brief=growthBrief(report,task);assert.ok(brief.includes(evidence.finalUrl));assert.ok(brief.includes('https://'));assert.ok(doc.includes(task.toBe));assert.ok(doc.includes(task.steps.at(-1)!));}
  assert.match(doc,/공유 보고서·PDF에 저장하지 않습니다/);
});
test('report panels show unknown evidence and empty KPI instead of fake site performance',()=>{
  const plan=renderToStaticMarkup(React.createElement(GrowthPlanPanel,{report:fixture})),kpi=renderToStaticMarkup(React.createElement(GrowthKpiPanel,{targetUrl:fixture.url}));
  assert.match(plan,/새 기술 관측값이 없습니다/);assert.match(plan,/14개 실행 가이드/);
  assert.match(kpi,/계정 미연동/);assert.match(kpi,/직접 입력/);assert.ok(!kpi.includes('value="10000"'));assert.match(kpi,/1:1로 가정하지 않습니다/);
});
