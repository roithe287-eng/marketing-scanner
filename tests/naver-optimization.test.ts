import {beforeEach as transportSetup} from 'node:test';
import {websiteHttp} from '../lib/security/safeFetch';
transportSetup(t=>{(t as TestContext).mock.method(websiteHttp,'fetch',(input:string|URL,init?:RequestInit)=>globalThis.fetch(input,init));});
import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite,type ExtractedWebsiteData} from '../lib/extractWebsite';
import {analyzeNaverOptimization,naverDirectives} from '../lib/analyzeNaverOptimization';
import {evaluateRobots} from '../lib/robotsRules';
import {observeRobots} from '../lib/observeRobots';
import {MarketingReportSchema} from '../lib/reportSchema';
import {naverCounts,naverExecutionBrief} from '../lib/naverKnowledge';
import {aggregateKeywordObservations,keywordObservation,matchesNaverTarget,searchNaverWeb,type NaverSearchResponse} from '../lib/analyzeKeywordRank';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportInsights} from '../lib/reportInsights';
import NaverOptimizationPanel from '../components/report/NaverOptimizationPanel';
import KeywordRankCard from '../components/KeywordRankCard';
import {fixture} from './fixtures/report';
const html=(head='',body='')=>`<!doctype html><html lang="ko"><head><title>ACME</title><meta name="description" content="정확한 서비스 설명입니다.">${head}</head><body><h1>서비스 안내</h1><p>이 페이지는 실제로 제공하는 서비스 범위와 이용 조건을 안내합니다. 사용자가 서비스와 적용 조건을 충분히 이해할 수 있도록 설명합니다.</p>${body}</body></html>`;
async function extract(t:TestContext,head='',body='',headers:Record<string,string>={}) {
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(html(head,body),{headers:{'content-type':'text/html',...headers}}));
  return extractWebsite('https://fixture.example/product');
}
const check=(d:ExtractedWebsiteData,id:string)=>analyzeNaverOptimization(d).checks.find(c=>c.id===id)!;

