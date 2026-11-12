import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {classifyIndustryFromEvidence,groundedIndustrySuggestion} from '../lib/industryClassifier';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';
import {buildServiceStrategy} from '../lib/serviceStrategy';
import {answerSources} from '../lib/answerContent';
import {buildPrompt} from '../lib/analyzeMarketing';
import {captureLocalPlaceEvidence} from '../lib/localPlaceEvidence';
import {localPlaceItem} from '../lib/collectLocalPlace';
import {purposeSchemaTypes} from '../lib/websiteIdentity';
const url='https://business.example/';
async function extract(t:TestContext,title:string,description:string,body='',extra='',target=url){
 const html=`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><main><h1>${title}</h1><section><h2>제공 업무</h2><p>${description}</p></section>${body}<a href="/contact">문의하기</a></main>${extra}</body></html>`;
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const robots=u.pathname==='/robots.txt';const r=new Response(robots?'User-agent: *\nAllow: /':html,{headers:{'content-type':robots?'text/plain':'text/html'}});Object.defineProperty(r,'url',{value:u.href});return r;});
 return extractWebsite(target);
}
const cases=[
 ['travel-client','광고 대행사 새길','여행사 광고 제작과 마케팅 상담','<section><h2>고객사 사례</h2><p>시드니 공항픽업 투어 예약과 가이드 운영 안내</p></section>','service','agency','consulting'],
 ['logistics-client','물류 SaaS 업무 소프트웨어','국제물류 포워딩 회사를 위한 업무 솔루션','<section><h2>고객사 사례</h2><p>국제운송 화물 통관과 포장 견적 업무를 지원합니다.</p></section>','service','software','it_service'],
 ['device-maker','치과용 의료기기 제조기업','치과 병원에 공급하는 임플란트 및 장비 제조','','organization','organization','manufacturing'],
 ['clinic-interior','병원 인테리어 시공','의원과 병원을 위한 설계 및 리모델링','','service','home','interior'],
 ['software-lawyer','법무법인 새길 소프트웨어 저작권','변호사 법률 상담과 지식재산 소송','','service','legal','legal'],
 ['beauty-training','새길 미용학원','미용사 자격증 교육과 커리큘럼 수강 신청','','education','education','education'],
 ['marketing-training','마케팅 실무 교육·강의','광고대행 담당자를 위한 교육과 커리큘럼 안내','','education','education','education'],
 ['pet-friendly','반려견 동반 숙소 호텔 새길','여행객의 숙박 예약과 객실 안내','','service','travel_booking','travel'],
 ['pet-only','반려견 호텔 새길','반려견을 위한 위탁 돌봄과 예약 안내','','service','place_pet_care','pet'],
 ['pet-clinic','새길 동물병원','강아지 고양이 진료 예약','','service','place_veterinary','pet'],
 ['human-clinic','새길 한의원','사람의 진료 과목과 진료시간 예약 안내','','service','medical','medical'],
 ['medical-provider','병원 마케팅 컨설팅','병원 마케팅과 개원 컨설팅 서비스','','service','medical_consulting','consulting'],
 ['insurance-software','보험 업무 소프트웨어','보험 대리점을 위한 SaaS 솔루션','','service','software','it_service'],
 ['insurance-agent','새길 보험 상담','보험 보장과 가입 조건 안내','','service','insurance','finance'],
 ['legal-site-builder','법률사무소 홈페이지 제작','변호사를 위한 웹 제작 대행','','service','agency','consulting'],
 ['restaurant-payment','새길 식당','한식 메뉴 예약과 포장 주문 안내','<button>결제하기</button>','service','place_restaurant','food'],
 ['textbook-shop','강의 교재 온라인 쇼핑몰','교육 도서를 판매하는 온라인 쇼핑몰','<button>장바구니</button><button>구매하기</button>','commerce',null,'ecommerce'],
 ['interior-store-no-cart','부산 인테리어 상품 쇼핑몰','인테리어 상품 구매 안내','','commerce',null,'ecommerce'],
 ['interior-products','공간 인테리어 상품','인테리어 상품 안내','<button>구매하기</button>','commerce',null,'ecommerce'],
 ['software-column','소프트웨어 도입 칼럼','업무 도구를 비교하는 기사와 사용자 가이드','','content','content','media'],
 ['hotel-cleaner','호텔 청소 전문 서비스','객실 청소와 위생관리 견적 문의','','service','home','interior'],
 ['negative-offer','부산 청소 서비스','병원 진료와 약국 판매는 제공하지 않습니다. 청소와 소독만 제공합니다.','','service','home','interior'],
] as const;
for(const[id,title,desc,body,kind,book,industry]of cases)test(`industry boundary: ${id}`,async t=>{
 const d=await extract(t,title,desc,body),p=analyzeWebsitePurpose(d),place=d.diagnosticSeed?.page.localPlaceEvidence;
 assert.equal(p.kind,kind);assert.equal(classifyIndustryFromEvidence(d),industry);
 if(book)assert.equal(nonCommercePlaybook(p,[d.title,d.description,...d.h1].join(' '),place).id,book);
 if(['agency','software','home','organization'].includes(book||''))assert.equal(p.business,undefined);
 if(['agency','software','organization'].includes(book||''))assert.equal(place,undefined);
});

