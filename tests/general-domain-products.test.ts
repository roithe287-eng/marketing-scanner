import assert from 'node:assert/strict';
import {beforeEach,test,type TestContext} from 'node:test';
import {websiteHttp} from '../lib/security/safeFetch';
import {captureProductSeed,ownProductUrl,productSourcesFromHtml} from '../lib/productDiscovery';
import {collectOwnProductContext} from '../lib/ownProductSources';
import {extractWebsite} from '../lib/extractWebsite';
import {capturePageEvidence} from '../lib/pageEvidence';
import {verifyReportEvidence} from '../lib/reportIntegrity';
import {buildAnswerContentPlan} from '../lib/answerContent';
import {citationFallbackQuestions} from '../lib/analyzeCitation';
import {analyzeCompetitors} from '../lib/competitorAnalysis';
import {MarketingReportSchema} from '../lib/reportSchema';
import {fixture} from './fixtures/report';
import {marketKeywordCandidates,usableMarketKeyword} from '../lib/competitorResearch';

beforeEach(t=>{(t as TestContext).mock.method(websiteHttp,'fetch',(u:string|URL,init?:RequestInit)=>globalThis.fetch(u,init));});
const root='https://general-shop.example.com';
const html=(value:string)=>new Response(value,{headers:{'content-type':'text/html;charset=utf-8'}});
const xml=(value:string)=>new Response(value,{headers:{'content-type':'application/xml'}});
const robots=()=>new Response('User-agent: *\nAllow: /');
const schema=(name:string,url?:string)=>`<script type="application/ld+json">${JSON.stringify({'@type':'Product',name,category:'비타민',url})}</script>`;

for(const [platform,path] of [
  ['Cafe24','/product/detail.html?product_no=12'],['Cafe24 slug','/product/cream/12/category/1/display/2/'],
  ['Godomall','/goods/goods_view.php?goodsNo=12'],['Youngcart','/shop/item.php?it_id=12'],
  ['Makeshop','/shop/shopdetail.html?branduid=12'],['Imweb','/shop_view/?idx=12'],['Shopify','/products/daily-vitamin'],
] as const)test(`${platform} public details are recognized on any merchant host`,()=>{
  assert.equal(ownProductUrl(path+(path.includes('?')?'&':'?')+'utm_source=tracking',root),root+path);
});

test('list, account, lookalike, credential and private URLs cannot become detail sources',()=>{
  for(const path of ['/product/list.html?cate_no=1','/goods/goods_list.php?cateCd=1','/products/categories/1','/product/detail.html','/shop_view/?idx=','/member/login.html','/cart/products/1','/api/products/1','/board/product/write.html?product_no=70','/board/product/list.html?board_no=6','/bbs/products/review/1','https://general-shop.example.com.attacker.example/products/1','https://user:secret@general-shop.example.com/products/1','http://127.0.0.1/products/1'])assert.equal(ownProductUrl(path,root),null,path);
});

test('product-board actions and card controls never become product samples or discovery requests',()=>{
  const seed=captureProductSeed('<main><ul><li><a href="/board/product/write.html?product_no=70">WRITE</a><a href="/product/detail.html?product_no=70">REVIEW</a><a href="/product/detail.html?product_no=70"><img alt="공개 제습기" src="a.png"></a></li></ul></main>',root);
  assert.deepEqual(seed.sources.map(p=>p.name),['공개 제습기']);
  assert.deepEqual(seed.productLinks,[root+'/product/detail.html?product_no=70']);
  assert.deepEqual(seed.catalogLinks,[]);
});

test('GEO topics come from actual product nouns rather than common storefront headings or brand names',async t=>{
  const page='<title>가상가전(appliance)</title><meta name="description" content="제습기와 냉난방기 전문 가전"><h2>BEST ITEMS</h2><h2>NEW ARRIVALS</h2><h2>BEST PHOTO REVIEW</h2><main>'+[24,60,16].map(n=>`<li><a href="/products/dehumidifier-${n}"><img alt="가상가전 1등급 대용량 제습기 W10LA ${n}L" src="a.png"></a></li>`).join('')+'</main>';
  t.mock.method(globalThis,'fetch',async(input:unknown)=>String(input).endsWith('/robots.txt')?robots():html(page));
  const sources=productSourcesFromHtml(page,root),data=await extractWebsite(root);
  data.productContext={status:'observed',discovery:'public_links',attemptedPages:1,sources,note:'공개 상품 표본'};
  const candidates=marketKeywordCandidates({...data,productSources:sources});
  assert.equal(candidates[0]?.keyword,'제습기');
  assert.ok(candidates.every(c=>!['등급','W10LA','w10la'].includes(c.keyword)));
  for(const label of ['BEST ITEMS','NEW ARRIVALS','BEST PHOTO REVIEW',"MD’s CHOICE",'가상가전'])assert.equal(usableMarketKeyword(label,{...data,productSources:sources}),false,label);
  assert.ok(citationFallbackQuestions(data,'가상가전').slice(1).every(q=>q.question.includes('제습기')));
  assert.equal(buildAnswerContentPlan(data).primaryKeyword?.term,'제습기');
});


