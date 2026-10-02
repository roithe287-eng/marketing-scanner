import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {MarketingReportSchema,type MarketingReport,type LlmCitationQuestionResult as Row} from '../lib/reportSchema';
import {baselineQuestions,buildGeoComparison,parseReportReference} from '../lib/geoComparison';
import {buildReportDocument} from '../lib/reportDocument';
import GeoComparisonPanel from '../components/GeoComparisonPanel';
import {analyzeCitation} from '../lib/analyzeCitation';
import type {ExtractedWebsiteData} from '../lib/extractWebsite';
const row=(question:string,extra:Partial<Row>={}):Row=>({engine:'chatgpt',question,questionType:'industry',journey:'비교',status:'ok',cited:false,brandMentioned:false,searchUsed:true,citationVerified:true,model:'test-model',requestFingerprint:'a'.repeat(24),measuredAt:'2026-10-01T00:00:00Z',...extra});
const q='어떤 업체를 선택해야 하나요?';
function report(old:Row[]=[row(q)],current:Row[]=[row(q,{cited:true,brandMentioned:true,measuredAt:'2026-10-02T00:00:00Z'})]):MarketingReport {
  const citation={...fixture.llmCitationTest!,measurementProtocol:'geo-compare-v1' as const,targetUrl:fixture.url,brandName:'테스트 브랜드',cacheHit:false};
  return {...fixture,geoBaseline:{reportId:'abc123',url:fixture.url,citation:{...citation,results:old}},llmCitationTest:{...citation,results:current}};
}
test('matching uses question and engine, compares identical denominator and excludes failed pairs',()=>{
  const old=[row(q),row('계약 조건은 무엇인가요?',{cited:true}),row('비용은 얼마인가요?',{engine:'gemini',cited:true})];
  const current=[row(old[1].question,{measuredAt:'2026-10-02',cited:false}),row(old[2].question,{engine:'gemini',status:'error',measuredAt:'2026-10-02'}),row(q,{measuredAt:'2026-10-02',cited:true})];
  const r=buildGeoComparison(report(old,current))!;
  assert.equal(r.matched,2);assert.equal(r.excluded,1);assert.equal(r.beforeRate,50);assert.equal(r.afterRate,50);assert.equal(r.gained,1);assert.equal(r.lost,1);assert.equal(r.pairs[2].reason,'failed');
});
test('missing metadata, target, model, settings, cache and timestamps never claim a gain',()=>{
  const cases:[string,(r:MarketingReport)=>void][]=[
    ['legacy',r=>delete r.geoBaseline!.citation.measurementProtocol],
    ['target',r=>r.llmCitationTest!.targetUrl='https://other.example/'],
    ['target',r=>r.llmCitationTest!.brandName='다른 브랜드'],
    ['model',r=>r.llmCitationTest!.results[0].model='different-model'],
    ['request',r=>r.llmCitationTest!.results[0].requestFingerprint='b'.repeat(24)],
    ['cached',r=>r.llmCitationTest!.cacheHit=true],
    ['cached',r=>delete r.llmCitationTest!.cacheHit],
    ['time',r=>r.llmCitationTest!.results[0].measuredAt='2026-10-01T00:00:00Z'],
    ['time',r=>r.llmCitationTest!.results[0].measuredAt='invalid'],
    ['failed',r=>r.llmCitationTest!.results[0].citationVerified=false],
    ['failed',r=>r.geoBaseline!.citation.results[0].status='timeout'],
  ];
  for (const [reason,change] of cases) {const r=report();change(r);const result=buildGeoComparison(r)!;assert.equal(result.pairs[0].reason,reason);assert.equal(result.gained,0);assert.equal(result.beforeRate,null);assert.equal(result.afterRate,null);}
});
test('missing and duplicate observations cannot create a loss; missing mentions have a separate denominator',()=>{
  let r=report();r.llmCitationTest=null;assert.equal(buildGeoComparison(r)!.pairs[0].reason,'missing');assert.equal(buildGeoComparison(r)!.lost,0);
  r=report([row(q),row(q)]);assert.equal(buildGeoComparison(r)!.pairs[0].reason,'duplicate');
  r=report();delete r.llmCitationTest!.results[0].brandMentioned;assert.equal(buildGeoComparison(r)!.matched,1);assert.equal(buildGeoComparison(r)!.mentionCount,0);assert.equal(buildGeoComparison(r)!.afterMention,null);
});
test('reference parsing only accepts this scanner and preserves fixed question type and journey',()=>{
  for (const value of ['https://www.mktscanner.com/r/abc123','abc123','https://mktscanner.com/r/abc123/']) assert.equal(parseReportReference(value),'abc123');
  for (const value of ['https://evil.test/r/abc123','https://www.mktscanner.com.evil.test/r/abc123','https://x@www.mktscanner.com/r/abc123','javascript:abc123','https://www.mktscanner.com/api/abc123']) assert.equal(parseReportReference(value),null);
  const baseline=report([row(q),row(q,{engine:'gemini'})]).geoBaseline!;
  assert.deepEqual(baselineQuestions(baseline),[{question:q,type:'industry',journey:'비교'}]);
  assert.throws(()=>baselineQuestions({...baseline,citation:{...baseline.citation,results:[]}}));
});
test('share roundtrip, visible panel and PDF retain both observations and failure reasons',()=>{
  const r=report([row(q,{responseText:'이전 답변 보존',sources:[{url:'https://example.com/old-evidence',title:'이전 근거',ownership:'own'}]})],[row(q,{status:'error',errorMessage:'HTTP 429',measuredAt:'2026-10-02'})]);
  const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(r)));
  assert.deepEqual(restored.geoBaseline,r.geoBaseline);
  const pdf=buildReportDocument(restored);const text=pdf.map(b=>b.text).join('\n');
  for(const value of ['GEO 이전·현재 비교','이전 답변 보존','HTTP 429','실패 또는 검색·출처 미확인','비교 불가']) assert.ok(text.includes(value),value);
  assert.ok(pdf.some(b=>b.href==='https://example.com/old-evidence'));
  const html=renderToStaticMarkup(React.createElement(GeoComparisonPanel,{report:restored}));
  assert.ok(html.includes('비교 가능한 관측이 없습니다'));assert.ok(!html.includes('0% → 0%'));assert.ok(html.includes('이전 답변 보존'));assert.ok(html.includes('HTTP 429'));
});
test('fresh fixed-question runs bypass stored observations and preserve measurement settings',async()=>{
  const keys=['OPENAI_API_KEY','GEMINI_API_KEY','ENABLE_LLM_CITATION','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const oldFetch=globalThis.fetch;
  process.env.OPENAI_API_KEY='test';process.env.GEMINI_API_KEY='test';delete process.env.ENABLE_LLM_CITATION;
  process.env.UPSTASH_REDIS_REST_URL='https://test.upstash.io';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  let calls=0,reads=0;
  globalThis.fetch=async(input,init)=>{
    if (String(input).startsWith('https://test.upstash.io/')) {
      const commands=JSON.parse(String(init?.body)) as string[][];
      return Response.json(commands.map(command=>{
        if(command[0].toLowerCase()==='get') {reads++;return {result:Buffer.from(JSON.stringify(report().llmCitationTest)).toString('base64')};}
        return {result:Buffer.from('OK').toString('base64')};
      }));
    }
    calls++;return Response.json({error:'quota'},{status:429});
  };
  try {
    const data={url:fixture.url,finalUrl:fixture.url,title:'브랜드',description:'',bodyText:'본문'.repeat(100)} as ExtractedWebsiteData;
    const fixed=[{question:q,type:'industry' as const,journey:'비교'}];
    const cached=await analyzeCitation(data,undefined,{fixedQuestions:fixed});assert.equal(cached?.cacheHit,true);assert.equal(calls,0);assert.equal(reads,1);
    const first=await analyzeCitation(data,undefined,{fixedQuestions:fixed,fresh:true});
    const second=await analyzeCitation(data,undefined,{fixedQuestions:fixed,fresh:true});
    assert.equal(calls,4);assert.equal(reads,1);assert.equal(first?.cacheHit,false);assert.equal(first?.questionSetId,second?.questionSetId);
    assert.equal(first?.results[0].questionType,'industry');assert.equal(first?.results[0].journey,'비교');assert.equal(first?.measurementProtocol,'geo-compare-v1');
    assert.match(first!.results[0].requestFingerprint!,/^[a-f0-9]{24}$/);assert.equal(first?.results[0].requestFingerprint,second?.results[0].requestFingerprint);
    const changed=await analyzeCitation(data,undefined,{fixedQuestions:[{...fixed[0],question:'다른 질문의 조건은 무엇인가요?'}],fresh:true});
    assert.notEqual(changed?.results[0].requestFingerprint,first?.results[0].requestFingerprint);
  } finally {globalThis.fetch=oldFetch;for(const k of keys) if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
});

test('analysis rejects changed baseline URL, changed questions and expired IDs before provider calls',async()=>{
  const {POST}=await import('../app/api/analyze/route');const {NextRequest}=await import('next/server');
  const keys=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  const original=globalThis.fetch;let missing=false,providerCalls=0;
  process.env.UPSTASH_REDIS_REST_URL='https://baseline.upstash.io';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  globalThis.fetch=async(input,init)=>{
    if (!String(input).startsWith('https://baseline.upstash.io/')) {providerCalls++;throw new Error('Unexpected provider request');}
    return Response.json(JSON.parse(String(init?.body)).map(()=>({result:missing?null:Buffer.from(JSON.stringify(report())).toString('base64')})));
  };
  const submit=(body:object)=>POST(new NextRequest('https://www.mktscanner.com/api/analyze',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}));
  try {
    assert.equal((await submit({url:fixture.url,baselineId:'invalid-id'})).status,400);
    assert.equal((await submit({url:'https://other.example',baselineId:'abc123'})).status,400);
    assert.equal((await submit({url:fixture.url,baselineId:'abc123',geoQuestions:['기준과 다른 질문입니다.']})).status,400);
    missing=true;assert.equal((await submit({url:fixture.url,baselineId:'abc123'})).status,422);
    assert.equal(providerCalls,0);
  } finally {globalThis.fetch=original;for (const k of keys) if(saved[k]===undefined) delete process.env[k];else process.env[k]=saved[k];}
});
