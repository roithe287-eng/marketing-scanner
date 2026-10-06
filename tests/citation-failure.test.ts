import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyzeCitation} from '../lib/analyzeCitation';
import {citationFailure,httpCitationFailure,readCitationError} from '../lib/citationFailure';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
import LlmCitationCard from '../components/LlmCitationCard';
import {fixture} from './fixtures/report';

const data={url:'https://example.com/',title:'테스트 브랜드',ogSiteName:'테스트 브랜드',description:'',bodyText:'진단 본문'.repeat(40)} as ExtractedWebsiteData;
const secret='NEVER_ECHO_PROVIDER_SECRETS';
const completed={candidates:[{finishReason:'STOP',content:{parts:[{text:'테스트 브랜드의 서비스 안내입니다.'}]},groundingMetadata:{webSearchQueries:['서비스'],groundingSupports:[{groundingChunkIndices:[0]}],groundingChunks:[{web:{uri:'https://example.com/faq',title:'자사 안내'}}]}}]};

test('provider errors retain actionable codes without raw messages or credentials',async(t)=>{
  const keys=['OPENAI_API_KEY','GEMINI_API_KEY','ENABLE_LLM_CITATION','GEMINI_CITATION_MODEL','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const oldFetch=globalThis.fetch,oldWarn=console.warn;
  for(const key of keys)delete process.env[key];process.env.GEMINI_API_KEY=secret;
  let logs:unknown[][]=[];console.warn=(...args)=>{logs.push(args);};
  const cases=[
    {name:'quota',status:429,payload:{error:{status:'RESOURCE_EXHAUSTED',message:secret}},code:'RATE_LIMITED',provider:'RESOURCE_EXHAUSTED'},
    {name:'invalid key',status:400,payload:{error:{status:'INVALID_ARGUMENT',message:secret,details:[{reason:'API_KEY_INVALID',metadata:{key:secret}}]}},code:'AUTHENTICATION',provider:'API_KEY_INVALID'},
    {name:'permission',status:403,payload:{error:{status:'PERMISSION_DENIED',message:secret}},code:'PERMISSION_DENIED',provider:'PERMISSION_DENIED'},
    {name:'billing prerequisite',status:400,payload:{error:{status:'FAILED_PRECONDITION',message:secret}},code:'PRECONDITION_FAILED',provider:'FAILED_PRECONDITION'},
    {name:'model missing',status:404,payload:{error:{status:'NOT_FOUND',message:secret}},code:'MODEL_NOT_FOUND',provider:'NOT_FOUND'},
    {name:'provider unavailable',status:503,payload:{error:{status:'UNAVAILABLE',message:secret}},code:'UPSTREAM_UNAVAILABLE',provider:'UNAVAILABLE'},
    {name:'output tokens exhausted despite partial text and own citation',status:200,payload:{...completed,candidates:[{...completed.candidates[0],finishReason:'MAX_TOKENS'}]},code:'OUTPUT_LIMIT',provider:'MAX_TOKENS'},
    {name:'blocked prompt',status:200,payload:{promptFeedback:{blockReason:'SAFETY',message:secret}},code:'CONTENT_BLOCKED',provider:'SAFETY'},
    {name:'blocked answer',status:200,payload:{candidates:[{finishReason:'RECITATION'}]},code:'CONTENT_BLOCKED',provider:'RECITATION'},
    {name:'unknown finish reason is not exposed',status:200,payload:{candidates:[{finishReason:secret}]},code:'INCOMPLETE_RESPONSE',provider:undefined},
    {name:'empty answer',status:200,payload:{candidates:[{finishReason:'STOP',content:{parts:[]}}]},code:'EMPTY_RESPONSE',provider:undefined},
    {name:'invalid payload',status:200,payload:null,code:'INVALID_RESPONSE',provider:undefined},
  ];
  try {
    for(const c of cases) await t.test(c.name,async()=>{
      let calls=0;logs=[];
      globalThis.fetch=async(input,init)=>{calls++;assert.equal(String(input),'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(new Headers(init?.headers).get('x-goog-api-key'),secret);return Response.json(c.payload,{status:c.status});};
      const report=await analyzeCitation(data,['어떤 서비스를 제공하나요?'],{fresh:true});const row=report!.results[1];
      assert.equal(calls,1);assert.equal(row.errorCode,c.code);assert.equal(row.providerCode,c.provider);assert.equal(row.httpStatus,c.status===200?undefined:c.status);
      assert.equal(row.cited,false);assert.equal(row.citationVerified,false);assert.equal(row.responseText,undefined);assert.equal(report?.citationValidTests,0);assert.equal(report?.ownedCitationRate,null);assert.equal(report?.actionPlan?.[0].action,'retry');
      assert.match(row.diagnosticId!,/^[a-f0-9-]{36}$/);assert.ok(row.errorAction);assert.ok(!JSON.stringify([report,logs]).includes(secret));
      const restored=MarketingReportSchema.parse({...fixture,llmCitationTest:report});assert.deepEqual(restored.llmCitationTest?.results[1],row);
      const pdf=buildReportDocument(restored).map(b=>b.text).join('\n');assert.ok(pdf.includes(row.errorAction!));assert.ok(pdf.includes(row.diagnosticId!));
      const html=renderToStaticMarkup(React.createElement(LlmCitationCard,{citation:report}));assert.ok(html.includes('AI 호출 실패 원인과 조치'));assert.ok(html.includes(row.errorMessage!));assert.ok(html.includes(row.errorAction!));
      assert.ok(html.indexOf(row.errorMessage!)<html.indexOf('질문별 AI 관측 지도'));
    });
    await t.test('timeout, connection error and malformed response stay separate',async()=>{
      for(const [implementation,code] of [
        [async()=>{throw new DOMException(secret,'TimeoutError');},'TIMEOUT'],
        [async()=>{throw new TypeError(secret);},'NETWORK'],
        [async()=>new Response(secret,{status:200}),'INVALID_RESPONSE'],
        [async()=>new Response(secret,{status:429}),'RATE_LIMITED'],
      ] as const){globalThis.fetch=implementation;const report=await analyzeCitation(data,['어떤 서비스를 제공하나요?'],{fresh:true});assert.equal(report?.results[1].errorCode,code);assert.ok(!JSON.stringify(report).includes(secret));}
    });
    await t.test('realistic completed response remains valid',async()=>{
      globalThis.fetch=async()=>Response.json(completed);const report=await analyzeCitation(data,['어떤 서비스를 제공하나요?'],{fresh:true});
      assert.equal(report?.results[1].status,'ok');assert.equal(report?.results[1].errorCode,undefined);assert.equal(report?.results[1].cited,true);assert.equal(report?.ownedCitationRate,100);assert.equal(report?.citationValidTests,1);
    });
  } finally {globalThis.fetch=oldFetch;console.warn=oldWarn;for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
});

test('non-JSON, oversized and unrecognized provider error fields are bounded and dropped',async()=>{
  assert.equal(await readCitationError(new Response('<html>gateway error</html>',{status:503})),null);
  assert.equal(await readCitationError(Response.json({error:{message:secret.repeat(2000)}})),null);
  assert.equal(httpCitationFailure(400,{error:{status:secret}}).providerCode,undefined);
  assert.equal(citationFailure('UNKNOWN',-1,secret).httpStatus,undefined);
});

test('failure summary groups repeated reasons and keeps older reports honest',()=>{
  const old={...fixture.llmCitationTest!,measurementVersion:2 as const,results:[0,1,2,3,4].map(i=>({engine:'gemini' as const,question:`질문 ${i}`,questionType:'service' as const,cited:false,status:'error' as const,errorMessage:'측정에 실패했습니다.'}))};
  const html=renderToStaticMarkup(React.createElement(LlmCitationCard,{citation:old}));
  assert.equal((html.match(/Gemini · 5건 관측 실패/g)||[]).length,1);assert.ok(html.includes('상세 코드 기록 없음'));assert.ok(html.includes('다시 진단해야 원인을 확인'));
  old.results[0].errorMessage='측정에 실패했습니다 (HTTP 429).';
  const legacy429=renderToStaticMarkup(React.createElement(LlmCitationCard,{citation:old}));assert.ok(legacy429.includes('분당·일일 한도'));assert.ok(legacy429.includes('HTTP 429'));
});
