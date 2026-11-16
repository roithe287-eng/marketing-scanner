import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics} from '../lib/collectSiteDiagnostics';
import {auditBacklinks} from '../lib/backlinkAudit';
import {websiteHttp} from '../lib/security/safeFetch';
import {parseSearchConsoleFiles,sourceUrlsFromFile,comparablePeriods,searchOpportunities,sampleTotals} from '../lib/searchConsoleFiles';
import {collectMobileEvidence} from '../lib/collectMobileEvidence';
import {readLighthouse} from '../lib/mobileEvidence';
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

test('mobile official API keeps origin fallback and lab measures separate, and never substitutes TBT for INP',async t=>{
  const lab={requestedUrl:product,configSettings:{formFactor:'mobile'},audits:{
    'largest-contentful-paint':{numericValue:2800},'total-blocking-time':{numericValue:230},'cumulative-layout-shift':{numericValue:0.12},
    'render-blocking-insight':{score:0.3,displayValue:'100 ms'},unrelated:{numericValue:-1},
  }};
  t.mock.method(globalThis,'fetch',async(input:URL)=>{
    assert.equal(input.hostname,'www.googleapis.com');
    assert.equal(input.searchParams.get('strategy'),'mobile');
    return Response.json({lighthouseResult:lab,loadingExperience:{id:site,origin_fallback:true,metrics:{LARGEST_CONTENTFUL_PAINT_MS:{percentile:3200}}},
      originLoadingExperience:{id:site,metrics:{LARGEST_CONTENTFUL_PAINT_MS:{percentile:3200},CUMULATIVE_LAYOUT_SHIFT_SCORE:{percentile:12}}}});
  });
  const saved=process.env.GOOGLE_CRUX_API_KEY;delete process.env.GOOGLE_CRUX_API_KEY;
  try{
    const result=await collectMobileEvidence(product);
    assert.equal(result.field?.scope,'origin');assert.equal(result.field?.values.cls,0.12);
    assert.equal(result.field?.values.inp,undefined);
    assert.equal(result.lab?.tbt,230);assert.equal(result.lab?.issues[0].id,'render-blocking-insight');
    assert.equal(readLighthouse(lab,site+'/other','Lighthouse JSON'),undefined);
    assert.equal(readLighthouse({...lab,configSettings:{formFactor:'desktop'}},product,'Lighthouse JSON'),undefined);
  }finally{if(saved!==undefined)process.env.GOOGLE_CRUX_API_KEY=saved;}
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

test('CrUX uses its own authorized endpoint and retains field metrics when the PageSpeed API quota is exhausted',async t=>{
  const prior=process.env.GOOGLE_CRUX_API_KEY;
  process.env.GOOGLE_CRUX_API_KEY='isolated-fixture';
  t.after(()=>{if(prior===undefined)delete process.env.GOOGLE_CRUX_API_KEY;else process.env.GOOGLE_CRUX_API_KEY=prior;});
  const calls:unknown[]=[];
  t.mock.method(globalThis,'fetch',async(input:URL,init:RequestInit)=>{
    if(input.hostname==='www.googleapis.com')return new Response(null,{status:429});
    assert.equal(input.hostname,'chromeuxreport.googleapis.com');
    assert.equal(init.method,'POST');
    const request=JSON.parse(String(init.body));
    calls.push(request.url||request.origin);
    if(request.url)return new Response(null,{status:404});
    return Response.json({record:{key:{origin:site,formFactor:'PHONE'},metrics:{
      cumulative_layout_shift:{percentiles:{p75:'0.05'}},
      interaction_to_next_paint:{percentiles:{p75:170}},
    },collectionPeriod:{firstDate:{year:2026,month:10,day:1},lastDate:{year:2026,month:10,day:28}}}});
  });
  const result=await collectMobileEvidence(product);
  assert.deepEqual(calls,[product,site]);
  assert.equal(result.field?.scope,'origin');
  assert.equal(result.field?.values.inp,170);
  assert.equal(result.field?.values.cls,0.05);
  assert.match(result.notice||'',/요청 한도/);
});
