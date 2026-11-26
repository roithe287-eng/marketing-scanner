import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import LandingHero from '../components/LandingHero';
import CompetitorComparison from '../components/CompetitorComparison';
import ShareButton from '../components/ShareButton';
import {buildCompetitionScope} from '../lib/competitionScope';
import type {CommunityContext} from '../lib/communityContext';
import {competitorOwnText} from '../lib/competitorResearch';
import {buildCompetitorHints,CompetitorRequestSchema,COMPETITOR_REQUEST_BYTES} from '../lib/competitorRequest';
import {readLandingSnapshot} from '../lib/landingActivity';
import {buildReportInsights} from '../lib/reportInsights';
import {reportForPresentation} from '../lib/reportPresentation';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {fixture} from './fixtures/report';

Object.assign(globalThis,{React});
type Analysis=NonNullable<MarketingReport['competitorAnalysis']>;
const url='https://wig-shop.example/';
const research:NonNullable<Analysis['research']>={
  version:2,capturedAt:'2026-11-25T00:00:00Z',provider:'public_web',requestedCount:5,returnedCount:1,
  apiStart:1,totalDocuments:null,searchVolumeStatus:'not_measured',keywordReason:'업체 상품명',
  keywordEvidence:[],alternatives:[],attemptedKeywords:['부분가발'],eligibleCount:1,budgetDeferredCount:0,
  successfulPages:1,selectedCount:1,selectionStatus:'matched',selectionMessage:'비교 후보 1곳을 확인했습니다.',
};
const peer={rank:1,link:'https://peer.example/',domain:'peer.example',title:'부분가발 전문몰',description:'부분가발 상품 비교',metaTitle:'부분가발',h1:'부분가발'};
const analysis:Analysis={searchKeyword:'부분가발',competitors:[peer],research};
const source={url,finalUrl:url,title:'부분가발 전문몰',description:'인모 부분가발 상품을 판매합니다.',ogTitle:'',ogDescription:'',keywords:'인모 가발',h1:['인모 부분가발'],h2:['상품 안내'],bodyText:'상품 안내\n인모 부분가발을 판매합니다.'};

test('activity totals and public reviews survive missing or malformed sibling fields independently',()=>{
  const valid={id:'review-0',kind:'review',title:'이용 후기',text:'원문과 비교했습니다.',byline:'이용자'};
  assert.deepEqual(readLandingSnapshot({activity:{requested:0,completed:0}}),{activity:{requested:0,completed:0},reviews:null,complete:false});
  assert.deepEqual(readLandingSnapshot({activity:{requested:-1,completed:1},reviews:[null,{},valid]}),{activity:null,reviews:[valid],complete:false});
  assert.deepEqual(readLandingSnapshot({reviews:[]}),{activity:null,reviews:[],complete:false});
  assert.equal(readLandingSnapshot({activity:{requested:0,completed:0},reviews:[]}).complete,true);
  assert.equal(readLandingSnapshot({reviews:[null,{}]}).reviews,null);
  assert.deepEqual(readLandingSnapshot(null),{activity:null,reviews:null,complete:false});
});

test('normal first-party headings survive without shortening; supplementary characters remain whole at field limits',()=>{
  const scope=buildCompetitionScope(source);
  const small=buildCompetitorHints(url,{...source,h2:['상품 안내','보도자료']},scope);
  assert.deepEqual(small?.h2,['상품 안내']);assert.deepEqual(small?.h1,source.h1);
  const clipped=buildCompetitorHints(url,{...source,description:'가'.repeat(1999)+'🧵'},scope);
  assert.equal(clipped?.description,'가'.repeat(1999));assert.ok(CompetitorRequestSchema.safeParse({url,hints:clipped}).success);
  assert.equal(buildCompetitorHints(url+'a'.repeat(2048),source,scope),null);
});

