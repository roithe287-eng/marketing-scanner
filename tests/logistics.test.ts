import {test} from 'node:test';
import assert from 'node:assert/strict';
import {websiteHttp} from '../lib/security/safeFetch';
import {extractWebsite} from '../lib/extractWebsite';
import {captureBusinessDocument,collectBusinessDocuments,hasBusinessResearch} from '../lib/businessResearch';
import {analyzeBusinessContext,businessPrompt} from '../lib/businessContext';
import {analyzeWebsitePurpose,showProductCollection,purposePrompt} from '../lib/websitePurpose';
import {buildAnswerContentPlan,answerSources} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {classifyIndustry} from '../lib/industryClassifier';
import {IndustryCategorySchema} from '../lib/reportSchema';
import {positionProfile} from '../lib/industryPositioning';

const url='https://www.pumyang.com/';
// Reduced public markup reproducing the site's generic title, navigation CTA,
// separate consent modal, service paragraphs and customer testimonial region.
const home=`<head><title>범양해운</title><meta name="description" content="범양해운"></head><body>
<header><h1>범양해운</h1><nav><a href="/customer/07/">상담신청</a><button>회사소개서 다운로드</button></nav></header>
<div class="privacy_modal"><p>개인정보 처리방침의 PRIVATE_POLICY: 물품 배송, 요금 결제 및 정산을 처리합니다.</p></div>
<main><section><p>안전하고 신속한 해외이사 서비스</p><p>편안하고 빠른 귀국이사 서비스</p></section>
<section class="main_review"><p>저는 해외이사 견적 777만원으로 2일 만에 배송 받았어요. REVIEW_ONLY</p></section></main></body>`;
const processHtml=`<head><title>범양해운</title></head><body><main><h2>해외이사 절차</h2>
<p>견적 및 방문상담 후 계약 및 작업일 확정</p><p>컨테이너 포장작업과 해상운송 절차</p>
<p>서류 안내 및 이사화물 수입통관</p><p>파손물품 확인 및 보험보상 처리 안내</p></main></body>`;
const freight=`<head><title>범양해운</title></head><body><main><h2>국제운송</h2><p>국제운송과 기업 수출입 화물의 해상운송·항공운송 서비스를 안내합니다.</p></main></body>`;
const quote=`<head><title>범양해운</title></head><body><main><h2>상담신청</h2><form>
<dl><dt>출발지</dt><dd><input value="PRIVATE_CUSTOMER" placeholder="국가명을 입력하세요."></dd>
<dt>도착지</dt><dd><input value="PRIVATE_ADDRESS"></dd><dt>특이사항 및 요청사항</dt><dd><textarea>PRIVATE_NOTE</textarea></dd></dl>
<input type="hidden" value="PRIVATE_TOKEN"><button>문의</button></form></main></body>`;
const docs=()=>[captureBusinessDocument(home,url),captureBusinessDocument(processHtml,url+'oversea/01/'),captureBusinessDocument(freight,url+'international/01/'),captureBusinessDocument(quote,url+'customer/07/')];

test('live-shaped homepage follows logistics quote journey, without retail requirements or testimonial terms',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}}):new Response(home,{headers:{'content-type':'text/html'}}));
  const data=await extractWebsite(url),original={title:data.title,h1:[...data.h1],cta:[...data.ctaButtons]};
  assert.doesNotMatch(data.bodyText,/PRIVATE_POLICY/);
  assert.equal(analyzeWebsitePurpose(data).business?.id,'international_logistics','main page alone identifies the service before product crawling');
  data.businessDocuments=docs();
  const purpose=analyzeWebsitePurpose(data),plan=buildAnswerContentPlan(data);
  assert.equal(purpose.kind,'service');assert.equal(purpose.goal.key,'contact');assert.equal(purpose.goal.observed,true);
  assert.deepEqual(purpose.goal.evidence.map(e=>e.text),['상담신청']);
  assert.equal(showProductCollection(purpose),false);assert.equal(await classifyIndustry(data),'logistics');
  assert.equal(plan.primaryKeyword?.term,'해외이사');assert.equal(plan.questions.length,3);
  assert.match(plan.questions[0].question,/견적/);assert.match(plan.questions[1].question,/기업 화물/);assert.match(plan.questions[2].question,/보험/);
  assert.ok(plan.questions.some(q=>q.evidence.some(e=>e.url===url+'customer/07/')));
  assert.doesNotMatch(JSON.stringify(purpose.business?.checks),/REVIEW_ONLY|777만원/);
  assert.doesNotMatch(JSON.stringify(answerSources(data)),/REVIEW_ONLY|PRIVATE_/);
  assert.match(purposePrompt(data),/클릭을 계약 성과로 단정하지/);
  assert.ok(citationFallbackQuestions(data,'범양해운').some(q=>/통관/.test(q.question)));
  assert.deepEqual({title:data.title,h1:data.h1,cta:data.ctaButtons},original,'detail evidence must not overwrite homepage measurements');
});

test('form inventory preserves route labels without reading values or modal controls',()=>{
  const doc=captureBusinessDocument(quote.replace('<main>','<div class="privacy_modal"><form><label>HIDDEN_MODAL</label></form></div><main>'),url+'customer/07/');
  assert.match(JSON.stringify(doc),/출발지.*도착지/);
  assert.doesNotMatch(JSON.stringify(doc),/PRIVATE_|HIDDEN_MODAL/);
});

test('empty domains, articles, travel and isolated retail mentions do not become logistics providers',()=>{
  const base={url,finalUrl:url,title:'',description:'',h1:[],h2:[],bodyText:''};
  assert.equal(analyzeBusinessContext(base),undefined);
  assert.equal(analyzeBusinessContext({...base,title:'해외이사 절차',schemaTypes:['Article'],businessDocuments:docs()}),undefined);
  assert.equal(analyzeBusinessContext({...base,title:'시드니 투어 예약',description:'여행사 예약과 공항픽업'} )?.id,'travel_booking');
  assert.equal(analyzeBusinessContext({...base,title:'온라인 가구 쇼핑몰',description:'해외이사 고객 후기 한 건'}),undefined);
  assert.equal(hasBusinessResearch('https://pumyang.com.evil.example/'),false);
  const provider=analyzeBusinessContext({...base,url:'https://logistics.example/',title:'국제운송 견적',description:'기업 수출입 화물 포워딩과 해상운송 안내'});
  assert.equal(provider?.id,'international_logistics');assert.match(businessPrompt(provider),/동명 해운사/);
});

test('logistics industry is serializable and uses its own comparison criteria',()=>{
  assert.equal(IndustryCategorySchema.parse('logistics'),'logistics');
  const p=positionProfile('logistics');assert.equal(p.criteria.length,4);
  assert.match(p.label,/국제물류/);assert.ok(p.criteria.some(c=>c.pattern.test('출발지·도착지별 해상운송')));
});

test('supplemental collection follows three same-site public service pages and respects robots',async t=>{
  const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>{const target=String(input);requests.push(target);return new Response(target.includes('/customer/')?quote:target.includes('/international/')?freight:processHtml,{headers:{'content-type':'text/html'}});});
  const seed=captureBusinessDocument(home,url);
  const result=await collectBusinessDocuments(url,{seed,robots:{url:url+'robots.txt',status:'ok',text:'User-agent: *\nAllow: /\nDisallow: /customer/',observedAt:new Date().toISOString()}});
  assert.deepEqual(new Set(requests),new Set([url+'oversea/01/',url+'international/01/']));
  assert.equal(result.length,3);assert.equal(result[0],seed);
});
