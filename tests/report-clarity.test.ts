import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {fixture} from './fixtures/report';
import {buildReportInsights} from '../lib/reportInsights';
import {reportForPresentation} from '../lib/reportPresentation';
import {keywordRewrite} from '../lib/keywordRewrite';
import {buildExecutableRewrites,rewriteInstruction} from '../lib/keywordExecution';
import {selectSearchCandidates} from '../lib/competitorSelection';
import {buildInsightsDocument} from '../lib/reportInsightsDocument';
import {BrandReview,SourceDirectory} from '../components/report/InsightPanels';
import KeywordWorkspace from '../components/report/KeywordWorkspace';
import SourceElementCard from '../components/report/SourceElementCard';
import {PageEditPreview} from '../components/report/ExecutionWorkflow';
import type {MarketingReport,LlmCitationQuestionResult as Row,KeywordFreqItem} from '../lib/reportSchema';
import type {PageElement} from '../lib/siteEditingSchema';

const word=(keyword:string):KeywordFreqItem=>({keyword,count:20,density:4,inTitle:false,inMetaDescription:false});
const row=(patch:Partial<Row>={}):Row=>({engine:'chatgpt',question:'브랜드의 서비스는?',questionType:'brand',status:'ok',searchUsed:true,citationVerified:true,cited:false,brandMentioned:true,sources:[{url:'https://other.example/service',title:'외부 자료',ownership:'external'}],...patch});
const report=(rows:Row[]):MarketingReport=>({...fixture,url:'https://example.com',llmCitationTest:{...fixture.llmCitationTest!,measurementVersion:2,results:rows}});

test('frequent product brands and model codes remain in raw data but cannot produce title placement recommendations',()=>{
 const singles=['fepl','landas','toms','defiway','JK160','031','광고','컨설팅'].map(word);
 const r:MarketingReport={...fixture,meta:{siteName:'예시',ogTitle:'단체복 주문제작'},keywordFrequency:{totalTokens:100,uniqueSingles:8,uniquePhrases:0,singles,phrases:[]}};
 const before=JSON.stringify(r),d=buildReportInsights(r);
 assert.deepEqual(d.gaps.map(k=>k.keyword),['광고','컨설팅']);assert.equal(d.heldKeywords.length,6);
 for(const k of singles.slice(0,6)){const p=keywordRewrite(k,r.meta);assert.equal(p.kind,'문맥 검토');assert.match(p.action,/제목 보강이나 삭제를 권하지 않습니다/);}
 const document=buildInsightsDocument(r).map(b=>b.text).join('\n');assert.match(document,/제목 보강 보류: fepl/);assert.equal(JSON.stringify(r),before);
 assert.equal(keywordRewrite(word('CRM'),{ogTitle:'CRM 고객 관리 서비스'}).kind,'배치');
 assert.equal(keywordRewrite(word('B2B'),{ogTitle:'B2B 영업 지원'}).kind,'배치');
 assert.equal(keywordRewrite(word('crm'),{ogTitle:'SCRMS 플랫폼'}).kind,'문맥 검토');
 assert.equal(keywordRewrite(word('FEPL'),{siteName:'FEPL'}).kind,'유지');
 const held=buildExecutableRewrites(r).singles.find(p=>p.item.keyword==='fepl')!;
 assert.doesNotMatch(rewriteInstruction(held),/수정 작업 지시서|사실로 문장 완성하기|저장 후 다시 확인하기/);
});
test('candidate selection excludes large malls and own subdomains with exact host boundaries',()=>{
 const domains=['m.lfmall.co.kr','www.ssg.com','shop.example.com','www.gsshop.com','lfmall.co.kr.other.example','service.example.net'];
 const selection=selectSearchCandidates(domains.map(domain=>({title:domain,description:'의류',link:`https://${domain}`})),'example.com','의류');
 assert.deepEqual(selection.candidates.map(c=>c.domain),domains.slice(4));assert.equal(selection.excluded.length,4);
});
test('saved reports apply the same candidate filter without losing audit records or changing source observations',()=>{
 const r:MarketingReport={...fixture,competitorAnalysis:{searchKeyword:'의류',competitors:['m.lfmall.co.kr','ssg.com','example.com','vendor.example'].map((domain,i)=>({rank:i+1,title:domain,link:`https://${domain}`,domain,description:'의류'}))}};
 const before=JSON.stringify(r),display=reportForPresentation(r);
 assert.deepEqual(display.competitorAnalysis!.competitors.map(c=>c.domain),['vendor.example']);assert.equal(display.competitorAnalysis!.filtering!.excluded.length,3);
 assert.equal(reportForPresentation(display),display);assert.equal(JSON.stringify(r),before);
});
test('source cards omit own sites and large malls while recording explicit exclusion reasons',()=>{
 const r=report([row({sources:['example.com','m.lfmall.co.kr','ssg.com','other.example'].map(domain=>({url:`https://${domain}/x`,title:domain,ownership:'external'}))})]);
 const before=JSON.stringify(r),d=buildReportInsights(r),$=load(renderToStaticMarkup(React.createElement(SourceDirectory,{data:d})));
 assert.equal(d.sources.length,4);assert.equal(d.eligibleSources.length,1);assert.equal(d.excludedSources.length,3);
 assert.equal($('.report-source-item').length,1);assert.match($('.report-source-grid').text(),/other.example/);assert.doesNotMatch($('.report-source-grid').text(),/lfmall|ssg|example.com/);
 assert.equal($('.report-excluded-sources li').length,3);assert.equal(JSON.stringify(r),before);
});
test('empty review states distinguish collection failure, missing mention and already connected own sources',()=>{
 const failed=buildReportInsights(report([row({status:'error'})]));assert.equal(failed.reviewSummary.verified,0);assert.match(failed.reviewExplanation,/계산하지 않았습니다/);
 const $=load(renderToStaticMarkup(React.createElement(BrandReview,{data:failed})));assert.equal($('.report-review-stats dd').last().text(),'—');
 const absent=buildReportInsights(report([row({brandMentioned:false})]));assert.match(absent.reviewExplanation,/브랜드 언급이 확인된 답변이 없어/);assert.equal(absent.reviewSummary.noBrand,1);
 const own=buildReportInsights(report([row({cited:true,sources:[{url:'https://example.com/about',title:'자사 정보',ownership:'own'}]})]));assert.match(own.reviewExplanation,/자사 출처 연결 1건/);assert.equal(own.reviews.length,0);
 const missing=buildReportInsights(report([row({sources:[]})]));assert.equal(missing.reviewSummary.missingSource,1);assert.match(missing.reviewExplanation,/외부 출처 미확인 1건/);
 const duplicates=buildReportInsights(report([row(),row()]));assert.equal(duplicates.reviewSummary.unavailable,2);
});
test('keyword categories are visible together with links to each section start',t=>{
 const prior=(globalThis as typeof globalThis & {React?:typeof React}).React;Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:prior}));
 const r:MarketingReport={...fixture,keywordFrequency:{totalTokens:100,uniqueSingles:2,uniquePhrases:1,singles:[word('fepl'),word('광고')],phrases:[word('광고 운영')]}};
 const $=load(renderToStaticMarkup(React.createElement(KeywordWorkspace,{report:r,data:buildReportInsights(r)})));
 assert.equal($('.keyword-workspace-nav a').length,3);assert.equal($('.keyword-workspace > div[hidden]').length,0);assert.equal($('.keyword-workspace h3').length,1);
 for(const a of $('.keyword-workspace-nav a').toArray())assert.equal($($(a).attr('href')!).length,1);
 assert.equal($('.keyword-table tbody tr').length,2);assert.equal($('.report-rewrite-card').length,2);assert.match($('.keyword-frequency').text(),/브랜드명·상품 코드/);
});
test('metadata and short duplicate copy never offer a generic page-opening fallback',()=>{
 const element:PageElement={key:'title',kind:'title',tag:'title',selector:'head > title',text:'저장된 검색 제목',truncated:false,heading:'',order:0,anchor:'not-visible'};
 const $=load(renderToStaticMarkup(React.createElement(SourceElementCard,{element,url:'https://example.com'})));
 assert.equal($('a').length,0);assert.doesNotMatch($.text(),/실제 페이지 열기/);assert.equal($('.guide-element blockquote').text(),element.text);assert.equal($('.guide-selector,.guide-source-context').length,0);
});
test('missing H1 explains why a comparison cannot be displayed and what to check next',t=>{
 const prior=(globalThis as typeof globalThis & {React?:typeof React}).React;Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:prior}));
 const r:MarketingReport={...fixture,pageEvidence:{version:1,requestedUrl:fixture.url,finalUrl:fixture.url,capturedAt:'2026-10-13T05:00:00Z',h1:[],h2:[],title:'',description:'',ctaButtons:[],bodyText:'상품 안내',bodyTruncated:false}};
 const $=load(renderToStaticMarkup(React.createElement(PageEditPreview,{report:r})));
 assert.match($('.work-before-after').text(),/비교할 원문이 확보되지 않아/);assert.match($('.work-before-after').text(),/스크립트·이미지/);assert.match($('.work-before-after').text(),/HTML의 H1을 함께 확인/);
});

