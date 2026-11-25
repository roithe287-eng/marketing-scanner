import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAnswerContentPlan } from '../lib/answerContent';
import { citationFallbackQuestions } from '../lib/analyzeCitation';
import { captureBusinessLinks, collectBusinessDocuments } from '../lib/businessResearch';
import { analyzeCompetitors, captureCompetitorPage } from '../lib/competitorAnalysis';
import { buildCompetitionScope, competitionMismatch, scopeAllowsKeyword } from '../lib/competitionScope';
import { extractWebsite } from '../lib/extractWebsite';
import { classifyIndustryFromEvidence } from '../lib/industryClassifier';
import { defaultPositionIndustry, positionProfile } from '../lib/industryPositioning';
import { websiteHttp } from '../lib/security/safeFetch';
import { analyzeWebsitePurpose, purposePrompt } from '../lib/websitePurpose';
import { fixture } from './fixtures/report';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {WigPurchaseJourney,WigStoreComparison} from '../components/report/WigReportPanels';
import {MarketingReportSchema} from '../lib/reportSchema';
import {commercialSearchSnapshot} from '../lib/naverReportPolicy';
import {buildCompetitorDocument} from '../lib/competitorDocument';

const url='https://hair-shop.example/';
const response=(html:string)=>new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});
const home=`<html><head><title>가상몰 | 인모 똑딱이 헤어피스·가발 전문몰</title>
<meta name="description" content="인모와 고열사 헤어피스, 앞머리가발, 통가발을 온라인으로 판매합니다.">
</head><body><nav><a href="/product/list.html?cate_no=5">컬러차트</a><a href="/board/product/list.html?board_no=7">구매 가이드</a>
<a href="/shopinfo/guide.html">교환·반품</a><a href="https://example.net/">외부 교환·반품</a></nav>
<main><h1>가발·헤어피스 전문몰</h1><p>상품에 따라 숱 보충 또는 길이 연장에 맞는 옵션을 고를 수 있습니다.</p>
<article><h2>헤어피스 상품</h2><a href="/product/clip-piece/27/"><img src="/product.jpg" alt="숱 보충용 똑딱이 헤어피스 6피스"></a><p>상품별 판매가와 배송비 안내를 확인하세요.</p>
<img src="/cart.png" onclick="productOptions()" alt="장바구니 담기"><img src="/preview.png" alt="구매하기">
<template><img src="/demo.png" onclick="demo()" alt="바로구매"></template></article></main></body></html>`;
const pages:Record<string,string>={
  '/product/list.html?cate_no=5':'<h1>컬러차트</h1><p>색상표는 실제 상품의 블랙과 브라운을 비교할 때 참고합니다.</p>',
  '/board/product/list.html?board_no=7':'<h1>착용 가이드</h1><p>헤어피스 착용 방법과 세척 안내는 제품별로 확인해 주세요.</p>',
  '/shopinfo/guide.html':'<h1>교환·반품</h1><p>개봉과 착용 여부에 따라 달라지는 교환 조건은 해당 상품의 안내에서 확인해 주세요.</p>',
  '/product/clip-piece/27/':'<h1>숱 보충용 똑딱이 헤어피스 6피스</h1><p>상품의 실측 길이와 소재를 표시합니다.</p><button>구매하기</button>',
};

test('hair commerce uses first-party options, purchase icons, guides and report questions', async t=>{
  const checked:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const requested=new URL(input);
    assert.equal(requested.origin,new URL(url).origin);
    if(requested.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
    const path=requested.pathname+requested.search;
    checked.push(path);
    if(path==='/')return response(home);
    assert.ok(pages[path],path);
    return response(`<html><head><title>가상몰 이용 안내</title></head><body><main>${pages[path]}</main></body></html>`);
  });
  const page=await extractWebsite(url);
  const first=analyzeWebsitePurpose(page);
  assert.equal(first.business?.id,'hairpieces_wigs');
  assert.equal(first.kind,'commerce');
  assert.equal(first.goal.key,'purchase');
  assert.deepEqual(first.goal.evidence.map(e=>e.text),['장바구니 담기']);
  const links=captureBusinessLinks(home,url);
  assert.deepEqual(links.slice(0,3).map(link=>link.slice(url.length-1)),Object.keys(pages).slice(0,3));
  const documents=await collectBusinessDocuments(url,{links,productLinks:page.productDiscovery?.productLinks,robots:page.seoEvidence?.robots,commerceGuides:true});
  assert.deepEqual(new Set(checked),new Set(['/',...Object.keys(pages)]));
  const data={...page,businessDocuments:documents};
  const purpose=analyzeWebsitePurpose(data);
  assert.equal(classifyIndustryFromEvidence(data),'ecommerce');
  assert.match(purpose.label,/가발·헤어피스/);
  assert.equal(purpose.checks.find(c=>c.id==='business-hair-policy')?.status,'observed');
  assert.equal(purpose.pricingObserved,true);
  assert.ok(purpose.checks.find(c=>c.id==='business-hair-policy')?.evidence.some(e=>e.locator.endsWith('/shopinfo/guide.html')));
  assert.match(purposePrompt(data),/색상표 신청은 구매 전 행동/);
  const answers=buildAnswerContentPlan(data);
  assert.equal(answers.primaryKeyword?.term,'똑딱이 헤어피스');
  assert.equal(answers.questions.length,4);
  assert.ok(answers.questions.some(q=>q.question.includes('열기구')));
  const geo=citationFallbackQuestions(data,'가상몰');
  assert.deepEqual(geo.map(q=>q.journey),['브랜드 확인','상품·소재 선택','색상·착용 비교','착용·관리','교환·반품']);
  assert.equal(defaultPositionIndustry({...fixture,url,sitePurpose:purpose}).category,'hairpieces_wigs');
  assert.deepEqual(positionProfile('hairpieces_wigs').criteria.map(c=>c.id),['cost','scope','proof','process']);
});

