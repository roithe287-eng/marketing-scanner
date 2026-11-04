import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {load} from 'cheerio';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose,outOfPurpose,purposePrompt} from '../lib/websitePurpose';
import {classifyIndustry} from '../lib/industryClassifier';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {captureContentSections} from '../lib/contentSections';
import {capturePageEvidence} from '../lib/pageEvidence';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {fixture} from './fixtures/report';
import {captureSiteDiagnosticSeed,buildSiteDiagnosticFindings} from '../lib/siteDiagnostics';
import {buildSourceLibrary,buildContentFacets} from '../lib/reportContent';

// Reduced reproduction of observed CMS structure, source labels and provider identity.
const title='메디컬컨설팅그룹 | 병원 전문 컨설팅, 마케팅, 홈페이지 제작 실행사';
const providerHtml=`<html><head><title>${title}</title><meta name="description" content="병원컨설팅 전문 그룹,병원 전문 컨설팅, 마케팅, 홈페이지 제작 실행사"></head>
<body class="mobile-nav-on fixed-menu-on new_header_site">
<div id="mobile_slide_menu">${Array.from({length:36},(_,i)=>`<a href="/page-${i}">메뉴 ${i}</a>`).join('')}<a href="/contact">상담문의</a></div>
<main><h1>병원 실무자 출신의 전문가</h1><p>개원 전부터 이후까지 지속적으로 관리를 도와드립니다. 컨설팅, 마케팅, 교육, 해외환자 유치 등 전반적인 업무를 도와드립니다.</p>
<p>5단계 성공 로드맵</p><a href="/client-booking">환자 진료 예약 사례</a>
<form><p>회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증과 회원자격 유지를 목적으로 개인정보를 처리합니다.</p><label for="hospital">병원명 / 지역</label><input id="hospital" value="NEVER_CAPTURE_VALUE"><label for="inquiry">희망하는 상담내용을 작성해주세요.</label><textarea id="inquiry">NEVER_CAPTURE_CONTENT</textarea><button type="submit">작성</button></form></main>
<div class="modal"><p>비공개 예약 메뉴의 내용은 본문 근거로 사용하지 않습니다.</p></div></body></html>`;

