import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as cheerio from 'cheerio';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {analyzeWebsitePurpose,isNonCommerce,purposePrompt} from '../lib/websitePurpose';
import {captureCommunityContext,communityPageUrl} from '../lib/communityContext';
import {collectCommunityContext} from '../lib/collectCommunityContext';
import {classifyIndustry} from '../lib/industryClassifier';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {marketKeywordCandidates,keywordEvidence,competitorOwnText} from '../lib/competitorResearch';
import {finalizeReportEvidence} from '../lib/evidenceReview';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import WebsitePurposePanel from '../components/report/WebsitePurposePanel';
import {fixture} from './fixtures/report';

const url='https://forum.example.com/';
const html=`<html><head><title>실무마당 - 마케팅 정보 포털</title><meta name="description" content="마케터가 정보를 공유하는 마케팅 커뮤니티입니다. 정보, 교육, 질문답변을 제공합니다."></head><body>
<header><a href="/ab-signup">회원가입</a><a href="/ab-100">커뮤니티</a><a href="/ab-200">질문답변</a><a href="/ab-300">정보공유</a><a href="https://education.example.com">교육</a></header>
<main><h1>마케팅 정보와 실무 노하우를 나누는 공간</h1><h2>오늘의 게시글</h2>
<a href="/ab-201-1001">병원 진료 예약 광고의 성과가 궁금합니다</a><a href="/ab-201-1002">온라인 쇼핑몰 장바구니 개선을 문의드립니다</a><a href="/ab-301-1003">새로운 마케팅 자료와 광고 사례를 공유합니다</a>
<p>입점 광고: 동물병원 치료·법률 상담·건강식품 판매 3만원</p><a href="/ab-calendar">시험 접수 일자 안내</a>
<h2>온라인 교육</h2><h2>추천 강의</h2><p>커리큘럼과 수강료 안내</p>
<a href="javascript:void(0)">뉴스레터 구독하기</a><button>질문하기</button></main></body></html>`;
const article=`<html><head><title>병원 예약 광고를 운영할 때 확인할 사항</title></head><body><main><h1>공개 질문과 답변</h1><span class="author">공개 필명</span><time datetime="2026-11-09">2026-11-09</time><p>댓글과 답변을 확인하세요.</p></main><script type="application/ld+json">{"@type":"QAPage","mainEntity":{"@type":"Question","name":"광고를 어떻게 확인하나요?"}}</script></body></html>`;

test('community identity outranks secondary education, merchant ads and question titles',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(String(input).endsWith('/robots.txt')?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html;charset=utf-8'}}));
  const data=await extractWebsite(url),p=analyzeWebsitePurpose(data);
  assert.equal(p.kind,'content');assert.equal(p.label,'커뮤니티·정보 포털형');assert.equal(p.sector,undefined);assert.equal(p.business,undefined);assert.equal(isNonCommerce(p),true);
  assert.equal(p.goal.key,'read');assert.equal(p.goal.label,'게시글 탐색·회원 참여');assert.equal(await classifyIndustry(data),'media');
  assert.ok(p.community?.navigation.some(l=>l.role==='join'));
  assert.ok(p.community?.navigation.some(l=>l.role==='subscribe'&&l.targetObserved===false));
  assert.ok(p.community?.navigation.some(l=>l.role==='secondary'&&l.label==='교육'));
  assert.doesNotMatch(JSON.stringify(p.goal),/시험 접수|예약 광고/);
  assert.match(purposePrompt(data),/게시글 제목과 입점업체/);
  const report=MarketingReportSchema.parse(finalizeReportEvidence({...fixture,url},data));
  assert.equal(report.checklist?.find(c=>c.id==='price_info')?.status,'not_applicable');
  assert.doesNotMatch(report.checklist?.find(c=>c.id==='cta_clarity')?.currentValue||'',/시험 접수|장바구니 개선/);
  assert.match(renderToStaticMarkup(React.createElement(WebsitePurposePanel,{purpose:p})),/커뮤니티 공개 페이지 표본/);
  assert.match(buildReportDocument(report).map(b=>b.text).join('\n'),/커뮤니티 공개 페이지 표본 1개/);
});

