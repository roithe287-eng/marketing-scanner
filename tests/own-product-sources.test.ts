import assert from 'node:assert/strict';
import {beforeEach,test,type TestContext} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {websiteHttp} from '../lib/security/safeFetch';
import {productSourcesFromHtml,ownProductUrl,collectOwnProductContext} from '../lib/ownProductSources';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildCompetitorDocument} from '../lib/competitorDocument';
import CompetitorLandscape from '../components/report/CompetitorLandscape';
import {fixture} from './fixtures/report';

beforeEach(t=>{(t as TestContext).mock.method(websiteHttp,'fetch',(u:string|URL,init?:RequestInit)=>globalThis.fetch(u,init));});
const html=(body:string)=>new Response(body,{headers:{'content-type':'text/html;charset=utf-8'}});
const product=(name:string,category:string)=>`<title>온누리스토어 - ${name}</title><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name,description:name,category,offers:{price:999,url:'https://unrelated.example/fake-offer'}})}</script>`;
const env=()=>{const keys=['OPENAI_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const,values=keys.map(k=>process.env[k]);process.env.OPENAI_API_KEY='local-test';process.env.NAVER_CLIENT_ID='local-test';process.env.NAVER_CLIENT_SECRET='local-test';return ()=>keys.forEach((k,i)=>{if(values[i]===undefined)delete process.env[k];else process.env[k]=values[i];});};
const own={url:'https://onnuristore.com',title:'온누리스토어',ogTitle:'온누리스토어',description:'',keywords:'',h1:[],h2:[]};

test('public product JSON is usable even when visible HTML is empty; customer state, reviews, offers and related products never enter evidence',()=>{
  const input=product('자일리멜츠 마일드민트 80정 단품','푸드')+`<script type="application/json" id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:{goods:{goodsName:'프레스샷 액상비타민',categoryName:'건강기능식품'},customer:{productName:'CUSTOMER_SECRET'},reviews:[{productName:'REVIEW_SECRET'}],relatedProducts:[{productName:'RELATED_SECRET'}],allCookies:{secret:'COOKIE_SECRET'}}}})}</script>`;
  const sources=productSourcesFromHtml(input,own.url+'/goods/181632');
  assert.deepEqual(sources.map(p=>p.name),['자일리멜츠 마일드민트 80정 단품','프레스샷 액상비타민']);
  assert.doesNotMatch(JSON.stringify(sources),/SECRET|999|unrelated/);
  assert.deepEqual(productSourcesFromHtml('<title>온누리스토어</title><footer>건강기능식품판매업신고</footer>',own.url),[]);
});

test('discovery permits only same-merchant public product URLs and deduplicates tracking parameters',()=>{
  assert.equal(ownProductUrl('/goods/181632?utm_source=naver&inflow=GS#review',own.url),own.url+'/goods/181632');
  assert.equal(ownProductUrl('https://www.onnuristore.com/goods/181632',own.url),'https://www.onnuristore.com/goods/181632');
  for(const value of ['https://onnuristore.com.evil.example/goods/123','http://127.0.0.1/goods/123','https://elsewhere.example/goods/123','/auth/login','/goods/list/search/비타민','/goods/event','/api/products/123','/mypage/products/123'])assert.equal(ownProductUrl(value,own.url),null,value);
});

test('a sparse Onnuri storefront recovers its own products via official URL discovery, keeps API snippets out of AI, and still excludes recruitment competitors',async t=>{
  const restore=env(),ownPages:string[]=[],queries:string[]=[];let prompt='';
  t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
    const u=new URL(String(input));
    if(u.hostname==='api.openai.com'){prompt=String(init?.body);assert.match(prompt,/프레스샷 액상비타민/);assert.doesNotMatch(prompt,/API_SNIPPET_SECRET|API_TITLE_SECRET/);return Response.json({choices:[{message:{content:'{"keyword":"비타민"}'}}]});}
    if(u.hostname==='openapi.naver.com'){
      const q=u.searchParams.get('query')!;queries.push(q);
      return Response.json({items:q.startsWith('site:')?[
        {link:own.url+'/goods/123?utm_source=naver',title:'API_TITLE_SECRET 첫 상품',description:'API_SNIPPET_SECRET'},
        {link:own.url+'/goods/123?inflow=GS',title:'API_TITLE_SECRET 첫 상품',description:'API_SNIPPET_SECRET'},
        {link:own.url+'/goods/124',title:'다른 상품',description:'API_SNIPPET_SECRET'},
        {link:'https://saramin.co.kr/goods/333',title:'기업 채용',description:'API_SNIPPET_SECRET'},
      ]:[{link:'https://saramin.co.kr/',title:'비타민 채용',description:''},{link:'https://vitamins.example/',title:'비타민 전문몰',description:'API_SNIPPET_SECRET'}]});
    }
    if(u.hostname==='onnuristore.com'){
      if(u.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
      ownPages.push(u.href);
      if(u.pathname==='/')return html('<title>온누리스토어</title><main><div id="products"></div></main>');
      if(u.pathname==='/goods/123')return html(product('프레스샷 액상비타민','건강기능식품'));
      if(u.pathname==='/goods/124')return html(product('차일드라이프 어린이 비타민','건강기능식품'));
      throw new Error('Unexpected merchant page');
    }
    assert.equal(u.hostname,'vitamins.example');return html('<title>비타민 전문몰</title><meta name="description" content="영양제와 비타민 판매">');
  });
  try{
    const result=await analyzeCompetitors(own);assert.ok(result);assert.equal(result.searchKeyword,'비타민');
    assert.deepEqual(queries,['site:onnuristore.com','비타민']);assert.equal(ownPages.length,3);assert.equal(new Set(ownPages).size,3);
    assert.equal(result.research.productContext?.status,'observed');assert.equal(result.research.productContext?.sources.length,2);
    assert.equal(result.ourSite.metaDescription,'');assert.deepEqual(result.competitors.map(p=>p.domain),['vitamins.example']);
    assert.ok(result.research.keywordEvidence.some(e=>e.field.startsWith('상품명')));
    const report=MarketingReportSchema.parse({...fixture,competitorAnalysis:result});
    const markup=renderToStaticMarkup(React.createElement(CompetitorLandscape,{report}));assert.match(markup,/확인한 상품군의 비교 키워드|자사 상품 원문 확인/);assert.match(markup,/표본 2개/);
    assert.match(buildCompetitorDocument(report).map(b=>b.text).join('\n'),/프레스샷 액상비타민/);
    assert.doesNotMatch(prompt,/API_SNIPPET_SECRET/);
  }finally{restore();}
});

test('existing public product links avoid an unnecessary search API call',async t=>{
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));assert.equal(u.hostname,'onnuristore.com');
    if(u.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
    if(u.pathname==='/')return html('<a href="/goods/181632">商品</a>');
    assert.equal(u.pathname,'/goods/181632');return html(product('자일리멜츠 마일드민트 80정 단품','푸드'));
  });
  const result=await collectOwnProductContext(own.url);assert.equal(result.discovery,'public_links');assert.equal(result.sources.length,1);assert.equal(result.attemptedPages,2);
});

