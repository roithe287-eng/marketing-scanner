import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureBusinessDocument,captureBusinessLinks} from '../lib/businessResearch';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics} from '../lib/collectSiteDiagnostics';
import {purposePrompt,analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildServiceStrategy} from '../lib/serviceStrategy';
import {buildServiceStrategyDocument} from '../lib/serviceStrategyDocument';
import {reportForPresentation} from '../lib/reportPresentation';
import {capturePageEvidence} from '../lib/pageEvidence';
import {captureLocalPlaceEvidence} from '../lib/localPlaceEvidence';
import {localPlaceItem} from '../lib/collectLocalPlace';
import {PLACE_SECTORS} from '../lib/localPlaceCatalog';
import {SEASONAL_PROFILES} from '../lib/seasonalPlaceCatalog';
import {fixture} from './fixtures/report';
import ServiceStrategyPanel from '../components/report/ServiceStrategyPanel';

const url='https://clinic.example.com/';
const page=(body:string)=>`<html><head><title>부산서면 메타한방병원</title></head><body><main>${body}</main></body></html>`;
const home=page('<nav><a href="/doctor">의료진 소개</a><a href="/hospitalization">입원 안내</a><a href="/nonbenefit">비급여 항목</a></nav><p>한의과 진료와 예약 안내</p><a href="/contact">진료 예약</a><address>부산광역시 부산진구 중앙대로 653</address>');
const bodies:Record<string,string>={
  '/doctor':page('<p>정경훈 원장</p><p>이지훈 원장</p><p>의학박사 | 정형외과전문의</p>'),
  '/hospitalization':page('<h2>입원치료 일정</h2><ul><li><span>아침</span><p>혈압측정 및 혈액 검사 - 주치의 회진 - 아침식사</p></li><li>저녁식사 - 전문의/주치의 협진 경과체크</li></ul>'),
  '/nonbenefit':page('<h2>비급여 항목</h2><table><thead><tr><th>명칭</th><th>금액(원)</th></tr></thead><tbody><tr><td>보호자식</td><td>6,000</td></tr><tr><td>상급병실이용료(1인실)</td><td>170,000</td></tr><tr><td>초진기록지</td><td>1,000</td></tr></tbody></table>'),
};

test('public detail crawl reaches doctors, admissions and itemized fees and feeds objective cards',async t=>{
  const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));requests.push(u.pathname);const text=u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':u.pathname==='/'?home:bodies[u.pathname];const r=new Response(text||'not found',{status:text?200:404,headers:{'content-type':u.pathname==='/robots.txt'?'text/plain':'text/html;charset=utf-8'}});Object.defineProperty(r,'url',{value:u.href});return r;});
  const data=await extractWebsite(url),before=analyzeWebsitePurpose(data);
  const diagnostics=await collectSiteDiagnostics(url,{seed:data.diagnosticSeed,robots:data.seoEvidence?.robots});
  data.businessDocuments=diagnostics.pages.flatMap(p=>p.businessDocument?[p.businessDocument]:[]);
  const purpose=analyzeWebsitePurpose(data),plan=buildServiceStrategy(data)!;
  assert.equal(purpose.sector?.id,before.sector?.id);
  assert.match(purposePrompt(data),/정경훈/);assert.match(purposePrompt(data),/170,000/);
  for(const path of Object.keys(bodies))assert.ok(requests.includes(path),path);
  for(const [id,path,pattern] of [['proof','/doctor',/정경훈|이지훈/],['process','/hospitalization',/주치의 회진/],['price','/nonbenefit',/6,000|170,000/]] as const){
    const check=purpose.checks.find(c=>c.id===id)!;assert.equal(check.status,'observed');assert.ok(check.evidence.some(e=>e.locator===url.slice(0,-1)+path&&pattern.test(e.text)),JSON.stringify(check));
  }
  assert.doesNotMatch(JSON.stringify(purpose.checks.find(c=>c.id==='process')),/초진기록지/);
  const html=renderToStaticMarkup(React.createElement(ServiceStrategyPanel,{plan,view:'segments'}));
  const exported=buildServiceStrategyDocument(plan).map(b=>b.text).join('\n');
  for(const text of [html,exported])assert.doesNotMatch(text,/완결성·최신성·동작|미확인은 실제 부재|입력 페이지의 수집 범위에서 해당 문구/);
  assert.match(html,/service-fact-title/);assert.match(html,/정경훈/);assert.match(html,/170,000/);
  const old={...plan,findings:plan.findings.map(f=>({...f,observed:'입력 페이지의 수집 범위에서 해당 문구를 확보하지 못했습니다.',evidence:[]}))};
  const report={...fixture,url,sitePurpose:before,pageEvidence:capturePageEvidence(data),siteDiagnostics:diagnostics,serviceStrategy:old};
  const fixed=reportForPresentation(report);assert.match(JSON.stringify(fixed.serviceStrategy?.findings),/정경훈/);assert.match(JSON.stringify(fixed.serviceStrategy?.findings),/170,000/);
  assert.match(old.findings[0].observed,/확보하지/); // original persisted report remains immutable
});

