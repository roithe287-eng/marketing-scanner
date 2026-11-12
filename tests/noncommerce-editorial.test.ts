import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NONCOMMERCE_PLAYBOOKS,nonCommercePlaybook,nonCommerceQuestionGuides} from '../lib/nonCommercePlaybook';
import {PLACE_SECTORS} from '../lib/localPlaceCatalog';
import {SEASONAL_PROFILES} from '../lib/seasonalPlaceCatalog';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {nonCommerceEditorialSections} from '../lib/nonCommerceStrategy';
import {ServiceStrategySchema} from '../lib/serviceStrategy';
import {editorialFocus} from '../lib/nonCommerceEditorial';
import {reportForPresentation} from '../lib/reportPresentation';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {capturePageEvidence} from '../lib/pageEvidence';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
import type {LocalPlaceEvidence} from '../lib/localPlaceSchema';
import ServiceStrategyPanel from '../components/report/ServiceStrategyPanel';

const url='https://example.com/',capturedAt='2026-11-12T00:00:00.000Z';
const base={url,finalUrl:url,title:'서비스 안내',description:'제공 업무와 이용 조건을 안내합니다.',h1:['서비스 안내'],h2:[],bodyText:'제공 업무와 상담 절차를 확인하고 담당자에게 문의할 수 있습니다.',ctaButtons:['상담 문의']};
const purpose=analyzeWebsitePurpose(base);
const sources=[{url,title:'업무 소개',text:'제공 범위는 운영 자료에 작성된 업무입니다.'},{url:url+'criteria',title:'조건 비교',text:'조건별 포함 항목과 별도 비용을 확인합니다.'},{url:url+'process',title:'준비 절차',text:'신청 전에 준비 서류와 처리 절차를 확인합니다.'}];
const place=(sector:string):LocalPlaceEvidence=>({sector,name:'표본 업체',identity:'자사 서비스',address:'',branch:'',franchise:false,links:[],terms:[],signals:[],media:{images:0,described:0,videos:0}});
function check(book:ReturnType<typeof nonCommercePlaybook>){
 const sections=nonCommerceEditorialSections(purpose,sources,url,book.label,book);
 const plan=ServiceStrategySchema.parse({version:1,industry:'noncommerce',targetUrl:url,capturedAt,basis:'source-backed-playbook',sources,findings:[],...sections});
 const stages=plan.segments;
 assert.equal(stages.length,3);
 assert.equal(new Set(stages.map(s=>s.cta)).size,3);
 const instructions=stages.flatMap(s=>s.landingBlocks);
 assert.equal(new Set(instructions).size,instructions.length);
 assert.ok(instructions.every(s=>s.endsWith('야 합니다.')));
 const quotes=stages.flatMap(s=>s.evidence.map(e=>e.text));
 assert.equal(new Set(quotes).size,quotes.length);
 assert.ok(quotes.every(q=>sources.some(s=>s.text===q)));
 assert.equal(new Set(plan.content.flatMap(c=>c.outline)).size,plan.content.flatMap(c=>c.outline).length);
 assert.equal(new Set(plan.funnel.map(s=>s.definition)).size,5);
 assert.equal(new Set(plan.funnel.map(s=>s.check)).size,5);
 assert.equal(new Set(plan.briefingPlan!.blocks.map(b=>b.action)).size,4);
 assert.ok(plan.briefingPlan!.blocks.every(b=>b.action.includes('해야 합니다.')));
 const html=renderToStaticMarkup(React.createElement(ServiceStrategyPanel,{plan,view:'search'}));
 assert.match(html,/service-instruction-label/);assert.match(html,/report-input-needed/);
 assert.doesNotMatch(html,/undefined|NaN|가설입니다|완결성·최신성/);
 return plan;
}
for(const book of Object.values(NONCOMMERCE_PLAYBOOKS))test(`non-commerce editorial: ${book.id}`,()=>{
 const plan=check(book),focus=editorialFocus(book);
 assert.ok(plan.segments[1].landingBlocks.some(s=>s.includes(focus.fields[2])));
 if(focus.information){
  assert.doesNotMatch(plan.segments.flatMap(s=>s.landingBlocks).join(' '),/비용|견적|회신 시점|접수 URL/);
  assert.doesNotMatch(plan.metrics.map(m=>m.name+' '+m.formula).join(' '),/광고비|유효 접수|계약|처리 대기/);
 }
});
for(const sector of PLACE_SECTORS)test(`local industry workflow: ${sector.id}`,()=>{
 const book=nonCommercePlaybook(purpose,'지역 서비스',place(sector.id)),plan=check(book);
 assert.equal(book.id,'place_'+sector.id);
 assert.deepEqual(editorialFocus(book).fields,sector.fields);
 assert.ok(plan.channels.some(c=>c.label.includes('플레이스')));
 assert.ok(nonCommerceQuestionGuides(purpose,'지역 서비스',place(sector.id)).some(q=>q.question===sector.questions[0]));
});
for(const season of SEASONAL_PROFILES)test(`seasonal workflow: ${season.id}`,()=>{
 const evidence={...place(season.sector),seasonal:{version:1 as const,profiles:[{id:season.id,excerpt:season.label,terms:[]}],destinations:season.id==='ski'?[{id:'muju',label:'무주',matchedAs:'무주',excerpt:'무주 스키렌탈'}]:[],seasonLabels:[],signals:[]}};
 const book=nonCommercePlaybook(purpose,'지역 서비스',evidence),plan=check(book);
 assert.equal(book.id,'season_'+season.id);
 assert.deepEqual(editorialFocus(book).fields,season.fields);
 if(season.id==='ski'){assert.match(plan.segments[0].keywords[0],/^무주/);assert.doesNotMatch(JSON.stringify(plan),/하이원|에덴밸리/);}
});
test('professional service identity is not replaced by a client place or seasonal topic',()=>{
 for(const [title,id] of [['병원 마케팅 컨설팅','medical_consulting'],['소프트웨어 SaaS','software'],['광고 대행','agency']]){
  const p=analyzeWebsitePurpose({...base,title,description:title,h1:[title]});
  assert.equal(nonCommercePlaybook(p,title,place('medical')).id,id);
 }
 const shop=nonCommercePlaybook(purpose,'치킨 식당 강남점',{...place('restaurant'),franchise:true,branch:'강남점'});
 assert.equal(shop.id,'place_restaurant');assert.doesNotMatch(JSON.stringify(shop),/가맹비|가맹 계약/);
});
test('metadata alone never becomes stage body evidence or a fabricated landing URL',()=>{
 const book=NONCOMMERCE_PLAYBOOKS.service;
 const plan=nonCommerceEditorialSections(purpose,[{url,title:'입력 페이지 제목·설명',text:'서비스 소개 상담 비용'}],url,'서비스',book);
 assert.ok(plan.segments.every(s=>!s.evidence.length&&!s.landingUrl));
 assert.ok(plan.briefingPlan.blocks.every(b=>!b.evidence.length));
});
test('saved reports refresh all editorial sections without replacing original observations or scores',async t=>{
 const html='<title>서비스 안내</title><meta name="description" content="제공 업무와 이용 조건을 안내합니다."><h1>서비스 안내</h1><main><p>제공 업무와 상담 절차를 확인하고 담당자에게 문의할 수 있습니다.</p><a href="/contact">상담 문의</a></main>';
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}});Object.defineProperty(r,'url',{value:u.href});return r;});
 const page=capturePageEvidence(await extractWebsite(url),capturedAt);
 const p=analyzeWebsitePurpose({...base,title:page.title,description:page.description,h1:page.h1,h2:page.h2,bodyText:page.bodyText});
 const plan={version:1 as const,industry:'noncommerce' as const,targetUrl:url,capturedAt,basis:'source-backed-playbook' as const,sources,findings:[],...nonCommerceEditorialSections(p,sources,url,'서비스',NONCOMMERCE_PLAYBOOKS.service)};
 const stale={...plan,channels:plan.channels.map(c=>({...c,setup:'LEGACY_REPEAT'})),content:plan.content.map(c=>({...c,outline:['LEGACY_REPEAT']})),experiments:plan.experiments.map(e=>({...e,change:'LEGACY_REPEAT'}))};
 const report=MarketingReportSchema.parse({...fixture,url,pageEvidence:page,sitePurpose:p,serviceStrategy:stale}),before=JSON.stringify(report);
 const refreshed=reportForPresentation(report);
 assert.doesNotMatch(JSON.stringify(refreshed.serviceStrategy),/LEGACY_REPEAT/);
 assert.equal(refreshed.serviceStrategy!.capturedAt,capturedAt);
 assert.deepEqual(refreshed.serviceStrategy!.sources,report.serviceStrategy!.sources);
 assert.deepEqual(refreshed.pageEvidence,report.pageEvidence);
 assert.equal(JSON.stringify(report),before);
 assert.deepEqual(reportForPresentation(refreshed),refreshed);
});

