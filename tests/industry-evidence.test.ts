import test from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {classifyIndustryFromEvidence} from '../lib/industryClassifier';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';

// Reduced public page structures: verify extraction → model → industry together.
const cases=[
 ['무주스키월드 스키렌탈','스키 렌탈과 강습 예약 안내','service','sports','season_ski'],
 ['하이원 스키렌탈','스키 장비 대여와 강습 예약','service','sports','season_ski'],
 ['에덴밸리 보드렌탈','보드 대여와 강습 예약','service','sports','season_ski'],
 ['양양 서핑 강습','서핑보드 대여와 이용 조건','service','sports','season_surf_dive'],
 ['가평 수상레저','웨이크보드와 래프팅 예약','service','sports','season_water_leisure'],
 ['제주 딸기 수확체험','농장 체험 예약 안내','service','travel','season_strawberry'],
 ['부산 동물병원','강아지 고양이 진료 예약 안내','service','pet','place_veterinary'],
 ['반려견 호텔','강아지 위탁 예약과 미용 안내','service','pet','place_pet_care'],
 ['치킨 식당 강남점','프랜차이즈 매장 메뉴와 영업시간 안내','service','food','place_restaurant'],
 ['해운대 카페','커피와 디저트 메뉴 영업시간 안내','service','food','place_cafe'],
 ['성수 네일샵','네일과 피부관리 예약 안내','service','beauty','place_beauty'],
 ['광고 대행','병원과 식당의 마케팅 사례 상담 문의','service','consulting','agency'],
 ['업무 소프트웨어 SaaS','병원과 식당에 제공하는 업무 솔루션 상담','service','it_service','software'],
] as const;
for(const [title,description,kind,industry,book]of cases)test(`extracted industry stays aligned: ${title}`,async t=>{
 const html=`<title>${title}</title><meta name="description" content="${description}"><main><h1>${title}</h1><p>${description}</p><p>부산광역시 해운대구 해운대로 100</p><a href="/contact">문의하기</a></main>`;
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
  const u=new URL(String(input)),robots=u.pathname==='/robots.txt';
  const r=new Response(robots?'User-agent: *\nAllow: /':html,{headers:{'content-type':robots?'text/plain':'text/html'}});
  Object.defineProperty(r,'url',{value:u.href});return r;
 });
 const data=await extractWebsite('https://example.com/'),purpose=analyzeWebsitePurpose(data);
 assert.equal(purpose.kind,kind);
 assert.equal(nonCommercePlaybook(purpose,[data.title,data.description,...data.h1].join(' '),data.diagnosticSeed?.page.localPlaceEvidence).id,book);
 assert.equal(classifyIndustryFromEvidence(data),industry);
});

test('ski products sold online retain commerce classification',async t=>{
 const html='<title>스키 장비 온라인 쇼핑몰</title><main><h1>스키용품 쇼핑</h1><p>스키 장비 판매</p><button>장바구니</button><button>구매하기</button></main><script type="application/ld+json">{"@type":"Product","name":"스키 장비","offers":{"@type":"Offer","price":"100000","priceCurrency":"KRW"}}</script>';
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(new URL(String(input)).pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}}));
 const data=await extractWebsite('https://example.com/');
 assert.equal(analyzeWebsitePurpose(data).kind,'commerce');
 assert.notEqual(classifyIndustryFromEvidence(data),'sports');
});