test('table labels, short names and definition lists survive; hidden fields and reviews do not',()=>{
  const doc=captureBusinessDocument(page('<h2>이용 요금</h2><dl><dt>대여료</dt><dd>20,000원</dd></dl><p>김하늘 변호사</p><div hidden><p>PRIVATE_HIDDEN</p></div><div style="display:none"><p>PRIVATE_CSS</p></div><div class="review"><p>REVIEW_ONLY 100% 만족</p></div><form><input value="PRIVATE_VALUE"><textarea>PRIVATE_NOTE</textarea></form>'),url);
  assert.ok(doc.sections.some(s=>s.text==='대여료: 20,000원'));assert.ok(doc.sections.some(s=>s.text==='김하늘 변호사'));assert.doesNotMatch(JSON.stringify(doc),/PRIVATE_|REVIEW_ONLY/);
});

test('primary industry never changes because another industry appears in a supplemental page',()=>{
  const doc=captureBusinessDocument('<title>법률사무소</title><main><p>김하늘 변호사 상담 분야와 사건 절차 안내</p></main>',url+'article');
  const p=analyzeWebsitePurpose({url,finalUrl:url,title:'메타한방병원',description:'진료 안내',h1:[],h2:[],bodyText:'',businessDocuments:[doc,{...doc,url:'https://other.example/',sections:[{heading:'의료진',text:'EXTERNAL 원장 소개'}]}]});
  assert.equal(p.sector?.id,'medical');assert.doesNotMatch(JSON.stringify(p.checks),/EXTERNAL/);
});

test('regional prefixes need both address and domain agreement; other branches stay candidates',()=>{
  const evidence=captureLocalPlaceEvidence(home,url)!;
  assert.equal(evidence.address,'부산광역시 부산진구 중앙대로 653');
  const raw={title:'메타한방병원',link:url,roadAddress:'부산 부산진구 중앙대로 653'};
  assert.equal(localPlaceItem(raw,evidence,url)?.match,'consistent');
  assert.equal(localPlaceItem({...raw,roadAddress:'서울 강남구 도산대로 1'},evidence,url)?.match,'candidate');
  assert.equal(localPlaceItem({...raw,link:'https://other.example/'},evidence,url)?.match,'candidate');
  assert.equal(localPlaceItem({...raw,title:'메타한방병원 해운대점'},evidence,url)?.match,'candidate');
});

for(const sector of PLACE_SECTORS)test('all place families retain fee and visit source facts: '+sector.id,()=>{
  const name='새길 '+sector.label;
  const html=`<title>${name}</title><script type="application/ld+json">${JSON.stringify({'@type':sector.types[0]||'LocalBusiness',name,url,address:'부산광역시 해운대구 센텀로 12'})}</script><main><h2>이용 요금</h2><table><thead><tr><th>서비스</th><th>가격</th></tr></thead><tbody><tr><td>상담</td><td>20,000원</td></tr></tbody></table><p>운영시간 월~금 09:00~18:00</p></main>`;
  const doc=captureBusinessDocument(html,url);assert.ok(doc.sections.some(s=>s.text.includes('가격: 20,000원')));
  const e=captureLocalPlaceEvidence(html,url);assert.ok(e?.signals.find(s=>s.key==='price')?.excerpt.includes('20,000'),sector.id);
});

for(const profile of SEASONAL_PROFILES)test('seasonal detail source retains rental conditions: '+profile.id,()=>{
  const doc=captureBusinessDocument(`<title>${profile.label}</title><main><h2>예약 및 이용 절차</h2><p>예약 확인 후 대여 · 반납시간 18:00 · 이용요금 30,000원</p></main>`,url+'season');
  assert.ok(doc.sections.some(s=>s.text.includes('반납시간 18:00')));
});
