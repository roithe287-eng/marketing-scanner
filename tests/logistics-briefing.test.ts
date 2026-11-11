import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildLogisticsBriefing,LogisticsBriefingSchema} from '../lib/logisticsBriefing';
import {buildServiceStrategy,ServiceStrategySchema} from '../lib/serviceStrategy';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import LogisticsBriefingPanel from '../components/report/LogisticsBriefingPanel';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import {fixture} from './fixtures/report';

const url='https://www.pumyang.com/';
const sources=[
  {url:url+'oversea/01/',title:'해외이사 절차',text:'해외이사 전문 포장작업과 물품에 적합한 포장자재 및 장비를 확인합니다.'},
  {url:url+'oversea/01/',title:'해외이사 절차',text:'수입통관 및 배송서비스와 서류 준비를 안내합니다.'},
  {url:url+'customer/07/',title:'공개 상담 양식',text:'입력 항목: 이름 · 연락처 · 출발지 · 도착지'},
  {url:url+'customer/02/',title:'운송약관',text:'계약서에 운송 기간과 서비스 포함 내역 및 추가 비용을 명시합니다.'},
];

test('briefing plans distinguish the supplied search example, own evidence, proposals and unmeasured citation',()=>{
  const p=buildLogisticsBriefing(url,sources)!;
  assert.ok(LogisticsBriefingSchema.safeParse(p).success);
  assert.equal(p.basis,'reference-example-and-own-sources');assert.match(p.scope,/자동 수집.*결과가 아닙니다/);
  assert.equal(p.blocks.length,4);assert.equal(p.steps.length,5);assert.equal(p.channels.length,3);assert.equal(p.articles.length,6);
  assert.ok(p.blocks.every(b=>b.draft.includes('[')&&b.action&&b.placement));
  assert.ok(p.blocks.every(b=>b.evidence.every(e=>sources.some(s=>s.url===e.url&&s.text===e.text))));
  assert.doesNotMatch(JSON.stringify(p),/2~3개월|상위 노출 보장|blog\.naver\.com\/[^\s"]+|인용 확률|인용률 \d/);
  assert.ok(p.references.every(r=>/^https:\/\/(searchadvisor\.naver\.com|www\.navercorp\.com)\//.test(r.url)));
  assert.match(p.verification[2].metric,/브랜드 언급.*홈페이지 URL 인용.*블로그 URL 인용/);
});

test('missing facets remain scoped review items; generic headings cannot establish content coverage',()=>{
  const p=buildLogisticsBriefing(url,sources)!;
  const prep=p.blocks.find(b=>b.id==='preparation')!;
  assert.deepEqual(prep.review,['반입 제한·휴대 구분']);assert.ok(prep.observed.includes('서류 준비'));
  const onlyHeadline=[{url,title:'서류·여권·귀중품·포장·반입 제한',text:'해외이사 서비스를 소개합니다.'}];
  const limited=buildLogisticsBriefing(url,onlyHeadline)!.blocks.find(b=>b.id==='preparation')!;
  assert.equal(limited.observed.length,0);assert.equal(limited.review.length,3);assert.equal(limited.evidence.length,0);
});

test('third-party pages and testimonials cannot fill gaps; unrelated freight does not get overseas moving advice',()=>{
  const foreign={url:'https://example.com/blog',title:'해외이사',text:'해외이사 귀중품 반입 제한 안내 THIRD_PARTY_FACT'};
  const review={url,title:'고객 후기',text:'해외이사 귀중품 반입 제한 안내 REVIEW_ONLY_FACT'};
  const p=buildLogisticsBriefing(url,[...sources,foreign,review])!;
  assert.ok(p.blocks.find(b=>b.id==='preparation')!.review.includes('반입 제한·휴대 구분'));
  assert.doesNotMatch(JSON.stringify(p),/THIRD_PARTY_FACT|REVIEW_ONLY_FACT/);
  assert.equal(buildLogisticsBriefing(url,[foreign,review]),undefined);
  assert.equal(buildLogisticsBriefing(url,[{url,title:'SEA FREIGHT',text:'기업 해상운송 화물 서비스'}]),undefined);
});

test('new scans retain the full briefing in report serialization and document exports; legacy reports stay compatible',()=>{
  const data={url,finalUrl:url,title:'범양해운 해외이사',description:'해외이사 견적 상담',bodyText:'해외이사 포장·통관·배송 견적 상담',h1:[],h2:[],businessDocuments:sources.map(s=>({url:s.url,title:s.title,capturedAt:new Date().toISOString(),source:'merchant_html',sections:[{heading:s.title,text:s.text}]}))} as unknown as ExtractedWebsiteData;
  const strategy=buildServiceStrategy(data)!;assert.ok(strategy.briefing);
  const report=MarketingReportSchema.parse({...fixture,serviceStrategy:strategy});
  const document=buildReportDocument(report).map(b=>b.text).join('\n');
  for(const b of strategy.briefing.blocks){assert.ok(document.includes(b.draft));assert.ok(document.includes(b.placement));}
  for(const a of strategy.briefing.articles)assert.ok(document.includes(a.title));
  assert.ok(document.includes(strategy.briefing.verification[3].metric));assert.match(document,/촬영일·검색 조건/);
  const {briefing,...legacy}=strategy;assert.ok(ServiceStrategySchema.safeParse(legacy).success);
  assert.equal(buildServiceStrategy({...data,collectionNotice:'수집 제한'}),undefined);
  assert.equal(buildServiceStrategy({...data,businessDocuments:data.businessDocuments!.map(d=>({...d,source:'search_excerpt'}))}),undefined);
});

test('briefing screen renders drafts, source disclosure and six article briefs without unsafe external links',()=>{
  const p=buildLogisticsBriefing(url,sources)!;
  const markup=renderToStaticMarkup(React.createElement(LogisticsBriefingPanel,{plan:p}));
  assert.match(markup,/해외이사 AI 브리핑 대응 설계/);assert.match(markup,/검색 사례에서 보인 내용/);assert.match(markup,/작성 초안/);
  for(const a of p.articles)assert.ok(markup.includes(a.title));
  assert.doesNotMatch(markup,/undefined|NaN|href="javascript:/);
  assert.match(markup,/noopener noreferrer/);
});
