import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureLocalPlaceEvidence} from '../lib/localPlaceEvidence';
import {collectLocalPlace,localPlaceHttp,localPlaceItem} from '../lib/collectLocalPlace';
import {buildLocalPlaceReview} from '../lib/localPlaceReview';
import {PLACE_SECTORS,PLACE_POLICIES,placePolicies,policyPhase} from '../lib/localPlaceCatalog';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics} from '../lib/collectSiteDiagnostics';
import {SiteDiagnosticsSchema} from '../lib/siteDiagnosticsSchema';
import {MarketingReportSchema} from '../lib/reportSchema';
import {websiteHttp} from '../lib/security/safeFetch';
import {buildAnswerContentDocument} from '../lib/answerContentDocument';
import LocalPlacePanel from '../components/report/LocalPlacePanel';
import {hospitalPlaceReport} from './fixtures/hospital-place-report';

const url='https://business.example.com/';
const html=(name:string,body='',type='',desc='')=>`<html><head><title>${name}</title><meta name="description" content="${desc}"></head><body><h1>${name}</h1><address>부산광역시 해운대구 센텀로 12</address>${type?`<script type="application/ld+json">${JSON.stringify({'@type':type,name,url,address:{streetAddress:'부산광역시 해운대구 센텀로 12'}})}</script>`:''}<main>${body}</main></body></html>`;
const sectors:[string,string][]=[['pharmacy','새길 약국'],['finance','새길 은행'],['medical','새길 내과의원'],['legal','새길 법률사무소'],['professional','새길 세무사 사무소'],['veterinary','새길 동물병원'],['pet_care','새길 애견호텔'],['pet_store','새길 강아지고양이매장'],['cafe','새길 베이커리 카페'],['restaurant','새길 국밥 식당'],['lodging','새길 호텔'],['travel','새길 여행사'],['beauty','새길 미용실'],['education','새길 학원'],['fitness','새길 필라테스'],['automotive','새길 카센터'],['home_service','새길 인테리어'],['real_estate','새길 공인중개사'],['retail','새길 꽃집'],['culture','새길 박물관'],['event','새길 사진관'],['rental','새길 렌터카'],['welfare','새길 요양원'],['living','새길 세탁소'],['funeral','새길 장례식장']];
for(const [sector,name] of sectors)test('local identity: '+sector,()=>{const e=captureLocalPlaceEvidence(html(name,'예약과 주차 안내'),url);assert.equal(e?.sector,sector);assert.equal(e?.name,name);});
test('unknown LocalBusiness and restaurant schema brands are eligible without invented industry keywords',()=>{
  assert.equal(captureLocalPlaceEvidence(html('새길','방문 안내','LocalBusiness'),url)?.sector,'local');
  assert.equal(captureLocalPlaceEvidence(html('새길','메뉴 안내','Restaurant'),url)?.sector,'restaurant');
  assert.equal(captureLocalPlaceEvidence(html('새길','예약 안내','','부산의 식당, 점심 메뉴 안내'),url)?.sector,'restaurant');
});
test('provider examples, personal content, private and platform pages do not become local businesses',()=>{
  for(const name of ['병원 마케팅 대행사','법률사무소 홈페이지 제작','식당 뉴스','여행 블로그','펫샵 솔루션'])assert.equal(captureLocalPlaceEvidence(html(name,'<h2>병원 식당 법률사무소 고객사</h2>'),url),undefined,name);
  assert.equal(captureLocalPlaceEvidence(html('진짜마케팅','고객사: 식당, 법률사무소, 동물병원'),url),undefined);
  assert.equal(captureLocalPlaceEvidence(html('온라인 펫샵 쇼핑몰').replace(/<address>.*?<\/address>/,''),url),undefined);
  assert.equal(captureLocalPlaceEvidence(html('법률사무소'),url+'cases/private'),undefined);
  assert.equal(captureLocalPlaceEvidence(html('식당').replace('<title>','<meta name="robots" content="noindex"><title>'),url),undefined);
  assert.equal(captureLocalPlaceEvidence(html('새길 식당'),'https://blog.naver.com/account'),undefined);
});
test('animal services never receive human medical keywords or unconditional human lodging requirements',()=>{
  for(const name of ['동물병원','애견호텔','고양이매장','동물장례']){const e=captureLocalPlaceEvidence(html(name),url)!;assert.notEqual(e.sector,'medical');assert.ok(!placePolicies(e.sector).some(p=>p.id==='medical'));}
  const care=placePolicies('pet_care').find(p=>p.url.endsWith('/1122'))!;assert.match(care.scope,/반려견만|반려동물만/);assert.match(care.scope,/보호자/);
  assert.ok(!placePolicies('legal').some(p=>p.id==='agent'||p.id==='saved'));
});
test('pet-friendly visit conditions do not change a restaurant or hotel into a pet business',()=>{
  assert.equal(captureLocalPlaceEvidence(html('강아지 동반 식당 새길','메뉴 안내','Restaurant'),url)?.sector,'restaurant');
  assert.equal(captureLocalPlaceEvidence(html('반려동물 동반 카페 새길'),url)?.sector,'cafe');
  assert.equal(captureLocalPlaceEvidence(html('새길','','','반려견 동반 호텔'),url)?.sector,'lodging');
  assert.equal(captureLocalPlaceEvidence(html('새길 키즈카페'),url)?.sector,'culture');
});
test('a branch report never borrows another branch or headquarters service terms',()=>{
  const report=hospitalPlaceReport();report.siteDiagnostics!.targetUrl=url;
  report.siteDiagnostics!.pages=[captureSiteDiagnosticSeed(html('새길 카페 해운대점','커피'),url).page,captureSiteDiagnosticSeed(html('새길 카페 서면점','디저트'),url+'seomyeon').page,captureSiteDiagnosticSeed(html('새길 카페','브런치'),url+'headquarters').page];
  const review=buildLocalPlaceReview(report.siteDiagnostics)!;
  assert.ok(review.terms.some(t=>t.term==='커피'));
  assert.ok(!review.terms.some(t=>t.term==='디저트'||t.term==='브런치'));
});
test('observed terms and media exclude forms, hidden content and foreign entities; channels cover industries',()=>{
  const e=captureLocalPlaceEvidence(html('새길 여행사','패키지 상담 예약 <form>고객 민감정보 비자</form><div hidden>골프여행</div><img src="/a" alt="상담실"><img src="/b"><video></video><a href="https://m.place.naver.com/restaurant/123/home">네이버 플레이스</a>'),url)!;
  assert.ok(e.terms.some(t=>t.term==='패키지'));assert.ok(!e.terms.some(t=>t.term==='골프여행'||t.term==='비자'));
  assert.deepEqual(e.media,{images:2,described:1,videos:1});assert.equal(e.links[0].url,'https://m.place.naver.com/restaurant/123');
  assert.ok(!JSON.stringify(e).includes('고객 민감정보'));
});
test('franchise headquarters and named branches remain distinct',()=>{
  const hq=captureLocalPlaceEvidence(html('새길 카페','전국 매장 찾기 · 가맹 문의'),url)!;
  const branch=captureLocalPlaceEvidence(html('새길 카페 해운대점','프랜차이즈 가맹점'),url)!;
  assert.ok(hq.franchise);assert.equal(hq.branch,'');assert.ok(branch.franchise);
  const raw={title:hq.name,link:url,roadAddress:hq.address,category:'음식점>카페'};
  assert.equal(localPlaceItem(raw,hq,url)?.match,'candidate');
  assert.equal(localPlaceItem({...raw,title:branch.name},branch,url)?.match,'consistent');
  assert.equal(localPlaceItem({...raw,title:'새길 카페 서면점'},branch,url)?.match,'candidate');
});
test('name alone does not confirm identity; API text is escaped and private schema fields are absent',()=>{
  const e=captureLocalPlaceEvidence(html('새길 법률사무소'),url)!;
  const raw={title:'<b>새길</b> 법률사무소',description:'<img src=x onerror=alert(1)>상담',link:'javascript:alert(1)',telephone:'010-1234-5678',reviews:999};
  const candidate=localPlaceItem(raw,e,url)!;
  assert.equal(candidate.name,e.name);assert.equal(candidate.link,'');assert.equal(candidate.match,'candidate');assert.equal(candidate.description,'상담');assert.ok(!JSON.stringify(candidate).includes('999'));assert.ok(!JSON.stringify(candidate).includes('010-'));
  assert.equal(localPlaceItem({...raw,roadAddress:e.address},e,url)?.match,'consistent');
});
test('API collector is bounded, deduplicates, distinguishes empty/failure, and never forwards snippets to AI',async t=>{
  const oldId=process.env.NAVER_CLIENT_ID,oldSecret=process.env.NAVER_CLIENT_SECRET;
  process.env.NAVER_CLIENT_ID='test-id';process.env.NAVER_CLIENT_SECRET='test-secret';
  t.after(()=>{if(oldId===undefined)delete process.env.NAVER_CLIENT_ID;else process.env.NAVER_CLIENT_ID=oldId;if(oldSecret===undefined)delete process.env.NAVER_CLIENT_SECRET;else process.env.NAVER_CLIENT_SECRET=oldSecret;});
  const e=captureLocalPlaceEvidence(html('새길 식당'),url)!;
  const requests:URL[]=[];
  const mock=t.mock.method(localPlaceHttp,'fetch',async(input:URL,init:RequestInit)=>{requests.push(new URL(input));assert.equal(new Headers(init.headers).get('X-Naver-Client-Secret'),'test-secret');assert.equal(init.redirect,'error');return Response.json({items:Array.from({length:10},(_,i)=>({title:i===0?e.name:'다른 식당 '+i,roadAddress:e.address,link:url}))});});
  const result=await collectLocalPlace(e,url);assert.equal(requests.length,2);assert.equal(result?.items.length,5);assert.equal(result?.status,'observed');
  assert.ok(requests.every(u=>u.origin==='https://openapi.naver.com'&&u.searchParams.get('display')==='5'&&u.searchParams.get('start')==='1'&&u.searchParams.get('sort')==='random'));
  mock.mock.restore();
  const empty=t.mock.method(localPlaceHttp,'fetch',async()=>Response.json({items:[]}));assert.equal((await collectLocalPlace(e,url))?.status,'empty');empty.mock.restore();
  const failure=t.mock.method(localPlaceHttp,'fetch',async()=>new Response('bad',{status:429}));assert.equal((await collectLocalPlace(e,url))?.status,'error');failure.mock.restore();
  delete process.env.NAVER_CLIENT_ID;assert.equal((await collectLocalPlace(e,url))?.status,'unavailable');assert.equal((await collectLocalPlace(e,url,true))?.status,'limited');
});
test('diagnosis persists lookup and source facts, with old reports remaining readable',async t=>{
  const seed=captureSiteDiagnosticSeed(html('새길 법률사무소','형사 상담 · 예약과 주차 안내'),url);
  t.mock.method(websiteHttp,'fetch',async()=>new Response('',{status:404}));
  const diag=await collectSiteDiagnostics(url,{seed,robots:{url:url+'robots.txt',observedAt:'2026-11-12T00:00:00Z',status:'missing'}});
  const parsed=SiteDiagnosticsSchema.parse(diag);assert.ok(parsed.localPlaceLookup);assert.equal(parsed.pages[0].localPlaceEvidence?.sector,'legal');
  const report={...hospitalPlaceReport(),url,siteDiagnostics:parsed};assert.ok(MarketingReportSchema.parse(report).siteDiagnostics?.localPlaceLookup);
  delete parsed.localPlaceLookup;assert.equal(buildLocalPlaceReview(parsed)?.lookup.status,'not_queried');
  delete parsed.pages[0].localPlaceEvidence;assert.equal(buildLocalPlaceReview(parsed),undefined);
});
test('screen and document show matching policy scope, status and conservative observations',()=>{
  const report=hospitalPlaceReport();report.url=url;report.siteDiagnostics!.targetUrl=url;
  report.siteDiagnostics!.pages=[captureSiteDiagnosticSeed(html('새길 식당','메뉴 가격 10000원 · 주차 · 예약'),url).page];
  report.siteDiagnostics!.localPlaceLookup={status:'observed',observedAt:'2026-11-12T01:00:00Z',queries:['새길 식당'],items:[localPlaceItem({title:'새길 식당',link:url,roadAddress:'부산광역시 해운대구 센텀로 12',category:'음식점>한식'},report.siteDiagnostics!.pages[0].localPlaceEvidence!,url)!],note:'검색 표본'};
  const review=buildLocalPlaceReview(report.siteDiagnostics)!;
  const $=load(renderToStaticMarkup(React.createElement(LocalPlacePanel,{review})));
  assert.equal($('.lp-candidates details').length,1);assert.equal($('.lp-checks article').length,6);
  assert.equal($('.lp-policies article').length,review.policies.length);assert.match($.text(),/등록 상태는 자동 조회되지 않습니다/);assert.match($.text(),/시행 예정/);assert.ok($('.lp-fold:not(.lp-candidates .lp-fold)').toArray().every(el=>$(el).attr('open')===undefined));
  const blocks=buildAnswerContentDocument(report);assert.ok(blocks.some(b=>b.text.includes('동일 업체 근거 일치')));assert.ok(blocks.some(b=>b.href?.endsWith('/1155')));assert.ok(blocks.some(b=>b.text.includes('시행 예정')));
});
test('policy registry has valid scopes and preserves KST effective dates',()=>{
  assert.equal(new Set(PLACE_POLICIES.map(p=>p.id)).size,PLACE_POLICIES.length);
  assert.ok(PLACE_POLICIES.every(p=>p.sectors.every(s=>s==='all'||PLACE_SECTORS.some(x=>x.id===s))));
  const saved=PLACE_POLICIES.find(p=>p.id==='saved')!;
  assert.equal(policyPhase(saved,'2026-11-17T14:59:59Z'),'시행 예정');assert.equal(policyPhase(saved,'2026-11-17T15:00:00Z'),'적용 범위 확인');
  assert.match(saved.scope,/기본 검색 순서와 광고/);
});
