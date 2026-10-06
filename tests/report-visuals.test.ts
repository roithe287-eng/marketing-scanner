import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {buildObservationVisual,observationCell,percentageChange,readinessItems} from '../lib/reportVisuals';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';
import {MarketingReportSchema,type LlmCitationQuestionResult as Row} from '../lib/reportSchema';
import {ObservationOverview,QuestionMatrix} from '../components/visuals/ObservationVisuals';
import {PairedBars} from '../components/visuals/ComparisonVisuals';
const row=(extra:Partial<Row>={}):Row=>({engine:'chatgpt',question:'광고 업체를 선택하는 기준은 무엇인가요?',questionType:'industry',cited:false,status:'ok',searchUsed:true,citationVerified:true,brandMentioned:false,...extra});
const measure=(s:string,style:PdfTextStyle)=>Array.from(s).reduce((sum,c)=>sum+(/[ -~]/.test(c)?0.55:1)*style.size*(style.weight===700?1.06:1),0);
test('visual metrics separate failed, unverified and absent observations from measured zero',()=>{
  const citation={...fixture.llmCitationTest!,results:[row({cited:true,brandMentioned:true}),row({engine:'gemini',status:'error'}),row({question:'비용 기준을 어떻게 확인하나요?',status:'unverified',citationVerified:false,brandMentioned:true})]};
  const visual=buildObservationVisual(citation)!;
  assert.equal(visual.citationRate,100);assert.equal(visual.sourceTotal,1);assert.equal(visual.mentionRate,100);assert.equal(visual.mentionTotal,2);
  assert.deepEqual(visual.distributions[0].counts,{cited:1,uncited:0,unverified:1,unavailable:0,failed:0});
  assert.equal(visual.distributions.length,1);assert.equal(visual.total,2);assert.deepEqual(Object.keys(visual.questions[0].cells),['chatgpt']);
  const failed=buildObservationVisual({...citation,results:[row({status:'error'})]})!;assert.equal(failed.citationRate,null);assert.equal(failed.mentionRate,null);
  const zero=buildObservationVisual({...citation,results:[row()]})!;assert.equal(zero.citationRate,0);assert.equal(zero.mentionRate,0);
});
test('legacy and duplicated observations cannot imply verified source rates',()=>{
  assert.equal(buildObservationVisual({...fixture.llmCitationTest!,measurementVersion:undefined}),null);
  assert.equal(observationCell([row(),row()]).state,'duplicate');
  const visual=buildObservationVisual({...fixture.llmCitationTest!,results:[row(),row({cited:true})]})!;
  assert.equal(visual.citationRate,null);assert.equal(visual.distributions[0].counts.unverified,2);
});
test('accessible charts provide text equivalents and distinguish percentage points',()=>{
  assert.equal(percentageChange(20,40),'+20%p');assert.equal(percentageChange(20,0),'-20%p');assert.equal(percentageChange(0,0),'변화 없음');assert.equal(percentageChange(null,0),'비교 불가');
  const citation={...fixture.llmCitationTest!,results:[row({status:'error'})]};
  const html=renderToStaticMarkup(React.createElement(ObservationOverview,{citation}));assert.match(html,/호출 실패 1건/);assert.match(html,/판정 가능한 관측 없음/);assert.ok(!/>0%<\//.test(html));
  const matrix=renderToStaticMarkup(React.createElement(QuestionMatrix,{citation,selected:null,onSelect:()=>{}}));assert.match(matrix,/질문 상태 필터/);assert.match(matrix,/호출 실패/);
  const paired=renderToStaticMarkup(React.createElement(PairedBars,{label:'출처',before:null,after:null,count:0}));assert.match(paired,/비교 불가/);assert.ok(!/>0%<\/strong>/.test(paired));
});
test('all infographic pages preserve long questions and stay inside PDF content bounds',()=>{
  const longQuestion='긴질문의줄바꿈을확인하는내용'.repeat(12);
  const rows=Array.from({length:5},(_,i)=>row({question:`${i+1}. ${longQuestion}`,responseText:'답변 원문은 상세 보고서에 유지됩니다.'}));
  const item={id:'x',label:'아주 긴 준비도 항목 제목도 충분한 공간에 표시',score:75,status:'warning' as const,currentValue:'현재 값',diagnosis:'긴 진단'.repeat(100),guide:'개선안'.repeat(100)};
  const report=MarketingReportSchema.parse({...fixture,discoverability:{overallScore:75,summary:'요약',...Object.fromEntries(['seoFoundation','contentStructure','redundancy','geo','structuredData','eeat','localBrand','aiAnswerability'].map(k=>[k,{...item,id:k}]))},llmCitationTest:{...fixture.llmCitationTest,results:rows,actionPlan:[{question:rows[0].question,journey:'비교',action:'improve_candidate',evidence:'근거'.repeat(100),nextStep:'다음 행동'.repeat(200),accuracy:'needs_review'}]}});
  const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(report)));
  assert.equal(readinessItems(restored.discoverability).length,8);
  const pages=buildVisualPdfPages(restored,measure);assert.ok(pages.length>=4);
  const text=pages.flatMap(p=>p.lines).map(l=>l.text).join('');for(const r of rows)assert.ok(text.includes(r.question),r.question);
  for(const page of pages)for(const line of page.lines) {
    assert.ok(line.x>=PDF_PAGE.padding-0.01,`left ${line.text}`);assert.ok(line.x+line.width<=PDF_PAGE.padding+PDF_PAGE.contentWidth+0.01,`right ${line.text}`);
    assert.ok(line.y>=PDF_PAGE.padding-2.01,`top ${line.text}`);assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom+0.01,`bottom ${line.text}: ${line.y}`);
  }
  for(const page of pages)for(const shape of page.shapes) {const w=shape.kind==='ring'?shape.size:shape.width,h=shape.kind==='ring'?shape.size:shape.height;assert.ok(shape.x>=48&&shape.y>=48);assert.ok(shape.x+w<=742.01);assert.ok(shape.y+h<=1039);}
});
