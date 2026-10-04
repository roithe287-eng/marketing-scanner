import {beforeEach as transportSetup,type TestContext} from 'node:test';
import {websiteHttp} from '../lib/security/safeFetch';
transportSetup(t=>{(t as TestContext).mock.method(websiteHttp,'fetch',(input:string|URL,init?:RequestInit)=>globalThis.fetch(input,init));});
import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {scorePosition,positionGroups,buildCompetitorPositioning,positioningBrief,positionCoordinates,positionDiameter} from '../lib/competitorPositioning';
import {keywordCandidates,keywordEvidence} from '../lib/competitorResearch';
import {selectSearchCandidates,finalizeSearchCandidates} from '../lib/competitorSelection';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {buildCompetitorVisualPage} from '../lib/competitorVisualPdf';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import CompetitorLandscape from '../components/report/CompetitorLandscape';
import {fixture} from './fixtures/report';
const input={id:'own',name:'자사',url:fixture.url,own:true,title:'메타 광고 대행',description:'기업 대상 광고 상담과 운영 사례 · 비용은 견적 후 안내'};
const competitor={rank:1,searchRank:3,title:'검색 결과 제목',description:'검색 요약',domain:'agency.test',link:'https://agency.test',metaTitle:input.title,metaDescription:input.description};
const report=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:'메타 광고 대행',competitors:[competitor],ourSite:{url:fixture.url,domain:'example.com',title:input.title,metaDescription:input.description,h1:''}}});
test('coordinates are reproducible, independent of repeated words and never measure price or quality',()=>{
  const row=scorePosition(input,'메타 광고 대행');assert.equal(row.x,67);assert.equal(row.y,100);
  assert.equal(scorePosition({...input,description:'메타 광고 대행'},'메타 광고 대행').x,100);
  const repeated=scorePosition({...input,description:input.description.repeat(30)},'메타 광고 대행');assert.equal(repeated.x,row.x);assert.equal(repeated.y,row.y);assert.equal(repeated.signalCount,row.signalCount);
  const noPrice=scorePosition({...input,title:'원하는 광고',description:'원하는 내용을 적었습니다'},'광고');assert.equal(noPrice.checks[0].found,false);assert.equal(noPrice.y,0);
  assert.equal(scorePosition({...input,title:'메타 광고',description:'일반 안내'},'메타 광고 대행').x,33);
  assert.equal(scorePosition({...input,title:'메타 광고',description:'후기 없음, 인증 미보유, 상담 불가'},'광고').y,0);
});
test('failed or missing evidence is unplaced while complete zero-signal evidence remains real zero',()=>{
  for(const partial of [{description:''},{title:''},{fetchError:'HTTP 403'}]){const row=scorePosition({...input,...partial},'메타 광고');assert.equal(row.x,null);assert.equal(row.y,null);assert.ok(row.reason);}
  const zero=scorePosition({...input,title:'상품 소개',description:'우리의 이야기'},'광고 대행');assert.equal(zero.x,0);assert.equal(zero.y,0);
  assert.equal(scorePosition(input,'!').x,null);
});
test('identical coordinates cluster without jitter and retain every accessible site control',()=>{
  const rows=[scorePosition(input,'메타 광고'),scorePosition({...input,id:'candidate-1',own:false},'메타 광고')];
  assert.equal(positionGroups(rows).length,1);assert.equal(positionGroups(rows)[0].rows.length,2);
  const $=load(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report})));
  assert.equal($('.position-dot').length,1);assert.equal($('.position-dot').text(),'2곳');assert.equal($('.position-site-list button').length,2);
  assert.ok($('.position-dot').attr('aria-label')?.includes('같은 위치'));assert.equal($('.position-site-list button[aria-pressed=true]').length,1);
});
test('legacy unknowns and unrelated own-page evidence cannot become invented central or zero positions',()=>{
  const legacy=MarketingReportSchema.parse({...fixture,meta:{ogTitle:input.title,ogDescription:input.description},competitorAnalysis:{searchKeyword:'광고',competitors:[{...competitor,fetchError:'403'}]}});
  const model=buildCompetitorPositioning(legacy)!;assert.equal(model.own.x,null);assert.equal(model.groups.length,0);
  const other=MarketingReportSchema.parse({...report,competitorAnalysis:{...report.competitorAnalysis,ourSite:{...report.competitorAnalysis!.ourSite,url:'https://other.test'}},pageEvidence:{version:1,requestedUrl:'https://other.test',finalUrl:'https://other.test',capturedAt:'2026-10-03T09:00:00.000Z',title:input.title,description:input.description,h1:[],h2:[],ctaButtons:[],bodyText:'',bodyTruncated:false}});
  assert.equal(buildCompetitorPositioning(other)!.own.x,null);
  const html=renderToStaticMarkup(React.createElement(CompetitorLandscape,{report:legacy}));assert.match(html,/판정 보류/);assert.match(html,/이전 보고서/);assert.doesNotMatch(html,/position-dot /);
});
test('query evidence validates generated words and fallback prefers supported service to title-only brand',()=>{
  const site={title:'브랜드예시',description:'광고대행',keywords:'광고대행',h1:[]};
  assert.equal(keywordCandidates(site)[0].keyword,'광고대행');assert.equal(keywordEvidence('부산 광고대행',site).grounded,false);
  assert.equal(keywordEvidence('광고 대행',{title:'광고대행 서비스'}).grounded,true);
});
test('domain exclusions respect host boundaries and page evidence is not replaced by search-snippet claims',()=>{
  const item=(host:string)=>({title:'광고대행',description:'광고대행',link:`https://${host}`});
  const selection=selectSearchCandidates(['coupang.com','shop.coupang.com','coupang.com.example.net','agency.test','agency.test'].map(item),'example.com','광고대행',1);
  assert.equal(selection.eligibleCount,2);assert.equal(selection.budgetDeferredCount,1);assert.equal(selection.excluded.length,3);
  const selected=finalizeSearchCandidates([{...selection.candidates[0],metaTitle:'다른 서비스',metaDescription:'다른 안내'}],'광고대행',[]);
  assert.equal(selected[0].relevance,'needs_review');assert.deepEqual(selected[0].matchedTerms,[]);assert.equal(selected[0].relevanceBasis,'page_metadata');
});
test('new API snapshot preserves query provenance, absolute response position and two original page fields through sharing',async()=>{
  const oldFetch=globalThis.fetch;const keys=['NAVER_CLIENT_ID','NAVER_CLIENT_SECRET','OPENAI_API_KEY'] as const;const env=keys.map(k=>process.env[k]);process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';delete process.env.OPENAI_API_KEY;
  let apiCalls=0,pages=0;
  globalThis.fetch=async u=>{if(String(u).includes('openapi.naver.com')){apiCalls++;return Response.json({start:5,total:4321,items:[{title:'광고대행',description:'검색 광고 요약',link:'https://agency.test'}]});}pages++;return new Response('<html><title>광고대행</title><meta name="description" content="기업 상담 사례와 견적"><meta property="og:description" content="사용하지 않을 OG"></html>');};
  try{const result=await analyzeCompetitors({url:fixture.url,title:'브랜드예시',ogTitle:'',description:'광고대행',keywords:'광고대행',h1:[]});assert.ok(result);assert.equal(apiCalls,1);assert.equal(pages,1);assert.equal(result.competitors[0].searchRank,5);assert.equal(result.competitors[0].metaDescription,'기업 상담 사례와 견적');assert.equal(result.research.totalDocuments,4321);assert.equal(result.research.searchVolumeStatus,'not_measured');assert.ok(result.research.keywordEvidence.length);
    const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify({...fixture,competitorAnalysis:result})));assert.deepEqual(restored.competitorAnalysis?.research,result.research);assert.equal(restored.competitorAnalysis?.ourSite?.url,fixture.url);
  }finally{globalThis.fetch=oldFetch;keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});}
});
test('full report and brief retain method, complete evidence and actions without inventing performance uplift',()=>{
  const long='상담 조건과 실제 사례를 자세히 설명합니다. '.repeat(15);
  const r={...report,competitorAnalysis:{...report.competitorAnalysis!,competitors:[{...competitor,metaDescription:long+'마지막 문장'}]}};
  const text=buildReportDocument(r).map(b=>b.text).join('\n');for(const expected of ['검색 메시지 포지셔닝','검색량 미측정','100','TO-BE 작성 틀','마지막 문장','웹문서 검색 응답 순서: 3'])assert.ok(text.includes(expected),expected);
  assert.ok(text.includes(long));assert.match(positioningBrief(report,buildCompetitorPositioning(report)!.own),/상승률|성과/);
  const $=load(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report:r})));assert.equal($('.position-site-list button').length,2);assert.equal($('script').length,0);
});
test('PDF chart uses the same coordinates, keeps all candidate labels, and stays inside page bounds',()=>{
  const r={...report,competitorAnalysis:{...report.competitorAnalysis!,competitors:Array.from({length:5},(_,i)=>({...competitor,rank:i+1,domain:`agency${i}.test`,metaDescription:i%2?'상품 안내':input.description}))}};
  const measure=(s:string,t:{size:number})=>[...s].reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);const page=buildCompetitorVisualPage(r,measure)!;
  for(const line of page.lines){assert.ok(line.x>=48&&line.x+line.width<=742.01,line.text);assert.ok(line.y>=46&&line.y+line.lineHeight<=1039,line.text);}
  for(const name of ['자사','agency0.test','agency4.test'])assert.ok(page.lines.some(l=>l.text.includes(name)));
  const groups=buildCompetitorPositioning(r)!.groups;assert.equal(page.shapes.filter(s=>s.kind==='rect'&&['#b91825','#315d88'].includes(s.color)).length,groups.length);
});

