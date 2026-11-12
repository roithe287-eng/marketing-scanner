import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {competitionMismatch} from '../lib/competitionScope';
import {finalizeSearchCandidates} from '../lib/competitorSelection';
import {competitorDisplay} from '../lib/competitorDisplay';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {classifyIndustryFromEvidence,groundedIndustrySuggestion} from '../lib/industryClassifier';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
const url='https://own.example/';
function html(title:string,description:string,body=''){
  return `<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><section><h2>제공 업무</h2><p>${description}</p></section>${body}<a href="/contact">상담 문의</a></main></body></html>`;
}
function page(title:string,description=title,body='',target=url){return captureCompetitorPage(html(title,description,body),target);}
function candidate(title:string,description=title,body=''){
  const link='https://other.example/';
  return {rank:1,searchRank:1,title,description,link,domain:'other.example',...page(title,description,body,link)};
}
async function extract(t:TestContext,title:string,description:string,body=''){
  const source=html(title,description,body);
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const target=new URL(String(input)),robots=target.pathname==='/robots.txt';
    const r=new Response(robots?'User-agent: *\nAllow: /':source,{headers:{'content-type':robots?'text/plain':'text/html'}});
    Object.defineProperty(r,'url',{value:target.href});return r;
  });
  return extractWebsite(url);
}

for(const title of ['변호사 시험 교재 쇼핑몰','법률 도서 온라인 쇼핑몰','의료기기 온라인 쇼핑몰','교육 소프트웨어 교재 쇼핑몰','교육용품 쇼핑몰'])test(`goods named after a profession remain commerce: ${title}`,async t=>{
  const d=await extract(t,title,'교재와 제품을 온라인으로 판매합니다.'),p=analyzeWebsitePurpose(d);
  assert.equal(p.kind,'commerce');assert.equal(p.sector,undefined);
  assert.equal(classifyIndustryFromEvidence(d),'ecommerce');
  assert.equal(page(title,'교재와 제품을 온라인으로 판매합니다.').scope?.profile,'commerce');
});
for(const[title,description,kind,profile]of [
  ['쇼핑몰 제작 대행','온라인 쇼핑몰 구축과 웹 제작 대행','service','agency'],
  ['쇼핑몰 업무 소프트웨어','쇼핑몰을 위한 업무 소프트웨어 제공','service','software'],
  ['쇼핑몰 운영 교육','온라인 쇼핑몰 운영 강의와 수강 신청','education','education'],
  ['법무법인 가온','소프트웨어 저작권 법률 상담','service','legal'],
  ['부산 반려견 훈련소','반려견 훈련과 보호자 상담','service','pet_care'],
  ['반려동물 훈련사 교육 학원','사람을 위한 자격증 교육과 수강 신청','education','education'],
]as const)test(`provider and recipient remain distinct: ${title}`,()=>{
  const s=page(title,description).scope!;assert.equal(s.kind,kind);assert.equal(s.profile,profile);
});

