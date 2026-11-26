import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fixture} from './fixtures/report';
import {MarketingReportSchema} from '../lib/reportSchema';
import {captureCompetitorPage} from '../lib/competitorAnalysis';
import {buildCompetitionScope} from '../lib/competitionScope';
import {buildCompetitorHints} from '../lib/competitorRequest';
import {buildCompetitorPositioning,scorePosition} from '../lib/competitorPositioning';
import {marketingExpressions} from '../lib/marketingExpressions';
import {buildReportInsights,messageCellLabel} from '../lib/reportInsights';
import {buildReportDocument} from '../lib/reportDocument';
import {calculateSimpleGoal,describeGoal,formatGoalRate} from '../lib/growthKpi';
import {buildGeoComparison} from '../lib/geoComparison';
import {reportForPresentation} from '../lib/reportPresentation';
import {METADATA_LIMITS,metadataCoverage} from '../lib/metadataCoverage';

const url=fixture.url,stamp='2026-11-21T01:02:03Z';
const page={version:1 as const,requestedUrl:url,finalUrl:url,capturedAt:stamp,title:'부분가발',description:'여성용 인모 제품을 안내합니다.',h1:[],h2:[],ctaButtons:[],bodyText:'',bodyTruncated:false};
const offer='여성 부분가발 맞춤 제작을 제공합니다.';
const peer=(host:string,description:string)=>({rank:1,title:'검색 요약',link:'https://'+host+'/',domain:host,description:'검색 결과 할인 문구',metaTitle:'여성 부분가발',metaDescription:description});
const peers=[peer('limited.example','할인 없음, 당일 배송 불가. 맞춤 제작 예정.'),peer('maker.example',offer),{...peer('partial.example','당일 제작, 할인 행사'),metadataTruncated:{title:false,description:true}}];
const comparison={searchKeyword:'부분가발',ourSite:{url,domain:'example.com',title:page.title,metaDescription:page.description,h1:''},competitors:peers};

test('metadata comparisons distinguish complete boundary-length captures, legacy limits, clipping and an observed zero',()=>{
  const title='가'.repeat(METADATA_LIMITS.title),description='나'.repeat(METADATA_LIMITS.description);
  const capture=(title:string,description:string)=>captureCompetitorPage('<title>'+title+'</title><meta name="description" content="'+description+'"><h1>여성 부분가발</h1>',url);
  const whole=capture(title,description);
  assert.deepEqual(whole.metadataTruncated,{title:false,description:false});
  const clipped=capture('가'.repeat(599)+'🧵',description+'할인');
  assert.equal(clipped.metaTitle,'가'.repeat(599));
  assert.deepEqual(clipped.metadataTruncated,{title:true,description:true});
  assert.deepEqual(metadataCoverage(title,description),{title:true,description:true});
  const base={id:'test',name:'업체',url,own:false,title,description};
  assert.equal(scorePosition({...base,metadataTruncated:whole.metadataTruncated},'가발').x,0);
  assert.equal(scorePosition(base,'가발').x,null);
  const saved=MarketingReportSchema.parse({...fixture,pageEvidence:{...page,metadataTruncated:{title:false,description:true}},competitorAnalysis:comparison});
  assert.equal(buildCompetitorPositioning(saved)?.own.x,null);
  assert.equal(buildReportInsights(saved).messageOpportunities.length,0);
  assert.deepEqual(saved.competitorAnalysis?.competitors[2].metadataTruncated,{title:false,description:true});
});

test('full requests and reduced Korean catalogues preserve independent original-field truncation flags',()=>{
  const source={...page,url,ogTitle:'',ogDescription:'',keywords:'',h1:['부분가발'],description:'가'.repeat(960)};
  const scope=buildCompetitionScope(source);
  const full=buildCompetitorHints(url,source,scope)!;
  assert.deepEqual(full.metadataTruncated,{title:false,description:false});
  const small=buildCompetitorHints(url,{...source,h1:Array(30).fill('상품'.repeat(900))},scope)!;
  assert.ok(small.description!.length<source.description.length);
  assert.deepEqual(small.metadataTruncated,{title:false,description:true});
  const historic={...comparison,ourSite:{...comparison.ourSite,metaDescription:'나'.repeat(240)}};
  assert.equal(buildCompetitorPositioning({...fixture,competitorAnalysis:historic})?.own.x,null);
  assert.equal(buildCompetitorPositioning({...fixture,competitorAnalysis:{...historic,ourSite:{...historic.ourSite,metadataTruncated:{title:false,description:false}}}})?.own.x,0);
});

