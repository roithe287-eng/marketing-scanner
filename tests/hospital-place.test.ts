import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {hospitalHtml,hospitalPlaceReport,hospitalUrl} from './fixtures/hospital-place-report';
import {buildHospitalPlaceReview,comparePlaceEntries,placeChannel,PLACE_TITLE} from '../lib/hospitalPlace';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {buildAnswerContentDocument} from '../lib/answerContentDocument';
import {buildReportDocument} from '../lib/reportDocument';
import {reportForPresentation} from '../lib/reportPresentation';
import {MarketingReportSchema} from '../lib/reportSchema';
import AnswerContentPanel from '../components/report/AnswerContentPanel';

test('a real clinic homepage supplies four source-bound categories and Place linkage independently of owner settings',()=>{
  const report=MarketingReportSchema.parse(hospitalPlaceReport());
  const review=buildHospitalPlaceReview(report.siteDiagnostics)!;
  assert.equal(review.coverage,'sample');
  assert.deepEqual(review.groups.map(g=>g.terms.map(t=>t.term)),[['어지럼증'],['이석증'],['고막절개술'],['청력검사']]);
  assert.equal(review.link?.kind,'place');
  const $=load(renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:report.answerContentPlan,placeReview:review})));
  assert.equal($('.hospital-place').length,1);
  assert.equal($('.hospital-place textarea').length,4);
  assert.match($('.hospital-place').text(),/등록 상태 · 관리자 확인/);
  const text=buildAnswerContentDocument(report).map(b=>b.text).join('\n');
  assert.ok(buildAnswerContentDocument({...report,answerContentPlan:undefined}).some(b=>b.text.includes(PLACE_TITLE)));
  assert.match(text,/합계 30개/);assert.match(text,/질병 분류로 자동 이전/);
  assert.match(text,/11월 12일/);assert.match(text,/광고만 제외/);
  assert.doesNotMatch(text,/도수치료|족저근막염|최대 10개/);
});

test('eligibility is on the submitted clinic page, never a vendor, directory, vet or a patient record',()=>{
  const base=hospitalPlaceReport().siteDiagnostics!;
  for(const title of ['병의원 마케팅 컨설팅','서울동물병원','좋은병원 찾기 포털','의료기기 쇼핑몰','해봄의원 치료 후기 블로그','부산국회의원','헤어클리닉','식품 쇼핑몰']){
    const page=captureSiteDiagnosticSeed('<title>'+title+'</title><h1>'+title+'</h1><p>진료시간과 의료진 소개. 이석증을 검색합니다.</p>',hospitalUrl).page;
    const child={...base.pages[0],url:hospitalUrl+'case'};
    assert.equal(buildHospitalPlaceReview({...base,pages:[page,child]}),undefined,title);
  }
  const privatePage=captureSiteDiagnosticSeed(hospitalHtml,hospitalUrl+'patient/results',true).page;
  assert.equal(privatePage.medicalEvidence?.place,undefined);
  assert.equal(buildHospitalPlaceReview({...base,targetUrl:privatePage.url,pages:[privatePage]}),undefined);
  assert.equal(buildAnswerContentDocument({...hospitalPlaceReport(),siteDiagnostics:undefined}).some(b=>b.text.includes(PLACE_TITLE)),false);
});

test('only same-site public treatment samples contribute, and a short link is not a verified Place link',()=>{
  const base=hospitalPlaceReport().siteDiagnostics!;
  const service=captureSiteDiagnosticSeed('<title>진료 안내</title><p>질병: 전정신경염</p>',hospitalUrl+'department/ear',true).page;
  const foreign={...service,url:'https://external.example/department',medicalEvidence:{...service.medicalEvidence!,place:{facility:true,terms:[{category:'질병' as const,term:'다른기관항목'}]}}};
  const review=buildHospitalPlaceReview({...base,pages:[...base.pages,service,foreign]})!;
  assert.deepEqual(review.groups[1].terms.map(t=>t.term),['이석증','전정신경염']);
  assert.equal(placeChannel('https://naver.me/abcd','네이버 지도')?.kind,'short');
  for (const url of ['https://naver.me/abcd','https://map.naver.com.evil.com/p/entry/place/13','https://map.naver.com/p/search/병원','https://m.place.naver.com/restaurant/123'])assert.equal(placeChannel(url,'참고'),undefined);
  assert.equal(placeChannel('https://map.naver.com/p/entry/place/123?token=private','지도')?.url,'https://map.naver.com/p/entry/place/123');
  const limited=buildHospitalPlaceReview({...base,limited:true})!;
  assert.equal(limited.coverage,'limited');assert.equal(limited.link,undefined);assert.equal(limited.groups.flatMap(g=>g.terms).length,0);
});

test('operator-provided comparisons count all categories together and distinguish wrong groups from missing text',()=>{
  const report=hospitalPlaceReport(),before=JSON.stringify(report);
  const review=buildHospitalPlaceReview(report.siteDiagnostics)!;
  const inputs={증상:'어지럼증, 이석증',질병:'',시술:'고막 절개술, 고막절개술',검진:''};
  const result=comparePlaceEntries(review,inputs);
  assert.equal(result.count,4);assert.deepEqual(result.duplicates,['고막절개술']);
  assert.deepEqual(result.matches,['어지럼증','고막절개술']);
  assert.deepEqual(result.toCheck,['청력검사']);assert.deepEqual(result.otherCategory,['이석증 (증상 → 질병 확인)']);
  assert.equal(comparePlaceEntries(review,{...inputs,검진:Array.from({length:27},(_,i)=>String(i)).join('\n')}).count,31);
  assert.equal(JSON.stringify(report),before);
});

test('old medical reports update obsolete guidance without inventing keyword evidence',()=>{
  const old=hospitalPlaceReport(),diagnostics=old.siteDiagnostics!;
  diagnostics.medicalAudit!.reviewedOn='2026-11-04';
  diagnostics.medicalAudit!.checks.find(c=>c.id==='naver-source')!.detail='진료 질병명 최대 10개';
  delete diagnostics.pages[0].medicalEvidence!.place;
  const presented=reportForPresentation(old);
  assert.notEqual(presented.siteDiagnostics!.medicalAudit,diagnostics.medicalAudit);
  assert.equal(buildHospitalPlaceReview(presented.siteDiagnostics)?.coverage,'legacy');
  const text=buildReportDocument(old).map(b=>b.text).join('\n');
  assert.doesNotMatch(text,/진료 질병명 최대 10개/);assert.match(text,/네 분류 합계 30개/);
  assert.match(diagnostics.medicalAudit!.checks.find(c=>c.id==='naver-source')!.detail,/최대 10개/);
});
