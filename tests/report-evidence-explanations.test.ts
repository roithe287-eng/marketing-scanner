import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {fixture} from './fixtures/report';
import type {MarketingReport} from '../lib/reportSchema';
import {positionProfile} from '../lib/industryPositioning';
import {scorePosition,positionCheckReason,positionFieldFinding,positioningBrief} from '../lib/competitorPositioning';
import {buildCompetitorDocument} from '../lib/competitorDocument';
import {buildReportInsights,sourceReferenceGuide} from '../lib/reportInsights';
import {buildInsightsDocument} from '../lib/reportInsightsDocument';
import CompetitorLandscape from '../components/report/CompetitorLandscape';
import PositionCheckCard from '../components/report/PositionCheckCard';
import PositionEvidenceReview from '../components/report/PositionEvidenceReview';
import {SourceDirectory} from '../components/report/InsightPanels';

const input={id:'own',name:'테스트 의류',url:fixture.url,own:true,title:'과잠 단체복',description:'주문 제작 유니폼 상담'};
const sample:MarketingReport={...fixture,competitorAnalysis:{searchKeyword:'과잠',ourSite:{url:fixture.url,domain:'example.com',title:input.title,metaDescription:input.description,h1:''},competitors:[
  {rank:1,title:'과잠 후보',description:'검색 요약',domain:'vendor.example',link:'https://vendor.example',metaTitle:'과잠',metaDescription:'단체복 상담'},
  {rank:2,title:'과잠 미수집 후보',description:'이 요약을 원문으로 세면 안 됩니다',domain:'missing.example',link:'https://missing.example',metaTitle:'과잠',fetchError:'HTTP 403'},
]}};

test('cross-industry sources explain citation origin and page-format-only usage without recommending unverified businesses',()=>{
  const report:MarketingReport={...sample,llmCitationTest:{...fixture.llmCitationTest!,measurementVersion:2,results:[{
    engine:'chatgpt',question:'과잠 업체의 가격 안내는?',questionType:'industry',status:'ok',searchUsed:true,citationVerified:true,cited:false,
    sources:[{url:'https://miso.kr/test',title:'강서 전통 국악기 대여 비용',ownership:'external'}],
  }]}};
  const original=JSON.stringify(report),data=buildReportInsights(report),$=load(renderToStaticMarkup(React.createElement(SourceDirectory,{data})));
  assert.match($.text(),/AI 답변이 인용한/);assert.match($.text(),/다른 업종/);assert.match($.text(),/페이지 안에서 정보를 보여주는 형식과 구성/);
  assert.match($.text(),/추천 사례로 검증한 결과가 아니므로/);assert.match($('.report-source-grid').text(),/강서 전통 국악기 대여 비용/);
  assert.match($('.report-source-grid details').text(),/과잠 업체의 가격 안내는/);
  const pdf=buildInsightsDocument(report).map(b=>b.text).join('\n');
  for(const value of Object.values(sourceReferenceGuide))assert.ok(pdf.includes(value));
  assert.equal(JSON.stringify(report),original);
});

test('search-volume placeholder is replaced by evidence-backed comparable external candidates, excluding own and failed fetches',()=>{
  const $=load(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report:sample})));
  assert.equal($('.position-query .position-tag').text(),'원문 비교 가능 1/2곳');assert.doesNotMatch($.text(),/검색량 미측정/);
  const empty={...sample,competitorAnalysis:{...sample.competitorAnalysis!,competitors:[]}};
  assert.match(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report:empty})),/경쟁사 선정을 보류/);
  assert.match(buildCompetitorDocument(sample).map(b=>b.text).join('\n'),/원문 비교 가능 1\/2곳/);
});

test('missing expressions retain each checked field and the exact criteria instead of implying no service',()=>{
  const row=scorePosition(input,'과잠','commerce'),check=row.checks[0];
  assert.equal(check.found,false);assert.equal(check.sources.length,2);assert.ok(check.sources.every(s=>s.matches.length===0));
  assert.ok(positionCheckReason(row,check).includes(check.label));
  const $=load(renderToStaticMarkup(React.createElement(PositionCheckCard,{row,check})));
  assert.equal($('.position-check-heading span').text(),'미탐지');assert.equal($('.position-field-findings>div').length,2);
  const shared=load(renderToStaticMarkup(React.createElement(PositionEvidenceReview,{row})));
  assert.deepEqual(shared('.position-source-fields blockquote').map((_,el)=>shared(el).text()).get(),[input.title,input.description]);
  for(const text of check.examples)assert.ok($('.position-criterion-words').text().includes(text));
  assert.match(shared('.position-reading-guide').text(),/본문·이미지/);assert.match(shared('.position-reading-guide').text(),/해당하지 않는 내용은 삭제/);
  assert.equal($('.position-rewrite-field').length,2);assert.doesNotMatch($.text(),/반영 가능한 표현 없음/);
  assert.ok(check.examples.includes('금액 표기 (예: 10,000원)'));assert.doesNotMatch(check.examples.join(' '),/\\d/);
});

