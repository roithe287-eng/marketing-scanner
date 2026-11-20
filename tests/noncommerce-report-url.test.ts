import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import ReportLayout from '../components/report/ReportLayout';
import {analyzeWebsitePurpose,showProductCollection} from '../lib/websitePurpose';
import {buildCompetitionScope} from '../lib/competitionScope';
import {reportForPresentation} from '../lib/reportPresentation';
import {nonCommerceGoalCases,nonCommerceGoalPage,nonCommerceGoalReport,type NonCommerceGoalSample} from './fixtures/noncommerce-goal-report';

test('public fortune listings need visible first-party tools beyond topical metadata',()=>{
  const {url,html}=nonCommerceGoalCases['fortune-reading'];
  const input=nonCommerceGoalPage(html,url),purpose=analyzeWebsitePurpose(input);
  assert.equal(purpose.business?.id,'fortune_digital');
  assert.equal(buildCompetitionScope(input).profile,'fortune_digital');
  assert.equal(purpose.goal.key,'start');
  assert.deepEqual(purpose.goal.evidence.map(item=>item.text),['연우 AI','연우 만세력']);
  for(const other of [html.replaceAll('yeonwoo.example.com','elsewhere.example.org'),html.replace('<a href="https://ai.','<a hidden href="https://ai.'),html.replace('https://ai.yeonwoo.example.com/','https://tools.yeonwoo.example.com/#related')]){
    assert.notEqual(analyzeWebsitePurpose(nonCommerceGoalPage(other,url)).business?.id,'fortune_digital');
  }
  assert.notEqual(analyzeWebsitePurpose(nonCommerceGoalPage(html,url.replace('/item','/blog/reading'))).business?.id,'fortune_digital');
});

test('non-commerce report paths show their own completion in text, visuals and controls',t=>{
  const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
  Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
  for(const [sample,entry] of Object.entries(nonCommerceGoalCases)){
    const report=nonCommerceGoalReport(sample as NonCommerceGoalSample),before=JSON.stringify(report);
    assert.equal(showProductCollection(report.sitePurpose),false,entry.url);
    const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
    assert.equal($('.simple-kpi-tabs button[aria-pressed="true"]').text(),`${entry.completion} 목표`);
    assert.ok($('#report-simple-kpi input[aria-describedby]').length===3,entry.url);
    assert.equal($('[data-page-model="service-conversion"]').children('li').length,report.serviceStrategy?.funnel.length);
    assert.equal($('[data-page-model="service-decisions"] article').length,report.serviceStrategy?.segments.length);
    assert.equal($('[data-page-model="service-landing"] a[href^="#report-service-segment-"]').length,report.serviceStrategy?.segments.length);
    for(const selector of ['#report-conversion-verification','.growth-path','[data-report-diagram="actions-guide"]','[data-report-diagram="actions-kpi"]','#report-view-actions-kpi .reading-preview','#report-simple-kpi .growth-measurement']){
      assert.ok($(selector).text().includes(entry.completion),`${entry.url} ${selector}`);
      assert.doesNotMatch($(selector).text(),/문의·구매|장바구니|재고·배송/,`${entry.url} ${selector}`);
    }
    assert.equal(JSON.stringify(report),before);
  }
});

test('identical industry quotations stay in one review section and links reach the retained source',t=>{
  const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
  Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
  const report=nonCommerceGoalReport('medical-goal'),render=()=>load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
  const $=render(),strategy=$('#report-view-overview-services'),sector=$('#report-view-overview-sector');
  assert.ok(strategy.find('a[href^="#report-purpose-check-"]').length>0);
  assert.ok(sector.find('a[href^="#report-purpose-check-"]').length>0);
  for(const link of strategy.find('a[href^="#report-purpose-check-"]').toArray()){
    const target=$($(link).attr('href')!);
    assert.equal(target.length,1);
    for(const source of target.find('a[href^="#report-purpose-source-"]').toArray()){
      const href=$(source).attr('href')!,quote=$(href).find('blockquote').text();
      assert.ok(quote);
      assert.equal(strategy.find('.service-source-quotes blockquote').toArray().some(e=>$(e).text()===quote),false);
    }
  }
  const question=report.answerContentPlan?.questions.find(q=>q.draft&&q.missingFacts.length);
  assert.ok(question);
  const panel=$(`#report-question-check-${question.id}`).parent();
  assert.equal(panel.find('blockquote.briefing-answer-text').text(),question.draft);
  assert.equal(panel.find('.briefing-excerpt blockquote').length,0);
  assert.equal(panel.find(`a[href="#report-question-check-${question.id}"]`).length,1);
});

test('fortune overview metadata identifies the topic without treating the page as a tool or a store',()=>{
  const entry=nonCommerceGoalCases['fortune-overview'],input=nonCommerceGoalPage(entry.html,entry.url);
  const result=analyzeWebsitePurpose(input);
  assert.equal(result.kind,'content');
  assert.equal(result.declaredIndustry?.category,'fortune');
  assert.equal(result.goal.key,'read');
  assert.equal(result.goal.observed,false);
  assert.equal(result.business,undefined);
  assert.equal(showProductCollection(result),false);
  assert.match(result.note,/풀이·상담의 시작 링크와 완료 화면은 확인되지 않았습니다/);
  const seller=analyzeWebsitePurpose(nonCommerceGoalPage(entry.html.replace('서비스 항목을 불러옵니다.</p>','서비스 항목을 불러옵니다.</p><a href="/cart">장바구니</a>'),entry.url));
  assert.equal(showProductCollection(seller),true);
  const report=nonCommerceGoalReport('fortune-overview'),legacy={...report,sitePurpose:{...result,kind:'unknown' as const,declaredIndustry:undefined}};
  assert.equal(reportForPresentation(legacy).sitePurpose?.goal.label,entry.completion);
});

test('an older unknown report can recover a fortune purpose using its own retained action links',()=>{
  const report=nonCommerceGoalReport('fortune-reading'),purpose=report.sitePurpose!;
  const old={...report,sitePurpose:{...purpose,kind:'unknown' as const,business:undefined}};
  const before=JSON.stringify(old);
  assert.equal(reportForPresentation(old).sitePurpose?.business?.id,'fortune_digital');
  assert.equal(JSON.stringify(old),before);
});