for(const type of ['Article','BlogPosting','NewsArticle','Course'])test(`related ${type} cannot change a shop homepage`,async t=>{
 const json=JSON.stringify({'@type':'ItemList',itemListElement:[{'@type':type,url:url+'related/1',name:'다른 문서'}]});
 const d=await extract(t,'새길 치킨 해운대점','식당 메뉴와 영업시간 안내','',`<script type="application/ld+json">${json}</script>`);
 assert.equal(analyzeWebsitePurpose(d).kind,'service');assert.equal(classifyIndustryFromEvidence(d),'food');
 assert.ok(d.schemaTypes.includes(type),'raw SEO observation stays intact');
});
for(const type of ['Article','Course'])test(`own ${type} still determines the page purpose`,async t=>{
 const json=JSON.stringify({'@type':type,mainEntityOfPage:{'@id':url+'guide'},name:'병원 예약 소프트웨어 안내'});
 const d=await extract(t,'병원 예약 소프트웨어 안내','기능과 사용 방법','','<script type="application/ld+json">'+json+'</script>',url+'guide');
 assert.equal(analyzeWebsitePurpose(d).kind,type==='Article'?'content':'education');
});
test('different query document is not the current structured article',()=>{
 assert.deepEqual(purposeSchemaTypes({url:url+'view?id=1',schemaTypes:['Article'],jsonLdSchemas:[{'@type':'Article',url:url+'view?id=2'}]}),[]);
});
test('clients, testimonials and related posts cannot supply a business identity or facts',async t=>{
 const d=await extract(t,'새길','업무 문의 안내','<section><h2>고객사 사례</h2><p>고객사 원장 홍길동 의료진 진료 예약 77777원</p></section><section><h2>관련 글</h2><p>국제물류 포워딩 해외이사 견적 88888원</p></section><section><h2>이용 후기</h2><p>소프트웨어 설치가 편해졌고 지원이 좋았습니다.</p></section>');
 const p=analyzeWebsitePurpose(d);
 assert.equal(p.business,undefined);assert.equal(p.sector,undefined);
 assert.equal(classifyIndustryFromEvidence(d),null);
 for(const value of [JSON.stringify(p.checks),JSON.stringify(answerSources(d)),JSON.stringify(buildServiceStrategy(d)),buildPrompt(d)])assert.doesNotMatch(value||'',/77777|88888|원장 홍길동/);
 assert.match(d.bodyText,/77777/,'literal collected source remains unchanged');
});
test('a supplier profile never borrows a customer price or employee',async t=>{
 const d=await extract(t,'병원 인테리어 시공','의원 리모델링과 공간 설계 상담','<section><h2>고객사 사례</h2><p>고객사 원장 홍길동의 진료비는 77777원입니다.</p></section>');
 const plan=buildServiceStrategy(d)!;
 assert.doesNotMatch(JSON.stringify(plan.findings),/77777|홍길동/);
 assert.doesNotMatch(JSON.stringify(plan.content),/진료비|의료진|비급여/);
 assert.doesNotMatch(buildPrompt(d),/77777|홍길동/);
});
test('another branch document cannot become this branch price evidence',async t=>{
 const d=await extract(t,'새길 카페 해운대점','커피와 메뉴 방문 안내');
 d.businessDocuments=[{url:url+'menu',title:'해운대점 메뉴',source:'merchant_html',capturedAt:new Date().toISOString(),sections:[{heading:'메뉴',text:'해운대점 커피 가격 4000원'}]},{url:url+'other',title:'새길 카페 서면점',source:'merchant_html',capturedAt:new Date().toISOString(),sections:[{heading:'메뉴',text:'서면점 와인 가격 99999원'}]}];
 assert.equal(d.diagnosticSeed?.page.localPlaceEvidence?.branch,'해운대점');
 for(const value of [JSON.stringify(analyzeWebsitePurpose(d).checks),JSON.stringify(answerSources(d)),JSON.stringify(buildServiceStrategy(d)),buildPrompt(d)]){assert.match(value,/4000/);assert.doesNotMatch(value,/99999/);}
});
test('an unrelated local schema does not identify the owner of the page',()=>{
 const html='<title>새길</title><main><h1>새길</h1></main><script type="application/ld+json">'+JSON.stringify({'@type':'Hospital',name:'고객 병원',url:url+'clients/hospital',address:'부산광역시 부산진구 중앙대로 1'})+'</script>';
 assert.equal(captureLocalPlaceEvidence(html,url),undefined);
});
test('a Naver candidate with conflicting industry does not become a matched business',()=>{
 const e=captureLocalPlaceEvidence('<title>새길 동물병원</title><address>부산광역시 해운대구 센텀로 12</address>',url)!;
 const raw={title:e.name,roadAddress:e.address,link:url};
 const wrong=localPlaceItem({...raw,category:'음식점>한식'},e,url)!;
 assert.equal(wrong.match,'candidate');assert.match(wrong.reasons.join(' '),/업종.*달라/);
 assert.equal(localPlaceItem({...raw,category:'건강,의료>동물병원'},e,url)!.match,'consistent');
});