test('public cards and microdata recover multiple products and keep each merchant source URL',()=>{
  const seed=captureProductSeed('<title>가상스토어</title><main><ul><li><a href="/product/detail.html?product_no=1"><img alt="비타민 제품 하나" src="a.png"></a></li><li><a href="/product/detail.html?product_no=2"><img alt="비타민 제품 둘" src="b.png"></a></li></ul></main>',root);
  assert.equal(seed.sources.length,2);assert.equal(seed.commerce,true);assert.equal(seed.productLinks.length,2);
  assert.deepEqual(seed.sources.map(p=>p.url),[root+'/product/detail.html?product_no=1',root+'/product/detail.html?product_no=2']);
  const micro='<main itemscope itemtype="https://schema.org/Product"><meta itemprop="name" content="표시된 비타민"><a itemprop="url" href="/products/vitamin">제품</a><meta itemprop="category" content="비타민"></main>';
  assert.equal(productSourcesFromHtml(micro,root)[0].url,root+'/products/vitamin');
  assert.equal(productSourcesFromHtml(schema('첫 상품')+schema('둘째 상품'),root).length,2);
});

test('the main extraction seed is reused without refetching the home page and FAQ/GEO use the same products',async t=>{
  const requests:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));requests.push(u.href);assert.equal(u.hostname,new URL(root).hostname);
    if(u.pathname==='/robots.txt')return robots();
    assert.equal(u.pathname,'/');return html('<title>가상스토어</title><main>홈</main>'+schema('확인한 비타민',root+'/products/vitamin'));
  });
  const data=await extractWebsite(root),before=capturePageEvidence(data);
  data.productContext=await collectOwnProductContext(data.finalUrl,{seed:data.productDiscovery,robots:data.seoEvidence?.robots});
  assert.equal(requests.filter(u=>new URL(u).pathname==='/').length,1);
  assert.equal(data.productContext.status,'observed');assert.equal(data.productContext.attemptedPages,0);
  assert.deepEqual({...capturePageEvidence(data),capturedAt:before.capturedAt},before);
  assert.equal(data.h1.length,0);assert.doesNotMatch(data.bodyText,/확인한 비타민/);
  assert.equal(buildAnswerContentPlan(data).primaryKeyword?.term,'비타민');
  assert.ok(citationFallbackQuestions(data,'가상스토어').slice(1).every(q=>q.question.includes('비타민')));
  const report=verifyReportEvidence({...fixture,criticalIssues:[{title:'상품 정보 부족',problem:'판매 상품이 없습니다.',reason:'확인 불가',recommendation:'상품 등록',priority:'high'}]},data);
  assert.match(report.criticalIssues[0].problem,/표본 1개/);assert.equal(report.criticalIssues[0].evidenceStatus,'review');
  assert.deepEqual(report.diagnosis,fixture.diagnosis);assert.ok(MarketingReportSchema.safeParse({...report,productContext:data.productContext}).success);
});

test('observed category links recover products on a generic store without guessing API endpoints',async t=>{
  const requests:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));requests.push(u.href);assert.equal(u.hostname,new URL(root).hostname);
    if(u.pathname==='/robots.txt')return robots();
    if(u.pathname==='/')return html('<title>가상스토어</title><a href="/product/list.html?cate_no=5&utm_source=old&action=delete">상품 목록</a>');
    if(u.pathname==='/product/list.html'){assert.equal(u.search,'?cate_no=5');return html('<ul><li><a href="/product/detail.html?product_no=8"><img alt="공개 비타민" src="a.png"></a></li></ul>');}
    assert.equal(u.pathname,'/product/detail.html');return html(schema('공개 비타민'));
  });
  const result=await collectOwnProductContext(root);
  assert.equal(result.discovery,'public_categories');assert.equal(result.status,'observed');assert.equal(result.commerce,true);
  assert.equal(result.sources.length,1);assert.equal(result.attemptedPages,3);assert.equal(result.sources[0].url,root+'/product/detail.html?product_no=8');
  assert.ok(!requests.some(u=>/api|sitemap|action=/.test(u)));
});

