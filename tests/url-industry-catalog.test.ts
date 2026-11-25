import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewIndustry} from '../lib/industryClassifier';
import {buildCompetitionScope,competitionMismatch} from '../lib/competitionScope';
import {analyzeWebsitePurpose,isNonCommerce} from '../lib/websitePurpose';
import {captureSiteDiagnosticSeed} from '../lib/siteDiagnostics';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {captureProductSeed} from '../lib/productDiscovery';
import {marketKeywordCandidates} from '../lib/competitorResearch';
import {industryExamples} from '../lib/landingIndustryExamples';
import {MarketingReportSchema} from '../lib/reportSchema';
import ReportIndustryEvidence from '../components/report/ReportIndustryEvidence';
import {fixture} from './fixtures/report';

const cases=(filename:string)=>readFileSync(new URL(`./fixtures/${filename}.tsv`,import.meta.url),'utf8').trim().split('\n').map(row=>row.split('\t'));
const commerceCases=cases('commerce-url-cases');
const nonCommerceCases=cases('noncommerce-url-cases');
const own='https://scan.example/';
const peer='https://peer.example/';
function offer(title:string,description:string,bodyText:string,action:string,products:string[]=[],url=own){
  const catalog=products.map(name=>`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name,offers:{'@type':'Offer',price:'10000',priceCurrency:'KRW'}})}</script>`).join('');
  const html=`<html><head><title>${title}</title><meta name="description" content="${description}">${catalog}</head><body><main><h1>${title}</h1><p>${bodyText}</p><button>${action}</button></main></body></html>`;
  const data={url,finalUrl:url,title,description,h1:[title],h2:[],bodyText,ctaButtons:[action],
    diagnosticSeed:captureSiteDiagnosticSeed(html,url),productDiscovery:captureProductSeed(html,url)};
  const industryDecision=reviewIndustry(data);
  const scope=buildCompetitionScope({...data,industryDecision});
  const purpose=analyzeWebsitePurpose({...data,industryDecision});
  return {data,industryDecision,scope,purpose,html};
}
function verifyComparison(sample:ReturnType<typeof offer>){
  const candidate=captureCompetitorPage(sample.html,peer);
  assert.ok(candidate.verifiedOffering);
  assert.ok(candidate.scope);
  assert.equal(competitionMismatch(sample.scope,candidate.scope),undefined);
  const productSources=sample.data.productDiscovery.sources;
  const keywords=marketKeywordCandidates({...sample.data,scope:sample.scope,productSources});
  assert.ok(keywords.length,`missing source-backed query for ${sample.data.title}`);
  assert.ok(keywords.every(query=>query.grounded));
}

test('URL diagnostic fixtures cover all advertised commerce and noncommerce examples',()=>{
  assert.deepEqual(commerceCases.map(([id])=>id),industryExamples.commerce.map(item=>item.id));
  assert.deepEqual(nonCommerceCases.map(([id])=>id),industryExamples.noncommerce.map(item=>item.id));
});
for(const [id,expectedFamily,label,...products] of commerceCases)test(`commerce URL identifies its own merchandise and next action: ${id}`,()=>{
  const action=id==='wholesale'?'대량 주문 문의':id==='subscription'?'구독 신청':'장바구니';
  const goal=id==='wholesale'?'contact':id==='subscription'?'subscribe':'purchase';
  const sample=offer(`${label} 공식몰`,`${label} 전문 온라인 쇼핑몰을 운영합니다. ${products.join(' 및 ')} 판매.`,
    `${products.join(' 및 ')}을 판매합니다. 온라인 쇼핑몰을 운영합니다.`,action,products);
  assert.equal(sample.purpose.kind,'commerce');
  assert.equal(sample.purpose.goal.key,goal);
  assert.ok(sample.purpose.goal.observed);
  assert.equal(sample.industryDecision.status,'matched');
  assert.deepEqual(sample.scope.specialties,[expectedFamily]);
  if(id==='overseas'||id==='subscription'){
    assert.deepEqual(sample.scope.retailFormats,[id==='overseas'?'해외직구':'정기구독']);
    assert.match(competitionMismatch(sample.scope,{...sample.scope,retailFormats:undefined})||'',/판매 방식/);
  }
  verifyComparison(sample);
});
for(const [id,category,profile,goal,title,body,action] of nonCommerceCases)test(`noncommerce URL identifies the provider and its next action: ${id}`,()=>{
  const sample=offer(title,body.split('. ')[0],body,action);
  assert.ok(isNonCommerce(sample.purpose));
  assert.ok(sample.purpose.goal.observed);
  assert.equal(sample.purpose.goal.key,goal);
  assert.equal(sample.industryDecision.status,'matched');
  assert.equal(sample.industryDecision.category,category);
  assert.equal(sample.scope.profile,profile);
  verifyComparison(sample);
});

test('verified services and shops use different three-part summaries in the report',()=>{
  for(const [sample,expected] of [
    [offer('화장품 공식몰','온라인 쇼핑몰을 운영합니다.','선크림을 판매합니다.','장바구니',['선크림']),['화장품·뷰티용품 판매','상품 판매형','구매·결제']],
    [offer('병원 개원 컨설팅','병원 개원 컨설팅과 마케팅을 제공합니다.','치과와 병원의 온라인 광고를 대행합니다.','컨설팅 문의'),['병원 컨설팅·마케팅','서비스·상담형','상담·문의']],
  ] as const){
    const report=MarketingReportSchema.parse({...fixture,sitePurpose:sample.purpose,industryDecision:sample.industryDecision});
    const markup=renderToStaticMarkup(createElement(ReportIndustryEvidence,{report}));
    assert.match(markup,/industry-decision-flow/);
    for(const label of expected)assert.ok(markup.includes(label),label);
  }
});

test('a streamed product category uses bounded same-site model paths and retains its family',()=>{
  const url=own+'category/refrigerators';
  const html=`<title>냉장고 | 온빛전자 공식몰</title><main><h1>냉장고</h1><!--$?--><template id="B:0"></template><!--/$--></main>
    <div hidden id="S:0"><ul><li><a href="/refrigerators/ab1234">양문형 냉장고<img src="/a.jpg" alt="양문형 냉장고"></a>902,000원</li>
    <li><a href="https://different.example/refrigerators/cd5678"><img src="/b.jpg" alt="헤어피스">헤어피스</a>450,000원</li>
    <li><a href="/guides/def567"><img src="/c.jpg" alt="구매가이드">구매가이드</a>900,000원</li></ul></div><script>$RC("B:0","S:0")</script>`;
  const seed=captureProductSeed(html,url);
  assert.deepEqual(seed.sources.map(product=>product.url),[own+'refrigerators/ab1234']);
  const candidate=captureCompetitorPage(html,url);
  assert.equal(candidate.verifiedOffering,true);
  assert.deepEqual(candidate.scope?.specialties,['디지털·가전']);
});