test('partial and failed collection stay unknown even if a retained field contains matching words',()=>{
  for(const patch of [{description:''},{fetchError:'HTTP 403'}]){
    const row=scorePosition({...input,...patch},'과잠','commerce'),check=row.checks[1];
    assert.equal(row.x,null);assert.match(positionCheckReason(row,check),/미탐지나 0점으로 처리하지 않습니다/);
    const $=load(renderToStaticMarkup(React.createElement(PositionCheckCard,{row,check})));
    assert.equal($('.position-check-heading span').text(),'판정 보류');
    if(!row.description)assert.match($('.position-field-findings>div').last().text(),/원문 미확보/);
    if(row.fetchError)assert.match($.text(),/수집 실패/);
  }
});

test('negated, unavailable and planned signals explain the actual excluded fragments while keeping positive observations',()=>{
  const row=scorePosition({...input,title:'과잠 제작',description:'후기 없음, 인증 미 보유, 상담 불가, 문의 예정'},'과잠','commerce');
  for(const check of row.checks.slice(2)){
    assert.equal(check.found,false);assert.match(positionCheckReason(row,check),/바로 뒤에 없음·미제공·예정/);
    assert.ok(check.sources[1].excluded.length);assert.match(positionFieldFinding(check.sources[1]),/제외한 표현:/);
  }
  assert.ok(row.checks[2].sources[1].excluded.some(e=>e.context==='인증 미 보유'));
  assert.ok(row.checks[2].sources[1].excluded.some(e=>e.context==='후기 없음'));
  const mixed=scorePosition({...input,description:'후기 없음. 실제 제품 인증 보유'},'과잠','commerce').checks[2];
  assert.deepEqual(mixed.signals,['인증']);assert.equal(mixed.signalCount,1);assert.equal(mixed.sources[1].excluded.length,1);
  for(const description of ['후기는 제공하지 않습니다','인증 준비 중','후기도 없습니다']){
    const check=scorePosition({...input,description},'과잠','commerce').checks[2];
    assert.equal(check.found,false,description);assert.ok(check.sources[1].excluded.length,description);
  }
});

test('apparel product vocabulary and spacing variants are recognized without losing original strings or inflating duplicates',()=>{
  for(const industry of ['commerce','ecommerce'] as const){
    const check=scorePosition(input,'과잠',industry).checks[1];
    for(const word of ['과잠','단체복','주문 제작','유니폼'])assert.ok(check.signals.includes(word),word);
    assert.equal(check.signalCount,2);
    const duplicate=scorePosition({...input,title:'단체복 주문제작',description:'단체 복 주문 제작'},'단체복',industry).checks[1];
    assert.equal(duplicate.signals.length,2);
    assert.deepEqual(duplicate.sources.map(s=>s.text),['단체복 주문제작','단체 복 주문 제작']);
  }
  assert.equal(scorePosition({...input,description:'가격 10,000 원'},'과잠','commerce').checks[0].signals.includes('10,000 원'),true);
  assert.ok(positionProfile('commerce').criteria[1].examples.includes('과잠'));
});

test('PDF and copied work instructions carry field-level findings and retain unabridged source text',()=>{
  const row=scorePosition(input,'과잠','ecommerce'),before=JSON.stringify(sample);
  const brief=positioningBrief(sample,row),pdf=buildCompetitorDocument(sample).map(b=>b.text).join('\n');
  for(const content of [brief,pdf]){
    for(const value of [input.title,input.description,'확인 기준 표현:','페이지 제목:','메타 설명:','이 관점의 기준 표현 미탐지','페이지 제목 제안:','메타 설명 제안:'])assert.ok(content.includes(value),value);
    assert.doesNotMatch(content,/검색량 미측정/);
  }
  assert.equal(JSON.stringify(sample),before);
});

