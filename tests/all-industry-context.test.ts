import test from 'node:test';
import assert from 'node:assert/strict';
import {IndustryCategorySchema} from '../lib/industryCategory';
import {classifyIndustryFromEvidence,groundedIndustrySuggestion} from '../lib/industryClassifier';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildCompetitionScope} from '../lib/competitionScope';
import {directIndustries} from '../lib/providerClaims';
import {nonCommerceQuestionGuides} from '../lib/nonCommercePlaybook';
import {providerIdentity} from '../lib/websiteIdentity';
import {placeChecks} from '../lib/placePositioning';
import {scorePosition} from '../lib/competitorPositioning';
import {positionProfile} from '../lib/industryPositioning';
import {positionEditorial} from '../lib/positionEditorial';
import {sectorCases} from './fixtures/noncommerce-sectors';

const url='https://company.example/';
const offerings={
  education:'외국어 수업을 운영합니다.',medical:'외래 진료를 제공합니다.',commerce:'편집숍을 운영합니다.',
  realestate:'상가를 중개합니다.',legal:'법률 상담을 제공합니다.',beauty:'왁싱을 시술합니다.',
  food:'레스토랑을 운영합니다.',travel:'가이드 투어를 기획합니다.',logistics:'국제운송을 대행합니다.',
  fortune:'사주 상담을 진행합니다.',it_service:'예약 소프트웨어를 개발합니다.',manufacturing:'자동차 부품을 생산합니다.',
  finance:'보험 상품을 중개합니다.',consulting:'온라인 광고를 대행합니다.',media:'뉴스레터를 발행합니다.',
  sports:'필라테스 레슨을 진행합니다.',pet:'반려견 미용을 제공합니다.',automotive:'차량을 정비합니다.',
  parenting:'아이 돌봄을 제공합니다.',interior:'맞춤 가구를 제작합니다.',ecommerce:'온라인 쇼핑몰을 운영합니다.',
  event:'웨딩 촬영을 진행합니다.',rental:'정수기 대여를 제공합니다.',business_services:'시설 경비를 대행합니다.',
};
function capture(description:string,title='온결',body='이용 안내를 확인하세요.'){
  const html=`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  return {url,finalUrl:url,title,description,h1:[title],h2:[],ogDescription:description,bodyText:body,ctaButtons:['문의하기'],diagnosticSeed:captureSiteDiagnosticSeed(html,url)};
}
test('coverage follows every named benchmark category',()=>assert.deepEqual(Object.keys(offerings).sort(),IndustryCategorySchema.options.filter(id=>id!=='etc').sort()));
for(const [category,statement] of Object.entries(offerings)){
  test('first-party and client claims take different report paths: '+category,()=>{
    const data=capture(statement),client=capture('고객사 소개: '+statement);
    assert.deepEqual(directIndustries(statement),[category]);
    assert.equal(groundedIndustrySuggestion({category,evidence:statement},data),category);
    assert.equal(classifyIndustryFromEvidence(data),category);
    assert.equal(classifyIndustryFromEvidence(client),null);
    assert.equal(groundedIndustrySuggestion({category,evidence:statement},client),'etc');
    assert.equal(analyzeWebsitePurpose(client).sector,undefined);
    assert.equal(client.diagnosticSeed.page.localPlaceEvidence,undefined);
    assert.equal(client.diagnosticSeed.page.description,client.description);
  });
}
test('declared care service supplies its own comparison profile and customer questions on a brand-only site',()=>{
  const d=capture(offerings.parenting);
  const p=analyzeWebsitePurpose(d);
  assert.equal(p.kind,'service');
  assert.equal(buildCompetitionScope(d).profile,'parenting');
  assert.ok(nonCommerceQuestionGuides(p,providerIdentity(d)).some(q=>q.question===positionEditorial('parenting',1).question));
});
test('different services in own primary sources do not pick an arbitrary direct industry',()=>{
  const d=capture(offerings.parenting,offerings.media);
  assert.equal(analyzeWebsitePurpose(d).declaredIndustry,undefined);
});
const specialists=[...sectorCases,{id:'medical_consulting',title:'병원 경영 컨설팅'}];
for(const c of specialists)test('a specialist mentioned as a supplier client cannot choose the report: '+c.id,()=>{
  const d=capture('납품 실적: '+c.title+'. 포장재를 제조합니다.');
  assert.equal(analyzeWebsitePurpose(d).sector,undefined);
  assert.equal(classifyIndustryFromEvidence(d),'manufacturing');
  assert.equal(buildCompetitionScope(d).profile,'manufacturing');
});

test('business and seasonal client introductions stay out of purpose, questions and competition',()=>{
  for(const phrase of ['단체복 주문제작','시드니 면세점','호주 해외직구','호주산 TGA 영양제 제품','공항 픽업 투어 예약','국제운송 해외이사','무료 만세력 풀이 시작','전화 타로 상담','하이원 스키 렌탈샵']){
    const d=capture('고객사 소개: '+phrase+'. 예약 소프트웨어를 개발합니다.');
    assert.equal(classifyIndustryFromEvidence(d),'it_service',phrase);
    assert.equal(buildCompetitionScope(d).profile,'software',phrase);
    assert.equal(analyzeWebsitePurpose(d).business,undefined,phrase);
  }
});
test('an isolated class label in meta and OG cannot supply an industry through a generic contact action',()=>{
  for(const label of ['필라테스','요가','공인중개사','법률 사무소','부동산 중개 사무소','렌터카','회계','복원','채용 대행 서비스']){
    const d=capture(label,'온결','문의 서비스를 제공합니다.');
    assert.equal(buildCompetitionScope(d).profile,'service',label);
    assert.equal(classifyIndustryFromEvidence(d),null,label);
  }
});

for(const id of Object.keys(placeChecks) as (keyof typeof placeChecks)[])test('local comparison uses its four own criteria and ignores client-only details: '+id,()=>{
  const profile=positionProfile(id),terms=placeChecks[id].map(c=>c[1].split('|')[0]).join(' · ');
  assert.equal(profile.criteria.length,4);
  const own={id:'own',own:true,name:'온결',title:'온결',url,description:terms};
  assert.ok(scorePosition(own,'온결',id).checks.every(c=>c.found));
  assert.ok(scorePosition({...own,description:'고객사 소개: '+terms},'온결',id).checks.every(c=>!c.found));
});

test('saved reports can revise a client-only specialist from their own retained HTML without rescanning',async()=>{
  const {reconcileStoredIndustry}=await import('../lib/storedIndustry');
  const {MarketingReportSchema}=await import('../lib/reportSchema');
  const {fixture}=await import('./fixtures/report');
  const old=analyzeWebsitePurpose(capture('국제운송을 대행합니다.','새길 국제물류','해외이사와 해상 운송 견적 문의'));
  assert.equal(old.business?.id,'international_logistics');
  const d=capture('고객사인 해외이사 전문업체의 국제운송 사례입니다. 예약 소프트웨어를 개발합니다.');
  const capturedAt='2026-11-01T00:00:00Z';
  const saved=MarketingReportSchema.parse({...fixture,url,sitePurpose:old,
    pageEvidence:{version:1,requestedUrl:url,finalUrl:url,capturedAt,title:d.title,description:d.description,h1:d.h1,h2:d.h2,bodyText:d.bodyText,bodyTruncated:false,ctaButtons:d.ctaButtons},
    industryBenchmark:{category:'logistics',categoryLabel:'물류',sampleSize:3,hasSufficientSample:false,summary:'과거 분류'}});
  const view=reconcileStoredIndustry(saved);
  assert.equal(view.sitePurpose?.business,undefined);
  assert.equal(view.sitePurpose?.declaredIndustry?.category,'it_service');
  assert.equal(view.industryBenchmark,null);
  assert.equal(reconcileStoredIndustry(view),view);
  assert.deepEqual(view.diagnosis,saved.diagnosis);
});
