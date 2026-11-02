import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import ReportLayout from '../components/report/ReportLayout';
import PagePatternGuide,{PagePatternGrid} from '../components/report/PagePatternGuide';
import {TodayWork} from '../components/report/ExecutionWorkflow';
import {buildSourceLibrary,buildContentFacets,isBoilerplateSource} from '../lib/reportContent';
import {buildExecutionPlan} from '../lib/reportExecution';
import {PLAIN_GUIDES} from '../lib/reportPlainLanguage';
import {fixture} from './fixtures/report';
import {serviceReviewReport} from './fixtures/service-review-report';
import {visualReviewReport} from './fixtures/visual-review-report';

test('every report opens with homepage content then customer questions, with scores and tasks retained later',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;Object.assign(globalThis,{React});
 t.after(()=>Object.assign(globalThis,{React:previous}));
 for(const report of [fixture,serviceReviewReport(),visualReviewReport()]){
  const before=JSON.stringify(report),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
  assert.deepEqual($('#report-overview [data-report-panel]').toArray().slice(0,3).map(el=>$(el).attr('data-report-panel')),['overview-main','overview-questions','overview-priority']);
  assert.equal($('#report-view-overview-main .site-content-overview').length,1);
  assert.equal($('#report-view-overview-main .report-radar, #report-view-overview-main .work-today, #report-view-overview-main .sector-overview').length,0);
  assert.equal($('#report-view-overview-questions .answer-content').length,1);
  assert.equal($('#report-view-overview-priority .work-today').length,1);
  assert.equal($('#report-view-overview-observations .report-radar').length,1);
  assert.equal($('.site-content-overview').length,1);
  for(const quote of $('.content-evidence-quotes blockquote p').toArray())assert.ok($(quote).text().length<=242);
  assert.equal(JSON.stringify(report),before);
 }
});

test('footer and policy text cannot become service/support evidence, while full original copy remains available',()=>{
 const report=serviceReviewReport();
 const legal='Information 주식회사 오드덕 대표 - 박지원 사업자등록번호 - 640-88-00562 통신판매업신고번호 제2023-성남수정-0244호 Terms & Condition Privacy Policy © 2019. ALL RIGHT RESERVED.';
 const eligibility='사업자등록번호가 있는 소상공인에게 창업 준비 지원을 안내합니다. 신청 대상과 제출 서류를 확인하세요.';
 const genuine='신청 고객에게 출국 후 현지 적응 지원을 제공합니다. 지원 기간과 별도 비용은 프로그램별 안내에서 확인하세요.';
 report.pageEvidence.siteEditing.elements.push({key:'footer-no-region',kind:'text',tag:'div',selector:'.information',text:legal,truncated:false,heading:'',order:200});
 report.pageEvidence.siteEditing.contentSections!.push({id:'footer-duplicated',heading:'Information',text:legal,truncated:false},{id:'actual-support',heading:'현지 지원',text:genuine,truncated:false},{id:'actual-eligibility',heading:'지원 자격',text:eligibility,truncated:false});
 report.pageEvidence.bodyText+='\n'+legal;
 const library=buildSourceLibrary(report),before=JSON.stringify(library),facets=buildContentFacets(library);
 assert.ok(library.groups.some(g=>g.text===legal),'the legal source is retained in the source directory');
 for(const f of facets)assert.ok(f.evidence.every(e=>e.text!==legal));
 assert.ok(facets.find(f=>f.id==='support')!.evidence.some(e=>e.text===genuine));
 assert.equal(isBoilerplateSource(library.groups.find(g=>g.text===eligibility)!),false,'eligibility text mentioning registration is real content');
 assert.equal(JSON.stringify(library),before);
});

test('jargon guides show small page models and explicit example labels, escaping content as text',()=>{
 for(const [topic,g] of Object.entries(PLAIN_GUIDES)){
  const $=load(renderToStaticMarkup(React.createElement(PagePatternGuide,{title:topic,topic:topic as keyof typeof PLAIN_GUIDES})));
  assert.ok($('.plain-page-meaning').text().includes(g.meaning));
  assert.equal($('.page-pattern-card').length,g.patterns.length);
  assert.equal($('.page-pattern-card svg').length,g.patterns.length);
  assert.match($('figcaption').text(),/구성 예시.*실제 화면 캡처 아님/);
  assert.equal($('img,script,iframe').length,0);
 }
 const $=load(renderToStaticMarkup(React.createElement(PagePatternGrid,{patterns:[{kind:'faq',title:'<script>질문</script>',detail:'<img src=x> 답변'}]})));
 assert.equal($('script,img').length,0);assert.match($.text(),/<script>질문<\/script>/);
});

test('starting cards keep explanations short even when original technical instructions are long',()=>{
 const report=serviceReviewReport(),long='복잡한 원래 진단 근거와 조건을 확인합니다. '.repeat(45);
 report.criticalIssues=[{title:'H1 대표 제목 점검',problem:long,reason:long,recommendation:long,priority:'high'}];
 const before=JSON.stringify(report),plan=buildExecutionPlan(report),$=load(renderToStaticMarkup(React.createElement(TodayWork,{plan})));
 assert.match($('.work-today-grid').text(),/첫 화면의 큰 제목/);
 assert.ok(!$('.work-today-grid').text().includes(long));
 assert.ok($('.work-today-grid>li').toArray().every(el=>$(el).text().length<360));
 assert.ok(plan.tasks.some(t=>t.action.includes(long)),'the original instructions remain in the execution plan');
 assert.equal(JSON.stringify(report),before);
});
