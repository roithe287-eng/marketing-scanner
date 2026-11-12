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
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {selectSearchCandidates} from '../lib/competitorSelection';
import {competitorDisplay} from '../lib/competitorDisplay';
import {buildCompetitorDocument} from '../lib/competitorDocument';
import {fixture} from './fixtures/report';

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
  assert.equal(plan.primaryKeyword?.term,'해외이사');assert.equal(plan.questions.length,8);
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

test('supplemental collection follows bounded same-site public service pages and respects robots',async t=>{
  const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:unknown)=>{const target=String(input);requests.push(target);return new Response(target.includes('/customer/')?quote:target.includes('/international/')?freight:processHtml,{headers:{'content-type':'text/html'}});});
  const seed=captureBusinessDocument(home,url);
  const result=await collectBusinessDocuments(url,{seed,robots:{url:url+'robots.txt',status:'ok',text:'User-agent: *\nAllow: /\nDisallow: /customer/',observedAt:new Date().toISOString()}});
  assert.deepEqual(new Set(requests),new Set([url+'oversea/01/',url+'oversea/02/',url+'oversea/03/',url+'oversea/04/',url+'international/01/',url+'international/02/']));
  assert.equal(result.length,7);assert.equal(result[0],seed);
});

test('legal reference sites are not logistics providers, without excluding public providers or host lookalikes',()=>{
  const items=['easylaw.go.kr','www.law.go.kr','public-provider.go.kr','easylaw.go.kr.carrier.test'].map(host=>({title:'해외이사 안내',description:'해외이사 서비스',link:`https://${host}/`}));
  const selection=selectSearchCandidates(items,'pumyang.com','해외이사');
  assert.deepEqual(selection.candidates.map(c=>c.domain),['public-provider.go.kr','easylaw.go.kr.carrier.test']);
  assert.equal(selection.excluded.length,2);assert.match(selection.excluded[0].reason,/참고 자료/);
  const old={searchKeyword:'해외이사',competitors:items.map((c,i)=>({...c,domain:new URL(c.link).hostname,rank:i+1}))};
  const original=JSON.stringify(old);
  assert.equal(competitorDisplay(old).competitors.length,2);assert.equal(JSON.stringify(old),original);
});

test('logistics competitor pipeline skips product collection and keeps provider evidence in exports',async t=>{
  const keys=['OPENAI_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const,env=keys.map(k=>process.env[k]);
  delete process.env.OPENAI_API_KEY;process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  const requests:string[]=[];
  const mockFetch=async(input:unknown)=>{
    const target=String(input);requests.push(target);
    if(target.includes('openapi.naver.com'))return Response.json({items:[
      {title:'해외이사 생활법령',description:'해외이사 법령 안내',link:'https://easylaw.go.kr/'},
      {title:'해외이사 전문 운송',description:'해외이사 견적과 통관 서비스',link:'https://carrier.test/'},
    ]});
    assert.ok(!target.includes('easylaw.go.kr'),'reference sites must not consume the metadata budget');
    if(target.endsWith('/robots.txt'))return new Response('User-agent: *\nAllow: /');
    if(target.startsWith('https://carrier.test'))return new Response('<title>해외이사 전문 운송</title><meta name="description" content="해외이사 견적과 통관 서비스">');
    return new Response(target.includes('/customer/')?quote:target.includes('/oversea/')?processHtml:target.includes('/international/')?freight:home,{headers:{'content-type':'text/html'}});
  };
  t.mock.method(websiteHttp,'fetch',mockFetch);t.mock.method(globalThis,'fetch',mockFetch);
  try{
    const result=await analyzeCompetitors({url,title:'범양해운',ogTitle:'범양해운',description:'범양해운',h1:[],h2:[],keywords:'',bodyText:'안전하고 신속한 해외이사 서비스\n편안하고 빠른 귀국이사 서비스\n화물 운송과 견적 상담'});
    assert.ok(result);assert.equal(result.searchKeyword,'해외이사');assert.equal(result.keywordSource,'fallback');assert.equal(result.research.productContext,undefined);
    assert.deepEqual(result.competitors.map(c=>c.domain),['carrier.test']);assert.match(result.filtering.excluded[0].reason,/참고 자료/);
    assert.ok(!requests.some(u=>/sitemap|openapi.naver.com\/v1\/search\/shop/.test(u)),'no product discovery for the service journey');
    const exported=JSON.stringify(buildCompetitorDocument({...fixture,competitorAnalysis:result}));
    assert.match(exported,/해외이사/);assert.doesNotMatch(exported,/자사 상품 원문 추가 확인|면세점 방문/);
  }finally{keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});}
});
