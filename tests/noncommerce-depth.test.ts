import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureBusinessDocument,captureBusinessLinks,collectBusinessDocuments} from '../lib/businessResearch';
import {buildServiceStrategy,ServiceStrategySchema} from '../lib/serviceStrategy';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {nonCommercePlaybook} from '../lib/nonCommercePlaybook';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {analyzeAnswerContent} from '../lib/analyzeAnswerContent';
import {buildPrompt} from '../lib/analyzeMarketing';
import {buildReportDocument} from '../lib/reportDocument';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
import {noncommerceCases} from './fixtures/noncommerce';
import {sectorCases,sectorHtml} from './fixtures/noncommerce-sectors';
import ServiceStrategyPanel from '../components/report/ServiceStrategyPanel';
import NonCommerceBriefingPanel from '../components/report/NonCommerceBriefingPanel';

async function extract(t:TestContext,html:string,url='https://provider.example.com/'){
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{const u=new URL(String(input));const r=new Response(u.pathname==='/robots.txt'?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html;charset=utf-8'}});Object.defineProperty(r,'url',{value:u.href});return r;});
  return extractWebsite(url);
}
const cases=[...sectorCases.map(c=>({id:c.id,html:sectorHtml(c),url:`https://${c.id}.example.com/`})),...noncommerceCases.filter(c=>!['mixed','unknown'].includes(c.id))];
for(const item of cases)test(`detailed source-backed strategy and export follow non-commerce purpose: ${item.id}`,async t=>{
  const data=await extract(t,item.html,item.url),before=JSON.stringify(data),plan=buildServiceStrategy(data)!;
  assert.ok(plan);assert.equal(plan.industry,'noncommerce');assert.equal(plan.briefing,undefined);
  assert.equal(plan.content.length,6);assert.equal(plan.channels.length,4);assert.equal(plan.experiments.length,4);
  assert.equal(plan.briefingPlan!.observation,'not-measured');assert.equal(plan.briefingPlan!.blocks.length,4);
  const questions=await analyzeAnswerContent(data);assert.ok(questions.questions.length>=6&&questions.questions.length<=8);
  for(const q of questions.questions){assert.equal(q.draft,q.evidence.map(e=>e.text).join('\n'));assert.ok(q.explanation);assert.ok(q.template.includes('[현재 원문'));}
  const docs=data.businessDocuments!.flatMap(d=>d.sections.map(s=>s.text));
  for(const e of plan.sources)assert.ok(docs.includes(e.text)||e.title==='입력 페이지 제목·설명');
  const report=MarketingReportSchema.parse({...fixture,url:data.url,serviceStrategy:plan,answerContentPlan:questions});
  assert.deepEqual(report.serviceStrategy,plan);assert.equal(JSON.stringify(data),before);
  const text=buildReportDocument(report).map(b=>b.text).join('\n');
  assert.ok(text.includes(plan.content[5].title));assert.ok(text.includes(plan.experiments[3].decision));
  assert.ok(text.includes(plan.briefingPlan!.blocks[3].draft));assert.match(text,/실제.*관측/);
  assert.match(buildPrompt(data),/비커머스 상세 진단/);assert.doesNotMatch(buildPrompt(data,'minimal'),/비커머스 상세 진단/);
  for(const view of ['segments','search','acquisition','conversion'] as const){const markup=renderToStaticMarkup(React.createElement(ServiceStrategyPanel,{plan,view}));assert.doesNotMatch(markup,/undefined|NaN/);assert.ok(markup.length>1000);}
  const html=renderToStaticMarkup(React.createElement(NonCommerceBriefingPanel,{plan:plan.briefingPlan!}));assert.match(html,/수정 위치/);assert.match(html,/noopener noreferrer/);
  if(['content','public'].includes(item.id)){assert.doesNotMatch(plan.funnel.map(x=>x.stage).join(' '),/견적|계약|매출|구매/);assert.doesNotMatch(questions.questions.map(q=>q.question).join(' '),/비용|수임|견적|배송/);}
  if(item.id==='education')assert.match(plan.funnel[4].stage,/참여/);
  if(item.id==='medical')assert.match(plan.funnel[4].stage,/내원/);
});

for(const [id,title] of [['software','업무 소프트웨어 SaaS'],['agency','브랜드 마케팅 광고대행'],['accounting','기업 세무 회계'],['home','공간 인테리어 시공'],['repair','명품 가방 수리 복원'],['hospitality','바다 펜션 숙박'],['hiring','채용 대행 서비스'],['event','웨딩 촬영 스튜디오'],['real_estate','부동산 중개 공인중개'],['fitness','필라테스 피트니스'],['rental','정수기 렌탈 설치'],['study_abroad','해외 유학 연수 교육']])test(`service identity selects a distinct operational playbook: ${id}`,async t=>{
  const data=await extract(t,`<title>${title}</title><meta name="description" content="${title}의 적용 조건 안내"><main><h1>${title}</h1><p>제공 범위와 제외 조건은 실제 안내와 상담 과정에서 확인합니다. 일정과 준비 자료 및 담당 역할을 안내합니다.</p><a href="/contact">상담 문의</a></main>`);
  const p=analyzeWebsitePurpose(data),book=nonCommercePlaybook(p,[data.title,data.description,...data.h1].join(' '));
  assert.equal(book.id,id);const plan=buildServiceStrategy(data)!;assert.ok(plan.summary.includes(book.label));assert.ok(plan.briefingPlan!.blocks[2].fields.includes(book.preparation[0]));
  assert.ok(plan.content.some(c=>c.title.includes(book.assets[0])));
});

test('purchase, unknown, restricted and legacy reports do not acquire generic service claims',async t=>{
  for(const item of noncommerceCases.filter(c=>['mixed','unknown'].includes(c.id))){const data=await extract(t,item.html,item.url);assert.equal(buildServiceStrategy(data),undefined);}
  const data=await extract(t,'<title>공간 인테리어 상품</title><main><h1>인테리어 상품</h1><a href="/buy">구매하기</a><a href="/contact">상담 문의</a></main>');
  assert.equal(analyzeWebsitePurpose(data).kind,'commerce');assert.equal(buildServiceStrategy(data),undefined);
  const service=await extract(t,noncommerceCases[0].html);assert.equal(buildServiceStrategy({...service,collectionNotice:'수집 제한'}),undefined);
  assert.equal(MarketingReportSchema.parse(fixture).serviceStrategy,undefined);
});

test('only observed public links are followed with robots, count and concurrency bounds',async t=>{
  const url='https://provider.example.com/',html='<title>업무 컨설팅</title><main><a href="/service/a">서비스 소개</a><a href="/process">진행 절차</a><a href="/pricing">비용 안내</a><a href="/team">담당 소개</a><a href="/contact">상담 안내</a><a href="/service/b">서비스 상세</a><a href="https://elsewhere.example/service">외부 서비스</a><a href="/admin/service">서비스 관리자</a><a href="/service?token=SECRET">서비스 안내</a><a href="/service/delete">서비스 삭제</a><a href="/review">서비스 후기</a></main>';
  const links=captureBusinessLinks(html,url);assert.equal(links.length,6);assert.doesNotMatch(links.join(' '),/elsewhere|admin|SECRET|delete|review/);
  let active=0,max=0;const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{requests.push(String(input));active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return new Response('<title>상세 업무 안내</title><main><p>대상과 제공 업무의 범위를 확인하고 진행 절차와 실제 조건을 안내합니다.</p></main>',{headers:{'content-type':'text/html'}});});
  const options={seed:captureBusinessDocument(html,url),links,nonCommerce:true,robots:{url:url+'robots.txt',status:'ok' as const,text:'User-agent: *\nAllow: /\nDisallow: /pricing',observedAt:new Date().toISOString()}};
  const docs=await collectBusinessDocuments(url,options);assert.equal(requests.length,5);assert.equal(docs.length,6);assert.ok(max<=3);assert.ok(!requests.some(u=>u.includes('pricing')));
  requests.length=0;assert.equal((await collectBusinessDocuments(url,{...options,nonCommerce:false})).length,1);assert.equal(requests.length,0);
});

test('source pages, body evidence, personal form values and review claims remain separated',async t=>{
  const data=await extract(t,'<title>기업 컨설팅 서비스</title><main><h1>기업 컨설팅</h1><p>기업 운영 업무의 제공 범위를 상담하여 확인하는 컨설팅입니다.</p><a href="/contact">상담 문의</a><div class="review"><p>REVIEW_ONLY 성과는 900%입니다.</p></div><form><label>업무 유형</label><input value="PRIVATE_VALUE"><textarea>PRIVATE_NOTE</textarea></form></main>');
  const detail=captureBusinessDocument('<title>업무 절차</title><main><h2>상담 준비</h2><p>사업 단계와 필요한 업무를 정리한 뒤 담당자의 검토 범위를 확인합니다.</p></main>',data.url+'process');
  data.businessDocuments!.push(detail,{...detail,url:'https://external.example/process',sections:[{heading:'성과',text:'EXTERNAL_CLAIM 원문 외부 업체의 성과를 확인합니다.'}]},{...detail,source:'search_excerpt',sections:[{heading:'검색 요약',text:'SNIPPET_ONLY 상세 업무 제공 범위는 확정되었습니다.'}]});
  const plan=buildServiceStrategy(data)!,answer=buildAnswerContentPlan(data),serialized=JSON.stringify({plan,answer});
  assert.doesNotMatch(serialized,/PRIVATE_|REVIEW_ONLY|EXTERNAL_CLAIM|SNIPPET_ONLY|900%/);
  assert.ok(plan.sources.some(s=>s.url===detail.url));assert.ok(answer.questions.some(q=>q.evidence.some(e=>e.url===detail.url)));
  assert.ok(plan.segments.every(s=>!s.landingUrl||s.landingUrl===detail.url));
  assert.deepEqual(ServiceStrategySchema.parse(JSON.parse(JSON.stringify(plan))),plan);
  const metadataOnly={...data,businessDocuments:[],siteEditing:undefined,bodyText:''};const sparse=buildServiceStrategy(metadataOnly)!;
  assert.ok(sparse.sources.every(s=>s.title==='입력 페이지 제목·설명'));assert.ok(buildAnswerContentPlan(metadataOnly).questions.every(q=>q.draft===''));
});
