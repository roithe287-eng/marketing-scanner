import assert from 'node:assert/strict';
import {test} from 'node:test';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureBusinessDocument,collectBusinessDocuments,hasBusinessResearch} from '../lib/businessResearch';
import {analyzeBusinessContext,businessPrompt,type BusinessDocument} from '../lib/businessContext';
import {analyzeWebsitePurpose,purposePrompt} from '../lib/websitePurpose';
import {buildAnswerContentPlan,answerSources} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {classifyIndustry} from '../lib/industryClassifier';
import {analyzeBenchmark} from '../lib/analyzeBenchmark';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {MarketingReportSchema} from '../lib/reportSchema';
import {capturePageEvidence} from '../lib/pageEvidence';
import {buildSourceLibrary} from '../lib/reportContent';
import {buildReportDocument} from '../lib/reportDocument';
import {evaluateRobots} from '../lib/robotsRules';
import {extractWebsite} from '../lib/extractWebsite';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import {fixture} from './fixtures/report';

const urls={sydney:'https://sydneydutyfree.com.au/ko',sdf:'https://sdfkorea.com/index.html',pure:'https://pure-australia.com/',trip:'https://www.tripozzy.com/'};
const doc=(url:string,title:string,text:string,source:BusinessDocument['source']='merchant_html'):BusinessDocument=>({url,title,source,capturedAt:'2026-11-03T06:00:00.000Z',sections:[{heading:title,text}]});
const data=(url:string,title:string,description:string,documents:BusinessDocument[]=[]):ExtractedWebsiteData=>({url,finalUrl:url,title,description,ogDescription:'',h1:[],h2:[],bodyText:'',buttons:[],ctaButtons:[],schemaTypes:[],businessDocuments:documents,isJsHeavy:false,siteEditing:undefined,...{ogTitle:'',imageAlts:[],imageCount:0,imageWithoutAlt:0,hasForm:false,hasReviewKeyword:false,hasPriceKeyword:false,hasTrustKeyword:false,hasContactInfo:false,viewportMeta:'',hasFavicon:false,links:[],h3:[],anchorHrefs:[],bodyTextLength:0,trackingScripts:[],redirectChain:[]}} as unknown as ExtractedWebsiteData);
const cases=[
  [data(urls.sydney,'호주 시드니 면세점 공식 사이트','시드니 면세점에서 호주산 건강식품·선물과 매장 쇼핑을 만나보세요.',[doc('https://sydneydutyfree.com.au/ko/pages/faq','면세 이용 FAQ','면세 쇼핑에는 여권과 항공권을 준비하고 출국 전 봉인 조건을 확인하세요.'),doc('https://sydneydutyfree.com.au/ko/pages/about-us','매장 안내','136 Liverpool St, Sydney NSW · 현지 영업시간과 지도에서 매장 위치를 확인하세요.')]),'duty_free','commerce','contact',/여권|봉인/],
  [data(urls.sdf,'호주직구닷컴','호주의 모든것, 호주 직구 쇼핑',[doc('https://sdfkorea.com/shopinfo/guide.html','배송·통관 안내','한국배송과 호주배송은 발송지가 다릅니다. 배송비·통관 조건과 추가 운송료를 주문 전 확인하세요.')]),'cross_border','ecommerce','purchase',/한국발송|통관/],
  [data(urls.pure,'PURE AUSTRALIA','Australian-made health foods and supplements',[doc('https://pure-australia.com/pages/ldv20-official-information','LDV20 공식 정보','Ingredients and the AUST L number are on the product label. Review current cautions before use.')]),'supplements','ecommerce','purchase',/AUST L/],
  [data(urls.trip,'트립호주 Tripozzy','시드니 공항픽업·숙소·투어 예약하기',[doc('https://www.tripozzy.com/fit/38567','공항픽업 예약','날짜·인원과 픽업 위치를 선택하고 예약 확정 안내를 확인하세요.'),doc('https://www.tripozzy.com/fit/42511','포트스테판 투어','상품별 포함·불포함, 날씨·최소 출발 인원과 취소·환불 조건을 확인하세요.')]),'travel_booking','travel','booking',/취소|확정/],
] as const;

