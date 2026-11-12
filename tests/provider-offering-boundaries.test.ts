import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {buildCompetitionScope,scopeAllowsKeyword} from '../lib/competitionScope';
import {finalizeSearchCandidates} from '../lib/competitorSelection';
import {captureLocalPlaceEvidence} from '../lib/localPlaceEvidence';
import {localPlaceItem} from '../lib/collectLocalPlace';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';
import {classificationText,offeringClauses,providerIdentity} from '../lib/websiteIdentity';
import {classifyIndustryFromEvidence} from '../lib/industryClassifier';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
const url='https://own.example/';
const html=(title:string,description:string,body='')=>`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><section><h2>제공 업무</h2><p>${description}</p></section>${body}<address>부산광역시 해운대구 센텀로 12</address><a href="/contact">상담 예약</a></main></body></html>`;
const scope=(title:string,description=title,body='')=>captureCompetitorPage(html(title,description,body),url).scope!;
function candidate(title:string,description=title,body=''){
  const link='https://other.example/';
  return {rank:1,searchRank:1,title,description,link,domain:'other.example',...captureCompetitorPage(html(title,description,body),link)};
}
async function extract(t:TestContext,title:string,description:string,body=''){
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const target=new URL(String(input)),robots=target.pathname==='/robots.txt';
    const r=new Response(robots?'User-agent: *\nAllow: /':html(title,description,body),{headers:{'content-type':robots?'text/plain':'text/html'}});
    Object.defineProperty(r,'url',{value:target.href});return r;
  });
  return extractWebsite(url);
}
const roleCases=[
  ['부산 반려동물 사진관','강아지 고양이 프로필 촬영 예약','event','etc','촬영'],
  ['부산 반려동물 법률사무소','반려동물 관련 소송과 법률 상담','legal','legal','법률'],
  ['부산 반려동물 장례식장','강아지 고양이 장례와 추모 상담','funeral','etc','장례'],
  ['부산 병원 전문 세무사','병의원 기장과 세무신고 대행','accounting','legal','기장'],
  ['부산 병원 청소 전문업체','병원과 의원의 정기청소를 제공합니다.','home_service','interior','작업'],
  ['부산 호텔 전문 세탁소','호텔 침구 세탁과 수거 서비스를 제공합니다.','living','etc','세탁'],
  ['부산 식당 식자재 판매점','식당과 카페에 식자재와 소모품을 판매합니다.','retail','commerce','품목'],
  ['부산 치과 장비 판매점','치과에 장비와 소모품을 판매합니다.','retail','commerce','품목'],
  ['부산 법률 교재 서점','변호사 시험 교재와 법률 도서를 판매합니다.','retail','commerce','품목'],
]as const;
for(const[title,description,profile,industry,field]of roleCases)test(`customer nouns do not replace the actual provider: ${title}`,async t=>{
  const data=await extract(t,title,description),p=analyzeWebsitePurpose(data),s=buildCompetitionScope(data);
  assert.equal(s.profile,profile);assert.equal(classifyIndustryFromEvidence(data),industry);
  assert.equal(scope(title,description).profile,profile);
  const book=nonCommercePlaybook(p,providerIdentity(data),data.diagnosticSeed?.page.localPlaceEvidence);
  assert.match(JSON.stringify(book),new RegExp(field));
});
for(const[title,description,other,otherDescription]of [
  ['부산 반려동물 사진관','강아지 프로필 촬영 예약','부산 반려동물 매장','강아지 사료와 용품 판매'],
  ['부산 식당 식자재 판매점','식당 식자재 판매','부산 한식 식당','점심 식사와 메뉴 안내'],
  ['부산 치과 장비 판매점','치과 장비 판매','부산 가온 치과','치과 진료 안내'],
  ['부산 법률 교재 서점','변호사 시험 교재 판매','부산 법률사무소','변호사 법률 상담'],
]as const)test(`final competitor selection rejects the customer's industry: ${title}`,()=>{
  const own=scope(title,description),excluded:any[]=[];
  assert.equal(finalizeSearchCandidates([candidate(other,otherDescription)],'부산',excluded,5,false,own).length,0);
  assert.ok(excluded[0]?.reason);
  assert.equal(finalizeSearchCandidates([candidate(title,description)],'부산',[],5,false,own).length,1);
});
for(const[description,expected]of [
  ['네일은 제공하지 않으며 헤어 커트를 시술합니다.','헤어'],
  ['네일은 제공하지 않고 헤어 커트를 시술합니다.','헤어'],
  ['네일 서비스를 종료했고 헤어 커트를 시술합니다.','헤어'],
  ['네일 시술을 중단했으며 헤어 커트를 시술합니다.','헤어'],
  ['네일 미제공, 헤어 커트를 시술합니다.','헤어'],
  ['헤어 커트를 시술합니다. 네일은 제공하지 않습니다.','헤어'],
  ['헤어 시술은 제공하지 않으며 네일을 시술합니다.','네일'],
]as const)test(`offering clauses retain only the currently provided service: ${description}`,async t=>{
  const title='부산 가온 뷰티살롱',data=await extract(t,title,description),s=buildCompetitionScope(data);
  assert.deepEqual(s.specialties,[expected]);assert.deepEqual(scope(title,description).specialties,[expected]);
  const c=candidate(title,description),hair=scope('부산 헤어 미용실','헤어 커트 시술'),nail=scope('부산 네일샵','네일 시술');
  assert.equal(finalizeSearchCandidates([c],'부산',[],5,false,hair).length,expected==='헤어'?1:0);
  assert.equal(finalizeSearchCandidates([c],'부산',[],5,false,nail).length,expected==='네일'?1:0);
  const terms=data.diagnosticSeed!.page.localPlaceEvidence!.terms.filter(t=>t.group==='상품·서비스').map(t=>t.term);
  assert.ok(terms.includes(expected==='헤어'?'커트':'네일'));
  assert.ok(!terms.includes(expected==='헤어'?'네일':'커트'));
});
test('an offering verb does not promote a separate informational paragraph to a service',()=>{
  const s=scope('부산 헤어 미용실','헤어 커트와 염색을 시술합니다.','<section><h2>참고 안내</h2><p>네일 예약 시 색상 선택을 확인하세요.</p></section>');
  assert.deepEqual(s.specialties,['헤어']);
});
test('two independently stated offerings are both retained',()=>{
  const s=scope('부산 헤어 미용실','헤어 커트를 시술합니다.','<section><h2>추가 시술</h2><p>네일 시술도 제공합니다.</p></section>');
  assert.deepEqual(s.specialties,['헤어','네일']);
});
test('same-category API identity matching uses the photography role, not its pet subject',()=>{
  const title='부산 반려동물 사진관',e=captureLocalPlaceEvidence(html(title,'강아지 사진 촬영'),url)!;
  const matched=localPlaceItem({title,link:url,category:'생활,편의 > 사진,스튜디오 > 반려동물 사진관',roadAddress:e.address},e,url)!;
  assert.equal(matched.match,'consistent');assert.ok(!matched.reasons.some(r=>r.includes('업종이 달라')));
});
for(const[title,wrong,right]of [
  ['부산 반려동물 사진관','강아지','반려동물 사진관'],
  ['부산 반려동물 장례식장','고양이','반려동물 장례'],
  ['부산 호텔 전문 세탁소','호텔','호텔 세탁'],
  ['부산 병원 전문 세무사','병원','병원 세무'],
]as const)test(`competitor queries retain the provider's role: ${title}`,()=>{
  const s=scope(title);
  assert.equal(scopeAllowsKeyword(wrong,s),false);assert.equal(scopeAllowsKeyword(right,s),true);
});
test('seasonal identity preserves the active service next to a discontinued offering',()=>{
  const e=captureLocalPlaceEvidence(html('무주 가온 레저','서핑 강습 서비스를 종료했고 무주 스키 대여 서비스를 제공합니다.'),url)!;
  assert.deepEqual(e.seasonal?.profiles.map(p=>p.id),['ski']);
  assert.ok(e.seasonal?.destinations.some(d=>d.id==='muju'));
});
test('classification preserves independent source boundaries and original conditions',()=>{
  assert.deepEqual(offeringClauses('헤어를 시술합니다.\n네일 예약 시 색상을 확인하세요.'),['헤어를 시술합니다.','네일 예약 시 색상을 확인하세요.']);
  assert.match(classificationText('진료 예약 없이 방문할 수 없습니다.'),/진료 예약/);
});
