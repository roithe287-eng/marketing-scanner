import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import {captureBusinessDocument,collectBusinessDocuments} from '../lib/businessResearch';
import {buildServiceStrategy,ServiceStrategySchema} from '../lib/serviceStrategy';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {buildPrompt} from '../lib/analyzeMarketing';
import {MarketingReportSchema} from '../lib/reportSchema';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildReportDocument} from '../lib/reportDocument';
import ServiceStrategyPanel from '../components/report/ServiceStrategyPanel';
import AnswerContentPanel from '../components/report/AnswerContentPanel';
import {websiteHttp} from '../lib/security/safeFetch';
import {fixture} from './fixtures/report';
const url='https://www.pumyang.com/';
const html=(heading:string,body:string)=>`<title>범양해운</title><main><h2>${heading}</h2>${body}</main>`;
const page=(heading:string,text:string,path:string)=>captureBusinessDocument(html(heading,`<p>${text}</p>`),url+path);
function data():ExtractedWebsiteData{return {url,finalUrl:url,title:'범양해운',ogTitle:'범양해운',description:'범양해운',ogDescription:'',h1:[],h2:[],bodyText:'해외이사와 귀국이사, 기업 화물 국제운송의 견적 상담을 제공합니다.',buttons:['상담신청'],ctaButtons:['상담신청'],schemaTypes:[],isJsHeavy:false,imageAlts:[],imageCount:0,imageWithoutAlt:0,keywords:'',hasForm:false,hasContactInfo:true,viewportMeta:'',hasFavicon:true,businessDocuments:[
  page('해외이사','해외이사 상담과 전문 포장작업 후 수입통관 및 배송서비스를 안내합니다.','oversea/01/'),
  page('귀국이사','귀국이사 물품의 해외 집하와 한국 통관·배송 절차를 안내합니다.','oversea/02/'),
  page('SEA FREIGHT','SEA FREIGHT consolidation cargo services and shipping documents.','international/01/'),
  page('AIR FREIGHT','AIR FREIGHT cargo shipment handling and transport documents.','international/02/'),
  page('보관서비스','보관서비스 이용 물품의 입고와 보관 창고 출고 절차를 안내합니다.','oversea/04/'),
  captureBusinessDocument(html('상담신청','<form><label>출발지</label><input value="PRIVATE_NAME"><label>도착지</label><input value="PRIVATE_ADDRESS"></form>'),'https://www.pumyang.com/customer/07/'),
  page('국제운송약관','운송보험 범위와 파손보상 접수는 실제 약관을 확인합니다.','customer/02/'),
]} as unknown as ExtractedWebsiteData;}

test('five observed services produce distinct audiences, landing plans and source-backed current findings',()=>{
 const d=data(),p=buildServiceStrategy(d);assert.ok(p);assert.equal(p.segments.length,5);assert.equal(p.channels.length,4);assert.equal(p.findings.length,4);
 assert.ok(p.segments.every(s=>s.evidence.length&&s.landingUrl&&s.questions.length===3&&s.landingBlocks.length===6&&s.keywords.length>=3));
 assert.equal(new Set(p.segments.map(s=>s.cta)).size,5);assert.match(p.findings[0].interpretation,/확인하지 못했습니다/);assert.match(p.findings[1].interpretation,/물량·화물 제원.*희망 일정/);
 assert.doesNotMatch(JSON.stringify(p),/PRIVATE_NAME|PRIVATE_ADDRESS/);assert.ok(ServiceStrategySchema.safeParse(p).success);
 assert.ok(p.metrics.every(m=>m.required&&m.interpretation));assert.ok(p.funnel.some(f=>/개인|전화번호/.test(f.check)));
 const specific={...d,title:'해외이사·귀국이사 | 범양해운',description:'항공운송 견적 상담'};
 assert.match(buildServiceStrategy(specific)!.findings[0].interpretation,/단서를 확인했습니다/);
});

test('services absent from collected merchant evidence are not invented; restricted snippets stay limited',()=>{
 const d=data();d.businessDocuments=d.businessDocuments!.slice(0,2);
 assert.deepEqual(buildServiceStrategy(d)?.segments.map(s=>s.id),['outbound','return']);
 assert.equal(buildServiceStrategy({...d,businessDocuments:d.businessDocuments!.map(x=>({...x,source:'search_excerpt'}))}),undefined);
 assert.equal(buildServiceStrategy({...d,collectionNotice:'수집 제한'}),undefined);
 assert.equal(buildServiceStrategy({...d,title:'의류 쇼핑몰',bodyText:'',businessDocuments:[]}),undefined);
});