test('hair goods competition uses merchant offerings, excluding clinics, guide pages and unrelated retailers',()=>{
  const own=captureCompetitorPage(home,url).scope!;
  assert.equal(own.profile,'hairpieces_wigs');
  assert.ok(own.specialties.includes('헤어피스'));
  assert.ok(scopeAllowsKeyword('똑딱이 헤어피스',own));
  assert.ok(!scopeAllowsKeyword('헤어케어',own));
  assert.ok(!scopeAllowsKeyword('탈모 치료 가발',own));
  const unrelated=buildCompetitionScope({url:'https://unrelated.example/',title:'신상품과 티셔츠 의류 쇼핑몰',description:'의류를 온라인으로 판매합니다.'});
  const clinic=buildCompetitionScope({url:'https://clinic.example/',title:'모발이식 병원',description:'가발과 관련한 두피 상담을 제공합니다.'});
  const guide=captureCompetitorPage(home,'https://hair-shop.example/board/product/list.html?board_no=7').scope!;
  for(const candidate of [unrelated,clinic,guide]){
    assert.notEqual(candidate.profile,'hairpieces_wigs');
    assert.ok(competitionMismatch(own,candidate));
  }
  const comparable=buildCompetitionScope({url:'https://second.example/',title:'인모 부분가발·헤어피스 쇼핑몰',description:'똑딱이 헤어피스를 온라인 판매합니다.'});
  assert.equal(competitionMismatch(own,comparable),undefined);
});


test('official wig comparison verifies shared product families and preserves links without the search API',async t=>{
  const target='https://www.picknwear.co.kr/';
  const own={url:target,title:'가상몰 | 가발·헤어피스 전문몰',description:'똑딱이 헤어피스와 앞머리가발을 판매합니다.',ogTitle:'',h1:['헤어피스 전문몰'],keywords:''};
  const checked:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL,options:RequestInit)=>{
    const source=new URL(input);
    checked.push(source.href);
    assert.match(new Headers(options.headers).get('User-Agent')||'',/^JinjjaScanner\//);
    assert.equal(options.redirect,'manual');
    if(source.pathname==='/robots.txt')return new Response(source.hostname==='www.pinkage.co.kr'?'User-agent: *\nDisallow: /':'User-agent: *\nAllow: /');
    if(source.hostname==='www.amimo.co.kr')return response('<title>붙임머리·탑커버 전문 쇼핑몰</title><meta name="description" content="앞머리가발과 붙임머리 판매"><main><h1>붙임머리·앞머리가발</h1></main>');
    if(source.hostname==='gabalnara.com')return response('<title>합성모 통가발 쇼핑몰</title><main><h1>통가발만 판매</h1></main>');
    assert.fail(source.href);
  });
  const analysis=await analyzeCompetitors(own);
  assert.ok(analysis);
  assert.equal(analysis.research.provider,'official_wig_stores');
  assert.deepEqual(analysis.competitors.map(c=>[c.link,c.matchedTerms,c.searchRank]),[
    ['https://www.amimo.co.kr/',['헤어피스','부분가발'],undefined],
  ]);
  assert.ok(!checked.includes(target));
  assert.ok(!checked.includes('https://www.pinkage.co.kr/'));
  assert.equal(analysis.filtering.excluded.length,2);
  const report=MarketingReportSchema.parse({...fixture,url:target,competitorAnalysis:analysis});
  assert.equal(commercialSearchSnapshot(report).competitorAnalysis?.competitors[0].link,'https://www.amimo.co.kr/');
  const blocks=buildCompetitorDocument(report);
  assert.ok(blocks.some(block=>block.href==='https://www.amimo.co.kr/'));
  assert.ok(blocks.every(block=>!block.text.includes('네이버 웹문서')));
  const card=renderToStaticMarkup(createElement(WigStoreComparison,{analysis:report.competitorAnalysis!}));
  assert.match(card,/aria-label="아미모 공식몰 열기"[^>]*>|href="https:\/\/www.amimo.co.kr\/"/);
  assert.doesNotMatch(card,/href="https:\/\/(gabalnara|www.pinkage)/);
  const purpose=analyzeWebsitePurpose({...own,finalUrl:target,h2:[],bodyText:'길이 연장용 인모 헤어피스를 온라인 판매합니다.'});
  const flow=renderToStaticMarkup(createElement(WigPurchaseJourney,{purpose}));
  assert.match(flow,/제품 고르기.*옵션 비교.*색상과 착용.*구매와 교환/);
  assert.match(flow,/wig-status-observed/);
  assert.match(flow,/wig-status-review/);
  assert.match(flow,/#report-view-search-scope/);
});
