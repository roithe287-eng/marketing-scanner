import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {sectorCases,sectorHtml} from './fixtures/noncommerce-sectors';
import {fixture} from './fixtures/report';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose,isNonCommerce,purposePrompt} from '../lib/websitePurpose';
import {classifyIndustry} from '../lib/industryClassifier';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {capturePageEvidence} from '../lib/pageEvidence';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import ReportLayout from '../components/report/ReportLayout';
import type {PdfTextStyle} from '../lib/pdfLayout';

const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);
async function extract(t:TestContext,html:string,url='https://page.example.com/'){
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html;charset=utf-8'}});Object.defineProperty(r,'url',{value:u.href});return r;});
  return extractWebsite(url);
}
function render(report:MarketingReport){Object.assign(globalThis,{React});return load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));}
for(const item of sectorCases)test(`URL-backed sector classification, report, questions and export: ${item.id}`,async t=>{
  const data=await extract(t,sectorHtml(item),`https://${item.id}.example.com/`),purpose=analyzeWebsitePurpose(data);
  assert.ok(isNonCommerce(purpose));assert.equal(purpose.sector?.id,item.id);assert.equal(await classifyIndustry(data),item.category);
  assert.ok(purpose.goal.observed);assert.ok(purpose.goal.evidence.some(e=>e.text===item.action));
  const sector=purpose.sector!;assert.equal(sector.checks.length,6);assert.ok(sector.evidence.length);assert.equal(purpose.checks.length,7);
  const corpus=[data.title,data.description,...data.h1,...data.h2,data.bodyText,...data.siteEditing!.elements.map(e=>e.text)].join('\n');
  for(const c of sector.checks)for(const e of c.evidence)assert.ok(corpus.includes(e.text),'only literal page evidence');
  assert.equal(JSON.parse(purposePrompt(data)).sector.id,item.id);
  const plan=buildAnswerContentPlan(data);assert.deepEqual(plan.questions.map(q=>q.intent),sector.questions.map(q=>q.intent));
  assert.ok(plan.primaryKeyword);assert.notEqual(plan.primaryKeyword.term,'상담');assert.ok(corpus.includes(plan.primaryKeyword.term));
  assert.deepEqual(plan.questions.map(q=>q.question),sector.questions.map(q=>q.question));
  for(const q of plan.questions)assert.equal(q.draft,'','fallback never writes invented answers');
  const questions=citationFallbackQuestions(data,'해봄');assert.equal(questions.length,5);assert.ok(questions[0].question.includes(new URL(data.url).hostname));
  for(const q of sector.questions)assert.ok(questions.some(v=>v.question===q.question));
  assert.doesNotMatch(JSON.stringify(questions),/장바구니|배송|재고|반품|구매 전/);
  const report=MarketingReportSchema.parse(JSON.parse(JSON.stringify(finalizeReportEvidence({...fixture,url:data.url,pageEvidence:capturePageEvidence(data),answerContentPlan:plan},data))));
  const before=JSON.stringify(report),$=render(report);
  assert.equal($('.sector-check').length,6);assert.equal($('.sector-journey>div').length,3);assert.equal($('.report-hero-score').length,0);
  assert.match($('.report-hero-purpose').text(),new RegExp(sector.label.replace(/[·]/g,'.')));
  for(const c of sector.checks){assert.ok($('.sector-check-grid').text().includes(c.label));assert.ok($('.sector-check-grid').text().includes(c.guide));}
  assert.equal($('#report-view-overview-main .report-radar').length,0);assert.equal($('#report-view-overview-questions .answer-content').length,1);
  const blocks=buildReportDocument(report);for(const c of sector.checks){assert.ok(blocks.some(b=>b.text.includes(c.guide)));for(const e of c.evidence)assert.ok(blocks.some(b=>b.text.includes(e.text)));}
  const summary=buildReportSummaryPage(report,measure);assert.ok(summary.lines.some(l=>l.text.includes(sector.label)));
  for(const p of [summary,...buildVisualPdfPages(report,measure)])for(const l of p.lines){assert.ok(l.x>=47&&l.x+l.width<=743,l.text);assert.ok(l.y+l.lineHeight<=1045,l.text);}
  assert.equal(JSON.stringify(report),before,'UI/export do not mutate observations');
});