test('peer recommendations expose only comparable official fields and keep restricted expressions attributed to the correct sentence',()=>{
  const report=MarketingReportSchema.parse({...fixture,pageEvidence:page,competitorAnalysis:comparison});
  const insights=buildReportInsights(report),[own,limited,maker,partial]=insights.messageRows;
  assert.ok(own.available&&limited.available&&maker.available&&!partial.available);
  const cells=limited.cells.filter(cell=>cell.restricted);
  assert.deepEqual(cells.map(cell=>cell.restricted),['할인 없음','당일 배송 불가','맞춤 제작 예정']);
  assert.ok(cells.every(cell=>messageCellLabel(cell)==='제한·예정'));
  assert.ok(partial.cells.every(cell=>messageCellLabel(cell)==='미확인'));
  assert.deepEqual(insights.messageOpportunities,[{label:'맞춤·범위',count:1,total:2,candidates:[{name:'maker.example',url:'https://maker.example/',field:'메타 설명',quote:offer}]}]);
  const ownLimit=buildReportInsights({...report,pageEvidence:{...page,description:'맞춤 제작 예정'}});
  assert.equal(ownLimit.messageOpportunities.length,0);
  const docs=buildReportDocument(report);
  assert.ok(docs.some(block=>block.href==='https://maker.example/'&&block.text.includes(offer)));
  assert.ok(docs.some(block=>block.text.includes('제한·예정 · 당일 배송 불가')));
  const mixed=marketingExpressions('상담 불가, 온라인 예약 가능. 수수료 없음. 당일 배송은 제한 없이 운영합니다.',/상담|예약|수수료|당일/);
  assert.deepEqual(mixed.matches,['예약','수수료','당일']);
  assert.deepEqual(mixed.excluded,[{expression:'상담',context:'상담 불가'}]);
  const qualifiers=marketingExpressions('맞춤형 제작 예정. 인증은 아직 미보유. 미지원. 비공식. 무료가 아닙니다. 장비 지원 가능.',/맞춤|인증|지원|공식|무료/);
  assert.deepEqual(qualifiers.matches,['지원']);
  assert.deepEqual(qualifiers.excluded.map(item=>item.context),['맞춤형 제작 예정','인증은 아직 미보유','미지원','비공식','무료가 아닙니다']);
});

test('current and previous observations for the same foreign page cannot supply a score, answer, or source for this report',()=>{
  const foreign='https://example.com/?product=other';
  const observation=(targetUrl:string,date:string)=>({...fixture.llmCitationTest!,measurementProtocol:'geo-compare-v3' as const,targetUrl,brandName:'표본',cacheHit:false,results:[{...fixture.llmCitationTest!.results[0],responseText:'외부 업체만의 답변 원본',requestFingerprint:'a'.repeat(24),model:'test-model',measuredAt:date,sources:[{url:foreign,title:'외부 업체 원본',ownership:'own' as const}]}]});
  const report=MarketingReportSchema.parse({...fixture,pageEvidence:page,llmCitationTest:observation(foreign,'2026-11-22'),geoBaseline:{reportId:'base123',url,citation:observation(foreign,'2026-11-21')}});
  const comparison=buildGeoComparison(report)!;
  assert.equal(comparison.matched,0);assert.equal(comparison.beforeRate,null);assert.equal(comparison.afterRate,null);
  assert.equal(comparison.pairs[0].reason,'target');
  assert.equal(comparison.pairs[0].before,undefined);assert.equal(comparison.pairs[0].after,undefined);
  const projection=reportForPresentation(report);
  assert.equal(projection.llmCitationTest,null);
  assert.equal(projection.analysisWarnings?.filter(w=>w.key==='citationTarget').length,1);
  assert.ok(report.llmCitationTest);assert.equal(report.analysisWarnings,undefined);
  assert.ok(!buildReportDocument(report).some(b=>b.text.includes('외부 업체만의 답변 원본')||b.href===foreign));
  const final=url+'/공식';
  const valid={...report,pageEvidence:{...page,finalUrl:final},llmCitationTest:observation(final,'2026-11-22'),geoBaseline:{...report.geoBaseline!,citation:observation(final,'2026-11-21')}};
  assert.equal(buildGeoComparison(valid)?.matched,1);
  assert.ok(reportForPresentation(valid).llmCitationTest);
});

test('goal math keeps measured zero, an unknown denominator, small positive rates, near-100 rates and a zero target distinct',()=>{
  const goal=(a:string,b:string,c:string)=>calculateSimpleGoal({opportunities:a,completed:b,targetCompleted:c});
  const small=goal('1000000','1','3');
  assert.equal(formatGoalRate(small.rate),'0.01% 미만');assert.equal(small.required,3000000);
  assert.equal(formatGoalRate(goal('10000','1','').rate),'0.01%');
  assert.equal(formatGoalRate(goal('1000000','999999','').rate),'99.99% 초과');
  assert.equal(formatGoalRate(goal('100','100','').rate),'100%');
  const empty=goal('0','0','3'),zero=goal('100','0','3');
  assert.equal(formatGoalRate(empty.rate),'미산출');assert.equal(formatGoalRate(zero.rate),'0%');
  assert.match(describeGoal(empty,'방문','완료'),/방문이 0회/);
  assert.match(describeGoal(zero,'방문','완료'),/완료 0회/);
  assert.equal(goal('','','0').required,0);assert.match(describeGoal(goal('0','0','0'),'방문','완료'),/목표가 0회/);
  const invalidTarget=goal('200','1','-1');assert.equal(formatGoalRate(invalidTarget.rate),'0.5%');assert.equal(invalidTarget.required,null);assert.ok(invalidTarget.errors.targetCompleted);
});