test('long Korean catalogue keeps the industry and qualifying evidence within the comparison endpoint byte limit', t=>{
  const h1=Array.from({length:10},(_,i)=>'부분가발 '+i+' · '+'인모 모질과 길이 안내 '.repeat(78));
  const h2=Array.from({length:20},(_,i)=>'여성용 부분가발 '+i+' · '+'착용 방법과 색상 '.repeat(80));
  const data={...source,h1,h2,bodyText:h2.join('\n')};
  const scope=buildCompetitionScope(source);
  const hints=buildCompetitorHints(url,data,scope);assert.ok(hints);
  const size=(h:unknown)=>Buffer.byteLength(JSON.stringify({url,hints:h}),'utf8');
  const oldSize=size({...source,url:undefined,finalUrl:undefined,h1,h2,scope,bodyText:competitorOwnText(data)});
  assert.ok(oldSize>COMPETITOR_REQUEST_BYTES);
  assert.ok(size(hints)<=COMPETITOR_REQUEST_BYTES);assert.ok(CompetitorRequestSchema.safeParse({url,hints}).success);
  assert.deepEqual(hints.scope,scope);assert.equal(hints.h1?.length,3);assert.equal(hints.h2?.length,8);
  assert.ok(hints.h2.every((h,index)=>h2[index].startsWith(h)));assert.match(hints.bodyText!,/착용 방법/);
  t.diagnostic(`representative Korean envelope: ${oldSize} → ${size(hints)} bytes`);
});

test('a community comparison retains its first-party board names and identity even if navigation fills the envelope',()=>{
  const community:CommunityContext={version:1,pageType:'home',evidence:[{text:'운영자가 지역 생활 커뮤니티를 운영합니다.',locator:'사이트 소개'}],
    navigation:Array.from({length:18},(_,i)=>({label:'지역 질문 게시판 '+i,role:'board',url:url+'section/'+'%EA%B0%80'.repeat(150)+i})),
    pages:[],attempts:[],note:''};
  const data={...source,communityContext:community,h1:Array.from({length:10},(_,i)=>'지역 생활 정보 '+i+' · '+'참여 안내 '.repeat(210))};
  const prepared=buildCompetitorHints(url,data,buildCompetitionScope(data));assert.ok(prepared);
  assert.deepEqual(prepared.communityContext?.evidence,community.evidence);
  assert.match(prepared.bodyText!,/지역 질문 게시판 17/);
  assert.ok(CompetitorRequestSchema.safeParse({url,hints:prepared}).success);
  assert.equal(community.navigation.length,18);
});

test('coverage distinguishes interrupted and inconclusive comparisons from completed searches with zero eligible URLs',()=>{
  for(const [status,value] of [['pending','경쟁사 원문 확인 중'],['timeout','경쟁사 조회 시간 초과'],['error','공식 URL 조회 미완료'],['unavailable','경쟁사 조회 이용 불가'],['empty','비교 후보 0곳']] as const){
    const data=buildReportInsights({...fixture,competitorStatus:{status,message:''}});
    assert.equal(data.coverage.find(c=>c.label==='경쟁사 수집')?.value,value);
    assert.equal(data.collection.measured,status==='empty');
  }
  const inconclusive=buildReportInsights({...fixture,competitorStatus:{status:'empty',message:''},competitorAnalysis:{...analysis,competitors:[],research:{...research,selectedCount:0,selectionStatus:'insufficient_source'}}});
  assert.equal(inconclusive.collection.label,'비교할 원문 근거 부족');assert.equal(inconclusive.collection.measured,false);
});

test('self and excluded platform candidates are removed from stored counts, comparisons and ranks without rewriting the stored report',()=>{
  const self={...peer,link:fixture.url,domain:'example.com'};
  const platform={...peer,link:'https://www.coupang.com/catalogue',domain:'www.coupang.com',rank:2};
  const redirect={...peer,link:'https://old-shop.example/',finalUrl:fixture.url,domain:'old-shop.example',rank:3};
  const original=MarketingReportSchema.parse({...fixture,competitorStatus:{status:'complete',message:'이전 선정 결과'},competitorAnalysis:{
    ...analysis,competitors:[self,platform,redirect],research:{...research,selectedCount:3},overallComparison:'이전 후보에 대한 평가',ourPositioning:'이전 후보와의 차이',
  }});
  const before=JSON.stringify(original);
  const view=reportForPresentation(original),visible=view.competitorAnalysis!;
  assert.equal(visible.competitors.length,0);assert.equal(visible.research?.selectedCount,0);assert.equal(visible.research?.selectionStatus,'no_relevant_candidates');
  assert.equal(view.competitorStatus?.status,'empty');assert.equal(visible.overallComparison,undefined);assert.equal(visible.ourPositioning,undefined);
  assert.equal(visible.filtering?.excluded.length,3);assert.equal(visible.filtering?.reviewedCount,3);
  const kept=reportForPresentation({...original,competitorAnalysis:{...original.competitorAnalysis!,competitors:[self,{...peer,rank:2}]}}).competitorAnalysis!;
  assert.equal(kept.research?.selectedCount,1);assert.deepEqual(kept.competitors.map(c=>[c.rank,c.domain]),[[1,peer.domain]]);
  assert.deepEqual(reportForPresentation(view).competitorAnalysis,visible);assert.equal(JSON.stringify(original),before);
});

