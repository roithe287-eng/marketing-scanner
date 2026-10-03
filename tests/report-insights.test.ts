import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {buildReportInsights,contentBrief} from '../lib/reportInsights';
import {buildReportDocument} from '../lib/reportDocument';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import {SourceDirectory,BrandReview,MessageMap,ActionBacklog} from '../components/report/InsightPanels';
import type {MarketingReport,LlmCitationQuestionResult as Row} from '../lib/reportSchema';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';
const row=(patch:Partial<Row>={}):Row=>({engine:'chatgpt',question:'회사의 서비스는 무엇인가요?',questionType:'brand',status:'ok',searchUsed:true,citationVerified:true,cited:false,brandMentioned:true,sources:[{url:'https://other.example/service',title:'외부 업체',ownership:'external'}],...patch});
function report(rows:Row[]):MarketingReport{return {...fixture,llmCitationTest:{...fixture.llmCitationTest!,results:rows}};}
test('source review excludes failures, unresolved attribution and duplicated engine/question pairs',()=>{
  const rows=[row(),row({engine:'gemini',status:'error'}),row({question:'검색 확인 불가',status:'unverified',citationVerified:false}),row({question:'중복 질문'}),row({question:'중복 질문',cited:true}),row({question:'중계 링크',sources:[{url:'https://vertexaisearch.cloud.google.com/x',title:'중계 출처',ownership:'unresolved'}]})];
  const d=buildReportInsights(report(rows));assert.equal(d.reviews.length,1);assert.equal(d.sources.length,2);assert.equal(d.sources.find(s=>s.domain==='other.example')?.observations.length,1);assert.equal(d.questions.find(q=>q.question==='중복 질문')?.target,null);
  assert.equal(d.reviews[0].engine,'OpenAI');assert.equal(d.questions[0].kind,'입력 페이지 검토');
});
test('source counts deduplicate URLs within one observation and do not trust an own label on another host',()=>{
  const same={url:'https://example.com/faq#answer',title:'자사 FAQ',ownership:'own' as const};
  const d=buildReportInsights(report([row({cited:true,sources:[same,same]}),row({engine:'gemini',sources:[{...same,url:'https://example.com/faq'}]}),row({question:'비슷한 주소',sources:[{url:'https://example.com.evil.test/faq',title:'비슷한 도메인',ownership:'own'}]})]));
  assert.equal(d.sources.length,2);const own=d.sources.find(s=>s.ownership==='own')!;assert.equal(own.observations.length,2);assert.equal(own.questions.length,1);assert.equal(own.url,'https://example.com/faq');assert.equal(d.reviews.length,1);assert.equal(d.questions[0].kind,'인용 페이지');
});
test('unsafe URL values and legacy data cannot become usable source links or invented review scores',()=>{
  const r=report([row({sources:[{url:'javascript:alert(1)',title:'unsafe',ownership:'external'},{url:'https://u:p@other.example',title:'credentials',ownership:'external'}]})]);const d=buildReportInsights(r);assert.equal(d.sources.length,0);assert.equal(d.reviews.length,0);
  const old=buildReportInsights({...r,llmCitationTest:{...r.llmCitationTest!,measurementVersion:undefined}});assert.equal(old.obs,null);assert.equal(old.questions.length,0);assert.equal(old.coverage[2].state,'미확인');
  const html=renderToStaticMarkup(React.createElement(BrandReview,{data:old}));assert.match(html,/판정하지 않았습니다/);assert.ok(!html.includes('javascript:'));
});
test('competitor collection failures remain unknown and cannot create message gap recommendations',()=>{
  const r:MarketingReport={...fixture,meta:{ogTitle:'자사 공식 전문 상담'},competitorAnalysis:{searchKeyword:'서비스',competitors:[{rank:1,title:'검색용 제목 무료',description:'검색용 설명',link:'https://other.example',domain:'other.example',metaTitle:'무료 상담 전문',fetchError:'timeout'},{rank:2,title:'검색 결과 무료',description:'가격',link:'https://missing.example',domain:'missing.example'}]}};
  const d=buildReportInsights(r);assert.equal(d.metadataCount,0);assert.equal(d.messageOpportunities.length,0);assert.ok(d.messageRows.slice(1).every(r=>r.cells.every(c=>c.match===undefined)));
  const html=renderToStaticMarkup(React.createElement(MessageMap,{data:d}));assert.match(html,/수집 미확인/);assert.ok(!html.includes('검색용 제목 무료'));
});
test('backlog retains supported evidence, omits retired technical grades, and exports actionable sections',()=>{
  const check={id:'h1',label:'H1 제목',status:'fail' as const,currentValue:'없음',diagnosis:'진단',guide:'대표 제목 추가'};
  const r:MarketingReport={...report([row()]),checklist:[{...check,category:'seo'},{...check,id:'pass',category:'seo',label:'통과 항목',status:'pass'}],technicalSeo:{overallScore:50,grade:'C',summary:'요약',counts:{pass:0,warning:0,fail:1},checks:[{...check,group:'index'}],priorityActions:[]}};
  const d=buildReportInsights(r);assert.equal(d.tasks.length,2);assert.equal(new Set(d.tasks.map(t=>t.id)).size,2);assert.ok(d.tasks.every(t=>t.title!=='통과 항목'));assert.equal(d.stages[0].score,r.diagnosis.firstView);
  const copy=contentBrief('질문 확인',null);assert.match(copy,/담당자 확인 필요/);assert.ok(!copy.includes('undefined'));const blocks=buildReportDocument(r);for(const title of ['AI 출처 검토함','경쟁사 메시지 비교 지도','키워드 연결 기회','통합 보완 목록 · 2개'])assert.ok(blocks.some(b=>b.text===title));assert.ok(blocks.some(b=>b.href==='https://other.example/service'));
  for(const Component of [SourceDirectory,ActionBacklog])assert.ok(renderToStaticMarkup(React.createElement(Component,{data:d})).length>500);
});
test('keyword opportunities remove common sentence words without rewriting original counts',()=>{
  const singles=['없습니다','필요한','함께','현재','가능한','광고','컨설팅'].map((keyword,i)=>({keyword,count:20-i,density:2,inTitle:false,inMetaDescription:false}));
  const r:MarketingReport={...fixture,keywordFrequency:{totalTokens:100,uniqueSingles:7,uniquePhrases:0,singles,phrases:[]}};
  const d=buildReportInsights(r);assert.deepEqual(d.gaps.map(k=>k.keyword),['광고','컨설팅']);assert.equal(d.gaps[0].count,15);assert.equal(r.keywordFrequency!.singles.length,7);
});
test('new visual PDF pages fit variable labels, full competitor rows and keyword candidates',()=>{
  const measure=(s:string,style:PdfTextStyle)=>Array.from(s).reduce((sum,c)=>sum+(/[ -~]/.test(c)?.55:1)*style.size*(style.weight===700?1.06:1),0);
  const r:MarketingReport={...fixture,oneLineSummary:'긴 한국어 설명 '.repeat(50),meta:{ogTitle:'무료 상담 공식 전문 업체'},competitorAnalysis:{searchKeyword:'업체',competitors:Array.from({length:12},(_,i)=>({rank:i+1,title:'후보',description:'',link:`https://other${i}.example`,domain:'긴비교도메인문자열'.repeat(10),metaTitle:'무료 공식 전문 빠른 맞춤 상담'}))},keywordFrequency:{totalTokens:100,uniqueSingles:8,uniquePhrases:0,singles:Array.from({length:8},(_,i)=>({keyword:'긴키워드문자'.repeat(8)+i,count:30,density:5,inTitle:false,inMetaDescription:false})),phrases:[]}};
  const pages=buildVisualPdfPages(r,measure);assert.ok(pages.length>=4);
  for(const p of pages)for(const l of p.lines){assert.ok(l.x>=46&&l.x+l.width<=742.01,`horizontal ${l.text}`);assert.ok(l.y+l.lineHeight<=PDF_PAGE.contentBottom+.01,`vertical ${l.text} ${l.y}`);}
});
