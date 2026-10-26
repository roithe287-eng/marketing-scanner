import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import {verifyReportEvidence} from '../lib/reportIntegrity';
import {answerSources,buildAnswerContentPlan} from '../lib/answerContent';
import {answerContentPrompt} from '../lib/analyzeAnswerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {buildAnswerContentDocument} from '../lib/answerContentDocument';
import {MarketingReportSchema} from '../lib/reportSchema';
import {storefrontObservations} from '../lib/storefrontEvidence';
import AnswerContentPanel from '../components/report/AnswerContentPanel';
import {buildSourceLibrary} from '../lib/reportContent';
import {answerPage} from './fixtures/answer-content';
import {fixture} from './fixtures/report';

const page:ExtractedWebsiteData={...answerPage,url:'https://shop.example.com',finalUrl:'https://shop.example.com/main',title:'샘플스토어',description:'모두가 더 건강한 선택을 할 수 있는 세상',ogTitle:'',ogDescription:'',h1:[],h2:[],bodyText:'홈\n카테고리\n신상품',isJsHeavy:true,buttons:[],ctaButtons:[],keywords:'',imageCount:0,imageWithoutAlt:0,imageAlts:[],hasReviewKeyword:false,hasPriceKeyword:false,hasTrustKeyword:false,hasContactInfo:false,
  productContext:{status:'observed',discovery:'public_catalog',attemptedPages:0,note:'공개 상품 표본이며 전체 품목의 매출·주력 순위는 미측정',sources:[
    {url:'https://shop.example.com/goods/1',name:'샘플 액상비타민',description:'',categories:[],kind:'catalog_product'},
    {url:'https://shop.example.com/goods/2',name:'샘플 구강청결제',description:'',categories:[],kind:'catalog_product'},
  ]},
} as unknown as ExtractedWebsiteData;

test('a recovered catalog prevents missing HTML from becoming claims of absent price, reviews or purchase buttons',()=>{
  const input={...fixture,oneLineSummary:'상품 가격 미노출, 후기와 CTA 부재',criticalIssues:[
    {title:'상품 가격 정보 미노출',problem:'상품 가격이 없습니다.',reason:'구매 판단 불가',recommendation:'가격 추가',priority:'high' as const,badExample:'가격 없음'},
    {title:'후기 부재',problem:'구매 후기가 없습니다.',reason:'신뢰 부족',recommendation:'후기 추가',priority:'high' as const},
    {title:'CTA 미흡',problem:'구매 버튼이 없습니다.',reason:'전환 부족',recommendation:'구매하기 버튼 추가',priority:'high' as const},
  ],checklist:['price_info','trust_review','cta_clarity'].map(id=>({id,label:id,category:'conversion' as const,status:'fail' as const,currentValue:'없음',diagnosis:'사이트에 정보 없음',guide:'추가하세요.'})),quickWinsDetailed:[{title:'후기 추가',steps:['후기를 추가합니다.'],beforeExample:'없음',afterExample:'후기'}],priorityRoadmap:{immediately:['가격을 추가합니다.'],thisWeek:[],thisMonth:[]}};
  const before=structuredClone(page),output=verifyReportEvidence(input,page);
  assert.match(output.oneLineSummary,/상품 표본 2개/);assert.doesNotMatch(output.oneLineSummary,/부재|미노출/);
  assert.ok(output.criticalIssues.every(i=>i.evidenceStatus==='review'&&i.title.includes('실제 화면 확인')));
  assert.ok(output.criticalIssues.every(i=>i.recommendation.includes('경우에만')));
  assert.ok(output.checklist?.every(i=>i.status==='warning'&&i.diagnosis.includes('미확인')));
  assert.match(output.quickWinsDetailed![0].title,/확인 후/);assert.match(output.priorityRoadmap.immediately[0],/경우에만/);
  assert.deepEqual(output.diagnosis,input.diagnosis);assert.deepEqual(page,before);
  assert.ok(MarketingReportSchema.safeParse(output).success);
});