test('robot-declared sitemap indexes discover only same-domain public products with at most four detail reads',async t=>{
  const requests:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));requests.push(u.href);assert.equal(u.hostname,new URL(root).hostname);
    if(u.pathname==='/robots.txt')return new Response('User-agent: *\nDisallow: /products/private\nSitemap: '+root+'/site-index.xml');
    if(u.pathname==='/')return html('<title>동적스토어</title>');
    if(u.pathname==='/site-index.xml')return xml(`<sitemapindex><sitemap><loc>${root}/page-map.xml</loc></sitemap><sitemap><loc>${root}/product-map.xml</loc></sitemap></sitemapindex>`);
    if(u.pathname==='/product-map.xml')return xml(`<urlset>${['private','a','b','c','d','e'].map(p=>`<url><loc>${root}/products/${p}</loc></url>`).join('')}<url><loc>https://other.example/products/foreign</loc></url><url><loc>${root}/account/products/secret</loc></url></urlset>`);
    assert.ok(u.pathname.startsWith('/products/'));assert.notEqual(u.pathname,'/products/private');return html(schema('공개 비타민 '+u.pathname));
  });
  const result=await collectOwnProductContext(root);
  assert.equal(result.discovery,'public_sitemap');assert.equal(result.status,'observed');assert.ok(result.sources.length>0);
  assert.ok(result.attemptedPages<=9);assert.ok(requests.filter(u=>new URL(u).pathname.startsWith('/products/')).length<=4);
  assert.ok(!requests.some(u=>/page-map|\/sitemap.xml|foreign|secret|\/products\/private/.test(u)));assert.ok(result.sources.every(s=>s.kind==='structured_product'));
});

test('an optional sitemap failure still falls back to official URL discovery without trusting search snippets',async t=>{
  const oldId=process.env.NAVER_CLIENT_ID,oldSecret=process.env.NAVER_CLIENT_SECRET;process.env.NAVER_CLIENT_ID='test';process.env.NAVER_CLIENT_SECRET='test';
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));
    if(u.hostname==='openapi.naver.com')return Response.json({items:[{link:root+'/products/vitamin',title:'UNTRUSTED_SEARCH_TITLE',description:'UNTRUSTED_SEARCH_DESCRIPTION'}]});
    if(u.pathname==='/robots.txt')return robots();if(u.pathname==='/')return html('<title>동적스토어</title>');
    if(u.pathname==='/sitemap.xml')throw new Error('optional source unavailable');
    assert.equal(u.pathname,'/products/vitamin');return html(schema('직접 확인한 비타민'));
  });
  try{const result=await collectOwnProductContext(root);assert.equal(result.status,'observed');assert.equal(result.discovery,'naver_web');assert.doesNotMatch(JSON.stringify(result.sources),/UNTRUSTED/);}
  finally{if(oldId===undefined)delete process.env.NAVER_CLIENT_ID;else process.env.NAVER_CLIENT_ID=oldId;if(oldSecret===undefined)delete process.env.NAVER_CLIENT_SECRET;else process.env.NAVER_CLIENT_SECRET=oldSecret;}
});

test('a service business is checked without inventing a shop or triggering product API searches',async t=>{
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));assert.equal(u.hostname,'consulting.example.com');
    if(u.pathname==='/robots.txt')return robots();assert.equal(u.pathname,'/');
    return html('<title>광고대행 서비스</title><h1>기업 마케팅 컨설팅</h1><main>'+('기업의 광고 운영과 상담 서비스를 안내합니다. '.repeat(30))+'</main>');
  });
  const result=await collectOwnProductContext('https://consulting.example.com');
  assert.equal(result.status,'not_observed');assert.equal(result.commerce,false);assert.equal(result.attemptedPages,1);assert.match(result.note,/서비스형 사이트/);
});

test('dynamic pages with no recovered products keep missing features unverified instead of claiming actual absence',async t=>{
  t.mock.method(globalThis,'fetch',async(input:unknown)=>String(input).endsWith('/robots.txt')?robots():html('<title>동적 서비스</title><main>홈</main>'+('<script src="app.js"></script>'.repeat(6))));
  const data=await extractWebsite('https://dynamic-service.example.com');data.productContext={status:'unavailable',discovery:'input_page',attemptedPages:0,sources:[],note:'동적 원문 미확인'};
  const output=verifyReportEvidence({...fixture,oneLineSummary:'후기가 없고 구매 버튼이 없습니다.',criticalIssues:[{title:'후기 부재',problem:'후기가 없습니다.',reason:'신뢰 부족',recommendation:'후기 추가',priority:'high'}]},data);
  assert.match(output.oneLineSummary,/부재를 단정하지 않고/);assert.match(output.criticalIssues[0].title,/실제 화면 확인/);assert.equal(output.criticalIssues[0].evidenceStatus,'review');
});