test('bubble area reflects capped distinct information and group size never rewards duplicate companies',()=>{
  const sparse=scorePosition({...input,title:'광고',description:'사례 상담'},'광고');
  const rich=scorePosition({...input,title:'광고',description:'사례 후기 인증 특허 상담 문의 예약'},'광고');
  assert.equal(sparse.y,rich.y);assert.equal(sparse.signalCount,2);assert.equal(rich.signalCount,4);
  assert.equal(rich.checks[2].signals.length,4);assert.equal(rich.checks[2].signalCount,2);
  const repeated=scorePosition({...input,title:'광고 사례 상담',description:'사례 상담 사례 상담'},'광고');assert.equal(repeated.signalCount,2);
  const group=positionGroups([sparse,{...sparse,id:'candidate-2'},rich])[0];assert.equal(group.signalCount,8/3);
  assert.ok(positionDiameter(rich.signalCount!)>positionDiameter(sparse.signalCount!));
  assert.ok(Math.abs((positionDiameter(0)**2+positionDiameter(8)**2)/2-positionDiameter(4)**2)<.001);
  assert.equal(positionDiameter(0),44);assert.equal(positionDiameter(8,true),64);
});
test('extreme coordinates stay inside the diagram and remain monotonic without random displacement',()=>{
  const low=positionCoordinates(0,0),high=positionCoordinates(100,100),middle=positionCoordinates(50,50);
  assert.ok(low.left>10&&low.top<90);assert.ok(high.left<90&&high.top>10);assert.deepEqual(middle,{left:50,top:50});
  assert.ok(positionCoordinates(33,50).left<positionCoordinates(67,50).left);
  for(const score of [0,25,50,75,100]){const p=positionCoordinates(score,score);const radius=positionDiameter(8,true)/2;assert.ok(p.left*2.4-radius>0&&p.left*2.4+radius<240);assert.ok(p.top*4.1-radius>0&&p.top*4.1+radius<410);}
});
