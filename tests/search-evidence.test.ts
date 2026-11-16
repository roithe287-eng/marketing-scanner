import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics} from '../lib/collectSiteDiagnostics';
import {auditBacklinks} from '../lib/backlinkAudit';
import {websiteHttp} from '../lib/security/safeFetch';
import {parseSearchConsoleFiles,sourceUrlsFromFile,comparablePeriods,searchOpportunities,sampleTotals} from '../lib/searchConsoleFiles';
import {naverReportSearchAllowed} from '../lib/naverReportPolicy';
import {searchNaverWeb} from '../lib/naverWebSearch';

const site='https://shop.example.com';
const product=site+'/product';
const html=(body:string)=>new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8'}});
const plain=(body:string)=>new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8'}});

test('public-page internal links retain actual source, anchor and observed redirects; robots blocks are inconclusive',async t=>{
  const requested:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const url=new URL(input);requested.push(url.href);
    if(url.pathname==='/robots.txt')return plain('User-agent: *\nDisallow: /blocked');
    if(url.pathname==='/old')return new Response(null,{status:301,headers:{location:'/new'}});
    if(url.pathname==='/new')return html('<link rel="canonical" href="/preferred"><main>내용</main>');
    if(url.pathname==='/gone')return new Response(null,{status:404});
    return new Response(null,{status:404});
  });
  const seed=captureSiteDiagnosticSeed('<a href="/gone">견적 문의</a><a href="/old">서비스</a><a href="/blocked">차단 대상</a><a href="https://other.example.com/">외부</a>',site+'/');
  const audit=await collectSiteDiagnostics(site+'/',{seed});
  const rows=audit.internalLinks!.rows;
  const broken=rows.find(row=>row.anchor==='견적 문의');
  assert.equal(broken?.status,'broken');assert.equal(broken?.source,site+'/');assert.equal(broken?.http,404);
  const moved=rows.find(row=>row.anchor==='서비스');
  assert.equal(moved?.final,site+'/new');assert.deepEqual(moved?.redirects,[301]);assert.equal(moved?.canonical,site+'/preferred');
  assert.equal(rows.find(row=>row.anchor==='차단 대상')?.status,'review');
  assert.equal(requested.some(url=>url.endsWith('/blocked')||url.includes('other.example.com')),false);
});

const productPage=(offers:unknown)=>'<main><div class="product-price">29,900원</div><div class="stock-status">품절</div><del class="product-price">40,000원</del></main><script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'상품',offers})+'</script>';
test('product audit compares visible sale price, currency and availability, with ambiguous variants held for review',()=>{
  const offer={'@type':'Offer',price:39900,priceCurrency:'KRW',availability:'https://schema.org/InStock'};
  const item=captureSiteDiagnosticSeed(productPage(offer),product).page.productOffer!;
  assert.deepEqual(item.fields.map(row=>row.state),['mismatch','match','mismatch']);
  assert.deepEqual(item.fields.map(row=>row.page),['29900','KRW','품절']);
  const variant=captureSiteDiagnosticSeed(productPage([offer,{...offer,price:29900}]),product).page.productOffer!;
  assert.ok(variant.fields.every(row=>row.state==='review'));
});

test('explicit article URLs preserve link attributes and separate dead destinations, brand mentions and platform restrictions',async t=>{
  const fetched:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const u=new URL(input);fetched.push(u.href);
    if(u.pathname==='/robots.txt')return plain('User-agent: *\nDisallow: /blocked');
    if(u.pathname==='/article')return html('<article><a rel="UGC sponsored" href="'+site+'/dead">상품 보기</a></article>');
    if(u.pathname==='/mention')return html('<article>진짜마케팅 소개</article>');
    if(u.pathname==='/dead')return new Response(null,{status:410});
    return new Response(null,{status:404});
  });
  const press='https://press.example.com';
  const result=await auditBacklinks(product,[press+'/article',press+'/mention',press+'/blocked','https://blog.naver.com/account/post'],'진짜마케팅');
  assert.deepEqual(result.map(row=>row.status),['broken','mentioned','review','review']);
  assert.deepEqual(result[0].rel,['ugc','sponsored']);
  assert.equal(result[0].anchor,'상품 보기');
  assert.ok(!fetched.some(url=>url.includes('naver.com')||url.endsWith('/blocked')));
});

test('Search Console imports require a same-page filter and compare equal dates only under the same filters',()=>{
  const queries='\ufeffTop queries,Clicks,Impressions,CTR,Position\r\n"상품, 가격",1,100,1%,4.1\r\n상품 주문,20,100,20%,2';
  const filters='Filter,Value\nSearch type,Web\nPage,'+product+'\nDevice,Mobile\nCountry,South Korea';
  const sample=parseSearchConsoleFiles([queries,filters],product);
  assert.equal(searchOpportunities(sample).selected[0].query,'상품, 가격');
  assert.equal(sampleTotals(sample).ctr,10.5);
  assert.throws(()=>parseSearchConsoleFiles([queries,filters],site+'/other'),/페이지 필터/);
  const a={start:'2026-10-01',end:'2026-10-28'},b={start:'2026-09-02',end:'2026-09-29'};
  assert.ok(comparablePeriods(a,b,sample.scopeKey,sample.scopeKey));
  const other=parseSearchConsoleFiles([queries,filters.replace('South Korea','Japan')],product);
  assert.ok(!comparablePeriods(a,b,sample.scopeKey,other.scopeKey));
  assert.deepEqual(sourceUrlsFromFile('Linking page,Last crawled\nhttps://press.example.com/article,2026-10-01'),['https://press.example.com/article']);
});

test('ordinary Naver Search API credentials cannot enable a paid report adapter',async t=>{
  const keys=['NAVER_CLIENT_ID','NAVER_CLIENT_SECRET','NAVER_REPORT_SEARCH_AUTHORIZED'] as const;
  const original=keys.map(k=>process.env[k]);
  t.after(()=>keys.forEach((key,i)=>{if(original[i]===undefined)delete process.env[key];else process.env[key]=original[i];}));
  process.env.NAVER_CLIENT_ID='fixture';process.env.NAVER_CLIENT_SECRET='fixture';
  delete process.env.NAVER_REPORT_SEARCH_AUTHORIZED;
  t.mock.method(globalThis,'fetch',()=>assert.fail('report with ordinary credentials attempted a request'));
  assert.equal(naverReportSearchAllowed(),false);
  await assert.rejects(()=>searchNaverWeb('검색'));
});
