import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureMedicalEvidence,medicalSensitiveUrl} from '../lib/medicalEvidence';
import {buildMedicalAudit,medicalPrompt,withMedicalCitation} from '../lib/medicalAudit';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics,diagnosticPageUrl} from '../lib/collectSiteDiagnostics';
import {MedicalAuditSchema} from '../lib/medicalAuditSchema';
import {MarketingReportSchema,type LlmCitationTest} from '../lib/reportSchema';
import {buildMedicalAuditDocument} from '../lib/medicalAuditDocument';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {websiteHttp} from '../lib/security/safeFetch';
import MedicalAuditPanel from '../components/report/MedicalAuditPanel';
import {fixture} from './fixtures/report';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';

const url='https://clinic.example.com/';
const html=(title:string,body='',schema:unknown=null)=>`<html><head><title>${title}</title></head><body><main><h1>${title}</h1>${body}</main>${schema?`<script type="application/ld+json">${JSON.stringify(schema)}</script>`:''}</body></html>`;
const page=(title:string,body='',schema:unknown=null,path='')=>captureSiteDiagnosticSeed(html(title,body,schema),url+path).page;
const clinic=(id='#clinic',name='해봄한의원',telephone='051-123-4567')=>({'@type':'MedicalClinic','@id':id,name,address:{'@type':'PostalAddress',streetAddress:'부산시 예시로 1'},telephone});

test('fourteen profiles are topics with grounded evidence, not credentials',()=>{
  const samples:Record<string,string>={plastic:'해봄성형외과의원',dermatology:'해봄피부과의원',korean:'해봄한의원',primary:'해봄내과의원 건강검진',musculoskeletal:'해봄정형외과의원',dental:'해봄치과의원',ophthalmology:'해봄안과의원',pediatric:'해봄소아청소년과의원',gynecology:'해봄산부인과의원',ent:'해봄이비인후과의원',psychiatry:'해봄정신건강의학과의원',urology:'해봄비뇨의학과의원',hospital:'해봄종합병원',cross_specialty:'해봄의원 비만 탈모'};
  for(const [id,title] of Object.entries(samples)){
    const audit=buildMedicalAudit([page(title)])!;
    assert.ok(audit?.profiles.some(p=>p.id===id),id);
    assert.equal(audit.checks.length,16);
    assert.match(audit.checks[0].detail,/인증 결과가 아닙니다/);
  }
});

test('consulting, generic editorial guides and PhD titles never require facility schema',()=>{
  assert.equal(captureMedicalEvidence(html('병의원 마케팅 컨설팅'),url,true).facilityCandidate,false);
  assert.equal(captureMedicalEvidence(html('좋은 병원 선택 방법 가이드'),url).facilityCandidate,false);
  assert.equal(buildMedicalAudit([page('Doctor of Philosophy 연구소')]),undefined);
});

test('patient-specific routes suppress signals and cannot be sampled as public navigation',()=>{
  for(const path of ['patient/results','medical-records','consult/detail','reservation/complete','mychart']){
    assert.ok(medicalSensitiveUrl(url+path),path);
    assert.equal(diagnosticPageUrl('/'+path,url),null,path);
    const evidence=captureMedicalEvidence(html('해봄한의원','<p>민감한 진료비와 의료진 상담</p>',clinic()),url+path);
    assert.equal(evidence.facilityCandidate,false);assert.deepEqual(evidence.signals,[]);assert.deepEqual(evidence.entities,[]);assert.equal(evidence.textLength,0);
  }
});

test('graph data catches enum misuse, incorrect service values, self-review stars and Korean medicine mapping',()=>{
  const schema={'@graph':[{...clinic(),medicineSystem:'https://schema.org/TraditionalChinese',medicalSpecialty:'KoreanMedicine',availableService:{'@type':'Service',name:'진료'},aggregateRating:{'@type':'AggregateRating',ratingValue:5}},{'@type':'Dermatology'}]};
  const e=captureMedicalEvidence(html('해봄한의원','<p>해봄한의원 051-123-4567</p>',schema),url);
  const issues=e.entities.flatMap(x=>x.issues).join(' ');
  for(const pattern of [/열거값/,/KoreanMedicine/,/availableService/,/통제 리뷰/,/TraditionalChinese/])assert.match(issues,pattern);
});

test('Microdata and RDFa count as observed declarations',()=>{
  const e=captureMedicalEvidence(html('해봄피부과의원',`<section itemscope itemtype="https://schema.org/MedicalClinic"><span itemprop="name">해봄피부과의원</span><span itemprop="address">부산</span></section><section typeof="schema:MedicalClinic"><span property="schema:name">해봄피부과의원</span><span property="schema:address">부산</span></section>`),url);
  assert.deepEqual(e.formats,['Microdata','RDFa']);assert.equal(e.entities.length,1);
  assert.ok(!e.entities[0].issues.some(s=>s.includes('name·PostalAddress')));
});

test('identity differences compare the same explicit entity ID and leave different branches separate',()=>{
  const a=page('해봄한의원','<p>해봄한의원 051-123-4567</p>',clinic(url+'#branch-a'));
  const b=page('해봄한의원','<p>해봄한의원 051-999-9999</p>',clinic(url+'#branch-b','해봄한의원','051-999-9999'),'b');
  const separate=buildMedicalAudit([a,b])!.checks.find(c=>c.id==='identity')!;
  assert.ok(!separate.evidence.some(e=>e.text.includes('동일 @id')));
  b.medicalEvidence!.entities[0].id=url+'#branch-a';
  assert.ok(buildMedicalAudit([a,b])!.checks.find(c=>c.id==='identity')!.evidence.some(e=>e.text.includes('동일 @id')));
});