test('secondary education and blog sections cannot reclassify a franchise homepage',async t=>{
  const item=sectorCases.find(x=>x.id==='franchise')!;
  const data=await extract(t,sectorHtml(item,'<h2>교육 프로그램</h2><p>교육·학습 커리큘럼과 자료실·칼럼 안내입니다.</p>'));
  assert.equal(analyzeWebsitePurpose(data).sector?.id,'franchise');
});
test('an actual insurance article keeps its informational purpose',async t=>{
  const data=await extract(t,'<html><head><title>보험 보장 비교 칼럼</title><meta name="description" content="보험 약관 연구 자료와 출처 안내"></head><body><main><h1>보험 보장 비교 칼럼</h1><p>보험료와 면책을 다루는 연구 자료입니다.</p></main></body></html>');
  assert.equal(analyzeWebsitePurpose(data).kind,'content');assert.equal(analyzeWebsitePurpose(data).sector,undefined);
});
test('commerce, mixed, unknown and navigation-only sector mentions keep their existing layouts',async t=>{
  const data=await extract(t,'<html><head><title>기본 온라인 쇼핑몰</title></head><body><nav>보험 법무법인</nav><main><h1>기본 온라인 쇼핑몰</h1><p>의류 상품을 판매합니다.</p><a href="/buy">구매하기</a></main><footer>개인회생 프랜차이즈</footer></body></html>');
  const p=analyzeWebsitePurpose(data);assert.equal(p.kind,'commerce');assert.equal(p.sector,undefined);
  const report=finalizeReportEvidence({...fixture,url:data.url},data),$=render(report);assert.equal($('.sector-overview').length,0);assert.equal($('#report-view-overview-main [aria-label="8개 영역 근거와 측정 범위"]').length,1);
  const legacy=render(fixture);assert.equal(legacy('.sector-overview').length,0);assert.equal(legacy('.report-radar').length,1);
});
test('a medical page without cost text is a review, not a failed price test',async t=>{
  const data=await extract(t,'<html><head><title>해봄의원 진료 안내</title></head><body><main><h1>해봄의원 진료 안내</h1><p>의료진 소개와 진료 시간·위치를 안내합니다.</p><a href="/reserve">진료 예약</a></main></body></html>');
  const report=finalizeReportEvidence({...fixture,url:data.url},data),price=report.sitePurpose!.sector!.checks.find(c=>c.id==='price')!;
  assert.equal(price.status,'review');assert.equal(price.evidence.length,0);assert.equal(report.checklist!.find(c=>c.id==='price_info')!.status,'review');
  assert.doesNotMatch(report.checklist!.find(c=>c.id==='trust_review')!.guide,/후기.*추가|전후.*추가/);
});
test('an unrelated service main topic wins over incidental sector paragraphs',async t=>{
  const data=await extract(t,'<html><head><title>브랜드 마케팅 컨설팅 서비스</title><meta name="description" content="광고대행과 컨설팅 제공 범위"></head><body><main><h1>브랜드 마케팅 컨설팅</h1><p>법무법인 마케팅 사례를 소개합니다.</p><p>변호사 광고 캠페인을 지원합니다.</p><a href="/contact">상담 문의</a></main></body></html>');
  assert.equal(analyzeWebsitePurpose(data).kind,'service');assert.equal(analyzeWebsitePurpose(data).sector,undefined);
});
test('legal criteria prefer direct service explanations and excerpt around the matched words',async t=>{
  const address='서울 사무소 : 서울특별시 테헤란로 103 (형사, 민사) 부산 사무소 : 부산광역시 중앙대로 100. '.repeat(5);
  const long='페이지의 일반 안내입니다. '.repeat(28)+'상담 절차는 준비 서류를 확인한 뒤 사건을 검토하는 순서입니다.';
  const data=await extract(t,`<html><head><title>법무법인 | 형사·민사 사건 안내</title><meta name="description" content="형사·민사 사건의 취급 업무와 상담 안내"></head><body><main><h1>법무법인 안내</h1><p>${address}</p><p>취급 업무는 형사·민사 사건입니다.</p><p>변호사로서의 윤리와 공정을 실천하겠습니다.</p><p>${long}</p><a href="/consult">법률 상담 문의</a></main></body></html>`);
  const sector=analyzeWebsitePurpose(data).sector!;
  assert.equal(sector.checks.find(c=>c.id==='scope')!.evidence[0].text,'취급 업무는 형사·민사 사건입니다.');
  assert.equal(sector.checks.find(c=>c.id==='proof')!.status,'review','an ethics slogan is not a lawyer biography');
  const process=sector.checks.find(c=>c.id==='process')!;
  assert.ok(process.evidence.some(e=>e.text.includes('상담 절차')));assert.ok(process.evidence.every(e=>e.text.length<=240));
  assert.equal(sector.checks.find(c=>c.id==='contact')!.evidence[0].text,'법률 상담 문의');
});
test('a ministry-designated hospital remains medical and can use an explicit navigation booking action',async t=>{
  const data=await extract(t,'<html><head><title>복지부 지정 관절전문, 해봄병원</title><meta name="description" content="복지부 지정 관절전문병원, 관절·척추 치료 안내"></head><body><header><nav><a href="/login">로그인</a><a href="/reserve">인터넷 진료 예약</a></nav></header><main><p>의료진 소개와 진료 시간·내원 준비사항을 안내합니다.</p><a href="/documents">진료서류 발급 신청</a></main></body></html>');
  const p=analyzeWebsitePurpose(data);assert.equal(p.kind,'service');assert.equal(p.sector?.id,'medical');assert.equal(p.goal.key,'booking');assert.ok(p.goal.evidence.some(e=>e.text==='인터넷 진료 예약'));
});
test('insurance eligibility wording alone does not imply a public support program',async t=>{
  const data=await extract(t,'<html><head><title>보험 신청 자격·가입 조건</title><meta name="description" content="보험 가입 조건과 보장 범위, 보험료 상담"></head><body><main><p>보험료 산정 조건과 면책·감액·제외 사항을 약관에서 확인합니다.</p><a href="/consult">보험 상담 문의</a></main></body></html>');
  assert.equal(analyzeWebsitePurpose(data).sector?.id,'insurance');assert.equal(analyzeWebsitePurpose(data).kind,'service');
});