test('one-time plans expose the regular URL and customer questions; store-only submissions are identified before analysis',()=>{
  const form=(submittedUrl:string,singleUse:boolean)=>load(renderToStaticMarkup(React.createElement(LandingHero,{onSubmit:()=>{},loading:false,compact:true,allowed:true,submittedUrl,singleUse})));
  const regular=form(url,true);
  assert.equal(regular('#geo-questions').length,1);assert.equal(regular('input[aria-label="기준 보고서 공유 링크 또는 ID"]').length,0);
  const store=form('https://smartstore.naver.com/sample',true);
  assert.equal(store('button[type=submit][disabled]').length,1);assert.match(store('#smartstore-url-notice').text(),/1회 진단권/);
  assert.equal(form('https://brand.naver.com/sample',false)('button[type=submit][disabled]').length,0);
  assert.equal(form(url,false)('input[aria-label="기준 보고서 공유 링크 또는 ID"]').length,1);
});

test('a reader keeps the candidate source link; the analysis action requires entitlement and public sharing explains who can open the link',()=>{
  const html=(canDeepDive:boolean)=>load(renderToStaticMarkup(React.createElement(CompetitorComparison,{competitorAnalysis:analysis,ourUrl:url,canDeepDive})));
  assert.equal(html(false)(`a[href="${peer.link}"]`).length,1);
  assert.equal(html(false)('button[aria-label$="페이지 상세 분석"]').length,0);
  assert.equal(html(true)('button[aria-label$="페이지 상세 분석"]').length,1);
  const share=load(renderToStaticMarkup(React.createElement(ShareButton,{report:fixture})));
  assert.match(share('[role=note]').text(),/링크를 받은 사람은 만료 전까지/);
  assert.equal(share('button').attr('aria-describedby'),share('[role=note]').attr('id'));
});

test('zero readable competitor originals is inconclusive in new and stored reports; a partially read set reports its actual sample',async t=>{
  const {websiteHttp}=await import('../lib/security/safeFetch');
  const {analyzeCompetitors}=await import('../lib/competitorAnalysis');
  const {reviewCandidateCoverage}=await import('../lib/competitorSchema');
  const requested:string[]=[];
  t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>{
    const target=new URL(input);requested.push(target.pathname);
    return new Response('User-agent: *\nDisallow: /',{headers:{'content-type':'text/plain'}});
  });
  const owner={...source,url:'https://www.picknwear.co.kr/',title:'인모 헤어피스·부분가발 전문몰',h1:['부분가발과 헤어피스']};
  const fresh=await analyzeCompetitors(owner);
  assert.ok(fresh);assert.equal(fresh.research.provider,'official_wig_stores');assert.ok(fresh.filtering.metadataCheckedCount>0);
  assert.equal(fresh.research.successfulPages,0);assert.equal(fresh.research.selectionStatus,'lookup_unavailable');
  assert.ok(requested.length>0);assert.ok(requested.every(path=>path==='/robots.txt'));
  const historic={...fresh,research:{...fresh.research,selectionStatus:'no_relevant_candidates' as const,selectionMessage:'후보가 없습니다.'}};
  const stored=MarketingReportSchema.parse({...fixture,competitorStatus:{status:'empty',message:'후보가 없습니다.'},competitorAnalysis:historic});
  const view=reportForPresentation(stored);assert.equal(view.competitorStatus?.status,'error');
  assert.equal(buildReportInsights(view).collection.measured,false);assert.equal(stored.competitorStatus?.status,'empty');
  assert.equal(reportForPresentation({...stored,competitorStatus:null}).competitorStatus?.status,'error');
  const {buildCompetitorDocument}=await import('../lib/competitorDocument');
  const pdf=buildCompetitorDocument(view);
  assert.ok(pdf.some(block=>block.text.includes('원문을 읽지 못했습니다')));
  assert.ok(!pdf.some(block=>block.text==='같은 상품군을 판매하는 공식몰'));
  const partial=reviewCandidateCoverage({...historic,research:{...historic.research,successfulPages:1}});
  assert.equal(partial.research.selectionStatus,'no_relevant_candidates');assert.match(partial.research.selectionMessage,/원문을 읽은 1곳/);
  assert.equal(reviewCandidateCoverage(partial),partial);
  const noReturned={...historic,filtering:{...historic.filtering,metadataCheckedCount:0}};
  assert.equal(reviewCandidateCoverage(noReturned),noReturned);
});