for(const[d,id,industry,goal,question]of cases)test(`${id}: purpose, FAQ, GEO and saved report follow the real customer journey`,async()=>{
  const original={title:d.title,h1:[...d.h1],description:d.description,cta:[...d.ctaButtons]};
  const p=analyzeWebsitePurpose(d),plan=buildAnswerContentPlan(d);
  assert.equal(p.business?.id,id);assert.equal(p.goal.key,goal);assert.equal(p.goal.observed,false);
  assert.equal(await classifyIndustry(d),industry);assert.equal(plan.questions.length,3);
  assert.ok(plan.questions.some(q=>question.test(q.question)));assert.equal(plan.scope,'submitted-page-and-business');
  assert.ok(citationFallbackQuestions(d,'브랜드').some(q=>question.test(q.question)));
  assert.ok(p.checks.every(c=>['goal','price'].includes(c.id)||c.id.startsWith('business-')));
  for(const q of plan.questions)assert.ok(new Set(q.evidence.map(e=>e.url)).size<=1,'different product policies must not be merged');
  const report=MarketingReportSchema.parse(finalizeReportEvidence({...fixture,url:d.url,pageEvidence:capturePageEvidence(d),answerContentPlan:plan},d));
  assert.equal(report.sitePurpose?.business?.id,id);
  assert.ok(buildSourceLibrary(report).links.some(l=>l.url===d.businessDocuments![0].url));
  assert.ok(JSON.stringify(buildReportDocument(report)).includes(d.businessDocuments![0].url));
  assert.deepEqual({title:d.title,h1:d.h1,description:d.description,cta:d.ctaButtons},original);
  assert.ok(purposePrompt(d).includes(p.goal.label));
});

test('known domains cannot fabricate a business or evidence from an empty page',()=>{
  for(const url of Object.values(urls))assert.equal(analyzeBusinessContext(data(url,'','')),undefined);
  assert.equal(hasBusinessResearch('https://www.tripozzy.com.evil.example/'),false);
  const article={...cases[3][0],schemaTypes:['Article']};assert.equal(analyzeBusinessContext(article),undefined);
});

test('public travel catalogue extraction omits translations, user state, CSS, reviews and comments',()=>{
  const next={props:{pageProps:{mainData:{banner_product_list:[{id:38567,tour_type:'f',title:'시드니 공항픽업',short_description:'날짜를 선택하는 여행 상품',user_rank:'SECRET',reviews:[{text:'PRIVATE'}]}]},_nextI18Next:{token:'SECRET'}}}};
  const html=`<head><title>트립호주</title></head><body><div><style>.css-123{color:red}</style><p>현지시간과 집결지를 예약 전에 확인하세요.</p></div><div id="comments">예약이 가능한지 궁금한 고객의 질문입니다 PRIVATE</div><div class="review-list">PRIVATE review</div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(next)}</script></body>`;
  const d=captureBusinessDocument(html,urls.trip),serialized=JSON.stringify(d);
  assert.match(serialized,/시드니 공항픽업/);assert.doesNotMatch(serialized,/SECRET|PRIVATE|css-123|color:red/);
  assert.equal(d.source,'merchant_html');
});

test('supplemented merchant claims retain TGA limits instead of certifying efficacy',()=>{
  const p=analyzeBusinessContext(cases[2][0])!;
  assert.match(businessPrompt(p),/효능 사전 승인/);
  assert.match(businessPrompt(p),/국내 건강기능식품 인정/);
  assert.ok(p.checks.some(c=>c.id==='business-regulatory'));
});

test('Shopify encoded filter rules do not stop unrelated public pages, while actual blocks remain enforced',()=>{
  const robots='User-agent: *\nAllow: /\nDisallow: /collections/*%2B*\nDisallow: /cart\nDisallow: /pr%6Ftected';
  assert.equal(evaluateRobots(robots,'JinjjaScanner','/ko/pages/faq').allowed,true);
  assert.equal(evaluateRobots(robots,'JinjjaScanner','/collections/oznex').allowed,true);
  assert.equal(evaluateRobots(robots,'JinjjaScanner','/cart').allowed,false);
  assert.equal(evaluateRobots(robots,'JinjjaScanner','/protected').allowed,false);
  assert.equal(evaluateRobots('User-agent: *\nDisallow: /','JinjjaScanner','/fit/38567').allowed,false);
});

