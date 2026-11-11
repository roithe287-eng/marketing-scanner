import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureLocalPlaceEvidence} from '../lib/localPlaceEvidence';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {LocalPlaceEvidenceSchema} from '../lib/localPlaceSchema';
import {localPlaceQueries,localPlaceItem} from '../lib/collectLocalPlace';
import {buildSeasonalPlaceReview} from '../lib/seasonalPlaceReview';
import {buildLocalPlaceReview} from '../lib/localPlaceReview';
import {SEASONAL_PROFILES,SKI_DESTINATIONS,SEASONAL_PLACE_POLICIES} from '../lib/seasonalPlaceCatalog';
import {buildLocalPlaceDocument} from '../lib/localPlaceDocument';
import LocalPlacePanel from '../components/report/LocalPlacePanel';
import {hospitalPlaceReport} from './fixtures/hospital-place-report';
const url='https://rental.example.com/';
const html=(name:string,body='',address='경상남도 양산시 원동면 123',desc='')=>`<html><head><title>${name}</title><meta name="description" content="${desc}"></head><body><h1>${name}</h1>${address?'<address>'+address+'</address>':''}<main>${body}</main></body></html>`;
const profiles:[string,string][]=[['ski','하이원 스키렌탈샵'],['snow_ice','무주 눈썰매장'],['water_leisure','가평 수상레저 빠지'],['surf_dive','양양 서핑강습'],['beach_pool','부산 파라솔 대여'],['camp_picnic','한강 피크닉대여'],['strawberry','논산 딸기체험농장'],['harvest','제주 감귤체험농장'],['flowers_foliage','춘천 수목원'],['fishing_tidal','태안 갯벌체험'],['holiday_event','서울 크리스마스 트리대여'],['graduation','부산 졸업 꽃다발'],['cooling','부산 에어컨 청소'],['winter_car','원주 윈터타이어'],['seasonal_food','부산 대방어 식당'],['season_event','부산 해돋이 투어 여행사']];
for(const [profile,name] of profiles)test('seasonal offering: '+profile,()=>{const e=captureLocalPlaceEvidence(html(name),url)!;assert.ok(e?.seasonal?.profiles.some(p=>p.id===profile),JSON.stringify(e));assert.deepEqual(LocalPlaceEvidenceSchema.parse(e),e);});
test('all ski destinations and Eden spelling aliases are bounded observed evidence',()=>{
 const names=['하이원','무주','에덴벨리','용평','휘닉스평창','비발디파크','엘리시안강촌','알펜시아','웰리힐리','곤지암','지산스키장','오크밸리'];
 names.forEach((n,i)=>{const e=captureLocalPlaceEvidence(html(n+' 스키렌탈'),url)!;assert.equal(e.seasonal?.destinations[0]?.id,SKI_DESTINATIONS[i].id,n);assert.equal(e.seasonal?.destinations.length,1,n);});
 const eden=captureLocalPlaceEvidence(html('에덴벨리 스키렌탈'),url)!;assert.equal(eden.seasonal?.destinations[0].label,'에덴밸리');assert.equal(eden.seasonal?.destinations[0].matchedAs,'에덴벨리');assert.equal(eden.address,'경상남도 양산시 원동면 123');
});
test('region-only addresses do not manufacture resort or service names',()=>{
 const e=captureLocalPlaceEvidence(html('새길 스키렌탈','스키복 대여','강원특별자치도 평창군 봉평면 123'),url)!;
 const r=buildSeasonalPlaceReview(e,url,'2026-11-12T00:00:00Z')!;
 assert.equal(r.destinations.length,0);assert.ok(r.keywordIdeas.some(x=>x.text==='평창 스키 렌탈'));
 assert.ok(!r.keywordIdeas.some(x=>/용평|휘닉스|강습|무료|할인|최저가/.test(x.text)));
 const noRegion=captureLocalPlaceEvidence(html('새길 스키렌탈','',''),url)!;
 assert.equal(buildSeasonalPlaceReview(noRegion,url,'2026-11-12')?.keywordIdeas.length,0);
});
test('season is an overlay and nearby services never change the business offering',()=>{
 for(const name of ['하이원 스키장 인근 펜션','제주 감귤 라떼 카페','서울 졸업 입학 학원','하이원 스키렌탈 마케팅 대행사','논산 딸기체험 블로그']){
  assert.equal(captureLocalPlaceEvidence(html(name),url)?.seasonal,undefined,name);
 }
 const water=captureLocalPlaceEvidence(html('가평 수상스키 강습'),url)!;
 assert.ok(water.seasonal?.profiles.some(p=>p.id==='water_leisure'));
 assert.ok(!water.seasonal?.profiles.some(p=>p.id==='ski'));
 const food=captureLocalPlaceEvidence(html('제주 대방어 식당'),url)!;assert.equal(food.sector,'restaurant');
});
test('negative, hidden, review and form claims cannot supply seasonal keywords',()=>{
 const e=captureLocalPlaceEvidence(html('하이원 스키렌탈','<p>보드렌탈 미제공</p><p>스키 강습 하지 않습니다</p><form>어린이 강습</form><div hidden>스키복 대여</div><div class="reviews">고객님 보드렌탈 후기</div>'),url)!;
 const r=buildSeasonalPlaceReview(e,url,'2026-11-12')!;
 assert.ok(r.terms.some(t=>t.label==='스키 렌탈'));assert.ok(!r.terms.some(t=>/강습|보드|스키복/.test(t.label)));
});
test('one business can carry multiple explicit seasons without declaring it open now',()=>{
 const e=captureLocalPlaceEvidence(html('가평 캠핑용품 대여','<h2>스키렌탈</h2><h2>파라솔 대여</h2>'),url)!;
 const r=buildSeasonalPlaceReview(e,url,'2026-11-12')!;
 assert.deepEqual(new Set(r.profiles.map(p=>p.id)),new Set(['ski','beach_pool','camp_picnic']));
 assert.ok(r.seasons.includes('겨울')&&r.seasons.includes('여름'));assert.match(r.scope,/실제 운영기간/);
});
test('observed season years survive parsing and old notices are flagged without closed-status inference',()=>{
 const e=captureLocalPlaceEvidence(html('무주 스키렌탈','<p>25/26 시즌 요금표</p><p>2026-12-01 개장 예정</p><p>26–27 시즌 예약 안내</p><footer>copyright 2019</footer>'),url)!;
 assert.deepEqual(e.seasonal?.seasonLabels,['25/26','26–27']);
 const r=buildSeasonalPlaceReview(e,url,'2026-11-12T00:00:00Z')!;assert.deepEqual(r.oldLabels,['25/26']);
 assert.ok(!r.keywordIdeas.some(k=>k.text.includes('25/26')));assert.ok(r.keywordIdeas.some(k=>k.text.includes('26–27'))); // Preserve old evidence, exclude it from current content proposals.
 const january=buildSeasonalPlaceReview(e,url,'2026-01-20T00:00:00Z')!;assert.equal(january.oldLabels.length,0);
});
test('API identity queries use observed resort only when address is absent, never promotional keyword combinations',()=>{
 const e=captureLocalPlaceEvidence(html('새길 스키렌탈','<p>하이원 스키장 픽업 상담</p>',''),url)!;
 assert.deepEqual(localPlaceQueries(e),['새길 스키렌탈 하이원','새길 스키렌탈']);
 assert.equal(localPlaceQueries({...e,address:'경상남도 양산시 원동면 123'})[0],'새길 스키렌탈 경상남도 양산시');
 assert.equal(localPlaceItem({title:'새길 스키렌탈',roadAddress:'강원특별자치도 정선군 고한읍'},e,url)?.match,'candidate');
});
test('seasonal policy scopes, mobile component and report exports agree; old evidence still renders',()=>{
 const report=hospitalPlaceReport();report.url=url;report.siteDiagnostics!.targetUrl=url;
 report.siteDiagnostics!.pages=[captureSiteDiagnosticSeed(html('에덴벨리 스키렌탈','<p>26/27 시즌 영업시간 09:00~20:00</p><p>스키복 대여, 헬멧 별도, 예약 및 반납 안내</p>'),url).page];
 const r=buildLocalPlaceReview(report.siteDiagnostics)!;assert.ok(r.seasonal);
 assert.equal(new Set(SEASONAL_PROFILES.map(p=>p.id)).size,16);
 assert.equal(new Set(SEASONAL_PLACE_POLICIES.map(p=>p.id)).size,5);
 assert.ok(r.policies.some(p=>p.id==='season-inventory'));
 const $=load(renderToStaticMarkup(React.createElement(LocalPlacePanel,{review:r})));
 assert.equal($('.lp-seasonal').length,1);assert.equal($('.lp-seasonal').attr('open'),undefined);assert.match($.text(),/에덴밸리 스키 렌탈/);assert.match($.text(),/검색량·순위/);
 const docs=buildLocalPlaceDocument(report);assert.ok(docs.some(b=>b.text.includes('에덴밸리 스키 렌탈')));assert.ok(docs.some(b=>b.href?.includes('/contents/23188')));
 delete report.siteDiagnostics!.pages[0].localPlaceEvidence!.seasonal;
 assert.equal(buildLocalPlaceReview(report.siteDiagnostics)?.seasonal,undefined);
});

test('ski clothing and summer board rentals never invent winter equipment offerings',()=>{
 const clothes=captureLocalPlaceEvidence(html('무주 스키복 대여'),url)!;
 const review=buildSeasonalPlaceReview(clothes,url,'2026-11-12')!;
 assert.ok(review.terms.some(t=>t.label==='스키복 대여'));
 assert.ok(!review.terms.some(t=>t.label==='스키 렌탈'||t.label==='보드 렌탈'));
 for(const name of ['가평 웨이크보드 렌탈','양양 서핑보드 대여']){
  const e=captureLocalPlaceEvidence(html(name),url)!;
  assert.ok(!e.seasonal?.profiles.some(p=>p.id==='ski'),name);
  assert.ok(e.seasonal?.profiles.length,name);
 }
});
