import assert from 'node:assert/strict';
import test from 'node:test';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {classifyIndustryFromEvidence,groundedIndustrySuggestion} from '../lib/industryClassifier';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope} from '../lib/competitionScope';
import {reconcileStoredIndustry} from '../lib/storedIndustry';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';

const url='https://example.com/';
function capture(description:string,body:string,title='온결'){
  const html=`<html><head><title>${title}</title><meta name="description" content="${description}"><meta property="og:description" content="${description}"></head><body><main><h1>${title}</h1><p>${body}</p><address>부산광역시 수영구 수영로 100</address></main></body></html>`;
  return {url,finalUrl:url,title,description,ogDescription:description,h1:[title],h2:[],bodyText:body,diagnosticSeed:captureSiteDiagnosticSeed(html,url)};
}

for(const [description,place,industry] of [
  ['신청서 양식과 파일을 다운로드하세요.','restaurant','food'],
  ['대표 썸네일과 카드뉴스를 제작합니다.','beauty','beauty'],
  ['스마트 센서와 계측기를 개발합니다.','retail','commerce'],
  ['카페24 연동을 지원합니다.','cafe','food'],
  ['은행나무 목재로 소품을 만듭니다.','finance','finance'],
  ['가까운 병원, 약국, 은행이 있습니다.','pharmacy','medical'],
  ['보험 상담, 병원, 식당','finance','finance'],
  ['새로운 디자인 시안과 신청 양식을 제공합니다.','medical','medical'],
  ['카페','cafe','food'],
  ['학원','education','education'],
])test('incidental metadata does not select a specialist report: '+description,()=>{
  const data=capture(description,'자료를 확인하세요.');
  assert.equal(data.diagnosticSeed.page.description,description);
  assert.notEqual(data.diagnosticSeed.page.localPlaceEvidence?.sector,place);
  assert.equal(data.diagnosticSeed.page.medicalRelevant,false);
  assert.notEqual(classifyIndustryFromEvidence(data),industry);
  assert.notEqual(buildCompetitionScope(data).profile,place);
  assert.equal(analyzeWebsitePurpose(data).sector,undefined);
});

for(const description of ['고객사는 병원·약국·학원입니다. 포장 상자를 제작합니다.','병원과 약국에 납품하는 포장재를 제조합니다.','고객사: 병원과 약국. 포장 상자를 제작합니다.']){
  test('packaging provider retains its own work: '+description,()=>{
    const data=capture(description,'원하는 상자의 크기와 인쇄 방법을 선택하세요.');
    assert.equal(classifyIndustryFromEvidence(data),'manufacturing');
    assert.equal(buildCompetitionScope(data).profile,'manufacturing');
    assert.equal(data.diagnosticSeed.page.medicalRelevant,false);
  });
}

for(const [description,body,place,industry] of [
  ['동네 로스터리 카페입니다.','오늘의 원두와 커피 메뉴를 확인하세요.','cafe','food'],
  ['예약제로 운영하는 네일샵입니다.','젤네일 시술과 페디큐어 예약을 받습니다.','beauty','beauty'],
  ['반려견 동반 호텔','객실 예약을 받습니다.','lodging','travel'],
  ['카페','저희 카페에서는 원두를 볶아 커피를 제공합니다.','cafe','food'],
])test('genuine site description chooses the matching layout: '+description,()=>{
  const data=capture(description,body);
  assert.equal(data.diagnosticSeed.page.localPlaceEvidence?.sector,place);
  assert.equal(classifyIndustryFromEvidence(data),industry);
});

test('copies of a metadata tag and substring-only AI citations cannot corroborate an industry',()=>{
  for(const [description,evidence,category] of [
    ['병원, 약국, 은행','병원, 약국','medical'],
    ['카페24 연동 서비스','카페24 연동','food'],
    ['대표 썸네일 제작','썸네일 제작','beauty'],
    ['고객사는 병원입니다.','병원입니다','medical'],
    ['금융 소식','금융 소식','finance'],
    ['병원 이용 가이드를 제공합니다.','병원 이용 가이드를 제공합니다.','medical'],
  ]){
    const data=capture(description,description);
    assert.equal(groundedIndustrySuggestion({category,evidence},data),'etc');
  }
  const data=capture('정밀 부품을 제조합니다.','금속 부품 공정과 생산 설비를 소개합니다.');
  assert.equal(groundedIndustrySuggestion({category:'manufacturing',evidence:data.description},data),'manufacturing');
});

test('a generic contact action does not turn a standalone hotel tag into a lodging playbook',()=>{
  const data=capture('호텔','문의 서비스를 제공합니다.');
  assert.notEqual(buildCompetitionScope(data).profile,'hospitality');
  assert.notEqual(classifyIndustryFromEvidence(data),'travel');
});

test('an older restaurant report sourced from 신청서 양식 loses its sector-specific guidance',()=>{
  const data=capture('신청서 양식과 파일을 다운로드하세요.','신청에 필요한 자료입니다.');
  const base=capture('파스타와 스테이크를 제공합니다.','오늘의 메뉴와 예약 안내','온결 양식당').diagnosticSeed.page.localPlaceEvidence!;
  const {contextReviewed,...old}=base;
  const capturedAt='2026-11-01T00:00:00Z';
  const report=MarketingReportSchema.parse({...fixture,url,pageEvidence:{version:1,requestedUrl:url,finalUrl:url,capturedAt,title:data.title,description:data.description,h1:data.h1,h2:[],bodyText:data.bodyText,bodyTruncated:false,ctaButtons:[]},
    siteDiagnostics:{version:1,observedAt:capturedAt,targetUrl:url,limited:false,scopeNote:'입력 페이지',pages:[{...data.diagnosticSeed.page,localPlaceEvidence:{...old,identity:data.title,name:data.title,sector:'restaurant'}}],attempts:[],sitemap:{url,status:'unavailable',note:'미확인',declared:false,entries:0,lastmod:0,invalidDates:0,futureDates:0,sampled:false},llms:{url,status:'unavailable',note:'미확인'},crawlers:[],findings:[]},
    industryBenchmark:{category:'food',categoryLabel:'음식점',sampleSize:3,hasSufficientSample:false,summary:'이전 표본'}});
  const corrected=reconcileStoredIndustry(report);
  assert.equal(corrected.siteDiagnostics?.pages[0].localPlaceEvidence?.sector,'local');
  assert.equal(corrected.industryBenchmark,null);
  assert.deepEqual(corrected.diagnosis,report.diagnosis);
  assert.equal(reconcileStoredIndustry(corrected),corrected);
});
