import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {classifyIndustryFromEvidence} from '../lib/industryClassifier';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope} from '../lib/competitionScope';
import {reconcileStoredIndustry} from '../lib/storedIndustry';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
import {buildReportDocument} from '../lib/reportDocument';

const url='https://example.com/';
const title='스튜디오 공식 사이트 - 단체복·과잠·기업 유니폼 주문제작';
const description='야구점퍼와 단체복을 주문 제작합니다. 디자인 시안과 자수 사양에 맞춰 견적 및 제작 일정을 안내합니다.';
const bodyText='과잠 원단과 사이즈를 확인하세요.\n로고 시안 확정 후 제작 일정을 안내합니다.';
const shell=(heading:string,intro:string,body:string)=>`<html><head><title>${heading}</title><meta name="description" content="${intro}"></head><body><h1>${heading}</h1><main><p>${body}</p></main><address>부산광역시 해운대구 센텀로 12</address></body></html>`;
const diagnosticSeed=captureSiteDiagnosticSeed(shell(title,description,bodyText),url);
const data={url,finalUrl:url,title,description,h1:[title],h2:[],bodyText,ogDescription:'',isJsHeavy:false,ctaButtons:['시안 / 견적문의'],diagnosticSeed};
test('custom apparel identity follows first-party HTML across report decisions',()=>{
  const p=analyzeWebsitePurpose(data);
  assert.equal(diagnosticSeed.page.localPlaceEvidence?.sector,'custom_apparel');
  assert.equal(p.business?.id,'custom_apparel');
  assert.equal(p.goal.key,'contact');
  assert.equal(p.goal.observed,true);
  assert.equal(classifyIndustryFromEvidence(data),'manufacturing');
  assert.equal(buildCompetitionScope(data).profile,'custom_apparel');
  assert.match(JSON.stringify(buildAnswerContentPlan(data).questions),/원단과 사이즈/);
  assert.equal(analyzeWebsitePurpose({...data,ctaButtons:['시안 문의','장바구니']}).kind,'mixed');
});
test('ambiguous Korean words and customer records do not establish a medical provider',()=>{
  const page=(heading:string,desc:string,body:string)=>captureSiteDiagnosticSeed(shell(heading,desc,body),url).page;
  assert.notEqual(page('창작 스튜디오','시안과 제안과 안내를 확인하세요.','방문 상담').localPlaceEvidence?.sector,'medical');
  assert.equal(page('맑은빛안과','시력 검사와 진료 시간을 안내합니다.','안과 전문의 진료').localPlaceEvidence?.sector,'medical');
  assert.equal(page('병원 유니폼 주문제작','단체복 시안과 자수 견적을 안내합니다.','디자인 시안 문의').medicalRelevant,false);
});
test('retained incorrect industry is rebuilt from the captured page, with dates and scores preserved',()=>{
  const capturedAt='2026-11-01T01:02:03Z';
  const stored=MarketingReportSchema.parse({...fixture,url,sitePurpose:undefined,serviceStrategy:undefined,
    pageEvidence:{version:1,requestedUrl:url,finalUrl:url,capturedAt,title,description,h1:[title],h2:[],bodyText,bodyTruncated:false,ctaButtons:data.ctaButtons},
    siteDiagnostics:{version:1,observedAt:capturedAt,targetUrl:url,limited:false,scopeNote:'입력 페이지',pages:[{...diagnosticSeed.page,localPlaceEvidence:{...diagnosticSeed.page.localPlaceEvidence,sector:'medical'}}],attempts:[],sitemap:{url,status:'unavailable',note:'미확인',declared:false,entries:0,lastmod:0,invalidDates:0,futureDates:0,sampled:false},llms:{url,status:'unavailable',note:'미확인'},crawlers:[],findings:[]},
    industryBenchmark:{category:'medical',categoryLabel:'의료',sampleSize:3,hasSufficientSample:false,summary:'이전 표본'}});
  const corrected=reconcileStoredIndustry(stored);
  assert.equal(corrected.sitePurpose?.business?.id,'custom_apparel');
  assert.equal(corrected.siteDiagnostics?.pages[0].localPlaceEvidence?.sector,'custom_apparel');
  assert.equal(corrected.industryBenchmark,null);
  assert.equal(corrected.answerContentPlan?.observedAt,stored.answerContentPlan?.observedAt||capturedAt);
  assert.deepEqual(corrected.diagnosis,stored.diagnosis);
  assert.equal(reconcileStoredIndustry(corrected),corrected);
  assert.match(buildReportDocument(corrected).map(b=>b.text).join('\n'),/단체복/);
});
