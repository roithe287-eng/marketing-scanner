import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {captureProductSeed} from '../lib/productDiscovery';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {buildCompetitionScope,competitionMismatch} from '../lib/competitionScope';
import {sharedCompetitorOffering,finalizeSearchCandidates} from '../lib/competitorSelection';
import {retailItems,retailFormats} from '../lib/retailOffer';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {reviewIndustry} from '../lib/industryClassifier';
import {reportGoal} from '../lib/reportGoal';
import {buildReportDocument} from '../lib/reportDocument';
import {reportForPresentation} from '../lib/reportPresentation';
import {MarketingReportSchema} from '../lib/reportSchema';
import ReportIndustryEvidence from '../components/report/ReportIndustryEvidence';
import {fixture} from './fixtures/report';

const url='https://shop.example/category/cabinets';
const script=(value:unknown)=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
const product=(name:string,link?:string)=>({'@type':'Product',name,url:link});
function shop(name:string,action:string,products=[name],address=url){
  const html='<main><h1>'+name+'</h1><button>'+action+'</button></main>'+script(products.map(n=>product(n)));
  return {url:address,finalUrl:address,title:name+' 공식몰',description:name+' 전문 온라인 쇼핑몰',bodyText:name+' 판매',h1:[name],h2:[],ctaButtons:[action],productDiscovery:captureProductSeed(html,address)};
}

test('first-party merchandise keeps explicit item paths and rejects offers from foreign shops, separate tenants, private pages and related stock',()=>{
  const detail='https://shop.example/products/cream';
  const html=script([product('선크림',detail),product('외부 냉장고','https://other.example/p/refrigerator'),product('외부 샴푸','//other.example/shampoo'),product('비공개 상품','/account/history'),product('구내 책장','/custom/billy?model=14&utm_source=test'),product('비공개 링크','/custom/offer?token=test'),{'@type':'ListItem',url:'https://outside.example/x',item:product('외부 사과')}]);
  const sources=captureProductSeed(html,detail).sources;
  assert.deepEqual(sources.map(p=>[p.name,p.url]),[['선크림',detail],['구내 책장','https://shop.example/custom/billy?model=14']]);
  assert.deepEqual(retailItems('쇼핑몰',sources,detail),['선크림']);
  const smart='https://smartstore.naver.com/merchant/products/123';
  assert.equal(captureProductSeed(script(product('타사 세탁기','https://smartstore.naver.com/other/products/234')),smart).sources.length,0);
});

test('structured collection and detail agree on the actual merchandise while an editorial page can cite an external product',()=>{
  const json={'@type':'CollectionPage',mainEntity:{'@type':'ItemList',itemListElement:[1,2].map(i=>({'@type':'ListItem',item:product('원목 책장 '+i,'/kr/ko/p/billy-'+i)}))}};
  const html='<title>모듈 책장</title><meta name="description" content="책장 컬렉션"><main><h1>모듈 책장</h1><p>공간을 꾸미는 방법입니다.</p></main>'+script(json);
  const first=captureCompetitorPage(html,url);
  assert.ok(first.verifiedOffering);assert.equal(first.scope?.kind,'commerce');assert.deepEqual(first.scope?.retailItems,['책장']);
  const data={...shop('모듈 책장','장바구니에 추가'),schemaTypes:['CollectionPage'],productDiscovery:captureProductSeed(html,url)};
  const decision=reviewIndustry(data),purpose=analyzeWebsitePurpose(data);
  const report=MarketingReportSchema.parse({...fixture,url,industryDecision:decision,sitePurpose:purpose});
  assert.ok(renderToStaticMarkup(createElement(ReportIndustryEvidence,{report})).includes('확인한 판매 품목'));
  assert.ok(buildReportDocument(report).some(b=>b.text==='확인한 판매 품목 · 책장'));
  const article='<title>책장 구매 가이드</title><main><h1>책장 구매 가이드</h1></main>'+script([{'@type':'Article'},product('책장','https://other.example/products/bookcase')]);
  assert.equal(captureCompetitorPage(article,url+'/blog/guide').scope?.kind,'content');
});

test('each advertised commerce example retains its own merchandise, with wrong-family candidates rejected in both directions',()=>{
  const cases=readFileSync(new URL('./fixtures/commerce-url-cases.tsv',import.meta.url),'utf8').trim().split('\n').map(line=>line.split('\t'));
  const samples=cases.map(([id,family,label,...products])=>{
    const action=id==='wholesale'?'대량 주문 문의':id==='subscription'?'구독 신청':'장바구니';
    const input=shop(label,action,products),scope=buildCompetitionScope(input);
    if(id==='overseas')assert.equal(scope.retailItems,undefined,'Broad category names alone cannot establish a particular item');
    else assert.ok(scope.retailItems?.length,id);
    assert.equal(competitionMismatch(scope,scope),undefined,id);
    assert.equal(reportGoal(analyzeWebsitePurpose(input))?.label,id==='wholesale'?'견적 문의 접수':id==='subscription'?'상품 구독 신청 완료':'구매 완료',id);
    return {id,family,scope};
  });
  for(const own of samples)for(const other of samples)if(own.family!==other.family)assert.ok(competitionMismatch(own.scope,other.scope),own.id+' '+other.id);
});

test('broad matching words cannot place different appliances, coffee formats or accessories on the competitor list',()=>{
  for(const [a,b] of [['냉장고','세탁기'],['소파','소파 커버'],['노트북','노트북 파우치'],['커피 캡슐','원두']]){
    const left=buildCompetitionScope(shop(a,'구매하기')),right=buildCompetitionScope(shop(b,'구매하기',[b],'https://peer.example/'));
    assert.ok(competitionMismatch(left,right),a+' '+b);
    assert.deepEqual(sharedCompetitorOffering(left,right),[]);
    const candidate={rank:1,domain:'peer.example',link:'https://peer.example/',title:'공식몰',description:'',metaTitle:b+' 공식몰',scope:right};
    assert.deepEqual(finalizeSearchCandidates([candidate],'공식몰',[],5,true,left,'shop.example',true),[]);
  }
  assert.deepEqual(sharedCompetitorOffering(buildCompetitionScope(shop('쇼파','구매하기')),buildCompetitionScope(shop('소파','구매하기'))),['소파']);
});

test('newsletter, stock notice and subscription management are not paid subscription goals on either new or saved reports',()=>{
  assert.deepEqual(retailFormats('뉴스레터 정기구독'),[]);assert.deepEqual(retailFormats('커피 정기배송 미제공'),[]);
  for(const action of ['뉴스레터 구독','재입고 알림 구독','정기구독 해지','구독 관리']){
    const p=analyzeWebsitePurpose(shop('원두 정기구독',action));
    assert.equal(p.goal.observed,false,action);assert.equal(p.goal.key,'unknown');
  }
  const mixed=analyzeWebsitePurpose({...shop('원두 정기구독','구독 신청'),ctaButtons:['뉴스레터 구독','구독 신청','구독 해지']});
  assert.deepEqual(mixed.goal.evidence.map(x=>x.text),['구독 신청']);
  const old=MarketingReportSchema.parse({...fixture,sitePurpose:{...mixed,goal:{...mixed.goal,evidence:[{text:'뉴스레터 구독',locator:'button'}]}}});
  assert.equal(reportForPresentation(old).sitePurpose?.goal.observed,false);assert.equal(old.sitePurpose?.goal.observed,true);
});