test('AI answers are stored in the question detail once and keep evidence links from the review and source views',async t=>{
 const {default:ReportLayout}=await import('../components/report/ReportLayout');
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 const first=row({question:'첫 질문',status:'ok',citationVerified:false,responseText:'첫 질문의 원문'});
 const review=row({question:'두 번째 질문',responseText:'두 번째 질문의 온전한 답변 원문'});
 const saved=report([first,review]);
 saved.llmCitationTest!.actionPlan=[{question:review.question,journey:'비교',accuracy:'needs_review',action:'research_page',evidence:'우선 다시 확인할 출처',nextStep:'고객 질문을 설명할 상세 페이지를 수정하세요.'}];
 const before=JSON.stringify(saved);
 const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report:saved})));
 assert.equal($('#report-ai-question-1').length,1);
 assert.equal($('#report-ai-question-2[hidden]').length,1);
 assert.match($('#report-ai-question-1 summary').first().text(),/자사 출처 판정 불가/);
 assert.match($('#report-ai-question-2').text(),/두 번째 질문의 온전한 답변 원문/);
 assert.equal($('[aria-controls="report-ai-question-2"]').length,1);
 assert.equal($('#report-view-geo-brand a[href="#report-ai-question-2"]').length,1);
 assert.equal($('#report-view-geo-sources a[href="#report-ai-question-2"]').length,1);
 assert.doesNotMatch($('#report-view-geo-brand').text(),/두 번째 질문의 온전한 답변 원문/);
 assert.ok($('#report-view-geo-observations a[href="#report-ai-question-actions"]').length);
 assert.equal($('#report-view-actions-geo #report-ai-question-actions').length,1);
 assert.match($('#report-ai-question-actions').text(),/고객 질문을 설명할 상세 페이지를 수정하세요/);
 assert.equal($('#report-view-actions-geo .report-geo-focus a[href="#report-ai-action-1"]').length,1);
 assert.doesNotMatch($('#report-view-actions-geo .report-geo-focus').text(),/고객 질문을 설명할 상세 페이지를 수정하세요/);
 assert.equal(JSON.stringify(saved),before);
});
