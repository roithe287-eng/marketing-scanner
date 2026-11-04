import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import * as cheerio from 'cheerio';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {captureContentSections} from '../lib/contentSections';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {classifyIndustry} from '../lib/industryClassifier';
import {buildAnswerContentPlan,answerSources} from '../lib/answerContent';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {capturePageEvidence} from '../lib/pageEvidence';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildSourceLibrary,buildContentFacets,type SourceLibrary} from '../lib/reportContent';
import {fixture} from './fixtures/report';

// Reduced public Imweb structure/source phrases from mcg2023.com, 2026-11-04.
const url='https://www.mcg2023.com/';
const consent='회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증 등을 목적으로 개인정보를 처리합니다.';
const service='컨설팅, 마케팅, 교육, 해외환자 유치 등 전반적인 업무를 도와드립니다.';
const html=`<html><head><title>메디컬컨설팅그룹 | 병원 전문 컨설팅, 마케팅, 홈페이지 제작 실행사</title>
<meta name="description" content="병원컨설팅 전문 그룹,병원 전문 컨설팅, 마케팅, 홈페이지 제작 실행사"></head>
<body class="page doz_sys fixed-menu-on new_header_site"><div id="mobile_slide_menu"><a href="/contact">상담문의</a></div>
<main><h1>병원 성공을 위한 경영 전략 컨설팅</h1><p>병원 경영의 전 과정을 함께 고민해보세요! 개원 컨설팅과 경영분석 컨설팅을 안내합니다.</p>
<p>${service}</p><p>개원 컨설팅</p><p>의료서비스교육</p><h2>병원 실무자 출신의 전문가</h2>
<p>병원의 다양한 출신의 직군으로 구성되어 병원 이해도가 높습니다.</p>
<form><div class="form-group privacy"><label>개인정보 수집 및 이용 동의</label>${Array(40).fill(`<p>${consent}</p>`).join('')}<div>물품 배송, 서비스 제공, 요금 결제 및 정산 등을 목적으로 개인정보를 처리합니다.</div></div>
<label for="hospital">병원명 / 지역</label><input id="hospital" value="NEVER_CAPTURE"><button>상담 문의</button></form>
<p>서비스별 진행 절차와 사후 관리 범위는 상담을 통해 안내합니다.</p></main></body></html>`;
async function extract(t:TestContext){
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}}));
 return extractWebsite(url);
}

test('embedded consent never displaces Imweb service copy or consumes form/action evidence',()=>{
 const $=cheerio.load(html),sections=captureContentSections($,url),editing=captureSiteEditing($,url,new Headers());
 assert.ok(sections.some(s=>s.text===service));
 assert.doesNotMatch(JSON.stringify(sections),/회원 가입 의사 확인/);
 assert.ok(editing.elements.some(e=>e.kind==='form'));
 assert.ok(editing.elements.some(e=>e.kind==='cta'&&e.text==='상담 문의'));
 assert.ok(editing.elements.some(e=>e.fields?.some(f=>f.label==='병원명 / 지역')));
 assert.doesNotMatch(JSON.stringify(editing.elements),/회원 가입 의사 확인|NEVER_CAPTURE/);
});

test('short service labels survive collection without reintroducing navigation or hidden policy copy',()=>{
 const sections=captureContentSections(cheerio.load(html),url);
 assert.ok(sections.some(s=>s.text==='개원 컨설팅'));assert.ok(sections.some(s=>s.text==='의료서비스교육'));
 assert.ok(!sections.some(s=>s.text==='상담문의'));
 const wrapped=captureContentSections(cheerio.load('<body><p>개원 전부터 이후까지<br>지속적으로 관리하는 컨설팅 서비스를 제공합니다.</p></body>'),url);
 assert.ok(wrapped.some(s=>s.text==='개원 전부터 이후까지 지속적으로 관리하는 컨설팅 서비스를 제공합니다.'));
});

test('MCG purpose and saved evidence retain provider classification while removing consent from semantic body',async t=>{
 const d=await extract(t),p=analyzeWebsitePurpose(d),plan=buildAnswerContentPlan(d);
 assert.equal(p.sector?.id,'medical_consulting');assert.equal(p.kind,'service');assert.equal(await classifyIndustry(d),'consulting');
 assert.equal(p.goal.key,'contact');assert.equal(p.goal.observed,true);
 assert.equal(d.hasForm,true);assert.equal(d.h1Count,1);
 assert.doesNotMatch(d.bodyText,/회원 가입 의사 확인|요금 결제 및 정산/);
 assert.match(d.bodyText,/서비스별 진행 절차와 사후 관리/);
 assert.match(plan.primaryKeyword!.term,/컨설팅/);
 assert.doesNotMatch(JSON.stringify(plan.questions),/회원 가입 의사 확인|초진 예약|내원 준비/);
 const report=MarketingReportSchema.parse(finalizeReportEvidence({...fixture,url,pageEvidence:capturePageEvidence(d),answerContentPlan:plan},d));
 const facets=buildContentFacets(buildSourceLibrary(report));
 assert.ok(facets.find(f=>f.id==='offer')!.evidence.some(e=>/컨설팅|마케팅/.test(e.text)));
 assert.doesNotMatch(JSON.stringify(facets),/회원 가입 의사 확인/);
});

test('legacy consent text remains available as source data but never becomes a service claim or answer fact',async t=>{
 const d=await extract(t),legacy={...d,bodyText:consent+'\n'+d.bodyText};
 assert.ok(answerSources(legacy).every(s=>s.text!==consent));
 const library=buildSourceLibrary({...fixture,url,pageEvidence:capturePageEvidence(legacy)});
 assert.ok(library.groups.some(g=>g.text===consent));
 assert.ok(buildContentFacets(library).every(f=>f.evidence.every(e=>e.text!==consent)));
});

test('responsive spacing variants do not occupy multiple service evidence cards',()=>{
 const text='컨설팅, 마케팅, 교육, 해외환자 유치 등 전반적인 업무를 도와드립니다.';
 const library:SourceLibrary={groups:[text,text.replace(/ /g,'')].map((text,i)=>({id:String(i),text,kinds:['text'],occurrences:1,heading:'서비스 소개',chrome:false,truncated:false,linkIds:[]})),links:[],rawCount:2,pageUrl:url,newCapture:true};
 assert.equal(buildContentFacets(library).find(f=>f.id==='offer')!.evidence.length,1);
});
