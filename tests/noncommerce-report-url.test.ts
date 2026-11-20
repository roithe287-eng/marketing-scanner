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

test('four non-commerce report paths show their own completion in text, visuals and controls',t=>{
  const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
  Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
  for(const [sample,entry] of Object.entries(nonCommerceGoalCases)){
    const report=nonCommerceGoalReport(sample as NonCommerceGoalSample),before=JSON.stringify(report);
    assert.equal(showProductCollection(report.sitePurpose),false,entry.url);
    const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
    assert.equal($('.simple-kpi-tabs button[aria-pressed="true"]').text(),`${entry.completion} 목표`);
    assert.ok($('#report-simple-kpi input[aria-describedby]').length===3,entry.url);
    for(const selector of ['#report-conversion-verification','.growth-path','[data-report-diagram="actions-guide"]','[data-report-diagram="actions-kpi"]','#report-view-actions-kpi .reading-preview','#report-simple-kpi .growth-measurement']){
      assert.ok($(selector).text().includes(entry.completion),`${entry.url} ${selector}`);
      assert.doesNotMatch($(selector).text(),/문의·구매|장바구니|재고·배송/,`${entry.url} ${selector}`);
    }
    assert.equal(JSON.stringify(report),before);
  }
});

test('an older unknown report can recover a fortune purpose using its own retained action links',()=>{
  const report=nonCommerceGoalReport('fortune-reading'),purpose=report.sitePurpose!;
  const old={...report,sitePurpose:{...purpose,kind:'unknown' as const,business:undefined}};
  const before=JSON.stringify(old);
  assert.equal(reportForPresentation(old).sitePurpose?.business?.id,'fortune_digital');
  assert.equal(JSON.stringify(old),before);
});