async function extract(t:TestContext,html=providerHtml,url='https://www.mcg2023.com/'){
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(new URL(String(input)).pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html;charset=utf-8'}}));
  return extractWebsite(url);
}

test('a hospital service provider is consulting; patient-related copy cannot change its contact goal',async t=>{
  const data=await extract(t),p=analyzeWebsitePurpose(data);
  assert.equal(p.sector?.id,'medical_consulting');assert.equal(p.kind,'service');assert.equal(await classifyIndustry(data),'consulting');
  assert.equal(p.goal.key,'contact');assert.equal(p.goal.observed,true);assert.equal(p.goal.evidence[0].text,'상담문의');
  assert.equal(p.sector.checks.find(c=>c.id==='price')!.status,'review');
  const contact=p.sector.checks.find(c=>c.id==='contact')!;
  assert.ok(contact.evidence.some(e=>e.text==='병원명 / 지역'));
  assert.doesNotMatch(JSON.stringify(p),/NEVER_CAPTURE/);
  assert.doesNotMatch(data.bodyText,/NEVER_CAPTURE|회원 가입 의사 확인/);
  assert.doesNotMatch(JSON.stringify(data.siteEditing),/NEVER_CAPTURE|회원 가입 의사 확인/);
  assert.ok(purposePrompt(data).includes('병원이 고객인'));
  const plan=buildAnswerContentPlan(data),geo=citationFallbackQuestions(data,'메디컬컨설팅그룹');
  assert.match(plan.primaryKeyword!.term,/컨설팅/);assert.deepEqual(plan.questions.map(q=>q.intent),['scope','process','price']);
  assert.doesNotMatch(JSON.stringify([...plan.questions.map(q=>q.question),...geo.map(q=>q.question)]),/초진|진료 예약|비급여|진료 시간|장바구니|배송/);
  assert.ok(outOfPurpose('초진 예약 안내를 추가하세요',p));
  assert.ok(!outOfPurpose('병원 마케팅의 성과 보고 범위를 확인하세요',p));
});

test('CMS document state classes keep main text while menu containers and overlays stay excluded',async t=>{
  const sections=captureContentSections(load(providerHtml));
  assert.ok(sections.some(s=>s.text.includes('개원 전부터 이후까지')));
  assert.doesNotMatch(JSON.stringify(sections),/메뉴 35|비공개 예약|NEVER_CAPTURE/);
  const data=await extract(t),elements=data.siteEditing!.elements;
  assert.ok(elements.some(e=>e.kind==='text'&&e.region==='main'&&e.text.includes('개원 전부터')));
  assert.ok(elements.some(e=>e.kind==='cta'&&e.region==='nav'&&e.text==='상담문의'),'a late actionable navigation link survives bounded sampling');
  assert.ok(!elements.some(e=>e.kind==='text'&&e.text.startsWith('메뉴 ')));
});

test('technical entity diagnostics use the same provider distinction without hiding declared medical entities',()=>{
  const page=captureSiteDiagnosticSeed(providerHtml,'https://www.mcg2023.com/').page;
  assert.equal(page.medicalRelevant,false);assert.ok(!buildSiteDiagnosticFindings([page]).some(f=>f.id.startsWith('medical-')));
  const declared=captureSiteDiagnosticSeed(providerHtml.replace('</head>','<script type="application/ld+json">{"@context":"https://schema.org","@type":"MedicalClinic","name":"실제로 선언된 값"}</script></head>'),'https://www.mcg2023.com/').page;
  assert.equal(declared.medicalRelevant,true);assert.equal(declared.medical.length,1);assert.ok(buildSiteDiagnosticFindings([declared]).some(f=>f.id==='medical-0-0'));
});

test('current page evidence drives the profile independently of domain; clinics and editorial pages retain their purpose',async t=>{
  const other=await extract(t,providerHtml,'https://another-provider.example/');
  assert.equal(analyzeWebsitePurpose(other).sector?.id,'medical_consulting');
  const empty={...other,title:'',description:'',h1:[],h2:[],bodyText:'',siteEditing:undefined,buttons:[],ctaButtons:[],url:'https://mcg2023.com/',finalUrl:'https://mcg2023.com/'};
  assert.equal(analyzeWebsitePurpose(empty).sector,undefined);
  const clinic=await extract(t,'<head><title>해봄병원 진료 안내</title><meta name="description" content="관절·척추 진료와 의료진 안내"></head><body><main><h1>해봄병원</h1><p>의료진 소개와 진료 시간·위치 안내입니다.</p><p>병원 마케팅 컨설팅 사례는 협력 업체의 자료입니다.</p><a href="/reserve">진료 예약</a></main></body>');
  assert.equal(analyzeWebsitePurpose(clinic).sector?.id,'medical');assert.equal(await classifyIndustry(clinic),'medical');
  const article={...other,schemaTypes:['Article'],title:'병원 마케팅 컨설팅 칼럼'};
  assert.equal(analyzeWebsitePurpose(article).kind,'content');assert.equal(analyzeWebsitePurpose(article).sector,undefined);
});

test('saved report and document use provider criteria and discard patient-care recommendations',async t=>{
  const data=await extract(t),report=MarketingReportSchema.parse(finalizeReportEvidence({...fixture,url:data.url,pageEvidence:capturePageEvidence(data),answerContentPlan:buildAnswerContentPlan(data),exampleCopy:{...fixture.exampleCopy,ctaText:'진료 예약'},criticalIssues:[{...fixture.criticalIssues[0],title:'초진 예약 안내 부족',problem:'진료 예약이 없습니다.',recommendation:'초진 예약 안내를 추가하세요.'}]},data));
  assert.equal(report.sitePurpose!.sector!.id,'medical_consulting');assert.equal(report.exampleCopy.ctaText,'상담문의');assert.equal(report.criticalIssues.length,0);
  assert.match(report.checklist!.find(c=>c.id==='trust_review')!.label,/담당 조직/);
  assert.match(report.checklist!.find(c=>c.id==='price_info')!.label,/견적 산정/);
  const text=buildReportDocument(report).map(b=>b.text).join('\n');
  const offer=buildContentFacets(buildSourceLibrary(report)).find(f=>f.id==='offer')!;
  assert.ok(offer.evidence.some(e=>e.text.includes('컨설팅')));assert.ok(offer.evidence.every(e=>!/회원 가입 의사|개인정보를 처리/.test(e.text)));
  for(const check of report.sitePurpose!.sector!.checks)assert.ok(text.includes(check.guide));
  assert.ok(text.includes('병원 컨설팅·마케팅'));assert.ok(text.includes('병원명 / 지역'));
});