test('shopping search can recover merchant product URLs when the web index has no product links, without trusting mall names or third-party summaries',async t=>{
  const restore=env();
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));
    if(u.hostname==='openapi.naver.com')return Response.json({items:u.pathname.endsWith('shop.json')?[
      {link:own.url+'/goods/181632',title:'API title is not evidence',mallName:'온누리스토어'},
      {link:'https://another.example/goods/123',title:'Other retailer',mallName:'온누리스토어'},
    ]:[{link:own.url,title:'온누리스토어',description:'API description is not evidence'}]});
    assert.equal(u.hostname,'onnuristore.com');
    if(u.pathname==='/robots.txt')return new Response('User-agent: *\nAllow: /');
    if(u.pathname==='/')return html('<title>온누리스토어</title><main>JS storefront</main>');
    assert.equal(u.pathname,'/goods/181632');return html(product('자일리멜츠 마일드민트 80정 단품','푸드'));
  });
  try{const context=await collectOwnProductContext(own.url);assert.equal(context.status,'observed');assert.equal(context.discovery,'naver_shop');assert.equal(context.sources.length,1);assert.doesNotMatch(JSON.stringify(context.sources),/API title|API description|Other retailer/);assert.deepEqual(context.discoveryAttempts?.map(a=>a.productLinkCount),[0,0,1]);}finally{restore();}
});

test('robots path restrictions and cross-origin redirects are respected before product requests',async t=>{
  const seen:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));seen.push(u.href);assert.equal(u.hostname,'onnuristore.com');
    if(u.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /goods/private\nAllow: /');
    if(u.pathname==='/')return html('<a href="/goods/private">private</a><a href="/goods/123">public</a>');
    assert.equal(u.pathname,'/goods/123');return new Response('',{status:302,headers:{location:'https://another.example/goods/123'}});
  });
  const result=await collectOwnProductContext(own.url);assert.equal(result.sources.length,0);assert.equal(result.status,'blocked');assert.ok(!seen.some(u=>u.includes('/goods/private')));
});

test('unavailable robots or blocked responses produce a collection limitation, never a fabricated product classification',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('unavailable',{status:503}));
  const context=await collectOwnProductContext(own.url);assert.equal(context.status,'unavailable');assert.deepEqual(context.sources,[]);
  const restore=env();delete process.env.OPENAI_API_KEY;
  try{const result=await analyzeCompetitors(own);assert.ok(result);assert.equal(result.searchKeyword,'');assert.equal(result.research.selectionStatus,'insufficient_source');assert.match(result.research.selectionMessage!,/상품이 없거나 사이트에 정보가 부족하다는 판정은 아닙니다/);}finally{restore();}
});