test('community topics, answer plans and citation questions ignore other businesses in member posts',async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(String(input).endsWith('/robots.txt')?'User-agent: *\nAllow: /':html,{headers:{'content-type':'text/html'}}));
  const data=await extractWebsite(url),keywords=marketKeywordCandidates(data).map(k=>k.keyword);
  assert.ok(keywords.includes('마케팅 커뮤니티'));
  assert.doesNotMatch(keywords.join(' '),/건강식품|병원|법률|장바구니/);
  assert.equal(keywordEvidence('건강식품',data).grounded,false);
  assert.doesNotMatch(competitorOwnText(data),/건강식품|진료 예약 광고/);
  const plan=buildAnswerContentPlan(data,{primaryKeyword:'건강식품',secondaryKeywords:[],topicScope:'focused',questions:[]});
  assert.deepEqual(plan.questions.slice(0,3).map(q=>q.intent),['scope','process','proof']);
  assert.match(plan.questions.map(q=>q.question).join(' '),/회원가입|원출처/);
  assert.ok(plan.questions.every(q=>q.draft===''&&q.missingFacts.length>0));
  const questions=citationFallbackQuestions(data,'실무마당');assert.equal(questions.length,5);assert.match(JSON.stringify(questions),/커뮤니티/);assert.doesNotMatch(JSON.stringify(questions),/진료비|학습 대상|커리큘럼|배송/);
});

test('public collection keeps board/detail evidence separate and never follows membership links',async t=>{
  const seed=captureCommunityContext(cheerio.load(html),url)!;
  const requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{requests.push(String(input));return new Response(String(input).includes('/ab-201-')?article:'<title>질문답변 게시판</title><main><h1>질문 목록</h1></main>',{headers:{'content-type':'text/html'}});});
  const result=(await collectCommunityContext(url,seed,{status:'ok',text:'User-agent: *\nAllow: /',url:url+'robots.txt'} as any))!;
  assert.equal(requests.length,3);assert.equal(result.pages.length,4);
  assert.equal(result.pages[0].title,seed.pages[0].title);
  const detail=result.pages.find(p=>p.pageType==='discussion')!;
  assert.ok(detail.authorObserved&&detail.dateObserved&&detail.discussionObserved);
  assert.ok(detail.schemaTypes.includes('QAPage'));
  assert.doesNotMatch(requests.join(' '),/signup|education\.example/);
  assert.match(result.note,/합산하지 않습니다/);
});

test('robots denial and login redirects remain unverified, without crawling private content',async t=>{
  const seed=captureCommunityContext(cheerio.load(html),url)!,requests:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{requests.push(String(input));return new Response('',{status:302,headers:{location:'/ab-login'}});});
  const blocked=(await collectCommunityContext(url,seed,{status:'ok',text:'User-agent: *\nDisallow: /',url:url+'robots.txt'} as any))!;
  assert.equal(requests.length,0);assert.equal(blocked.pages.length,1);assert.ok(blocked.attempts.every(a=>a.status==='blocked'));
  const redirected=(await collectCommunityContext(url,seed,{status:'ok',text:'User-agent: *\nAllow: /',url:url+'robots.txt'} as any))!;
  assert.equal(requests.length,3);assert.equal(redirected.pages.length,1);assert.ok(redirected.attempts.every(a=>a.status==='blocked'));
  assert.ok(!requests.some(r=>r.includes('login')));
});

test('community read routes reject mutation, auth, external and sensitive query targets',()=>{
  for(const path of ['/ab-signup','/ab-login','/bbs/write.php','/forum/delete/1','/ab-100?mode=delete','/ab-100?token=secret','https://other.example.com/ab-1','/article.pdf','/ab-100?wr_id=1%26action%3Ddelete'])assert.equal(communityPageUrl(path,url),null,path);
  assert.equal(communityPageUrl('/bbs/board.php?bo_table=free&wr_id=20',url),url+'bbs/board.php?bo_table=free&wr_id=20');
  assert.equal(communityPageUrl('/ab-201-1001?utm_source=test',url),url+'ab-201-1001');
});

test('an article about communities and a real course page are not reclassified as portal homepages',()=>{
  assert.equal(captureCommunityContext(cheerio.load('<title>커뮤니티 운영 방법</title><main><h1>커뮤니티 운영 방법</h1><p>커뮤니티에 대해 설명하는 칼럼입니다.</p></main>'),url),undefined);
  const course=html.replace('실무마당 - 마케팅 정보 포털','마케팅 교육 과정 · 수강 신청').replace('</body>','<script type="application/ld+json">{"@type":"Course"}</script></body>');
  assert.equal(captureCommunityContext(cheerio.load(course),url+'course'),undefined);
});

test('QAPage directly submitted is recognized without a known domain or home navigation',()=>{
  const context=captureCommunityContext(cheerio.load(article),url+'ab-201-1001');
  assert.equal(context?.pageType,'discussion');
});
