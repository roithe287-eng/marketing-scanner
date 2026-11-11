import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {extractWebsite} from '../lib/extractWebsite';
import {websiteHttp} from '../lib/security/safeFetch';
import {WebsiteCollectionError,RestrictedWebsiteReportSchema} from '../lib/restrictedWebsite';
import {collectRestrictedWebsite} from '../lib/collectRestrictedWebsite';
import RestrictedWebsiteReportView from '../components/report/RestrictedWebsiteReport';

const url='https://www.forum.example.com/';
test('HTTP denial stops public extraction without host or protocol retries',async t=>{
  for(const status of [403,406,429]){
    const requests:string[]=[];
    const mock=t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{requests.push(String(input));return String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}}):new Response('Access denied',{status});});
    await assert.rejects(extractWebsite(url),(error:unknown)=>error instanceof WebsiteCollectionError&&error.httpStatus===status);
    assert.deepEqual(requests,[url+'robots.txt',url]);mock.mock.restore();
  }
});
test('restricted report uses same-site display-only excerpts without fabricated observations or scores',async t=>{
  const priorId=process.env.NAVER_CLIENT_ID,priorSecret=process.env.NAVER_CLIENT_SECRET;
  process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  t.after(()=>{if(priorId===undefined)delete process.env.NAVER_CLIENT_ID;else process.env.NAVER_CLIENT_ID=priorId;if(priorSecret===undefined)delete process.env.NAVER_CLIENT_SECRET;else process.env.NAVER_CLIENT_SECRET=priorSecret;});
  const requests:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{requests.push(String(input));return new Response(JSON.stringify({items:[
    {link:url+'ab-100-123',title:'회원 질문',description:'상품 광고 내용'},
    {link:'https://other.example.com/',title:'다른 사이트',description:'외부 자료'},
    {link:url+'ab-login',title:'로그인',description:'비공개'},
    {link:url.replace('https:','http:'),title:'<b>실무마당</b> - 마케팅 정보 포털',description:'마케터를 위한 커뮤니티 &amp; 질문답변'},
    {link:url+'design/upload_file/directory.xls',title:'연락처 첨부파일',description:'분석 대상이 아닌 첨부파일'},
  ]}),{headers:{'content-type':'application/json'}});});
  const result=RestrictedWebsiteReportSchema.parse(await collectRestrictedWebsite(url,new WebsiteCollectionError('forbidden',403)));
  assert.equal(result.sources.length,2);assert.equal(result.sources[0].title,'실무마당 - 마케팅 정보 포털');assert.equal(result.communityCandidate,true);
  assert.equal(result.searchStatus,'observed');assert.ok(requests.every(r=>r.startsWith('https://openapi.naver.com/')));
  assert.equal(new URL(requests[0]).searchParams.get('query'),'forum.example.com');
  assert.ok(!result.sources.some(s=>/\.xls|upload_file/.test(s.url)));
  assert.equal('totalScore' in result,false);assert.equal('communityContext' in result,false);
  const rendered=renderToStaticMarkup(React.createElement(RestrictedWebsiteReportView,{report:result}));
  assert.match(rendered,/HTTP 403/);assert.match(rendered,/미확인 기능 감점 안 함/);assert.match(rendered,/원문 미검증/);
});
test('unavailable search remains an explicit unscored restriction result',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('upstream unavailable');});
  const result=await collectRestrictedWebsite(url,new WebsiteCollectionError('forbidden',403));
  assert.deepEqual(result.sources,[]);assert.equal(result.searchStatus,'unavailable');assert.equal(result.communityCandidate,false);
  const rendered=renderToStaticMarkup(React.createElement(RestrictedWebsiteReportView,{report:result}));
  assert.match(rendered,/전체 진단을 보류/);assert.doesNotMatch(rendered,/공개 검색자료를 확인했습니다/);
});
