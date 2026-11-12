import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {websiteHttp} from '../lib/security/safeFetch';
import {extractWebsite} from '../lib/extractWebsite';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {classifyIndustryFromEvidence} from '../lib/industryClassifier';
import {buildCompetitionScope,scopeAllowsKeyword} from '../lib/competitionScope';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {finalizeSearchCandidates} from '../lib/competitorSelection';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';
import {providerIdentity} from '../lib/websiteIdentity';
import {usableMarketKeyword,marketKeywordCandidates} from '../lib/competitorResearch';
import {buildServiceStrategy} from '../lib/serviceStrategy';
const url='https://own.example/';
const html=(title:string,description:string)=>`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><section><h2>이용 안내</h2><p>${description}</p></section><address>부산광역시 해운대구 센텀로 12</address><a href="/contact">예약·상담 문의</a></main></body></html>`;
async function extract(t:TestContext,title:string,description:string){
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const target=new URL(String(input)),robots=target.pathname==='/robots.txt';
    const response=new Response(robots?'User-agent: *\nAllow: /':html(title,description),{headers:{'content-type':robots?'text/plain':'text/html'}});
    Object.defineProperty(response,'url',{value:target.href});return response;
  });
  return extractWebsite(url);
}
const placeCases=[
  ['약국','pharmacy','medical'],['내과의원','medical','medical'],['법률사무소','legal','legal'],['세무사 사무소','accounting','legal'],
  ['동물병원','veterinary','pet'],['애견호텔','pet_care','pet'],['강아지 분양 매장','pet_store','pet'],
  ['베이커리 카페','cafe','food'],['국밥 식당','restaurant','food'],['호텔','lodging','travel'],['여행사','travel','travel'],
  ['미용실','beauty','beauty'],['영어학원','education','education'],['필라테스','fitness','sports'],
  ['카센터','automotive','automotive'],['인테리어 시공','home_service','interior'],['공인중개사','real_estate','realestate'],
  ['꽃집','retail','commerce'],['박물관','culture','etc'],['사진관','event','etc'],['렌터카','rental','automotive'],
  ['요양원','welfare','etc'],['세탁소','living','etc'],['장례식장','funeral','etc'],
]as const;
for(const[name,profile,industry]of placeCases)test(`ancillary insurance does not replace the actual local provider: ${name}`,async t=>{
  const d=await extract(t,'부산 새길 '+name,'방문·예약·상담 안내. 이용 시 보험 보장 조건을 확인하세요.');
  const p=analyzeWebsitePurpose(d),scope=buildCompetitionScope(d);
  assert.notEqual(p.sector?.id,'insurance');assert.equal(scope.profile,profile);
  assert.equal(classifyIndustryFromEvidence(d),industry);
  assert.equal(scopeAllowsKeyword('보험',scope),false);
});
for(const[title,desc,kind,profile,industry]of [
  ['여행용품 온라인 쇼핑몰','여행 가이드와 캐리어 제품 판매','commerce','commerce','ecommerce'],
  ['해외이사 포장박스 쇼핑몰','해외이사 포장박스와 포장재 제품 판매','commerce','commerce','ecommerce'],
  ['여행 매거진','투어 예약과 여행사 이용법을 소개하는 기사','content','content','media'],
  ['해외이사 블로그','해외이사 운송과 포장 견적을 알아보는 블로그','content','content','media'],
  ['부산 가온 한의원','진료 안내와 호주산 건강식품 영양제 제품 소개','service','medical','medical'],
  ['무주 스키 렌탈','스키 장비 대여와 보험 보장 안내','service','rental','sports'],
]as const)test(`business subject matter cannot override the provider role: ${title}`,async t=>{
  const d=await extract(t,title,desc),p=analyzeWebsitePurpose(d),scope=buildCompetitionScope(d);
  assert.equal(p.kind,kind);assert.equal(scope.profile,profile);assert.equal(classifyIndustryFromEvidence(d),industry);
  const c=captureCompetitorPage(html(title,desc),url);
  assert.equal(c.scope?.kind,kind);assert.equal(c.scope?.profile,profile);
});
test('a clinic headline remains authoritative even when optional Place extraction is unavailable',async t=>{
  const d=await extract(t,'부산 가온 한의원','진료 안내와 호주산 건강식품 영양제 제품 소개');
  delete d.diagnosticSeed;
  assert.equal(analyzeWebsitePurpose(d).business,undefined);
  assert.equal(classifyIndustryFromEvidence(d),'medical');
  assert.equal(scopeAllowsKeyword('영양제',buildCompetitionScope(d)),false);
});
test('hotel planning uses rooms and stays instead of tour-operator steps',async t=>{
  const d=await extract(t,'부산 가온 호텔','여행객의 객실 숙박 예약과 여행 보험 안내'),p=analyzeWebsitePurpose(d);
  const book=nonCommercePlaybook(p,providerIdentity(d),d.diagnosticSeed?.page.localPlaceEvidence);
  assert.equal(p.business,undefined);assert.equal(book.id,'hospitality');
  assert.match(JSON.stringify(buildServiceStrategy(d)),/객실|숙박|체크인/);
  assert.doesNotMatch(JSON.stringify(buildServiceStrategy(d)?.findings),/최소 출발 인원|투어 가이드/);
});
test('rental competitor queries retain the offering and do not become insurance searches',()=>{
  const title='부산 가온 렌터카',description='렌터카 예약과 자동차 보험 보장 조건 안내';
  const scope=captureCompetitorPage(html(title,description),url).scope!;
  const source={url,title,description,h1:[title],keywords:'보험,렌터카',bodyText:description,scope};
  assert.equal(usableMarketKeyword('보험',source),false);
  assert.equal(usableMarketKeyword('렌터카',source),true);
  assert.ok(marketKeywordCandidates(source).some(c=>c.keyword.includes('렌터카')));
  assert.ok(marketKeywordCandidates(source).every(c=>c.keyword!=='보험'));
});
for(const[title,description,expected]of [
  ['부산 가온 보험 대리점','보험 보장 분석과 가입 상담','insurance'],
  ['가온 해외이사','해외이사 운송·포장·통관 견적','international_logistics'],
  ['가온 여행사','투어 예약과 공항 픽업 안내','travel'],
  ['호주 영양제 공식몰','호주산 건강식품 제품 판매','commerce'],
]as const)test(`real providers still establish their own business: ${title}`,()=>{
  const scope=captureCompetitorPage(html(title,description),url).scope!;
  assert.equal(scope.profile,expected);
  if(expected==='insurance')assert.equal(scopeAllowsKeyword('보험',scope),true);
});
for(const[title,description,other,otherDesc,query]of [
  ['여행용품 온라인 쇼핑몰','여행 가이드와 캐리어 제품 판매','가온 여행사','여행 투어 예약','여행'],
  ['해외이사 포장박스 쇼핑몰','해외이사 포장박스 제품 판매','가온 해외이사','해외이사 포장·운송 견적','해외이사'],
  ['부산 가온 렌터카','자동차 보험 보장과 렌터카 대여','부산 보험 대리점','자동차 보험 보장 상담','보험'],
  ['부산 가온 한의원','진료 안내와 호주산 건강식품 영양제 제품 소개','호주 영양제 공식몰','호주산 건강식품 제품 판매','영양제'],
]as const)test(`a misleading shared keyword cannot admit the wrong competitor: ${title}`,()=>{
  const scope=captureCompetitorPage(html(title,description),url).scope!,link='https://other.example/';
  const candidate={rank:1,searchRank:1,title:other,description:otherDesc,link,domain:'other.example',...captureCompetitorPage(html(other,otherDesc),link)};
  const excluded:any[]=[];
  assert.equal(finalizeSearchCandidates([candidate],query,excluded,5,false,scope).length,0);
  assert.ok(excluded[0]?.reason);
});
