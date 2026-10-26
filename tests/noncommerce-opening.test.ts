import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import ReportLayout from '../components/report/ReportLayout';
import AnswerContentPanel from '../components/report/AnswerContentPanel';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {finalizeReportEvidence,evidenceScoreText} from '../lib/evidenceReview';
import {buildAnswerContentPlan,ANSWER_CONTENT_TITLE} from '../lib/answerContent';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import {nonCommerceOpening} from '../lib/reportOpening';
import type {MarketingReport} from '../lib/reportSchema';
import type {PdfTextStyle} from '../lib/pdfLayout';
import {fixture} from './fixtures/report';
import {noncommerceCases,noncommerceResponse} from './fixtures/noncommerce';
import {answerPlan} from './fixtures/answer-content';

const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);
function render(report:MarketingReport){
  const prior=(globalThis as typeof globalThis&{React?:typeof React}).React;
  Object.assign(globalThis,{React});
  try{return load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));}
  finally{Object.assign(globalThis,{React:prior});}
}
for(const site of noncommerceCases.filter(c=>!['mixed','unknown'].includes(c.kind)))test(`non-commerce opens with customer questions and preserves scoped evidence: ${site.id}`,async t=>{
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>noncommerceResponse(input));
  const data=await extractWebsite(site.url);
  const report=finalizeReportEvidence({...fixture,url:site.url,answerContentPlan:buildAnswerContentPlan(data)},data);
  const before=JSON.stringify(report),$=render(report),opening=nonCommerceOpening(report)!;
  assert.equal($('#report-overview .answer-content').length,1);
  assert.equal($('#report-geo .answer-content').length,0,'the moved content is not duplicated');
  assert.equal($('#report-overview .report-radar').length,0);
  assert.equal($('.report-hero-score').length,0);
  assert.ok($('.report-hero-summary').text().includes(opening.topic));
  assert.doesNotMatch($('.report-hero').text()+$('.answer-header').text(),/HTML 기본 항목|미측정|미확인|완료하지 못/);
  const purpose=$('[aria-label="페이지 목적별 분석"]'),evidence=$('[aria-label="8개 영역 근거와 측정 범위"]');
  assert.equal(purpose.length,1);assert.equal(evidence.length,1);
  assert.equal(purpose.closest('details').attr('open'),'open');
  assert.equal(evidence.closest('details').attr('open'),'open');
  assert.ok(evidence.text().includes('미측정'),'measurement limits remain available');
  assert.equal($('.report-chapter').length,5);
  const ids=$('[id]').toArray().map(n=>$(n).attr('id'));assert.equal(ids.length,new Set(ids).size);
  for(const a of $('a[href^="#"]').toArray())assert.ok(ids.includes($(a).attr('href')!.slice(1)));
  const blocks=buildReportDocument(report),question=blocks.findIndex(b=>b.text===ANSWER_CONTENT_TITLE),scope=blocks.findIndex(b=>b.text==='페이지 목적별 분석');
  assert.ok(question>=0&&question<scope,'detailed PDF also starts with customer content');
  assert.ok(blocks.findIndex(b=>b.text===evidenceScoreText(report))>question);
  assert.equal(blocks.filter(b=>b.text===ANSWER_CONTENT_TITLE).length,1);
  const summary=buildReportSummaryPage(report,measure),intro=summary.lines.filter(l=>l.y<550).map(l=>l.text).join(' ');
  assert.match(intro,/주요 주제와 다음 행동/);assert.match(intro,/고객이 먼저 궁금해할 질문/);
  assert.doesNotMatch(intro,/미측정|미확인|HTML 기본 항목 충족|8개 영역 진단/);
  for(const line of summary.lines){assert.ok(line.x>=48&&line.x+line.width<=742.01,line.text);assert.ok(line.y+line.lineHeight<=1040,line.text);}
  assert.equal(JSON.stringify(report),before,'presentation does not rewrite stored observations');
});

test('basic and limited guidance retain their exact scope inside a default-open disclosure',()=>{
  for(const mode of ['basic','limited'] as const){
    const plan={...answerPlan(),mode};
    const $=load(renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan,opportunityFirst:true})));
    const details=$('.answer-scope-detail');assert.equal(details.length,1);assert.equal(details.attr('open'),'open');
    assert.ok(details.text().includes(plan.notice));assert.match(details.text(),/미측정|실제 네이버 노출/);
    assert.doesNotMatch($('.answer-header').text(),/미측정|부족|완료하지 못/);
    assert.ok($('.answer-tags').text().includes(mode==='basic'?'기본 질문 가이드':'페이지 주제 기반 가이드'));
  }
});

test('legacy, mixed and unknown reports keep their established overview and scores',()=>{
  const purposes=['mixed','unknown'].map(kind=>({version:1 as const,kind:kind as 'mixed'|'unknown',label:'목적 후보',sourceUrl:fixture.url,evidence:[],goal:{key:'unknown' as const,label:'다음 행동 확인',observed:false,evidence:[]},pricingObserved:false,note:'검토',checks:[]}));
  for(const sitePurpose of [undefined,...purposes]){
    const report={...fixture,sitePurpose};assert.equal(nonCommerceOpening(report),null);
    const $=render(report);assert.equal($('.report-hero-score').length,1);assert.equal($('#report-overview .report-radar').length,1);
  }
});

test('a saved non-commerce report without a question plan gets a useful, truthful opening',()=>{
  const purpose={version:1 as const,kind:'service' as const,label:'서비스·상담형',sourceUrl:fixture.url,evidence:[],goal:{key:'contact' as const,label:'상담·문의',observed:false,evidence:[]},pricingObserved:false,note:'검토',checks:[]};
  const $=render({...fixture,sitePurpose:purpose,answerContentPlan:undefined});
  assert.match($('#report-overview').text(),/고객이 먼저 궁금해할/);
  assert.match($('#report-overview details').text(),/분석 기록이 없습니다/);
  assert.equal($('.report-hero-score').length,0);
});
