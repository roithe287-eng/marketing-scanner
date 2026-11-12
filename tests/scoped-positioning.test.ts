import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {competitionScopeLabel,competitionMismatch,scopeAllowsKeyword,type CompetitionScope} from '../lib/competitionScope';
import {defaultPositionIndustry,positionProfile} from '../lib/industryPositioning';
import {buildCompetitorPositioning,scorePosition} from '../lib/competitorPositioning';
import {nonCommercePlaybook,nonCommerceQuestionGuides} from '../lib/nonCommercePlaybook';
import {buildNonCommerceBriefing} from '../lib/nonCommerceBriefing';
import {nonCommerceOpening} from '../lib/reportOpening';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {SEASONAL_PROFILES} from '../lib/seasonalPlaceCatalog';
import {MarketingReportSchema} from '../lib/reportSchema';
import type {LocalPlaceEvidence} from '../lib/localPlaceSchema';
import PositionEvidenceReview from '../components/report/PositionEvidenceReview';
import {fixture} from './fixtures/report';
const url=fixture.url;
const ski:CompetitionScope={version:1,sourceUrl:url,kind:'service',profile:'rental',label:'대여',specialties:['season:ski'],area:'전북 무주',destinations:['muju'],nationwide:false};
function report(scope:CompetitionScope){return MarketingReportSchema.parse({...fixture,industryBenchmark:{category:'sports',categoryLabel:'스포츠',sampleSize:0,hasSufficientSample:false,summary:'분류'},competitorAnalysis:{searchKeyword:'스키 렌탈',ourSite:{url,domain:new URL(url).hostname,title:'무주 스키 렌탈',metaDescription:'장비·의류 대여, 리프트권 요금과 픽업·반납 안내',h1:'',scope},competitors:[]}});}

test('live ski rental scope overrides a broad sports AI category in comparison and drafts',()=>{
 const r=report(ski),model=buildCompetitorPositioning(r)!;
 assert.equal(model.profile.id,'ski');
 const copy=JSON.stringify(model.own.checks);
 assert.match(copy,/장비|리프트권|반납/);assert.doesNotMatch(copy,/락커|체형 변화|정규 수업|회원권/);
 assert.equal(buildCompetitorPositioning(r,'education')!.profile.id,'education','manual override still works');
});
for(const [profile,kind,expected] of [['agency','service','consulting'],['software','service','it_service'],['manufacturing','organization','manufacturing'],['veterinary','service','pet'],['commerce','commerce','ecommerce'],['rental','service','rental']] as const)test(`provider scope selects comparison lenses instead of client topic: ${profile}`,()=>{
 const r=report({...ski,profile,kind,specialties:[],destinations:[],area:''});
 assert.equal(defaultPositionIndustry(r).category,expected);
});
test('unrelated scope is not used as evidence for a different report URL',()=>{
 assert.equal(defaultPositionIndustry(report({...ski,sourceUrl:'https://other.example/'})).category,'sports');
});
test('ski scope label names the actual service and does not repeat the location',()=>{
 assert.equal(competitionScopeLabel(ski),'스키·보드 렌탈·강습 · 전북 무주');
 assert.equal(scopeAllowsKeyword('무주',ski),false);
 assert.equal(scopeAllowsKeyword('무주 스키 렌탈',ski),true);
});
test('same observed ski destination is valid local evidence even without a province address',()=>{
 assert.equal(competitionMismatch(ski,{...ski,area:''}),undefined);
 assert.ok(competitionMismatch(ski,{...ski,area:'강원',destinations:['high1']}));
 assert.ok(competitionMismatch(ski,{...ski,area:'강원'}),'a conflicting observed area is not ignored');
});
const purpose=analyzeWebsitePurpose({url,finalUrl:url,title:'무주 스키 렌탈',description:'스키 장비 대여와 예약',h1:['무주 스키 렌탈'],h2:[],bodyText:'장비 대여와 예약 안내',ctaButtons:['예약']});
const season=SEASONAL_PROFILES.find(p=>p.id==='ski')!;
const place:LocalPlaceEvidence={sector:'rental',name:'무주스키월드',identity:'스키 렌탈',address:'전라북도 무주군',branch:'',franchise:false,links:[],terms:[],signals:[],media:{images:0,described:0,videos:0},seasonal:{version:1,profiles:[{id:'ski',excerpt:'무주 스키 렌탈',terms:[]}],destinations:[{id:'muju',label:'무주',matchedAs:'무주',excerpt:'무주 스키 렌탈'}],seasonLabels:[],signals:[]}};
test('local cost question keeps cost evidence; pickup text is not used as a price answer',()=>{
 const guides=nonCommerceQuestionGuides(purpose,'무주 스키 렌탈',place);
 const q=guides.find(q=>q.question===season.questions[0])!;
 assert.equal(q.intent,'price');assert.ok(!q.match.test('픽업 서비스 제공 (주말/공휴일 제외)'));assert.ok(q.match.test('리프트권 가격 30,000원'));
 const operation=guides.find(q=>q.question===season.questions[1])!;assert.equal(operation.intent,'process');
});
test('seasonal briefing question and evidence match the field rather than catalog array position',()=>{
 const book=nonCommercePlaybook(purpose,'무주 스키 렌탈',place);
 const plan=buildNonCommerceBriefing(book,[{url,title:'픽업',text:'픽업 서비스 제공 (주말/공휴일 제외)'},{url,title:'요금',text:'리프트권 시간권 가격은 주말과 주중에 다릅니다.'}]);
 assert.match(plan.blocks[0].question,/운영기간/);assert.doesNotMatch(plan.blocks[0].question,/추가 비용/);
 assert.equal(plan.blocks[0].evidence.length,0);
 assert.match(plan.blocks[1].question,/리프트권/);assert.doesNotMatch(plan.blocks[1].question,/반납/);
 assert.equal(plan.blocks[1].evidence[0]?.title,'요금');
});
test('new original meta fields do not display an old-report warning',()=>{
 const row=scorePosition({id:'own',name:'업체',url,own:true,title:'스키 렌탈',description:'장비 대여'},'스키 렌탈','ski');
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(PositionEvidenceReview,{row})),/구버전 후보/);
 assert.match(renderToStaticMarkup(React.createElement(PositionEvidenceReview,{row:{...row,own:false,legacyMetadata:true}})),/구버전 후보/);
});
test('seasonal opening uses the homepage service rather than the generic service label',()=>{
 const r={...fixture,sitePurpose:purpose,siteDiagnostics:{...fixture.siteDiagnostics,targetUrl:url,pages:[{url,localPlaceEvidence:place}]}} as unknown as typeof fixture;
 assert.equal(nonCommerceOpening(r)?.purpose,season.label);
});