test('AI industry suggestions require eligible verbatim provider evidence',async t=>{
 const d=await extract(t,'새길','맞춤 가구를 제작합니다.','<section><h2>고객사 사례</h2><p>치과 병원 의료진 예약 77777원</p></section>');
 assert.equal(groundedIndustrySuggestion({category:'interior',evidence:'맞춤 가구를 제작합니다.'},d),'interior');
 assert.equal(groundedIndustrySuggestion({category:'medical',evidence:'치과 병원 의료진 예약 77777원'},d),'etc');
 assert.equal(groundedIndustrySuggestion({category:'medical',evidence:'원문에 없는 진료를 제공합니다.'},d),'etc');
 assert.equal(groundedIndustrySuggestion({category:'medical'},d),'etc');
});

for(const client of ['병원 의료진 진료 예약','국제물류 해외이사 포워딩 견적','호주 건강식품 TGA supplements 제품'])test(`a client-only meta description cannot classify the provider: ${client}`,async t=>{
 const d=await extract(t,'새길',`고객사: ${client}`);
 assert.equal(analyzeWebsitePurpose(d).sector,undefined);
 assert.equal(analyzeWebsitePurpose(d).business,undefined);
 assert.equal(classifyIndustryFromEvidence(d),null);
 assert.equal(d.diagnosticSeed?.page.localPlaceEvidence,undefined);
 assert.ok(answerSources(d).every(s=>!s.text.includes('고객사:')));
});

test('local place signals cannot borrow a client address, price or opening hours',()=>{
 const place=captureLocalPlaceEvidence('<title>새길 식당</title><main><h1>새길 식당</h1><section><h2>메뉴</h2><p>한식을 제공합니다.</p></section><section><h2>고객사 사례</h2><address>부산광역시 해운대구 고객로 77</address><p>가격 77777원 영업시간 00:00</p></section></main>',url)!;
 assert.equal(place.sector,'restaurant');assert.equal(place.address,'');
 assert.doesNotMatch(JSON.stringify(place.signals),/77777|00:00/);
});
