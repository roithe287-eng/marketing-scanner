import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {buildCompetitionScope} from '../lib/competitionScope';
import {commercialSearchSnapshot} from '../lib/naverReportPolicy';
import {publicCompetitorCitations} from '../lib/publicCompetitorSearch';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildCompetitorDocument} from '../lib/competitorDocument';
import {websiteHttp} from '../lib/security/safeFetch';
import CompetitorUrlPanel from '../components/report/CompetitorUrlPanel';
import {fixture} from './fixtures/report';

const ownUrl='https://erp-owner.example/';
const own={url:ownUrl,title:'회계 ERP 소프트웨어 솔루션',ogTitle:'',description:'업무용 소프트웨어를 개발합니다. 기업 회계 ERP 솔루션을 제공합니다.',h1:['기업 회계 ERP'],keywords:'회계 ERP',bodyText:'회계 ERP 솔루션을 제공하고 업무용 소프트웨어를 개발합니다.'};
const titleFor='기업 ERP 회계 시스템 솔루션';
const peer='https://verified-peer.example/services/accounting';
const oldAlias='https://verified-peer.example/offer';
const blocked='https://blocked-peer.example/';
const unrelated='https://unrelated-provider.example/';
const aliasDomains='https://alternate-owner.example/';
const unknown='https://unknown-provider.example/';
const searchedOnly='https://invented-by-text.example/';
const marketplace='https://coupang.com/erp/';
const citation=(url:string,title=titleFor)=>({type:'url_citation',url,title});
const response=(annotations:unknown[])=>({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:`검증되지 않은 모델 출력 ${searchedOnly}`,annotations}]}]});
function withoutNaver(t:TestContext){
  const saved={key:process.env.OPENAI_API_KEY,authorized:process.env.NAVER_REPORT_SEARCH_AUTHORIZED};
  process.env.OPENAI_API_KEY='test-only';
  delete process.env.NAVER_REPORT_SEARCH_AUTHORIZED;
  t.after(()=>{if(saved.key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved.key;if(saved.authorized===undefined)delete process.env.NAVER_REPORT_SEARCH_AUTHORIZED;else process.env.NAVER_REPORT_SEARCH_AUTHORIZED=saved.authorized;});
}

test('public competitor discovery accepts citations only after a completed web search',()=>{
  const sources=publicCompetitorCitations(response([citation(peer+'#features'),citation(peer),citation(ownUrl),citation('http://127.0.0.1:1234/')]),ownUrl);
  assert.deepEqual(sources.map(source=>source.link),[peer]);
  assert.throws(()=>publicCompetitorCitations({status:'completed',output:[{type:'message',content:[{type:'output_text',annotations:[citation(peer)]}]}]},ownUrl));
});

test('general industries obtain verified direct URLs even without Naver search authorization',async t=>{
  withoutNaver(t);
  let hostedLookups=0;
  t.mock.method(globalThis,'fetch',async(input:string|URL,options:RequestInit)=>{
    assert.equal(String(input),'https://api.openai.com/v1/responses');
    hostedLookups++;
    const request=JSON.parse(String(options.body));
    assert.equal(request.tools[0].type,'web_search');
    assert.equal(request.tool_choice,'required');
    assert.equal(request.store,false);
    return Response.json(response([citation(oldAlias),citation(blocked),citation(unrelated),citation(unknown),citation(aliasDomains),citation(marketplace)]));
  });
  const visited:string[]=[];
  t.mock.method(websiteHttp,'fetch',async (input:string|URL,options:RequestInit)=>{
    const url=new URL(input);
    visited.push(url.href);
    assert.match(new Headers(options.headers).get('User-Agent')||'',/^JinjjaScanner\//);
    assert.equal(options.redirect,'manual');
    if(url.pathname==='/robots.txt')return new Response(url.hostname==='blocked-peer.example'?'User-agent: *\nDisallow: /':'User-agent: *\nAllow: /',{headers:{'content-type':'text/plain'}});
    if(url.href===oldAlias)return new Response(null,{status:302,headers:{location:'/services/accounting'}});
    if(url.href===peer)return new Response('<title>한빛 업무 ERP</title><main><h1>기업 회계 ERP 솔루션</h1><p>회계 ERP 솔루션을 운영합니다. 업무용 소프트웨어를 개발합니다.</p><button>데모 문의</button></main>',{headers:{'content-type':'text/html; charset=utf-8'}});
    if(url.href===unrelated)return new Response('<title>교육 LMS 소프트웨어</title><main><h1>학습 관리 시스템 개발</h1><p>학습 운영 솔루션을 개발합니다.</p></main>',{headers:{'content-type':'text/html'}});
    if(url.href===aliasDomains)return new Response(`<title>${own.title}</title><link rel="canonical" href="${ownUrl}"><main><h1>회계 ERP 소프트웨어</h1><p>업무용 소프트웨어를 개발합니다.</p></main>`,{headers:{'content-type':'text/html'}});
    if(url.href===unknown)return new Response('<title>홈</title><main>브랜드 안내</main>',{headers:{'content-type':'text/html'}});
    assert.fail(`unexpected candidate request ${url}`);
  });
  const analysis=await analyzeCompetitors({...own,scope:buildCompetitionScope(own)});
  assert.ok(analysis);
  assert.equal(hostedLookups,1);
  assert.equal(analysis.research.provider,'public_web');
  assert.deepEqual(analysis.competitors.map(item=>item.link),[peer],JSON.stringify({research:analysis.research.selectionStatus,excluded:analysis.filtering.excluded,visited}));
  assert.deepEqual(analysis.competitors[0].matchedOffer,['업무·회계 ERP']);
  assert.equal(analysis.competitors[0].searchRank,undefined);
  assert.ok(analysis.competitors[0].sourceExcerpt?.includes('ERP'));
  assert.ok(!visited.includes(blocked));
  assert.ok(!visited.includes(marketplace));
  assert.ok(!visited.includes(searchedOnly));
  assert.ok(analysis.filtering.excluded.some(item=>item.link===unrelated));
  assert.ok(analysis.filtering.excluded.some(item=>item.link===unknown));
  assert.ok(analysis.filtering.excluded.some(item=>item.link===aliasDomains&&item.reason.includes('자사')));
  const report=MarketingReportSchema.parse({...fixture,url:ownUrl,competitorAnalysis:analysis});
  assert.ok(commercialSearchSnapshot(report).competitorAnalysis);
  const blocks=buildCompetitorDocument(report);
  assert.ok(blocks.some(block=>block.href===peer));
  assert.doesNotMatch(blocks.map(block=>block.text).join('\n'),/네이버 웹문서 API|검색 결과 제목/);
  const html=renderToStaticMarkup(createElement(CompetitorUrlPanel,{analysis:report.competitorAnalysis!,linkToDetails:true}));
  assert.match(html,/비교 기준.*원문 확인 시도.*비교 후보/);
  assert.ok(html.includes(`href="${peer}"`));
  assert.ok(!html.includes(`href="${marketplace}"`));
});

test('provider faults are reported separately from a completed comparison with no matches',async t=>{
  withoutNaver(t);
  t.mock.method(globalThis,'fetch',async()=>new Response(null,{status:503}));
  const analysis=await analyzeCompetitors({...own,scope:buildCompetitionScope(own)});
  assert.equal(analysis?.research.selectionStatus,'lookup_unavailable');
  assert.deepEqual(analysis?.competitors,[]);
});
