import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose,isNonCommerce,outOfPurpose} from '../lib/websitePurpose';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {MarketingReportSchema} from '../lib/reportSchema';
import {capturePageEvidence} from '../lib/pageEvidence';
import {analyzeKeywordFrequency} from '../lib/analyzeKeywordFreq';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {buildPrompt} from '../lib/analyzeMarketing';
import {buildReportInsights} from '../lib/reportInsights';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import {buildDiagnosisComparison,createDiagnosisBaseline,DIAGNOSIS_METHOD} from '../lib/diagnosisComparison';
import WebsitePurposePanel from '../components/report/WebsitePurposePanel';
import DiagnosisChecklist from '../components/DiagnosisChecklist';
import {fixture} from './fixtures/report';
import {noncommerceCases,noncommerceResponse} from './fixtures/noncommerce';

for(const site of noncommerceCases)test(`purpose-aware report, questions and PDF: ${site.id}`,async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>noncommerceResponse(input));
  const data=await extractWebsite(site.url),purpose=analyzeWebsitePurpose(data);
  assert.equal(purpose.kind,site.kind);assert.equal(purpose.goal.key,site.goal);
  assert.ok(purpose.evidence.every(e=>[data.title,data.description,...data.h1,...data.h2,data.bodyText].some(s=>s.replace(/\s+/g,' ').includes(e.text))));
  const report=MarketingReportSchema.parse(JSON.parse(JSON.stringify(finalizeReportEvidence({...fixture,url:site.url,pageEvidence:capturePageEvidence(data),keywordFrequency:analyzeKeywordFrequency(data),diagnosisMethod:DIAGNOSIS_METHOD,criticalIssues:[{title:'구매 버튼 부재',problem:'구매 버튼이 없습니다',reason:'상품 판매 손실',recommendation:'구매 버튼 추가',priority:'high'}],priorityRoadmap:{immediately:['장바구니 추가'],thisWeek:['배송 정책 추가'],thisMonth:['상품 등록']},exampleCopy:{...fixture.exampleCopy,ctaText:'구매하기'}},data))));
  const ui=renderToStaticMarkup(React.createElement(WebsitePurposePanel,{purpose:report.sitePurpose!}));
  assert.match(ui,/페이지 목적별 분석/);assert.ok(ui.includes(purpose.label));assert.ok(ui.includes(purpose.goal.label));
  assert.ok(renderToStaticMarkup(React.createElement(DiagnosisChecklist,{checklist:report.checklist!})).includes('기본 진단 체크리스트'));
  const pdf=buildReportDocument(report).map(b=>b.text).join('\n');assert.ok(pdf.includes(purpose.label));assert.ok(pdf.includes(purpose.goal.label));
  const summary=buildReportSummaryPage(report,(s,style)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*style.size,0));assert.ok(summary.lines.some(l=>l.text.includes(purpose.label)));
  const questions=citationFallbackQuestions(data,'검증브랜드');assert.equal(questions.length,5);
  assert.ok(buildPrompt(data).includes(purpose.label));
  const answer=buildAnswerContentPlan(data);
  if(isNonCommerce(purpose)){
    assert.equal(report.criticalIssues.length,0);assert.ok(Object.values(report.priorityRoadmap).every(rows=>rows.length===0));assert.doesNotMatch(report.exampleCopy.ctaText,/구매/);
    assert.doesNotMatch(JSON.stringify(questions),/배송|반품|장바구니|최소 주문|상품을 판매/);
    assert.ok(answer.questions.every(q=>!['delivery','minimum','care'].includes(q.intent)));
  }
  if(site.kind==='content'||site.kind==='public_service'){
    for(const id of ['price_info','trust_review','trust_certification'])assert.equal(report.checklist!.find(c=>c.id===id)?.status,'not_applicable');
    const excluded=report.checklist!.filter(c=>c.status==='not_applicable').map(c=>c.label);
    const tasks=buildReportInsights(report).tasks;assert.ok(tasks.every(t=>!excluded.includes(t.title)));
    assert.doesNotMatch(JSON.stringify(questions),/비용과 계약|제공 업체|구매 전/);
    assert.ok(answer.questions.every(q=>q.intent!=='price'));
  }
  if(site.kind==='content')assert.equal(data.productDiscovery?.commerce,true,'article mentions a cart but is not a shop');
});

test('retail topics in articles remain valid subjects while unrelated shop implementation is excluded',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>noncommerceResponse(input));
  const data=await extractWebsite(noncommerceCases.find(c=>c.id==='content')!.url),p=analyzeWebsitePurpose(data);
  assert.equal(outOfPurpose('배송비 산정 원리와 적용 예외를 설명합니다',p),false);
  assert.equal(outOfPurpose('배송 정책 추가',p),true);
  const report=finalizeReportEvidence({...fixture,url:data.url,criticalIssues:[{title:'고객 후기 부족',problem:'후기가 없습니다',reason:'신뢰 부족',recommendation:'실제 후기 추가',priority:'high'}]},data);
  assert.equal(report.criticalIssues.length,0);
  assert.equal(MarketingReportSchema.safeParse({...report,sitePurpose:{...report.sitePurpose!,sourceUrl:'javascript:alert(1)'}}).success,false);
  assert.ok(buildReportInsights(report).tasks.every(t=>t.title!=='후기·사례 확인'));
});

test('not-applicable changes are scope reviews rather than resolved defects',()=>{
  const before={...fixture,diagnosisMethod:DIAGNOSIS_METHOD,pageEvidence:{version:1 as const,requestedUrl:fixture.url,finalUrl:fixture.url,capturedAt:'2026-10-23T04:00:00.000Z',title:'기사',description:'',h1:[],h2:[],ctaButtons:[],bodyText:'',bodyTruncated:false},checklist:[{id:'price_info',label:'가격',category:'conversion' as const,status:'warning' as const,currentValue:'미확인',diagnosis:'',guide:''}]};
  const baseline=createDiagnosisBaseline(before,'scope123');
  const now={...before,diagnosisBaseline:baseline,pageEvidence:{...before.pageEvidence,capturedAt:'2026-10-23T05:00:00.000Z'},checklist:before.checklist.map(c=>({...c,status:'not_applicable' as const}))};
  const result=buildDiagnosisComparison(now)!;assert.equal(result.items.find(i=>i.key.includes('가격'))?.group,'unknown');
});

test('declared article types identify an informational page without commerce or content label words',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('<title>광고 설정의 원칙</title><main><h1>광고 설정의 원칙</h1><p>이 설정의 적용 조건과 예외를 설명합니다.</p></main><script type="application/ld+json">{"@type":"Article","headline":"광고 설정의 원칙"}</script>',{headers:{'content-type':'text/html'}}));
  const data=await extractWebsite('https://principles.example.com/'),p=analyzeWebsitePurpose(data);
  assert.equal(p.kind,'content');assert.equal(p.goal.key,'read');assert.ok(p.evidence.some(e=>e.text==='@type: Article'));
  assert.ok(buildAnswerContentPlan(data).questions.every(q=>!['price','delivery','minimum'].includes(q.intent)));
});
