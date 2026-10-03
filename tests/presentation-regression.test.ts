import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {fixture} from './fixtures/report';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildNaverVisualPage} from '../lib/naverVisualPdf';
import {analyzeNaverOptimization} from '../lib/analyzeNaverOptimization';
import type {PdfTextStyle} from '../lib/pdfLayout';
import DiagnosisCard from '../components/DiagnosisCard';
import DiagnosisChecklist from '../components/DiagnosisChecklist';
import CopyImprovement from '../components/CopyImprovement';
import PriorityMatrix from '../components/PriorityMatrix';
import QuickWinsFlow from '../components/QuickWinsFlow';
import ReportLayout from '../components/report/ReportLayout';
import EvidenceFlow from '../components/report/EvidenceFlow';
import CompetitorComparison from '../components/CompetitorComparison';
import {buildReportDocument} from '../lib/reportDocument';
import {layoutPdfPages,PDF_PAGE} from '../lib/pdfLayout';
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size*(t.weight>=600?1.06:1),0);
const long='문장이 길어져도 줄바꿈 과정에서 원문이나 작업 순서가 사라지지 않아야 합니다. '.repeat(12);
const issue={title:'긴 제목 '+long,priority:'high' as const,problem:long+'문제',reason:long+'원인',recommendation:long+'조치',badExample:'현재 문구 <script>alert(1)</script>',goodExample:'제안 문구 '+long,exampleNote:'사실 확인 필요'};
test('restyled evidence, copy and timeline panels preserve full text, ordering and escaping',()=>{
  const components=[
    {element:React.createElement(DiagnosisCard,{issue,index:0}),values:[issue.title,issue.problem,issue.reason,issue.recommendation,issue.badExample,issue.goodExample,issue.exampleNote]},
    {element:React.createElement(CopyImprovement,{exampleCopy:{...fixture.exampleCopy,currentHeroHeadline:long,heroHeadline:long+'개선',competitorCopyInsight:long+'비교'}}),values:[long,long+'개선',long+'비교']},
    {element:React.createElement(PriorityMatrix,{roadmap:{immediately:[long+'첫째',long+'둘째'],thisWeek:[long+'이번 주'],thisMonth:[]}}),values:[long+'첫째',long+'둘째',long+'이번 주','해당 항목이 없습니다.']},
    {element:React.createElement(QuickWinsFlow,{quickWins:[{title:long+'빠른 개선',steps:[long+'1단계',long+'2단계'],beforeExample:long+'이전',afterExample:long+'이후'}]}),values:[long+'빠른 개선',long+'1단계',long+'2단계',long+'이전',long+'이후']},
  ];
  for(const c of components){const html=renderToStaticMarkup(c.element),$=load(html),text=$.text();for(const value of c.values)assert.ok(text.includes(value));assert.equal($('script').length,0);}
});
test('checklist distribution reflects stored states and never marks missing text as a passed check',()=>{
  const checklist=[{category:'seo' as const,id:'1',label:'첫 번째 항목',status:'pass' as const,currentValue:long,diagnosis:'관측 근거',guide:'가이드'},{category:'content' as const,id:'2',label:'두 번째 항목',status:'warning' as const,currentValue:'',diagnosis:'',guide:''},{category:'trust' as const,id:'3',label:'세 번째 항목',status:'fail' as const,currentValue:'',diagnosis:'진단',guide:'수정'}];
  const $=load(renderToStaticMarkup(React.createElement(DiagnosisChecklist,{checklist})));
  assert.equal($('.report-checklist-rows>article').length,3);
  for(const state of ['pass','warning','fail'])assert.equal($(`.report-checklist-stats [data-state="${state}"] strong`).text(),'1개');
  assert.ok($.text().includes(long));assert.ok($.text().includes('저장된 가이드가 없습니다.'));
});
test('shared report keeps all five chapters, eight directions and complete issue text after layout changes',t=>{
  // tsx uses classic JSX for the legacy components; Next.js supplies the automatic runtime.
  const prior=(globalThis as typeof globalThis & {React?:typeof React}).React;
  Object.assign(globalThis,{React});t.after(()=>{Object.assign(globalThis,{React:prior});});
  const report=MarketingReportSchema.parse({...fixture,criticalIssues:[issue],keywordFrequency:{totalTokens:100,uniqueSingles:1,uniquePhrases:0,singles:[{keyword:'운영',count:12,density:12,inTitle:false,inMetaDescription:false}],phrases:[]}});
  const before=JSON.stringify(report),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
  assert.equal($('.report-chapter').length,5);assert.equal($('.report-axis').length,8);
  assert.ok($.text().includes(issue.recommendation));assert.equal($('.report-copy-fallback textarea[readonly]').length,1);
  assert.ok($('.report-copy-fallback textarea').text().includes(report.url));
  const counts=$('.report-backlog-distribution button strong').map((_,el)=>parseInt($(el).text())).get();assert.equal(counts.slice(1).reduce((a,b)=>a+b,0),counts[0]);
  assert.equal(JSON.stringify(report),before);
});
test('Naver graphic uses criteria counts for legacy reports, without invented current status',()=>{
  const page=buildNaverVisualPage(fixture,measure),text=page.lines.map(l=>l.text).join('');
  for(const count of [14,9,3])assert.ok(text.includes(`${count}개 점검 기준`));
  assert.match(text,/판정 결과가 아닙니다/);assert.equal(text.split('현재 판정 없음').length-1,4);assert.doesNotMatch(text,/확인됨 \d+개/);
});
test('Naver visual text stays in page bounds and separate text boxes do not collide',()=>{
  const guide=analyzeNaverOptimization(null,fixture.url);
  const report={...fixture,naverOptimization:{...guide,mode:'diagnosis' as const,checks:guide.checks.map((c,i)=>({...c,status:(['observed','action','manual','not_applicable'] as const)[i%4]}))}};
  const page=buildNaverVisualPage(report,measure);
  for(const line of page.lines){assert.ok(line.x>=48&&line.x+line.width<=742.01,line.text);assert.ok(line.y>=46&&line.y+line.lineHeight<=1039,line.text);}
  for(let i=0;i<page.lines.length;i++)for(let j=i+1;j<page.lines.length;j++){
    const a=page.lines[i],b=page.lines[j];
    const overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),overlapY=Math.min(a.y+a.lineHeight,b.y+b.lineHeight)-Math.max(a.y,b.y);
    assert.ok(overlapX<=.01||overlapY<=.01,`${a.text} overlaps ${b.text}`);
  }
});

