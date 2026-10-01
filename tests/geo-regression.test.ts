import { fixture } from './fixtures/report';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateCitation, brandMentioned, buildActionPlan, normalizeSources, ownHost, parseGemini, parseOpenAI } from '../lib/citationMeasurement';
import { buildReportDocument } from '../lib/reportDocument';
import { MarketingReportSchema, type LlmCitationQuestionResult } from '../lib/reportSchema';
import { analyzeCitation } from '../lib/analyzeCitation';
import type { ExtractedWebsiteData } from '../lib/extractWebsite';

const target='https://example.com';
const row=(extra:Partial<LlmCitationQuestionResult>={}):LlmCitationQuestionResult=>({engine:'chatgpt',question:'어떤 업체를 선택해야 하나요?',questionType:'industry',cited:false,status:'ok',searchUsed:true,citationVerified:true,brandMentioned:false,branded:false,...extra});

test('host comparison excludes lookalikes and accepts owned subdomains',()=>{
  assert.equal(ownHost('https://example.com.evil.test',target),false);
  assert.equal(ownHost('https://notexample.com',target),false);
  assert.equal(ownHost('https://www.example.com/a',target),true);
  assert.equal(ownHost('https://help.example.com/a',target),true);
  assert.equal(brandMentioned('이 예시 브랜드는 한국어로 답합니다.','예시 브랜드',target),true);
  assert.equal(normalizeSources([{url:'javascript:alert(1)'},{url:'https://example.com/x'},{url:'https://example.com/x'}],target).length,1);
});
test('OpenAI citation comes from URL annotations, never brand text or ranking numbers',()=>{
  const result=parseOpenAI({output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'1. example.com 추천',annotations:[{type:'url_citation',url:'https://other.test',title:'다른 출처'}]}]}]},target);
  assert.equal(result.sources[0].ownership,'external');assert.equal(result.searchUsed,true);
  assert.equal(parseOpenAI({output:[{type:'message',content:[{type:'output_text',text:'example.com'}]}]},target).sources.length,0);
});
test('Gemini counts only grounding chunks actually supporting the response',()=>{
  const result=parseGemini({candidates:[{content:{parts:[{text:'사고 과정',thought:true},{text:'최종 답변'}]},groundingMetadata:{webSearchQueries:['검색'],groundingChunks:[{web:{uri:'https://example.com',title:'미인용'}},{web:{uri:'https://other.test',title:'실제 인용'}}],groundingSupports:[{groundingChunkIndices:[1]}]}}]},target);
  assert.equal(result.text,'최종 답변');assert.equal(result.sources.length,1);assert.equal(result.sources[0].ownership,'external');
});
test('failed, unavailable and unverified searches are excluded from citation denominator',()=>{
  const stats=aggregateCitation([row({cited:true,brandMentioned:true,branded:true}),row(),row({status:'timeout',citationVerified:false}),row({status:'unavailable'}),row({status:'unverified',searchUsed:false,citationVerified:false,brandMentioned:true})]);
  assert.equal(stats.validTests,3);assert.equal(stats.citationValidTests,2);assert.equal(stats.ownedCitationRate,50);assert.equal(stats.mentionRate,67);assert.equal(stats.failedTests,2);assert.equal(stats.brandedCitationRate,100);assert.equal(stats.unbrandedCitationRate,0);
});
test('zero valid observations are not displayed as zero percent',()=>{
  const stats=aggregateCitation([row({status:'error'})]);assert.equal(stats.mentionRate,null);assert.equal(stats.ownedCitationRate,null);
});
test('unresolved Google redirect is not marked external or owned',()=>{
  const [source]=normalizeSources([{url:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/test',title:'제목'}],target);assert.equal(source.ownership,'unresolved');
});
test('action plan distinguishes observation from unverified accuracy or whole-site claims',()=>{
  const rows=[row({cited:true,sources:[{url:target+'/faq',title:'FAQ',ownership:'own'}]})];
  const plan=buildActionPlan(rows,target,true);assert.equal(plan[0].action,'review_cited');assert.equal(plan[0].accuracy,'needs_review');assert.equal(plan[0].targetUrl,target+'/faq');
  assert.equal(buildActionPlan([row({status:'error',searchUsed:false,citationVerified:false})],target,true)[0].action,'retry');
  assert.match(buildActionPlan([row()],target,false)[0].evidence,/사이트 전체/);
});

test('validated share round trip retains every GEO source, full answer and action',()=>{
  const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(fixture)));
  assert.deepEqual(restored.llmCitationTest,fixture.llmCitationTest);
  const text=buildReportDocument(restored).map(b=>b.text).join('\n');
  for(const expected of ['접혀 있어도 포함될 전체 답변','https://example.com/faq','질문별 실행 과제','마지막 페이지 확인 문구'])assert.ok(text.includes(expected),expected);
});
test('legacy report remains valid and its PDF labels legacy measurement',()=>{
  const old={...fixture,llmCitationTest:{overallScore:20,citationRate:25,totalTests:8,totalCited:2,summary:'구버전',results:[{engine:'chatgpt',question:'질문',questionType:'brand',cited:true}],engineScores:{chatgpt:25,gemini:25}}};
  const report=MarketingReportSchema.parse(old);assert.ok(buildReportDocument(report).some(b=>b.text.includes('구버전의 브랜드 언급')));
});
test('provider request contracts and partial errors produce honest metrics',async()=>{
  const oldFetch=globalThis.fetch;
  const saved={openai:process.env.OPENAI_API_KEY,gemini:process.env.GEMINI_API_KEY,enabled:process.env.ENABLE_LLM_CITATION};
  process.env.OPENAI_API_KEY='test';process.env.GEMINI_API_KEY='test';delete process.env.ENABLE_LLM_CITATION;
  globalThis.fetch=async(input,init)=>{
    const url=String(input);const body=JSON.parse(String(init?.body));
    if(url.includes('api.openai.com')) {
      assert.equal(body.tool_choice,'required');assert.equal(body.tools[0].type,'web_search_preview');
      return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'브랜드 답변입니다.',annotations:[{type:'url_citation',url:target+'/faq',title:'검증 출처'}]}]}]});
    }
    assert.ok(url.includes('generativelanguage.googleapis.com'));assert.ok(body.tools[0].google_search);
    return Response.json({error:'quota'},{status:429});
  };
  try {
    const report=await analyzeCitation({url:target,finalUrl:target,title:'브랜드',ogSiteName:'브랜드',description:'',bodyText:'본문'.repeat(100)} as ExtractedWebsiteData,['비교할 때 어떤 조건을 확인하나요?']);
    assert.equal(report?.failedTests,1);assert.equal(report?.citationValidTests,1);assert.equal(report?.ownedCitationRate,100);assert.equal(report?.results[1].status,'error');
  } finally {
    globalThis.fetch=oldFetch;
    for(const [key,value] of [['OPENAI_API_KEY',saved.openai],['GEMINI_API_KEY',saved.gemini],['ENABLE_LLM_CITATION',saved.enabled]])if(value===undefined)delete process.env[key!];else process.env[key!]=value;
  }
});
