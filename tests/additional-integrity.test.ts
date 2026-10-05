import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {websiteHttp} from '../lib/security/safeFetch';
import {extractWebsite} from '../lib/extractWebsite';
import {analyzeKeywordFrequency} from '../lib/analyzeKeywordFreq';
import {keywordFrequencyScope,keywordDensityNote} from '../lib/keywordFrequencyPresentation';
import {matchesNaverTarget} from '../lib/analyzeKeywordRank';
import {sameSite} from '../lib/siteIdentity';
import {aggregateCitation,buildActionPlan} from '../lib/citationMeasurement';
import {buildObservationVisual,observationState} from '../lib/reportVisuals';
import {fixture} from './fixtures/report';
import {buildReportDocument} from '../lib/reportDocument';
import {KeywordFrequencySchema,type LlmCitationQuestionResult as Row} from '../lib/reportSchema';

async function page(t:TestContext,body:string) {
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>new Response(String(input).endsWith('/robots.txt')?'User-agent: *\nAllow: /':`<html><head><title>분석전문 마케팅</title><meta name="description" content="마케팅 분석"></head><body>${body}<p>${"그리고 ".repeat(40)}</p></body></html>`,{headers:{'content-type':'text/html; charset=utf-8'}}));
 return extractWebsite('https://fixture.example');
}
test('body frequency counts headings once and excludes metadata from its denominator',async t=>{
 const data=await page(t,'<h1>마케팅 분석</h1><p>마케팅 분석</p><h2>마케팅 분석</h2>');
 const result=analyzeKeywordFrequency(data);
 assert.equal(result.totalTokens,6);assert.equal(result.totalPhrases,3);
 assert.equal(result.singles.find(i=>i.keyword==='마케팅')?.count,3);
 assert.equal(result.singles.find(i=>i.keyword==='분석')?.inTitle,false);
 assert.equal(result.phrases[0].density,100);assert.equal(result.phrases[0].inMetaDescription,true);
 assert.equal(result.methodVersion,2);assert.equal(result.bodyTruncated,false);
});
test('block, line, punctuation and omitted-word boundaries never fabricate an adjacent phrase',async t=>{
 const data=await page(t,'<p>기업</p><p>분석</p><p>기업<br>분석</p><p>기업 그리고 분석</p><p>기업 및 분석</p><p>기업, 분석</p><p>기업. 분석</p><p>기업 <strong>분석</strong></p><p>기업 분석</p>');
 assert.match(data.bodyText,/기업\n분석/);
 const result=analyzeKeywordFrequency(data);
 assert.deepEqual(result.phrases.map(i=>[i.keyword,i.count,i.density]),[['기업 분석',2,100]]);
 assert.equal(result.totalPhrases,2);
});
test('partial and legacy frequency notes expose scope in UI and exports',async t=>{
 const data=await page(t,'<p>마케팅 분석</p>');
 const result=analyzeKeywordFrequency({...data,bodyTextLength:20000});
 assert.equal(result.bodyTruncated,true);assert.match(keywordFrequencyScope(result),/앞부분/);
 assert.match(keywordDensityNote(result,true),/인접 단어쌍/);
 assert.match(keywordFrequencyScope({...result,methodVersion:undefined}),/중복 합산/);
 const exported=buildReportDocument({...fixture,keywordFrequency:result}).map(b=>b.text).join('\n');
 assert.match(exported,/수집 본문 앞부분/);assert.match(exported,/집계 대상 인접 단어쌍 수/);
});
test('Naver cafe routes and Place business IDs cannot attribute another tenant to the target',()=>{
 assert.equal(sameSite('https://cafe.naver.com/ca-fe/cafes/222/articles/3','https://cafe.naver.com/ca-fe/cafes/111/articles/1'),false);
 assert.equal(matchesNaverTarget('https://cafe.naver.com/ca-fe/cafes/222/articles/3','https://cafe.naver.com/ca-fe/cafes/111/articles/1'),false);
 assert.equal(sameSite('https://m.cafe.naver.com/ca-fe/cafes/111/articles/3','https://cafe.naver.com/ArticleRead.nhn?clubid=111&articleid=1'),true);
 assert.equal(sameSite('https://pcmap.place.naver.com/restaurant/222/home','https://m.place.naver.com/restaurant/111/home'),false);
 assert.equal(matchesNaverTarget('https://pcmap.place.naver.com/restaurant/111/home','https://m.place.naver.com/restaurant/111/home'),true);
 assert.equal(sameSite('https://m.place.naver.com/unknown/path','https://m.place.naver.com/unknown/path'),false);
 assert.equal(sameSite('https://cafe.naver.com/ca-fe/articles/3','https://cafe.naver.com/ca-fe/articles/1'),false);
});
const row=(extra:Partial<Row>={}):Row=>({engine:'chatgpt',question:'어떤 업체를 선택할까요?',questionType:'industry',cited:true,status:'ok',searchUsed:true,citationVerified:true,brandMentioned:true,sources:[{url:'https://example.com/guide',title:'가이드',ownership:'own'}],...extra});
test('unverified rows with stale success flags do not inflate rates or produce a verified action',()=>{
 const rows=[row({status:'unverified'})];
 const stats=aggregateCitation(rows),visual=buildObservationVisual({...fixture.llmCitationTest!,results:rows})!;
 assert.equal(stats.ownedCitationRate,null);assert.equal(visual.citationRate,null);
 assert.equal(stats.mentionRate,100);assert.equal(buildActionPlan(rows,fixture.url,true)[0].action,'retry');
 assert.equal(buildActionPlan([row(),row({question:'  어떤 업체를 선택할까요?  '})],fixture.url,true)[0].action,'retry');
});
test('unconfigured engine remains distinct from request failure and measured zero',()=>{
 assert.equal(observationState(row({status:'unavailable'})),'unavailable');
 const rows=[row({status:'unavailable'}),row({engine:'gemini',status:'error'})];
 const visual=buildObservationVisual({...fixture.llmCitationTest!,results:rows})!;
 assert.equal(visual.distributions[0].counts.unavailable,1);assert.equal(visual.distributions[0].counts.failed,0);
 assert.equal(visual.sourceTotal,0);assert.equal(visual.citationRate,null);
});

test('impossible frequency percentages and counts fail validation instead of rendering a misleading chart',()=>{
 const item={keyword:'마케팅',count:2,density:50,inTitle:true,inMetaDescription:false};
 const valid={totalTokens:4,uniqueSingles:2,uniquePhrases:0,singles:[item],phrases:[]};
 assert.equal(KeywordFrequencySchema.safeParse(valid).success,true);
 for(const bad of [{count:-1},{count:1.5},{count:Infinity},{density:-1},{density:100.01},{density:NaN}])assert.equal(KeywordFrequencySchema.safeParse({...valid,singles:[{...item,...bad}]}).success,false);
 assert.equal(KeywordFrequencySchema.safeParse({...valid,totalTokens:-1}).success,false);
});
