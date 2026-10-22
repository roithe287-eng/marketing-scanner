import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {answerPage,answerSuggestion,answerPlan} from './fixtures/answer-content';
import {answerSources,buildAnswerContentPlan,answerQuestionText,answerPlanText} from '../lib/answerContent';
import {answerContentPrompt,analyzeAnswerContent} from '../lib/analyzeAnswerContent';
import {AnswerContentPlanSchema} from '../lib/answerContentSchema';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReadingSections} from '../lib/reportReadingPdf';
import AnswerContentPanel from '../components/report/AnswerContentPanel';
import {fixture} from './fixtures/report';

test('URL-specific questions preserve whole source facts, qualifiers and numeric units',()=>{
  const plan=answerPlan();assert.equal(plan.primaryKeyword?.term,'과잠바');assert.equal(plan.questions.length,3);
  assert.equal(plan.questions[0].status,'partial');assert.equal(plan.questions[1].status,'supported');
  assert.match(plan.questions[0].draft,/15영업일/);assert.match(plan.questions[0].draft,/배송 기간은 별도/);assert.match(plan.questions[0].draft,/성수기/);
  for(const q of plan.questions)for(const e of q.evidence)assert.ok(answerPage.bodyText.includes(e.text));
  assert.ok(AnswerContentPlanSchema.safeParse(plan).success);assert.equal(plan.observation,'not-measured');
});
test('invented evidence and answer prose never become vendor facts',()=>{
  const ai=answerSuggestion();ai.questions[0].evidenceIds=['invented-id'];ai.questions[0].missingFacts=[];
  const plan=buildAnswerContentPlan(answerPage,{...ai,answer:'최소 1벌, 무료배송, 3일 보장'});
  assert.equal(plan.questions[0].draft,'');assert.equal(plan.questions[0].status,'not_observed');assert.ok(plan.questions[0].missingFacts.length);
  assert.doesNotMatch(JSON.stringify(plan),/무료배송|3일 보장/);
});
test('metadata, question headings and unrelated evidence cannot serve as the answer',()=>{
  const ai=answerSuggestion(),pool=answerSources(answerPage);
  ai.questions[0].evidenceIds=[pool.find(p=>p.kind==='title')!.id,pool.find(p=>p.text.includes('20벌'))!.id];ai.questions[0].missingFacts=[];
  const plan=buildAnswerContentPlan(answerPage,ai);assert.equal(plan.questions[0].draft,'');assert.equal(plan.questions[0].status,'not_observed');
});
test('unsupported keywords trigger an honest basic guide; empty/JS pages are limited',()=>{
  const plan=buildAnswerContentPlan(answerPage,{...answerSuggestion(),primaryKeyword:'해외여행'});
  assert.equal(plan.mode,'basic');assert.notEqual(plan.primaryKeyword?.term,'해외여행');assert.ok(plan.questions.every(q=>q.status==='review'));
  const limited=buildAnswerContentPlan({...answerPage,isJsHeavy:true},answerSuggestion());assert.equal(limited.mode,'limited');assert.ok(limited.questions.every(q=>q.status!=='supported'));
  const empty=buildAnswerContentPlan({...answerPage,title:'',description:'',h1:[],h2:[],bodyText:''});assert.equal(empty.primaryKeyword,null);assert.deepEqual(empty.questions,[]);
});
test('navigation/footer repetition is excluded from candidate and answer sources',()=>{
  const page={...answerPage,bodyText:answerPage.bodyText+'\n대출 추천 대출 추천 대출 추천',siteEditing:{version:1 as const,source:'static-html' as const,signals:[],elementsTruncated:false,elements:[{key:'nav',kind:'text' as const,tag:'p',selector:'footer p',text:'대출 추천 대출 추천 대출 추천',truncated:false,heading:'',order:0,region:'footer' as const}]}};
  assert.ok(answerSources(page).every(p=>!p.text.includes('대출')));
});
test('prompt serializes only selected own-page evidence, never attached search data',()=>{
  const page={...answerPage,naverSearch:{items:[{description:'NEVER_SEND_SEARCH_DATA'}]},keywordRankTracking:{secret:'NEVER_SEND_SEARCH_DATA'}};
  const prompt=answerContentPrompt(page);assert.doesNotMatch(prompt,/NEVER_SEND_SEARCH_DATA|naverSearch|keywordRankTracking/);assert.match(prompt,/과잠바/);
});
test('API failure uses basic guidance without failing the report or fetching Naver',async t=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-local-only';const urls:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{urls.push(String(input));return new Response('{}',{status:500});});
  try{const plan=await analyzeAnswerContent(answerPage);assert.equal(plan.mode,'basic');assert.equal(plan.questions.length,3);assert.ok(urls.every(u=>u.includes('api.openai.com')));}
  finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
test('saved reports, full PDF text and copied drafts retain provenance and missing fields',()=>{
  const plan=answerPlan();const report=MarketingReportSchema.parse({...fixture,answerContentPlan:plan});
  assert.deepEqual(report.answerContentPlan,plan);assert.ok(MarketingReportSchema.safeParse(fixture).success);
  const text=buildReportDocument(report).map(b=>b.text).join('\n');assert.match(text,/과잠바/);assert.match(text,/15영업일/);assert.match(text,/별도 배송 기간/);assert.match(text,/미측정/);
  const reading=buildReadingSections(report).flatMap(s=>s.blocks).map(b=>b.text).join('\n');assert.match(reading,/20벌/);
  assert.match(answerQuestionText(plan.questions[0]),/게시 전 확인/);assert.match(answerPlanText(plan),/자동완성/);
});
test('UI renders three consistent cards and honest legacy, limited and empty states',()=>{
  const html=renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:answerPlan()}));
  assert.equal((html.match(/class="answer-question"/g)||[]).length,3);assert.match(html,/답변 초안 복사/);assert.match(html,/실제 네이버 노출/);assert.match(html,/미측정/);
  assert.match(renderToStaticMarkup(React.createElement(AnswerContentPanel,{})),/다시 진단/);
  const empty=buildAnswerContentPlan({...answerPage,title:'',description:'',h1:[],h2:[],bodyText:''});
  assert.match(renderToStaticMarkup(React.createElement(AnswerContentPanel,{plan:empty})),/내용이 부족/);
});
