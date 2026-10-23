import assert from 'node:assert/strict';
import {beforeEach,test,type TestContext} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {websiteHttp} from '../lib/security/safeFetch';
import {marketKeywordCandidates,usableMarketKeyword,competitorOwnText,keywordEvidence} from '../lib/competitorResearch';
import {selectSearchCandidates,finalizeSearchCandidates} from '../lib/competitorSelection';
import {unrelatedPageReason} from '../lib/competitorRoles';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {competitorDisplay} from '../lib/competitorDisplay';
import {MarketingReportSchema} from '../lib/reportSchema';
import {reportForPresentation} from '../lib/reportPresentation';
import {buildCompetitorPositioning} from '../lib/competitorPositioning';
import {buildCompetitorVisualPage} from '../lib/competitorVisualPdf';
import {buildReportDocument} from '../lib/reportDocument';
import CompetitorLandscape from '../components/report/CompetitorLandscape';
import {fixture} from './fixtures/report';
beforeEach(t=>{(t as TestContext).mock.method(websiteHttp,'fetch',(input:string|URL,init?:RequestInit)=>globalThis.fetch(input,init));});

const own={url:'https://onnuristore.com',title:'온누리스토어',ogTitle:'온누리스토어',description:'',h1:[],h2:[],keywords:''};
const item=(host:string,title:string,description='')=>({title,description,link:`https://${host}/`});