test('every merchant competitor request checks concrete products even if headings already supply a generic category',async t=>{
  const keys=['OPENAI_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET'] as const,old=keys.map(k=>process.env[k]);keys.forEach(k=>process.env[k]='test');const queries:string[]=[];
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));
    if(u.hostname==='api.openai.com')return Response.json({choices:[{message:{content:'{"keyword":"건강식품"}'}}]});
    if(u.hostname==='openapi.naver.com'){queries.push(u.searchParams.get('query')!);return Response.json({items:[{link:'https://saramin.co.kr/',title:'비타민 채용',description:''},{link:'https://vitamin-information.example.com/',title:'비타민 안내',description:''},{link:'https://verified-shop.example.com/',title:'비타민 전문몰',description:''}]});}
    if(u.pathname==='/robots.txt')return robots();
    if(u.hostname===new URL(root).hostname)return html('<title>가상스토어</title><h1>건강식품</h1>'+schema('제품 A 비타민',root+'/products/a')+schema('제품 B 비타민',root+'/products/b'));
    if(u.hostname==='vitamin-information.example.com')return html('<title>비타민 안내</title><meta name="description" content="비타민 정보">');
    assert.equal(u.hostname,'verified-shop.example.com');return html('<title>비타민 전문몰</title><button>구매하기</button>');
  });
  try{
    const result=await analyzeCompetitors({url:root,title:'가상스토어',ogTitle:'가상스토어',description:'건강식품 안내',keywords:'건강식품',h1:['건강식품'],bodyText:'건강식품 안내'});
    assert.ok(result);assert.equal(result.searchKeyword,'비타민');assert.deepEqual(queries,['비타민 쇼핑몰']);assert.equal(result.research.productContext?.sources.length,2);
    assert.deepEqual(result.competitors.map(c=>c.domain),['verified-shop.example.com']);assert.ok(result.filtering.excluded.some(c=>c.domain==='saramin.co.kr'));assert.ok(result.filtering.excluded.some(c=>c.domain==='vitamin-information.example.com'));
  }finally{keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});

test('repeated card links and customer-history URLs do not duplicate samples or become product requests',()=>{
  const seed=captureProductSeed('<title>가상스토어</title><a href="/product/recent_view_product.html">최근 본 상품</a><main>'+Array.from({length:15},(_,i)=>`<li><a href="/products/p${i}"><img alt="비타민 ${i}" src="a.png"></a><a href="/products/p${i}"><img alt="상품명 : 비타민 ${i}" src="b.png"></a></li>`).join('')+'</main>',root);
  assert.equal(seed.sources.length,12);assert.equal(new Set(seed.sources.map(p=>p.url)).size,12);assert.ok(!seed.productLinks.some(p=>p.includes('recent_view')));
});

test('a later collection restriction keeps original public products without sending additional requests',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new Error('No new request is allowed');});
  const seed=captureProductSeed('<main>'+schema('이미 확인한 비타민',root+'/products/a')+'</main>',root);
  const result=await collectOwnProductContext(root,{seed,robots:{url:root+'/robots.txt',status:'unavailable',observedAt:new Date().toISOString()}});
  assert.equal(result.status,'observed');assert.equal(result.sources.length,1);assert.equal(result.attemptedPages,0);assert.equal(result.sources[0].name,'이미 확인한 비타민');
});

test('a deadline during details returns a bounded snapshot of already verified category products',async t=>{
  const seed=captureProductSeed('<title>동적스토어</title><a href="/collections/first">목록 하나</a><a href="/collections/second">목록 둘</a>',root);
  t.mock.method(globalThis,'fetch',async(input:unknown)=>{
    const u=new URL(String(input));
    if(u.pathname.startsWith('/collections/'))return html('<main>'+Array.from({length:12},(_,i)=>`<li><a href="/products/${u.pathname.endsWith('first')?'first':'second'}${i}"><img alt="확인한 비타민 ${i}" src="a.png"></a></li>`).join('')+'</main>');
    assert.ok(u.pathname.startsWith('/products/'));return new Promise<Response>(()=>{});
  });
  const result=await collectOwnProductContext(root,{seed,budgetMs:40,robots:{url:root+'/robots.txt',status:'ok',text:'User-agent: *\nAllow: /',observedAt:new Date().toISOString()}});
  assert.equal(result.status,'observed');assert.equal(result.sources.length,12);assert.equal(new Set(result.sources.map(p=>p.url)).size,12);
  assert.ok(MarketingReportSchema.safeParse({...fixture,productContext:result}).success);
});