test('long explanations and multi-step paragraphs get a wide reading layout without losing a character',()=>{
  const explanations=[long+'마지막 문장도 남아야 합니다.','첫 단계\n두 번째 단계\n세 번째 단계\n네 번째 단계'];
  for(const explanation of explanations){
    const $=load(renderToStaticMarkup(React.createElement(EvidenceFlow,{items:[{label:'확인 근거',content:'관측값'},{label:'상세 실행',content:explanation}]})));
    assert.equal($('dd').last().text(),explanation);
    assert.equal($('dl').attr('data-layout'),'stacked');
  }
  const $=load(renderToStaticMarkup(React.createElement(EvidenceFlow,{items:[{label:'근거',content:'짧은 근거'},{label:'조치',content:'짧은 조치'}]})));
  assert.equal($('dl').attr('data-layout'),'columns');
});

test('competitor cards expose complete saved descriptions, headings and every CTA',()=>{
  const competitor={rank:1,title:'제목',link:'https://example.org',domain:'example.org',description:'검색 설명',metaTitle:long+'제목 끝',metaDescription:long+'설명 끝',h1:long+'H1 끝',ctaTexts:Array.from({length:15},(_,i)=>`저장된 CTA ${i+1}`),keyMessage:long+'메시지 끝',differentiation:long+'차이 끝'};
  const $=load(renderToStaticMarkup(React.createElement(CompetitorComparison,{ourUrl:fixture.url,competitorAnalysis:{searchKeyword:'검증',competitors:[competitor]}})));
  const card=$('.competitor-card');
  for(const value of [competitor.metaTitle,competitor.metaDescription,competitor.h1,competitor.keyMessage,competitor.differentiation,...competitor.ctaTexts])assert.ok(card.text().includes(value),value);
  assert.equal(card.find('[class*="line-clamp"],[class~="truncate"]').length,0);
});

test('larger detailed PDF text flows to more pages while preserving the entire explanation',()=>{
  const report={...fixture,criticalIssues:[issue]},blocks=buildReportDocument(report),before=JSON.stringify(report);
  const pages=layoutPdfPages(blocks,measure),lines=pages.flatMap(page=>page.lines);
  const compact=(s:string)=>s.replace(/\n/g,'');
  assert.equal(compact(lines.map(line=>line.text).join('')),compact(blocks.map(block=>block.text).join('')));
  assert.ok(lines.every(line=>line.size>=16));
  assert.ok(pages.length>2);
  for(const line of lines){assert.ok(line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom+.01);}
  assert.equal(JSON.stringify(report),before);
});