test('the Onnuri brand alone never becomes a market query; actual own product text can supply it',()=>{
  assert.equal(usableMarketKeyword('온누리스토어',own),false);assert.deepEqual(marketKeywordCandidates(own),[]);
  assert.deepEqual(marketKeywordCandidates({...own,title:'온누리식품',ogTitle:'온누리식품'}),[]);
  const page={...own,bodyText:'건강기능식품과 영양제, 생활용품을 구매할 수 있는 온라인 스토어입니다.'};
  assert.ok(marketKeywordCandidates(page).some(c=>c.keyword==='건강기능식품'));
  assert.equal(usableMarketKeyword('부산 영양제',page),false);
  assert.equal(usableMarketKeyword('온누리스토어 건강기능식품',page),false);
});
test('navigation and footer licences cannot supply invented industry evidence',()=>{
  const body=competitorOwnText({bodyText:'고객센터\n건강기능식품판매업신고 : 2022-1234\n이용약관\n영양제 건강기능식품',siteEditing:{version:1,source:'static-html',signals:[],elementsTruncated:false,elements:[{key:'footer',kind:'text',tag:'p',selector:'footer p',text:'영양제 건강기능식품',truncated:false,heading:'',order:0,region:'footer'}]}});
  assert.doesNotMatch(body,/건강기능식품|영양제/);
  const text='제품 설명을 준비합니다. '.repeat(100)+'건강기능식품을 판매합니다.';
  const proof=keywordEvidence('건강기능식품',{bodyText:text});assert.ok(proof.grounded);assert.ok(proof.evidence[0].text.includes('건강기능식품'));
});
test('recruitment and company directories are excluded before the eight-page collection budget',()=>{
  const items=[...['saramin.co.kr','teamblind.com','wanted.co.kr','thevc.kr','jobplanet.co.kr'].map(host=>item(host,'온누리스토어 건강기능식품 기업정보 채용 연봉')),
    item('health.test','건강기능식품 전문몰','비타민과 영양제 판매'),item('directory.test','건강기능식품 기업정보 2026')];
  const result=selectSearchCandidates(items,'onnuristore.com','건강기능식품');
  assert.deepEqual(result.candidates.map(c=>c.domain),['health.test']);assert.equal(result.excluded.length,6);assert.equal(result.candidates[0].searchRank,6);
});
test('employment providers remain eligible for actual employment queries; host lookalikes and footer hiring links do not trigger exclusions',()=>{
  assert.equal(selectSearchCandidates([item('saramin.co.kr','채용 플랫폼')],'other.test','채용 플랫폼').candidates.length,1);
  assert.equal(unrelatedPageReason({...item('wanted.co.kr.store.test','영양제 쇼핑몰'),domain:'wanted.co.kr.store.test'},'영양제'),undefined);
  assert.equal(unrelatedPageReason({...item('store.test','뉴스킨 영양제 공식몰','회사소개 · 채용 · 문의'),domain:'store.test'},'영양제'),undefined);
});
test('search snippets and failed fetches cannot fill a competitor slot; metadata must match',()=>{
  const s=selectSearchCandidates([item('wrong.test','건강기능식품'),item('failed.test','건강기능식품'),item('right.test','건강기능식품')],'own.test','건강기능식품');
  const pages=s.candidates.map(c=>({...c,metaTitle:c.domain==='wrong.test'?'채용 정보':c.title,metaDescription:'영양제 온라인 판매',...(c.domain==='failed.test'?{fetchError:'HTTP 403'}:{})}));
  const result=finalizeSearchCandidates(pages,'건강기능식품',s.excluded);
  assert.deepEqual(result.map(c=>c.domain),['right.test']);assert.equal(result[0].searchRank,3);assert.equal(result[0].rank,1);assert.equal(result[0].relevanceBasis,'page_metadata');
  assert.equal(s.excluded.length,2);
});
test('late relevant results are inspected before unrelated top results without changing API positions',()=>{
  const result=selectSearchCandidates([...Array.from({length:8},(_,i)=>item(`other${i}.test`,'다른 서비스')),item('match.test','건강기능식품 전문몰')],'own.test','건강기능식품',8);
  assert.equal(result.candidates[0].domain,'match.test');assert.equal(result.candidates[0].searchRank,9);assert.equal(result.candidates.length,8);
});
test('an unreadable brand-only page skips Naver entirely and preserves an explicit empty result',async t=>{
  const keys=['OPENAI_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const,env=keys.map(k=>process.env[k]);delete process.env.OPENAI_API_KEY;process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('No external call is expected');});
  try{const result=await analyzeCompetitors(own);assert.ok(result);assert.equal(result.research.selectionStatus,'insufficient_source');assert.equal(result.filtering.reviewedCount,0);assert.deepEqual(result.competitors,[]);assert.equal(result.searchKeyword,'');assert.ok(MarketingReportSchema.safeParse({...fixture,competitorAnalysis:result}).success);}
  finally{keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});}
});
test('a merchant scan rejects all five reported platforms and retains only a grounded shop, without sending API snippets to AI',async t=>{
  const keys=['OPENAI_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const,env=keys.map(k=>process.env[k]);process.env.OPENAI_API_KEY='test-local';process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';let aiCalls=0,pages=0;
  t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
    const url=String(input);
    if(url.includes('api.openai.com')){aiCalls++;assert.doesNotMatch(String(init?.body),/SEARCH_SNIPPET_MARKER/);return Response.json({choices:[{message:{content:'{"keyword":"건강기능식품"}'}}]});}
    if(url.includes('openapi.naver.com'))return Response.json({items:[...['saramin.co.kr','teamblind.com','wanted.co.kr','thevc.kr','jobplanet.co.kr'].map(h=>item(h,'건강기능식품 회사 채용','SEARCH_SNIPPET_MARKER')),item('shop.test','건강기능식품 전문몰')]});
    if(url.startsWith(own.url))return new Response('',{status:503});
    pages++;assert.ok(url.includes('shop.test'));return new Response('<title>건강기능식품 전문몰</title><meta name="description" content="비타민과 영양제 온라인 판매">');
  });
  try{const result=await analyzeCompetitors({...own,bodyText:'건강기능식품과 영양제를 판매하는 온라인몰입니다.'});assert.ok(result);assert.equal(aiCalls,1);assert.equal(pages,1);assert.deepEqual(result.competitors.map(c=>c.domain),['shop.test']);assert.equal(result.filtering.policyVersion,2);assert.equal(result.filtering.excluded.length,5);assert.equal(result.research.selectionStatus,'matched');}
  finally{keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});}
});
test('old stored reports hide the reported platforms in cards, comparison rows and PDF charts without altering the record',()=>{
  const old=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:'온누리스토어',competitors:['saramin.co.kr','teamblind.com','wanted.co.kr','thevc.kr','jobplanet.co.kr'].map((h,i)=>({...item(h,'온누리스토어 기업 정보'),domain:h,rank:i+1,metaTitle:'온누리스토어',metaDescription:'기업정보 및 채용'}))}});
  const original=JSON.stringify(old),display=competitorDisplay(old.competitorAnalysis!);assert.equal(display.competitors.length,0);assert.equal(display.filtering?.excluded.length,5);
  assert.equal(reportForPresentation(old).competitorAnalysis?.competitors.length,0);assert.equal(buildCompetitorPositioning(old)!.rows.length,1);assert.equal(buildCompetitorVisualPage(old,(s)=>s.length*7),null);
  const html=renderToStaticMarkup(React.createElement(CompetitorLandscape,{report:old}));assert.match(html,/경쟁사 선정을 보류/);assert.doesNotMatch(html,/position-plot|position-site-list/);
  const text=buildReportDocument(old).map(b=>b.text).join('\n');assert.match(text,/이전 선정 기준/);assert.doesNotMatch(text,/후보 1 · saramin/);assert.equal(JSON.stringify(old),original);
});