const realLocalNames:[string,string][]=[['약국','pharmacy'],['고양이 용품 매장','pet_store'],['카페','cafe'],['한식 식당','restaurant'],['네일 미용실','beauty'],['자동차 정비소','automotive'],['꽃집','retail'],['박물관','culture'],['렌터카','rental'],['동물병원','veterinary'],['애견 호텔','pet_care'],['세탁소','living']];
for(const [name,sector] of realLocalNames)test(`extraction-to-report pipeline uses primary place identity: ${sector}`,async t=>{
 const html=`<title>새길 ${name}</title><meta name="description" content="새길 ${name} 이용 안내"><h1>새길 ${name}</h1><main><p>운영시간 09:00~18:00. 이용 전 준비사항과 방문 조건을 안내합니다.</p><address>부산광역시 해운대구 센텀로 12</address><a href="/reserve">예약 문의</a></main>`;
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}});Object.defineProperty(r,'url',{value:u.href});return r;});
 const data=await extractWebsite(url),p=analyzeWebsitePurpose(data),e=data.diagnosticSeed?.page.localPlaceEvidence;
 assert.equal(e?.sector,sector);assert.equal(p.kind,'service');
 const book=nonCommercePlaybook(p,[data.title,data.description,...data.h1].join(' '),e);
 assert.equal(book.id,'place_'+sector);
 const {buildServiceStrategy}=await import('../lib/serviceStrategy');const strategy=buildServiceStrategy(data)!;
 assert.ok(strategy);assert.deepEqual(strategy.briefingPlan!.blocks[0].fields[0],PLACE_SECTORS.find(s=>s.id===sector)!.fields[0]);
 if(sector==='veterinary'){assert.equal(p.sector,undefined);assert.doesNotMatch(JSON.stringify(strategy),/초진|비급여|담당 의료진|실제 내원/);}
});
for(const profile of SEASONAL_PROFILES)test(`season source reaches the generated report: ${profile.id}`,async t=>{
 const name=profile.id==='snow_ice'?'눈썰매장':profile.services[0][0],html=`<title>새길 ${profile.id==='ski'?'무주 ':''}${name}</title><meta name="description" content="${name} 이용 안내"><h1>새길 ${name}</h1><main><h2>${name}</h2><p>운영기간과 이용 전 준비사항을 안내합니다. 이용요금 30,000원. 예약 확인 후 이용합니다.</p><address>부산광역시 해운대구 센텀로 12</address><a href="/reserve">예약 문의</a></main>`;
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}});Object.defineProperty(r,'url',{value:u.href});return r;});
 const data=await extractWebsite(url),p=analyzeWebsitePurpose(data),e=data.diagnosticSeed?.page.localPlaceEvidence;
 assert.ok(e?.seasonal?.profiles.some(s=>s.id===profile.id),profile.id);
 const book=nonCommercePlaybook(p,[data.title,data.description,...data.h1].join(' '),e);
 assert.equal(book.id,'season_'+profile.id);
 const {buildServiceStrategy}=await import('../lib/serviceStrategy');const strategy=buildServiceStrategy(data)!;
 assert.ok(strategy);assert.ok(strategy.summary.includes(profile.label));
});
test('restaurant branch and franchise headquarters keep different objectives after extraction',async t=>{
 let html='';t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}});Object.defineProperty(r,'url',{value:u.href});return r;});
 for(const [title,expected] of [['새길 치킨 프랜차이즈 부산점','place_restaurant'],['새길 치킨 프랜차이즈 가맹 모집','franchise']]){
  html=`<title>${title}</title><h1>${title}</h1><main><p>치킨 메뉴와 매장 운영시간을 안내합니다.</p><address>부산광역시 해운대구 센텀로 12</address><a href="/contact">문의</a></main>`;
  const data=await extractWebsite(url),p=analyzeWebsitePurpose(data),book=nonCommercePlaybook(p,[data.title,...data.h1].join(' '),data.diagnosticSeed?.page.localPlaceEvidence);
  assert.equal(book.id,expected);
 }
});
