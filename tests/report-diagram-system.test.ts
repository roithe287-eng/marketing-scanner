import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import ReportLayout from '../components/report/ReportLayout';
import ReportSectionDiagram from '../components/report/ReportSectionDiagram';
import PageModelGraphic from '../components/report/PageModelGraphic';
import {buildReportDiagrams} from '../lib/reportDiagrams';
import {buildReportInsights} from '../lib/reportInsights';
import {buildSourceLibrary} from '../lib/reportContent';
import {serviceReviewReport} from './fixtures/service-review-report';
import {visualReviewReport} from './fixtures/visual-review-report';
import {fixture} from './fixtures/report';
import type {PageSketchKind} from '../lib/reportPlainLanguage';

test('every result section has a diagram or an integrated page model without changing saved evidence',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 for(const report of [fixture,serviceReviewReport(),visualReviewReport()]){
  const before=JSON.stringify(report),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
  for(const section of $('[data-report-panel]').toArray()){
   const el=$(section),id=el.attr('data-report-panel');
   assert.ok(el.find('[data-report-diagram], [data-page-model]').length>0,`missing section diagram: ${id}`);
   assert.equal(el.children('.report-section-divider,.section-reading').length,1);
   const fold=el.children('.section-reading');
   if(fold.length){assert.ok(fold.find('>summary .reading-preview').text().trim());assert.equal(fold.attr('open'),undefined);}
  }
  assert.equal($('.report-reading-key [data-reading-role]').length,5);
  assert.deepEqual($('.report-nav a[data-chapter-link]').toArray().map(el=>$(el).attr('data-chapter-link')),['overview','geo','search','competition','actions']);
  assert.equal($('#report-view-overview-main [data-report-diagram]').length,0,'the first layout keeps its integrated page examples');
  assert.equal($('#report-view-overview-questions [data-report-diagram]').length,0);
  assert.equal(JSON.stringify(report),before);
 }
});

test('diagram counts match stored groups, URLs, tasks, issues and actual roadmap periods',()=>{
 const report=serviceReviewReport(),data=buildReportInsights(report),sources=buildSourceLibrary(report),before=JSON.stringify(report),diagrams=buildReportDiagrams(report,data);
 assert.equal(diagrams['search-sources'].nodes[0].value,`${sources.groups.length}개`);
 assert.equal(diagrams['search-sources'].nodes[2].value,`${sources.links.length}개`);
 assert.equal(diagrams['actions-board'].nodes[0].value,`${data.tasks.length}개 항목`);
 assert.equal(diagrams['actions-issues'].nodes[0].value,`${report.criticalIssues.length}개 이슈`);
 for(const [i,key] of (['immediately','thisWeek','thisMonth'] as const).entries())assert.equal(diagrams['actions-schedule'].nodes[i].value,`${report.priorityRoadmap[key].length}개 항목`);
 assert.equal(JSON.stringify(report),before);
 const second=buildReportDiagrams(report,data);diagrams['actions-board'].nodes[0].title='changed locally';assert.notEqual(second['actions-board'].nodes[0].title,'changed locally','diagram instances do not share mutable node state');
});

test('branch, comparison and calculation relationships stay explicit and escaped',()=>{
 const report=serviceReviewReport(),diagrams=buildReportDiagrams(report,buildReportInsights(report));
 assert.equal(diagrams['geo-observations'].kind,'branch');assert.equal(diagrams['competition-messages'].kind,'compare');
 const kpi=diagrams['actions-kpi'];assert.equal(kpi.kind,'equation');assert.match(kpi.nodes[1].detail,/현재 완료 ÷ 현재 유입/);assert.match(kpi.nodes[2].detail,/목표 완료 ÷ 현재 비율/);
 const input={...kpi,title:'<script>제목</script>',nodes:kpi.nodes.map(n=>({...n,detail:'<img src=x> 내용'}))};
 const $=load(renderToStaticMarkup(React.createElement(ReportSectionDiagram,{diagram:input,id:'test'})));
 assert.equal($('script,img').length,0);assert.ok($.text().includes(input.title));
 assert.equal($('ol>li').length,3);assert.equal($('svg.report-diagram-connector[aria-hidden=true]').length,2);
});

test('all nine page models use independent scalable vector geometry and no external images',()=>{
 const types:PageSketchKind[]=['hero','search','cost','faq','proof','action','image','settings','flow'];
 const scenes=new Set<string>();
 for(const type of types){
  const html=renderToStaticMarkup(React.createElement(PageModelGraphic,{type})),$=load(html);
  assert.equal($('svg[data-page-model]').attr('viewBox'),'0 0 260 156');
  assert.equal($('svg').attr('aria-hidden'),'true');
  assert.equal($('image,img,foreignObject,script,[id]').length,0,'no raster assets, embedded HTML or duplicate SVG IDs');
  assert.ok($('path,rect,circle').length>0,type);scenes.add(html);
 }
 assert.equal(scenes.size,types.length);
});
