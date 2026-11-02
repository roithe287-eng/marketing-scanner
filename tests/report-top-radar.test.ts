import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import ScoreRadar from '../components/ScoreRadar';
import ReportLayout from '../components/report/ReportLayout';
import {fixture} from './fixtures/report';
import {serviceReviewReport} from './fixtures/service-review-report';
import {radarReviewReport} from './fixtures/radar-review-report';
import {diagnosisAxes} from '../lib/diagnosisVisuals';

test('a report with evidence review still draws the eight saved AI scores and labels their scope',()=>{
 const report=radarReviewReport(),before=JSON.stringify(report);
 const $=load(renderToStaticMarkup(React.createElement(ScoreRadar,{diagnosis:report.diagnosis,review:report.evidenceReview,featured:true})));
 assert.equal($('.diagnosis-radar-graphic').length,1);
 assert.equal($('.report-axis').length,8);
 const description=$('.diagnosis-radar-graphic').attr('aria-label')!;
 for(const a of diagnosisAxes)assert.ok(description.includes(`${a.label} ${report.diagnosis[a.key]}점`));
 assert.match(description,/AI 참고 평가/);assert.match($.text(),/실제 전환율·모바일 동작을 측정한 점수가 아닙니다/);
 assert.equal($('.diagnosis-radar-average-note').text(),'AI 평균');
 assert.equal($('.report-priority-trio').length,0,'the opening stays focused on the chart and axis selection');
 assert.equal(JSON.stringify(report),before);
});

test('radar is the first result block in legacy, service and evidence-reviewed reports, without duplication',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 for(const report of [fixture,serviceReviewReport(),radarReviewReport()]){
  const before=JSON.stringify(report),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
  assert.equal($('#report-area').children().first().attr('id'),'report-top');
  assert.equal($('#report-top .diagnosis-radar-graphic').length,1);
  assert.equal($('.report-radar-featured').length,1);assert.equal($('.diagnosis-radar-graphic').length,1);
  const ids=$('[id]').toArray().map(e=>$(e).attr('id'));assert.equal(ids.length,new Set(ids).size);
  assert.equal($('#report-top').length,1);assert.equal($('#report-header.report-hero').length,1);
  assert.equal($('#report-view-overview-main .site-content-overview').length,1);
  assert.equal($('#report-view-overview-questions .answer-content').length,1);
  assert.equal(JSON.stringify(report),before);
 }
});

test('HTML evidence remains below the radar and never replaces or supplies its AI score polygon',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 const report=radarReviewReport(),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
 assert.equal(report.evidenceReview!.score,100);
 assert.equal($('#report-view-overview-observations .report-evidence-review').length,1);
 for(const criterion of report.evidenceReview!.criteria)assert.ok($('.report-evidence-review').text().includes(criterion.evidence));
 assert.match($('.report-evidence-review').text(),/미측정/);
 assert.notEqual($('.diagnosis-radar-average').text(),'100','the HTML fulfillment percentage is not the radar average');
});