const pairs=[
  ['부산 한식 식당','부산 일식 식당','일식 메뉴와 한식 행사 안내'],
  ['부산 헤어 미용실','부산 네일샵','네일 시술과 헤어 관련 이용 안내'],
  ['부산 피부관리','부산 왁싱샵','왁싱 예약과 피부관리 관련 정보'],
  ['부산 강아지 분양 매장','부산 반려동물용품 매장','강아지 사료와 용품 판매'],
  ['부산 세무사 사무소','부산 회계법인','회계감사와 세무 관련 정보'],
  ['부산 카메라 대여','부산 정수기 렌탈','정수기 대여와 렌탈 상담'],
  ['부산 사진관','부산 웨딩 예식장','웨딩 예식과 사진관 관련 정보'],
]as const;
for(const[own,other,desc]of pairs)test(`broad regional keyword cannot merge different specialties: ${own} / ${other}`,()=>{
  const s=page(own).scope!,c=candidate(other,desc),excluded:any[]=[];
  assert.equal(finalizeSearchCandidates([c],'부산',excluded,5,false,s,'own.example').length,0);
  assert.ok(excluded[0]?.reason);
  const same=candidate(own.replace('부산','부산 가온'));
  assert.equal(finalizeSearchCandidates([same],'부산',[],5,false,s,'own.example').length,1);
});
test('an expressly offered second service can establish a genuine overlap',()=>{
  const own=page('부산 세무사 사무소').scope!,other=candidate('부산 회계법인','회계감사와 세무 신고·기장 서비스를 제공합니다.');
  assert.equal(finalizeSearchCandidates([other],'부산',[],5,false,own).length,1);
  assert.ok(other.scope?.specialties.includes('세무'));
});
test('brand-only service metadata can use its own menu rather than a related article',()=>{
  const own=page('부산 헤어 미용실').scope!;
  const direct=candidate('부산 가온 뷰티살롱','방문 예약 안내','<section><h2>시술 메뉴</h2><p>헤어 커트와 염색을 시술합니다.</p></section>');
  assert.equal(finalizeSearchCandidates([direct],'부산',[],5,false,own).length,1);
  for(const heading of ['고객사 사례','관련 글','이용 후기']){
    const c=candidate('부산 가온 뷰티살롱','방문 예약 안내',`<section><h2>${heading}</h2><p>헤어 커트와 염색을 시술합니다.</p></section>`);
    assert.equal(finalizeSearchCandidates([c],'부산',[],5,false,own).length,0,heading);
  }
});
test('an explicitly unavailable specialty cannot become competitor evidence',()=>{
  const c=candidate('부산 가온 뷰티살롱','헤어 시술은 제공하지 않습니다.','<section><h2>시술 메뉴</h2><p>네일을 시술합니다.</p></section>');
  assert.equal(finalizeSearchCandidates([c],'부산',[],5,false,page('부산 헤어 미용실').scope).length,0);
});
test('a shared season cannot override conflicting actual services',()=>{
  const own=page('부산 사진관').scope!,other=page('부산 웨딩 예식장').scope!;
  own.specialties.push('season:season_event');other.specialties.push('season:season_event');
  assert.ok(competitionMismatch(own,other));
});
test('existing saved scopes without specialties are screened from saved original metadata',()=>{
  const own=page('부산 헤어 미용실').scope!,c=candidate('부산 네일샵');
  own.specialties=[];c.scope!.specialties=[];
  const analysis=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:'부산',ourSite:{url,domain:'own.example',title:'부산 헤어 미용실',metaDescription:'헤어 커트와 펌 예약',h1:'부산 헤어 미용실',scope:own},competitors:[c],overallComparison:'이전 후보 비교',ourPositioning:'이전 후보 기준 제안'}}).competitorAnalysis!;
  const before=JSON.stringify(analysis),display=competitorDisplay(analysis);
  assert.equal(display.competitors.length,0);assert.equal(display.overallComparison,undefined);assert.equal(display.ourPositioning,undefined);
  assert.equal(JSON.stringify(analysis),before);
});
test('insufficient saved metadata is not retrospectively asserted to conflict',()=>{
  const own=page('부산 헤어 미용실').scope!,c=candidate('부산 가온 뷰티살롱','방문 예약 안내');
  const analysis=MarketingReportSchema.parse({...fixture,competitorAnalysis:{searchKeyword:'부산',ourSite:{url,domain:'own.example',title:'부산 헤어 미용실',metaDescription:'',h1:'',scope:own},competitors:[c]}}).competitorAnalysis!;
  assert.equal(competitorDisplay(analysis).competitors.length,1);
});
test('a verbatim quote must support the proposed AI industry, not just exist on the page',async t=>{
  const d=await extract(t,'가온','맞춤 가구를 제작합니다. 상담 문의 안내');
  assert.equal(groundedIndustrySuggestion({category:'medical',evidence:'상담 문의 안내'},d),'etc');
  assert.equal(groundedIndustrySuggestion({category:'legal',evidence:'상담 문의 안내'},d),'etc');
  assert.equal(groundedIndustrySuggestion({category:'interior',evidence:'맞춤 가구를 제작합니다.'},d),'interior');
});
test('a customer shop name cannot classify an otherwise unidentified provider',async t=>{
  const d=await extract(t,'고객사: 법률 교재 쇼핑몰','업무 문의 안내');
  assert.notEqual(analyzeWebsitePurpose(d).kind,'commerce');
  assert.notEqual(classifyIndustryFromEvidence(d),'ecommerce');
});
for(const title of ['부산 치과 장비 온라인 쇼핑몰','부산 변호사 시험 교재 쇼핑몰'])test(`a physical shop address cannot turn product subject matter into a Place profession: ${title}`,async t=>{
  const d=await extract(t,title,'제품 판매와 매장 방문 안내','<address>부산광역시 해운대구 센텀로 12</address>');
  assert.equal(d.diagnosticSeed?.page.localPlaceEvidence?.sector,'retail');
  assert.equal(analyzeWebsitePurpose(d).kind,'commerce');
});