test('blocked and cross-origin redirected research never fetches unpermitted pages and preserves its seed',async t=>{
  const seed=doc(urls.sydney,'시드니 면세점','현재 수집한 공개 메인 페이지의 실제 안내입니다.'),calls:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>{calls.push(String(input));return new Response('',{status:302,headers:{location:'https://other.example/secret'}});});
  const blocked=await collectBusinessDocuments(urls.sydney,{seed,robots:{url:'https://sydneydutyfree.com.au/robots.txt',status:'ok',text:'User-agent: *\nDisallow: /',observedAt:seed.capturedAt}});
  assert.deepEqual(blocked,[seed]);assert.equal(calls.length,0);
  const redirected=await collectBusinessDocuments(urls.sydney,{seed,robots:{url:'https://sydneydutyfree.com.au/robots.txt',status:'missing',observedAt:seed.capturedAt}});
  assert.deepEqual(redirected,[seed]);assert.ok(calls.every(url=>url.startsWith('https://sydneydutyfree.com.au/')));
});

test('robots-restricted search-only report never uses snippets as merchant facts or HTML pass/fail',async t=>{
  const before={id:process.env.NAVER_CLIENT_ID,secret:process.env.NAVER_CLIENT_SECRET};
  process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  t.after(()=>{for(const[k,v]of [['NAVER_CLIENT_ID',before.id],['NAVER_CLIENT_SECRET',before.secret]] as const){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    assert.match(String(input),/^https:\/\/openapi.naver.com\//);
    return new Response(JSON.stringify({items:[{title:'시드니 공항픽업·투어 예약 | 트립호주',link:urls.trip+'fit/38567',description:'예약 확정과 취소 조건을 확인하세요. 무료 혜택을 보장한다는 검색 요약 CLAIM'}]}),{headers:{'content-type':'application/json'}});
  });
  const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>{requests.push(String(input));assert.equal(String(input),'https://www.tripozzy.com/robots.txt');return new Response('User-agent: *\nDisallow: /',{headers:{'content-type':'text/plain'}});});
  const d=await extractWebsite(urls.trip);assert.ok(d);assert.equal(requests.length,1);
  const p=analyzeWebsitePurpose(d),plan=buildAnswerContentPlan(d);
  assert.equal(d.title,'');assert.equal(d.bodyText,'');assert.equal(d.seoEvidence,undefined);
  assert.equal(await analyzeBenchmark(d,fixture.diagnosis,'travel','limited-test'),null);
  assert.equal(p.business?.id,'travel_booking');assert.ok(p.checks.every(c=>c.status==='review'));
  assert.ok(plan.questions.every(q=>q.evidence.length===0&&q.draft===''));
  assert.ok(answerSources(d).every(s=>s.kind!=='body'));
  assert.doesNotMatch(purposePrompt(d),/CLAIM/);
  const report=finalizeReportEvidence({...fixture,url:urls.trip,pageEvidence:capturePageEvidence(d)},d);
  assert.equal(report.evidenceReview?.assessed,0);assert.equal(report.evidenceReview?.score,null);
  assert.ok(report.checklist?.every(c=>c.status!=='pass'&&c.status!=='fail'));
});

test('explicit JinjjaScanner permission restores primary HTML collection and SVG titles are not metadata',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nDisallow: /\nUser-agent: JinjjaScanner\nAllow: /',{headers:{'content-type':'text/plain'}}):new Response('<head><title>실제 페이지 제목</title><meta name="description" content="현재 공개된 안내"></head><body><svg><title>icon-X</title></svg><main><h1>실제 본문 제목</h1><p>공개된 페이지의 실제 안내 문장입니다.</p></main></body>',{headers:{'content-type':'text/html'}}));
  const d=await extractWebsite(urls.trip);
  assert.equal(d.title,'실제 페이지 제목');assert.equal(d.seoEvidence?.titleCount,1);assert.equal(d.collectionNotice,undefined);
});