test('observed text stays observed and a catalog product can be quoted without inventing HTML evidence',()=>{
  const observed={...page,h1:['실제 대표 제목'],ctaButtons:['구매하기'],hasReviewKeyword:true,hasPriceKeyword:true};
  assert.ok(!storefrontObservations(observed).some(o=>o.ids.some(id=>['h1','cta_clarity','price_info','trust_review'].includes(id))));
  const output=verifyReportEvidence({...fixture,criticalIssues:[{title:'제품 소개',problem:'상품 설명 위치 검토',reason:'표현 검토',recommendation:'실제 원문 대조',priority:'low',badExample:'샘플 액상비타민'}]},observed);
  assert.equal(output.criticalIssues[0].badExample,'샘플 액상비타민');
  assert.equal(output.exampleCopy.currentHeroHeadline,'실제 대표 제목');
  assert.equal(output.exampleCopy.currentCtaText,'구매하기');
  assert.deepEqual(storefrontObservations({...page,productContext:undefined}),[]);
});

test('verified products supply question topics and source links, never price, efficacy or shipping answer facts',()=>{
  const sources=answerSources(page),products=sources.filter(p=>p.kind==='product');
  const plan=buildAnswerContentPlan(page);
  assert.equal(products.length,2);assert.ok(products.every(p=>p.url?.startsWith('https://shop.example.com/goods/')));
  assert.ok(['비타민','구강청결제'].includes(plan.primaryKeyword!.term));
  assert.equal(plan.scope,'submitted-page-and-products');assert.equal(plan.questions.length,3);
  assert.ok(plan.questions.every(q=>q.draft===''&&q.evidence.length===0&&q.status==='review'));
  assert.doesNotMatch(plan.primaryKeyword!.term,/샘플스토어|모두가|건강한/);
  const proposal={primaryKeyword:plan.primaryKeyword!.term,secondaryKeywords:[],topicScope:'mixed',questions:plan.questions.map(q=>({question:q.question,intent:q.intent,evidenceIds:products.map(p=>p.id),missingFacts:[]}))};
  const assisted=buildAnswerContentPlan(page,proposal);
  assert.ok(assisted.questions.every(q=>q.draft===''&&q.evidence.length===0&&q.missingFacts.length>0));
  assert.match(answerContentPrompt(page),/샘플 액상비타민/);
  const brandProposal={...proposal,primaryKeyword:'샘플스토어'};
  assert.notEqual(buildAnswerContentPlan(page,brandProposal).primaryKeyword?.term,'샘플스토어');
});

test('shared, rendered and PDF question plans preserve product provenance and catalog-only limits',()=>{
  const plan=buildAnswerContentPlan(page),report=MarketingReportSchema.parse({...fixture,productContext:page.productContext,answerContentPlan:plan});
  const html=renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:report.answerContentPlan}));
  assert.match(html,/페이지·상품 표본 기반/);assert.match(html,/#report-site-guide/);
  assert.ok(buildSourceLibrary(report).links.some(link=>link.url==='https://shop.example.com/goods/1'));
  assert.ok(buildSourceLibrary(report).links.some(link=>link.url==='https://shop.example.com/goods/2'));
  assert.match(buildAnswerContentDocument(report).map(b=>b.text).join('\n'),/입력 페이지·자사 상품 표본/);
  assert.match(plan.notice,/답변 근거가 아닙니다/);
});

test('GEO fallback questions use the observed product category and disambiguate the storefront domain',()=>{
  const questions=citationFallbackQuestions(page,'샘플스토어');
  assert.equal(questions.length,5);assert.match(questions[0].question,/샘플스토어\(shop.example.com\)/);
  assert.ok(questions.slice(1).every(q=>/비타민|구강청결제/.test(q.question)));
  assert.ok(questions.slice(1).every(q=>!/샘플스토어|서비스|계약/.test(q.question)));
  assert.match(citationFallbackQuestions({...page,productContext:undefined},'샘플스토어')[1].question,/서비스/);
});
