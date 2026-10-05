import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {withBudget,budgetSignal,budgetFetch,optionalStage} from '../lib/runtime/budget';
import {AccessError} from '../lib/security/request';
import {requestJson,RequestError} from '../lib/client/request';
import {parseMarketingResponse} from '../lib/analyzeMarketing';
import {getOpenAI} from '../lib/openaiClient';
import {fixture} from './fixtures/report';

const timedOut=(error:unknown)=>error instanceof AccessError&&error.status===504;
test('deadline settles an unresponsive dependency and cancels downstream I/O',async()=>{
 let observed:AbortSignal|undefined;
 await assert.rejects(withBudget(20,async()=>{observed=budgetSignal();return new Promise(()=>{});}),timedOut);
 assert.equal(observed?.aborted,true);
});
test('concurrent request budgets do not cancel one another',async()=>{
 const slow=withBudget(15,()=>new Promise(()=>{})).catch(error=>error);
 const healthy=withBudget(200,async()=>{await delay(35);assert.equal(budgetSignal()?.aborted,false);return 'report';});
 assert.equal(await healthy,'report');assert.ok(timedOut(await slow));assert.equal(budgetSignal(),undefined);
});
test('parent cancellation reaches nested analysis and blocks late fetches',async t=>{
 let fetchSignal:AbortSignal|null|undefined;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{fetchSignal=init?.signal;fetchSignal?.throwIfAborted();return Response.json({});});
 const parent=new AbortController();let lateFetch:Promise<unknown>|undefined;
 const work=withBudget(500,()=>withBudget(500,async()=>{
   lateFetch=delay(30).then(()=>budgetFetch('https://example.com')).catch(error=>error);
   return new Promise(()=>{});
 }),parent.signal);
 await delay(5);parent.abort();
 await assert.rejects(work,{name:'AbortError'});assert.ok(await lateFetch instanceof Error);assert.equal(fetchSignal?.aborted,true);
});
test('an already cancelled request never starts work',async()=>{
 const parent=new AbortController();parent.abort();let called=false;
 await assert.rejects(withBudget(50,async()=>{called=true;},parent.signal),{name:'AbortError'});
 assert.equal(called,false);
});
test('optional timeout preserves required report and labels the missing observation',async()=>{
 const [report,optional]=await withBudget(300,()=>Promise.all([
   Promise.resolve(fixture),optionalStage('citation','GEO',15,()=>new Promise(()=>{})),
 ]));
 assert.equal(report.overallScore,70);assert.equal(optional.value,null);assert.equal(optional.warning?.status,'timeout');
});
test('unavailable and failed optional stages stay distinct from successful data',async()=>{
 assert.equal((await optionalStage('a','A',100,async()=>null)).warning?.status,'unavailable');
 assert.equal((await optionalStage('a','A',100,async()=>{throw new Error('upstream');})).warning?.status,'error');
 assert.deepEqual(await optionalStage('a','A',100,async()=>0),{value:0});
});
test('SDK fetch receives request cancellation and does not retry',async t=>{
 const before=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-not-a-secret';
 t.after(()=>{if(before===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=before;});
 let calls=0;let observed:AbortSignal|null|undefined;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{
   ++calls;observed=init?.signal;
   return new Promise<Response>((_,reject)=>{observed?.addEventListener('abort',()=>reject(observed?.reason),{once:true});});
 });
 await assert.rejects(withBudget(30,async()=>getOpenAI().chat.completions.create({model:'test',messages:[{role:'user',content:'test'}]})),timedOut);
 assert.equal(calls,1);assert.equal(observed?.aborted,true);
});
test('complete AI report preserves detailed Korean copy',()=>{
 const detailed={...fixture,oneLineSummary:'상세한 실행 방법과 실제 원문을 보존합니다. '.repeat(80)};
 assert.equal(parseMarketingResponse(JSON.stringify(detailed)).oneLineSummary,detailed.oneLineSummary);
 assert.equal(parseMarketingResponse('```json\n'+JSON.stringify(fixture)+'\n```').overallScore,70);
});
for(const [name,payload] of Object.entries({missing:{url:'https://example.com'},score:{...fixture,overallScore:'70'},diagnosis:{...fixture,diagnosis:{seo:70}},range:{...fixture,diagnosis:{...fixture.diagnosis,seo:101}}})){
 test(`reject malformed AI output: ${name}`,()=>assert.throws(()=>parseMarketingResponse(JSON.stringify(payload)),error=>error instanceof AccessError&&error.status===502));
}
test('truncated and invalid JSON never reaches report rendering',()=>{
 for(const text of ['not JSON','{"url":"https://example.com",','[]','null'])assert.throws(()=>parseMarketingResponse(text),AccessError);
});
for(const status of [502,504])test(`HTML gateway ${status} becomes a useful error`,async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>Gateway</html>',{status,headers:{'content-type':'text/html'}}));
 await assert.rejects(requestJson('/api/analyze'),error=>error instanceof RequestError&&error.status===status&&!error.message.includes('<html>'));
});
test('invalid JSON success is rejected; server access messages survive',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{broken',{headers:{'content-type':'application/json'}}));
 await assert.rejects(requestJson('/api/analyze'),error=>error instanceof RequestError&&error.status===502);
 t.mock.method(globalThis,'fetch',async()=>Response.json({message:'승인된 계정만 사용할 수 있습니다.'},{status:403}));
 await assert.rejects(requestJson('/api/analyze'),{status:403,message:'승인된 계정만 사용할 수 있습니다.'});
});
test('timeout also covers a response body that never completes',async t=>{
 t.mock.method(globalThis,'fetch',async(_url,init)=>new Response(new ReadableStream({start(stream){init?.signal?.addEventListener('abort',()=>stream.error(new DOMException('aborted','AbortError')),{once:true});}}),{headers:{'content-type':'application/json'}}));
 await assert.rejects(requestJson('/api/analyze',{},20),error=>error instanceof RequestError&&error.status===504);
});
test('user cancellation remains distinguishable from request timeout',async t=>{
 t.mock.method(globalThis,'fetch',async(_url,init)=>new Promise<Response>((_,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true})));
 const controller=new AbortController();const request=requestJson('/api/analyze',{signal:controller.signal},200);
 controller.abort();await assert.rejects(request,{name:'AbortError'});
});
test('missing final JSON delimiters are not silently repaired',()=>{
 const complete=JSON.stringify(fixture);
 assert.throws(()=>parseMarketingResponse(complete.slice(0,-1)),AccessError);
});
test('Redis SDK respects the calling request deadline',async t=>{
 const {getRedisClient}=await import('../lib/redisClient');
 const keys=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'];
 const before=keys.map(key=>process.env[key]);keys.forEach(key=>delete process.env[key]);
 process.env.UPSTASH_REDIS_REST_URL='https://redis-stability.example';process.env.UPSTASH_REDIS_REST_TOKEN='test-only';
 t.after(()=>keys.forEach((key,index)=>{if(before[index]===undefined)delete process.env[key];else process.env[key]=before[index];}));
 let calls=0;let observed:AbortSignal|null|undefined;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{++calls;observed=init?.signal;return new Promise<Response>((_,reject)=>observed?.addEventListener('abort',()=>reject(observed?.reason),{once:true}));});
 await assert.rejects(withBudget(30,()=>getRedisClient()!.get('test:bounded')),timedOut);
 assert.equal(calls,1);assert.equal(observed?.aborted,true);
});