test('Yeti specifics override wildcard; Ads-Naver ignores wildcard and honors explicit matching path',()=>{
  const text='User-agent: *\nDisallow: /\n\nUser-agent: Yeti\nAllow: /\nDisallow: /private\nAllow: /private/public\n\nUser-agent: Ads-Naver\nDisallow: /old/*\nAllow: /old/public$';
  assert.equal(evaluateRobots(text,'Yeti','/product').allowed,true);
  assert.equal(evaluateRobots(text,'Yeti','/private').allowed,false);
  assert.equal(evaluateRobots(text,'Yeti','/private/public').allowed,true);
  assert.equal(evaluateRobots('User-agent: *\nDisallow: /','Ads-Naver','/').allowed,true);
  assert.equal(evaluateRobots(text,'Ads-Naver','/old/x').allowed,false);
  assert.equal(evaluateRobots(text,'Ads-Naver','/old/public').allowed,true);
  assert.equal(evaluateRobots(text,'Ads-Naver','/old/public/x').allowed,false);
  assert.equal(evaluateRobots('User-agent: Yeti\nDisallow: /Case','Yeti','/case').allowed,true);
  assert.equal(evaluateRobots('User-agent: Yeti\nDisallow: /%EB%8B%A4','Yeti','/').allowed,null);
});
test('robots network failure, server failure, HTML response and 404 remain distinguishable',async(t)=>{
  const mock=t.mock.method(globalThis,'fetch',async()=>new Response('missing',{status:404}));
  assert.equal((await observeRobots('https://fixture.example/path','Scanner')).status,'missing');
  mock.mock.mockImplementation(async()=>new Response('down',{status:503}));
  assert.equal((await observeRobots('https://fixture.example','Scanner')).status,'http_error');
  mock.mock.mockImplementation(async()=>new Response('<html>fallback</html>',{headers:{'content-type':'text/html'}}));
  assert.equal((await observeRobots('https://fixture.example','Scanner')).status,'non_text');
  mock.mock.mockImplementation(async()=>{throw new Error('network');});
  assert.equal((await observeRobots('https://fixture.example','Scanner')).status,'unavailable');
});
test('meta/header directives are agent-scoped and nosourceinfo is not noindex',()=>{
  assert.equal(naverDirectives([],'googlebot: noindex, nofollow').has('noindex'),false);
  assert.equal(naverDirectives([],'noindex, googlebot: nofollow').has('noindex'),true);
  assert.equal(naverDirectives([],'yeti: noindex, nofollow').has('noindex'),true);
  assert.equal(naverDirectives([],'max-snippet: -1, noindex').has('noindex'),true);
  assert.equal(naverDirectives([],'googlebot: nofollow, max-snippet: -1, noindex').has('noindex'),false);
  assert.equal(naverDirectives([{agent:'robots',content:'nosourceinfo'}],'').has('noindex'),false);
});
test('extraction retains headers, duplicate metadata, JSON-LD failures and nested entity boundaries',async(t)=>{
  const d=await extract(t,'<title>重複</title><meta name="ROBOTS" content="noindex"><link rel="canonical" href="/wrong"><script type="application/ld+json">{"@graph":[{"@type":"Product","name":"A"},{"@type":"Product","description":"B"}],"subjectOf":{"@type":"Article","name":"C"}}</script><script type="application/ld+json">{invalid}</script>','<div itemscope itemtype="https://schema.org/Product">상품</div>',{'x-robots-tag':'nosourceinfo'});
  assert.equal(d.seoEvidence?.titleCount,2);assert.equal(d.seoEvidence?.jsonLdErrors,1);
  assert.ok(d.schemaTypes.includes('Article'));assert.equal(d.seoEvidence?.microdataCount,1);
  assert.equal(check(d,'search-index').status,'action');assert.equal(check(d,'search-sourceinfo').status,'manual');
  assert.equal(check(d,'search-canonical').status,'action');assert.equal(check(d,'search-schema').status,'action');
  assert.match(check(d,'ads-schema').evidence,/같은 Product 안에 name\+description 0개/);
  assert.equal(check(d,'ads-schema').status,'action');
});
test('short English titles, empty alt and absent ownership tags are never blanket failures',async(t)=>{
  const d=await extract(t,'','<img src="/art" alt=""><img src="/product" alt="상품"><p>wcs.js 라는 문자를 본문에서 설명합니다.</p>');
  assert.equal(d.imageWithoutAlt,0);assert.equal(d.seoEvidence?.imagesEmptyAlt,1);
  assert.equal(check(d,'search-title').status,'observed');assert.equal(check(d,'search-alt').status,'manual');
  assert.equal(check(d,'search-ownership').status,'manual');assert.equal(check(d,'ads-name').status,'manual');
  assert.equal(d.hasNaverConversionScript,false);assert.equal(check(d,'ads-conversion').status,'manual');
  assert.equal(check(d,'search-schema').status,'manual');assert.equal(check(d,'search-sitemap').status,'manual');
});
test('tracking script signal still requires actual event reception; generic map is not Place ownership',async(t)=>{
  const d=await extract(t,'<script src="https://wcs.naver.net/wcslog.js"></script>','<a href="https://place.naver.com.evil.example/restaurant/123">지도</a><a href="https://map.naver.com">일반지도</a><img src="/missing">');
  assert.equal(d.hasNaverConversionScript,true);assert.equal(check(d,'ads-conversion').status,'manual');
  assert.equal(d.hasNaverPlaceLink,false);assert.equal(d.imageWithoutAlt,1);assert.equal(check(d,'search-alt').status,'action');
});
test('redirected host uses its own robots and final URL as metadata base',async(t)=>{
  const requests:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{
    const url=String(input);requests.push(url);
    if(url==='https://start.example/robots.txt')return new Response('User-agent: *\nAllow: /');
    if(url==='https://final.example/robots.txt')return new Response('User-agent: Yeti\nDisallow: /product');
    if(url==='https://start.example/product')return new Response(null,{status:301,headers:{location:'https://final.example/product'}});
    return new Response(html('<meta property="og:image" content="/image.jpg">'),{headers:{'content-type':'text/html'}});
  });
  const d=await extractWebsite('https://start.example/product');
  assert.equal(d.finalUrl,'https://final.example/product');assert.equal(d.ogImage,'https://final.example/image.jpg');
  assert.equal(d.seoEvidence?.robots.url,'https://final.example/robots.txt');assert.equal(check(d,'search-robots').status,'action');
  assert.equal(requests.filter(url=>url==='https://final.example/robots.txt').length,1);
});
test('unknown evidence has no readiness score and survives report schema round trip',async(t)=>{
  const d=await extract(t);const result=analyzeNaverOptimization(d);
  assert.equal('overallScore' in result,false);assert.equal(result.checks.length,29);
  assert.ok(result.checks.filter(c=>c.status==='manual').length>0);
  const saved=MarketingReportSchema.parse({...fixture,naverOptimization:result}).naverOptimization!;
  assert.deepEqual(saved,result);assert.equal(Object.values(naverCounts(saved.checks)).reduce((a,b)=>a+b,0),29);
  for(const c of saved.checks)assert.ok(c.sourceIds.every(id=>saved.sources.some(s=>s.id===id)),c.id);
  const brief=naverExecutionBrief(saved,saved.checks[0]);assert.match(brief,/https:\/\/fixture.example\/product/);assert.match(brief,/완료 확인/);assert.match(brief,/https:\/\/searchadvisor.naver.com/);
});
const response:NaverSearchResponse={status:'ok',items:[{title:'상품',link:'https://example.com/p',description:'내용'}],total:200,start:1,requestedCount:15,observedAt:'2026-10-03T00:00:00Z'};
test('API total, returned count, not-found and error are separate; all errors never become hidden',()=>{
  const found=keywordObservation('상품','https://example.com',response);
  const missing=keywordObservation('다른 상품','https://other.example',response);
  const error=keywordObservation('오류','https://example.com',{status:'error',message:'HTTP 429',requestedCount:15,observedAt:response.observedAt});
  assert.equal(found.totalResults,200);assert.equal(found.returnedCount,1);assert.equal(found.naverWebRank,1);
  assert.equal(missing.observationStatus,'not_found');assert.equal(error.observationStatus,'error');
  const aggregate=aggregateKeywordObservations([found,missing,error]);assert.equal(aggregate.validCount,2);assert.equal(aggregate.hiddenCount,1);assert.equal(aggregate.failedCount,1);
  assert.equal(aggregateKeywordObservations([error]).hiddenCount,0);
});
test('target matching never merges parent domains, unrelated stores or blog tenants',()=>{
  assert.equal(matchesNaverTarget('https://www.example.com/a','https://example.com'),true);
  assert.equal(matchesNaverTarget('https://example.com','https://shop.example.com'),false);
  assert.equal(matchesNaverTarget('https://shop.example.com','https://example.com'),false);
  assert.equal(matchesNaverTarget('https://smartstore.naver.com/b/item','https://smartstore.naver.com/a'),false);
  assert.equal(matchesNaverTarget('https://smartstore.naver.com/a/item','https://smartstore.naver.com/a'),true);
  assert.equal(matchesNaverTarget('https://blog.naver.com/PostView.naver?blogId=another','https://blog.naver.com/own'),false);
  assert.equal(matchesNaverTarget('https://blog.naver.com/PostView.naver?blogId=own','https://blog.naver.com/own'),true);
  assert.equal(matchesNaverTarget('https://example.com.evil.test','https://example.com'),false);
});
test('API HTTP error and malformed payload are not successful empty results',async(t)=>{
  const beforeId=process.env.NAVER_CLIENT_ID,beforeSecret=process.env.NAVER_CLIENT_SECRET;
  process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  const mock=t.mock.method(globalThis,'fetch',async()=>new Response('quota',{status:429}));
  try {
    const r=await searchNaverWeb('서비스');assert.equal(r.status,'error');
    mock.mock.mockImplementation(async()=>Response.json({total:5,items:[]}));assert.equal((await searchNaverWeb('서비스')).status,'error');
    mock.mock.mockImplementation(async()=>Response.json({total:200,start:1,items:[]}));assert.equal((await searchNaverWeb('서비스')).status,'ok');
    delete process.env.NAVER_CLIENT_ID;assert.equal((await searchNaverWeb('서비스')).status,'unavailable');
  } finally {if(beforeId===undefined)delete process.env.NAVER_CLIENT_ID;else process.env.NAVER_CLIENT_ID=beforeId;if(beforeSecret===undefined)delete process.env.NAVER_CLIENT_SECRET;else process.env.NAVER_CLIENT_SECRET=beforeSecret;}
});
test('legacy grades and misleading API conclusions are suppressed in UI, tasks and full PDF',()=>{
  const stale={overallScore:20,grade:'F' as const,summary:'OLD_UNSUPPORTED_SCORE',checks:[{id:'x',label:'OLD_UNSUPPORTED_TASK',group:'technical' as const,status:'fail' as const,currentValue:'오류',diagnosis:'오류',guide:'OLD_UNSUPPORTED_TASK'}],priorityActions:['OLD_UNSUPPORTED_TASK']};
  const report={...fixture,naverBriefingReadiness:stale,keywordRankTracking:{totalKeywords:1,averageRank:null,visibleCount:0,topFiveCount:0,hiddenCount:1,summary:'OLD_FALSE_UNEXPOSED',keywords:[{keyword:'서비스',naverWebRank:null,status:'none' as const}]}};
  const text=buildReportDocument(report).map(b=>b.text).join('\n');
  assert.doesNotMatch(text,/OLD_UNSUPPORTED|OLD_FALSE/);assert.match(text,/구버전 오류 구분 없음/);
  assert.ok(!buildReportInsights(report).tasks.some(t=>t.title==='OLD_UNSUPPORTED_TASK'));
  const markup=renderToStaticMarkup(React.createElement(NaverOptimizationPanel,{targetUrl:report.url}));
  assert.match(markup,/현재 진단 결과가 아닙니다/);assert.match(markup,/공식 문서 19개/);assert.match(markup,/작업 지시서 보기/);assert.match(markup,/readonly=""/i);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(KeywordRankCard,{tracking:report.keywordRankTracking})),/15위 밖|미노출<|OLD_FALSE/);
});
test('new report PDF contains URL-specific steps, completion and clickable official sources',async(t)=>{
  const d=await extract(t,'<meta name="robots" content="noindex">');
  const naverOptimization=analyzeNaverOptimization(d);
  const blocks=buildReportDocument({...fixture,naverOptimization});
  assert.ok(blocks.some(b=>b.text.includes('완료 확인: 공개 의도')));
  assert.ok(blocks.some(b=>b.href==='https://searchadvisor.naver.com/guide/markup-structure'));
  assert.ok(buildReportInsights({...fixture,naverOptimization}).tasks.some(t=>t.id==='naver-search-index'&&t.status==='fail'));
  const guide=analyzeNaverOptimization(null,'https://example.com');assert.ok(guide.checks.every(c=>c.status==='manual'));assert.equal(guide.observedAt,undefined);
});