test('partial competitor evidence remains visible without counting as a comparison',async ()=>{
  const {MessageMap}=await import('../components/report/InsightPanels');
  const partial={rank:3,title:'검색 요약 제목',description:'검색용 문구',domain:'partial.example',link:'https://partial.example',metaTitle:'수집한 단체복 제목'};
  const report={...sample,competitorAnalysis:{...sample.competitorAnalysis!,competitors:[...sample.competitorAnalysis!.competitors,partial]}};
  const data=buildReportInsights(report);
  assert.equal(data.messageRows.find(r=>r.name==='partial.example')?.fieldCount,1);
  assert.ok(data.messageRows.find(r=>r.name==='partial.example')?.cells.every(c=>c.match===undefined));
  const $=load(renderToStaticMarkup(React.createElement(MessageMap,{data})));
  assert.match($.text(),/후보 3곳 중 제목과 설명을 모두 확보한 곳은 1곳/);
  assert.match($.text(),/제목·설명 중 1개 확인 · 비교 보류/);
  assert.match($('.report-inline-details').text(),/수집한 단체복 제목/);
  assert.doesNotMatch($.text(),/검색용 문구/);
});

test('page-purpose checks share identical evidence, retain distinct sources and show each checking guide',async ()=>{
  const {default:WebsitePurposePanel}=await import('../components/report/WebsitePurposePanel');
  const {WebsitePurposeSchema}=await import('../lib/websitePurpose');
  const common={text:'단체복 주문은 수량 확인 뒤 진행합니다.',locator:'head > title'};
  const different={...common,locator:'https://example.com/process'};
  const purpose=WebsitePurposeSchema.parse({version:1,kind:'service',label:'단체복 주문 제작',sourceUrl:'https://example.com',goal:{key:'contact',label:'견적 문의',observed:true,evidence:[common]},pricingObserved:false,evidence:[common],note:'이 URL의 범위를 확인했습니다.',
    checks:[
      {id:'audience',label:'대상',status:'observed',evidence:[common],guide:'대상과 수량을 확인하세요. 실제 견적서와 대조하세요.'},
      {id:'procedure',label:'절차',status:'observed',evidence:[common,different],guide:'문의 절차를 확인하세요.'},
    ],
  });
  const $=load(renderToStaticMarkup(React.createElement(WebsitePurposePanel,{purpose})));
  assert.equal($('.report-purpose-originals>li').length,2);
  assert.equal($('a[href="#report-purpose-source-1"]').length,2);
  assert.equal($('.report-purpose-originals a[href="https://example.com/process"]').length,1);
  assert.equal($('.report-purpose-checks article').first().find('.report-reading-points li').length,2);
  assert.match($('.report-purpose-checks').text(),/실제 견적서와 대조하세요/);
});

test('comparison links an identical product sample to its source and keeps a differing sample visible',()=>{
  const context={status:'observed' as const,discovery:'public_links' as const,attemptedPages:1,note:'확인한 상품 페이지 표본입니다.',sources:[{url:'https://example.com/product',name:'검수용 단체복 품목',description:'소재 안내',categories:['단체복'],kind:'product_page' as const}]};
  const research={version:2 as const,capturedAt:'2026-11-20T00:00:00.000Z',provider:'naver_web' as const,requestedCount:2,returnedCount:2,apiStart:1,totalDocuments:2,searchVolumeStatus:'not_measured' as const,keywordReason:'상품 원문 확인',keywordEvidence:[],alternatives:[],attemptedKeywords:['과잠'],eligibleCount:2,budgetDeferredCount:0,successfulPages:1,selectedCount:2,productContext:context};
  const report={...sample,competitorAnalysis:{...sample.competitorAnalysis!,research}};
  const same=load(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report,productContextInScope:{...context,sources:[{...context.sources[0]}]}})));
  assert.equal(same('a[href="#report-scope-product-originals"]').length,1);
  assert.doesNotMatch(same.text(),/검수용 단체복 품목/);
  const different=load(renderToStaticMarkup(React.createElement(CompetitorLandscape,{report,productContextInScope:{...context,note:'다른 수집 범위의 표본입니다.'}})));
  assert.equal(different('a[href="#report-scope-product-originals"]').length,0);
  assert.match(different.text(),/검수용 단체복 품목/);
});