test('unambiguous same-day hours differences are review candidates, split schedules are manual',()=>{
  const schedule={'@type':'OpeningHoursSpecification',dayOfWeek:'https://schema.org/Saturday',opens:'09:00',closes:'14:00'};
  const a=page('해봄한의원','<p>해봄한의원 051-123-4567</p><p>토요일 09:00~13:00</p>',{...clinic(),openingHoursSpecification:schedule});
  assert.equal(buildMedicalAudit([a])!.checks.find(c=>c.id==='hours')!.status,'needs_review');
  const b=page('해봄한의원','<p>토요일 09:00~13:00</p>',{...clinic(),openingHoursSpecification:[schedule,{...schedule,opens:'15:00',closes:'18:00'}]});
  assert.ok(!b.medicalEvidence!.entities[0].issues.some(s=>s.startsWith('진료시간')));
});

test('external registrations remain unverified, credentials require professional review and Korean context survives GEO questions',()=>{
  const audit=buildMedicalAudit([page('해봄한의원 피부 진료','<p>의료진 소개: 담당 한의사</p>')])!;
  assert.equal(audit.checks.find(c=>c.id==='naver-source')!.status,'unverified');
  assert.equal(audit.checks.find(c=>c.id==='doctors')!.status,'clinical_review');
  assert.equal(audit.checks.find(c=>c.id==='geo')!.status,'unverified');
  assert.match(JSON.stringify(medicalPrompt(audit)),/TraditionalChinese/);
  const d={url,finalUrl:url,title:'해봄한의원',description:'피부 진료',bodyText:'한의과 진료 안내',h1:['해봄한의원'],h2:[],medicalAudit:audit} as unknown as ExtractedWebsiteData;
  const q=citationFallbackQuestions(d,'해봄한의원');assert.equal(q.length,5);assert.ok(q.slice(1).every(x=>x.question.includes('한의원')));
});

test('old reports remain valid and new evidence persists into report snapshots, UI and full document blocks',()=>{
  const audit=buildMedicalAudit([page('해봄한의원')])!;
  assert.ok(MarketingReportSchema.safeParse(fixture).success);
  assert.deepEqual(MedicalAuditSchema.parse(JSON.parse(JSON.stringify(audit))),audit);
  assert.match(JSON.stringify(buildMedicalAuditDocument(audit)),/TraditionalChinese/);
  const markup=renderToStaticMarkup(React.createElement(MedicalAuditPanel,{audit}));
  assert.match(markup,/병의원 맞춤 진단/);
  const $=load(markup);
  assert.equal($('.medical-topic-check').length,audit.checks.length);
  assert.equal($('.medical-topic[open]').length,0);
  for(const check of audit.checks){
    const topic=$('#medical-check-'+check.id);
    assert.equal(topic.find('>summary>strong').text(),check.label);
    assert.equal(topic.find('>.medical-topic-body .medical-topic-detail').text(),check.detail);
    assert.ok(topic.find('>.medical-topic-body').text().includes(check.action));
    assert.equal(topic.find('>summary a, >summary button').length,0);
  }
  assert.match(markup,/공식|Google|네이버/);
});

test('actual API response counts remain distinct from verified own-site citations and impressions',()=>{
  const audit=buildMedicalAudit([page('해봄한의원')])!;
  const response={engine:'chatgpt',question:'해봄한의원 안내는 어디에 있나요?',model:'test-model',measuredAt:'2026-11-04T00:00:00Z',status:'ok',responseText:'공개 안내를 확인하세요.',brandMentioned:true,searchUsed:true,citationVerified:true,sources:[{url,title:'원문',ownership:'own'}]};
  const citation={measurementVersion:2,results:[response,{...response,status:'unverified',citationVerified:false}]} as unknown as LlmCitationTest;
  const result=withMedicalCitation(audit,citation,url)!.checks.find(c=>c.id==='geo')!;
  assert.equal(result.status,'observed');assert.match(result.detail,/답변 2건/);assert.match(result.detail,/자사 URL 인용 1건/);assert.match(result.detail,/실제 노출 실적과 다릅니다/);
  assert.equal(withMedicalCitation(audit,undefined,url),audit);
});

test('medical sampling stays bounded at eight pages and excludes private routes',async t=>{
  const original=websiteHttp.fetch,requested:string[]=[];t.after(()=>websiteHttp.fetch=original);
  websiteHttp.fetch=async input=>{const target=String(input);requested.push(target);return target.endsWith('.txt')||target.endsWith('.xml')?new Response('missing',{status:404}):new Response(html('해봄한의원 진료 안내','<p>의료진 소개 및 진료시간 안내</p>'),{headers:{'content-type':'text/html'}});};
  const links=Array.from({length:12},(_,i)=>`<a href="/department/${i}">진료안내 ${i}</a>`).join('')+'<a href="/patient/results">검사 결과</a>';
  const seed=captureSiteDiagnosticSeed(html('해봄한의원',links),url);
  const d=await collectSiteDiagnostics(url,{seed,robots:{url:url+'robots.txt',observedAt:'2026-11-04T00:00:00Z',status:'ok',text:'User-agent: *\nAllow: /'}});
  assert.equal(d.pages.length,8);assert.ok(d.attempts.length<=14);assert.ok(!requested.some(u=>u.includes('/patient/')));assert.equal(d.medicalAudit!.checks.length,16);
});
