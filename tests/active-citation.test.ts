import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {MarketingReportSchema,type LlmCitationQuestionResult as Row} from '../lib/reportSchema';
import {activeCitation} from '../lib/activeCitation';
import {buildGeoComparison} from '../lib/geoComparison';
import {buildReportDocument} from '../lib/reportDocument';
import {buildVisualPdfPages} from '../lib/reportVisualPdf';
import {buildReportInsights} from '../lib/reportInsights';
import {reviewStoredCitation} from '../lib/storedCitation';
import LlmCitationCard from '../components/LlmCitationCard';
import CitationFailureSummary from '../components/CitationFailureSummary';

const openai:Row={...fixture.llmCitationTest!.results[0],question:'현재 서비스의 선택 기준은 무엇인가요?',cited:false,brandMentioned:false,sources:[],responseText:'OpenAI 원문 보존',model:'gpt-4.1-mini',measuredAt:'2026-10-01T00:00:00Z'};
const retired:Row={...openai,engine:'gemini',question:'Gemini 전용 질문',cited:true,brandMentioned:true,responseText:'Gemini 이전 답변',model:'gemini-old',sources:[{url:'https://example.com/gemini-only',title:'Gemini 전용 근거',ownership:'own'}]};
const mixed={...fixture.llmCitationTest!,measurementProtocol:'geo-compare-v3' as const,measuredAt:'2026-10-01T00:00:00Z',targetUrl:fixture.url,summary:'Gemini를 포함한 이전 집계',engineScores:{chatgpt:0,gemini:100},results:[openai,retired],totalTests:2,totalCited:1,ownedCitationRate:50};

test('historical mixed results are projected consistently without altering stored source evidence or timestamps',()=>{
  const original=JSON.stringify(mixed);
  const citation=activeCitation(mixed);
  assert.equal(citation.totalTests,1);assert.equal(citation.totalCited,0);assert.equal(citation.ownedCitationRate,0);
  assert.deepEqual(citation.results,[openai]);assert.equal(citation.measuredAt,mixed.measuredAt);
  assert.deepEqual(citation.engineScores,{chatgpt:0});assert.equal(citation.actionPlan?.length,1);
  assert.equal(JSON.stringify(mixed),original);assert.deepEqual(activeCitation(citation),citation);
  assert.deepEqual(reviewStoredCitation(mixed,fixture.url),citation);
  const report=MarketingReportSchema.parse({...fixture,llmCitationTest:mixed,geoBaseline:{reportId:'abc123',url:fixture.url,citation:mixed}});
  assert.deepEqual(report.llmCitationTest,citation);assert.deepEqual(report.geoBaseline?.citation,citation);
  assert.equal(buildGeoComparison(report)?.pairs.length,1);
});

test('screen, insights, text PDF and visual PDF omit retired results and retain full OpenAI answers',()=>{
  const report={...fixture,llmCitationTest:mixed,geoBaseline:{reportId:'abc123',url:fixture.url,citation:mixed}};
  const html=renderToStaticMarkup(React.createElement(LlmCitationCard,{citation:mixed}));
  const document=buildReportDocument(report).map(b=>b.text).join('\n');
  const visual=buildVisualPdfPages(report,(s,style)=>s.length*style.size*.6).flatMap(p=>p.lines).map(l=>l.text).join('\n');
  for(const output of [html,document,visual,JSON.stringify(buildReportInsights(report))])assert.doesNotMatch(output,/Gemini|gemini|제미나이/);
  assert.match(document,/OpenAI 원문 보존/);assert.match(html,/OpenAI/);
});

test('Gemini-only archives cannot render failure banners, rows or measured success',()=>{
  const only={...mixed,results:[{...retired,status:'error' as const,errorMessage:'Gemini 호출 실패'}]};
  const citation=activeCitation(only);assert.equal(citation.totalTests,0);assert.equal(citation.ownedCitationRate,null);
  assert.equal(renderToStaticMarkup(React.createElement(LlmCitationCard,{citation:only})), '');
  assert.equal(renderToStaticMarkup(React.createElement(CitationFailureSummary,{citation:only})), '');
  const legacy=activeCitation({...only,measurementVersion:undefined});assert.equal(legacy.results.length,0);assert.equal(legacy.totalCited,0);
});

test('OpenAI failures remain visible and are excluded from the source denominator',()=>{
  const value=activeCitation({...mixed,results:[{...openai,status:'error',errorMessage:'OpenAI 호출 실패'},retired]});
  assert.equal(value.failedTests,1);assert.equal(value.ownedCitationRate,null);
  assert.match(renderToStaticMarkup(React.createElement(CitationFailureSummary,{citation:value})),/OpenAI 호출 실패/);
});