test('eight detailed questions preserve original facts and add separately labelled explanations and writing templates',()=>{
 const d=data(),p=buildAnswerContentPlan(d);assert.equal(p.questions.length,8);assert.equal(new Set(p.questions.map(q=>q.question)).size,8);
 assert.ok(p.questions.every(q=>q.explanation&&q.template.length>100&&q.missingFacts.length));
 for(const q of p.questions){assert.equal(q.draft,q.evidence.map(e=>e.text).join('\n'));assert.ok(new Set(q.evidence.map(e=>e.url)).size<=1);}
 const rendered=renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:p}));assert.doesNotMatch(rendered,/해석·보완 방향/);assert.match(rendered,/추가 작성 형식/);for(const q of p.questions)assert.ok(rendered.includes(q.draft.split('\n')[0]));
 assert.match(buildPrompt(d),/국제물류 상세 진단/);assert.doesNotMatch(buildPrompt(d,'minimal'),/국제물류 상세 진단/);
});

test('root URL spelling does not turn the homepage into a service landing and repeated terms are deduplicated',()=>{
 const d=data();d.finalUrl='https://www.pumyang.com';
 const main=page('해외이사','해외이사 전문 포장과 통관 상담을 안내합니다. 국제운송과 생활 물품 인도를 위한 상담 준비사항을 확인하고 실제 운송 조건을 담당자와 대조해 주세요. 해외이사 서비스 정보를 충분히 확인하세요.','');
 d.businessDocuments=[main,...d.businessDocuments!,page('보험보상','운송보험 범위와 파손보상 접수는 실제 약관을 확인합니다.','customer/03/')];
 const p=buildServiceStrategy(d)!;
 assert.equal(p.segments[0].landingUrl,url+'oversea/01/');assert.equal(p.segments[0].evidence[0].url,url+'oversea/01/');
 assert.equal(new Set(p.findings[3].evidence.map(e=>e.text)).size,p.findings[3].evidence.length);
 const storage=d.businessDocuments.find(x=>x.url.endsWith('/oversea/04/'))!;
 storage.sections.unshift({heading:'보관서비스',text:'AEO는 국제사회가 채택한 민관 협력제도에 대한 일반적인 소개입니다. 이 제도 설명은 특정 서비스 운영 과정이나 상담 준비사항의 근거가 되지 않으며 제공 범위를 확정하지 않습니다.'});
 assert.doesNotMatch(buildServiceStrategy(d)!.segments.find(s=>s.id==='storage')!.evidence[0].text,/^AEO/);
 d.businessDocuments=[main];assert.equal(buildServiceStrategy(d)!.segments[0].landingUrl,undefined);
});

test('full strategy survives report serialization and all four screen views and document export',()=>{
 const d=data(),p=buildServiceStrategy(d)!;
 const report=MarketingReportSchema.parse({...fixture,url,sitePurpose:analyzeWebsitePurpose(d),answerContentPlan:buildAnswerContentPlan(d),serviceStrategy:p});
 assert.deepEqual(report.serviceStrategy,p);
 const text=buildReportDocument(report).map(b=>b.text).join('\n');
 for(const s of p.segments){assert.ok(text.includes(s.headline));assert.ok(text.includes(s.landingBlocks[5]));}
 for(const m of p.metrics)assert.ok(text.includes(m.formula));
 assert.ok(text.includes(p.experiments[3].decision));assert.doesNotMatch(text,/해석·보완 방향/);
 for(const view of ['segments','search','acquisition','conversion'] as const){const markup=renderToStaticMarkup(React.createElement(ServiceStrategyPanel,{plan:p,view}));assert.doesNotMatch(markup,/undefined|NaN/);assert.ok(markup.length>1000);}
});

test('expanded detail collection respects a maximum of three parallel public requests',async t=>{
 let active=0,maximum=0;const requests:string[]=[];
 t.mock.method(websiteHttp,'fetch',async(input:unknown)=>{active++;maximum=Math.max(maximum,active);requests.push(String(input));await new Promise(r=>setTimeout(r,5));active--;return new Response(html('해외이사','<p>해외이사 포장과 운송 상담 절차를 확인하세요.</p>'),{headers:{'content-type':'text/html'}});});
 const docs=await collectBusinessDocuments(url,{seed:page('해외이사','해외이사 전문 포장과 견적 상담을 안내합니다.',''),robots:{url:url+'robots.txt',status:'ok',text:'User-agent: *\nAllow: /',observedAt:new Date().toISOString()}});
 assert.equal(requests.length,8);assert.equal(docs.length,9);assert.ok(maximum<=3);assert.equal(new Set(requests).size,8);
});
