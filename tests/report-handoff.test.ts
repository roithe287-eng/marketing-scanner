import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {BusinessDocument} from '../lib/businessContext';
import type {NaverCheck} from '../lib/naverSchema';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {buildSourceLibrary,buildContentFacets} from '../lib/reportContent';
import {reconcileStoredIndustry} from '../lib/storedIndustry';
import {commercialSearchSnapshot} from '../lib/naverReportPolicy';
import {reportForPresentation} from '../lib/reportPresentation';
import {buildReportDocument} from '../lib/reportDocument';
import {buildExecutionPlan,visibleWorkZones} from '../lib/reportExecution';
import {buildDiagnosisComparison,createDiagnosisBaseline,diagnosisChecks} from '../lib/diagnosisComparison';
import {serviceReviewReport} from './fixtures/service-review-report';
import {hospitalPlaceReport} from './fixtures/hospital-place-report';
import {fixture} from './fixtures/report';

const template=serviceReviewReport(), date='2026-11-20T00:00:00Z';
const url='https://education.example.org/program?id=11';
const page={...template.pageEvidence!,requestedUrl:url,finalUrl:url,capturedAt:date};
const base:MarketingReport={...fixture,url,pageEvidence:page,diagnosisMethod:'same',criticalIssues:[]};
const check:NaverCheck={id:'search-description',title:'페이지 설명의 존재·중복',category:'search',status:'action',evidence:'검증 보고서의 검색 설명 관측',interpretation:'검색 설명 확인',steps:['본문을 읽고 설명 작성'],completion:'원문과 대조',sourceIds:[],owner:'content',priority:'high',basis:'observation'};
function naver(targetUrl:string,checks:NaverCheck[]=[check]):NonNullable<MarketingReport['naverOptimization']>{
 return {version:2,rulesReviewedAt:date,targetUrl,mode:'diagnosis',sources:[],checks};
}
test('only scoped merchant HTML can support a homepage interpretation; references retain their original text',()=>{
 const doc=(suffix:string,text:string,source?:BusinessDocument['source']):BusinessDocument=>({url:suffix,title:'검수',capturedAt:date,source,sections:[{heading:'안내',text}]});
 const docs=[doc(url,'공식 과정의 특별 장학 혜택','merchant_html'),doc(url,'검색 요약만의 장학 혜택','search_excerpt'),doc(url.replace('11','22'),'별도 과정 장학 혜택','merchant_html'),doc(url,'수집 방법 미기록 장학 혜택'),doc('https://other.example/course','외부 원문의 장학 혜택','merchant_html')];
 const report=MarketingReportSchema.parse({...base,sitePurpose:{...template.sitePurpose,business:{version:1,id:'travel_booking',label:'여행 예약',industry:'travel',kind:'service',goalKey:'booking',goalLabel:'예약',evidence:[],checks:[],keywords:[],note:'테스트',documents:docs}}});
 const library=buildSourceLibrary(report),actual=docs[0].sections[0].text;
 assert.equal(library.groups.find(g=>g.text===actual)?.sourceUrl,url);
 assert.ok(buildContentFacets(library).some(f=>f.evidence.some(e=>e.text===actual)));
 for(const d of docs.slice(1)){
  const text=d.sections[0].text;
  assert.ok(!library.groups.some(g=>g.text===text));
  assert.ok(library.links.find(l=>l.url===d.url)?.references?.some(r=>r.text===text));
 }
 const pdf=buildReportDocument(report);
 assert.ok(pdf.some(b=>b.text===actual));
 assert.ok(!pdf.some(b=>b.text===docs[1].sections[0].text));
});
test('reopening a corrected legacy snapshot preserves captured HTML while respecting the search-provider setting',t=>{
 const original=process.env.NAVER_REPORT_SEARCH_AUTHORIZED;
 delete process.env.NAVER_REPORT_SEARCH_AUTHORIZED;
 t.after(()=>{if(original===undefined)delete process.env.NAVER_REPORT_SEARCH_AUTHORIZED;else process.env.NAVER_REPORT_SEARCH_AUTHORIZED=original;});
 const docs:BusinessDocument[]=(['merchant_html','search_excerpt'] as const).map(source=>({url,title:'원문 위치',capturedAt:date,source,sections:[{heading:'안내',text:source==='merchant_html'?'검증용 운영 안내 원문':'검색 요약 표본'}]}));
 const report=MarketingReportSchema.parse({...base,sitePurpose:{...template.sitePurpose,business:{version:1,id:'travel_booking',label:'여행 예약',industry:'travel',kind:'service',goalKey:'booking',goalLabel:'예약',evidence:[],checks:[],keywords:[],note:'표본',documents:docs}}});
 const corrected=reconcileStoredIndustry(commercialSearchSnapshot(report));
 const roundTrip=MarketingReportSchema.parse(JSON.parse(JSON.stringify(corrected)));
 const source=buildSourceLibrary(reportForPresentation(roundTrip));
 assert.ok(source.groups.some(g=>g.text==='검증용 운영 안내 원문'));
 assert.ok(!JSON.stringify(source).includes('검색 요약 표본'));
 assert.ok(!JSON.stringify(commercialSearchSnapshot({...report,pageEvidence:{...page,supplementalDocuments:docs}})).includes('검색 요약 표본'));
 assert.equal(report.sitePurpose!.business!.documents.length,2);
});
test('the submitted page and its captured redirect are valid; other offers, sites and orphan redirects cannot enter instructions or exports',()=>{
 const final='https://www.education.example.org/final?id=11';
 const audit=hospitalPlaceReport().siteDiagnostics!;
 const official:NonNullable<MarketingReport['officialSeoAudit']>={version:1,mode:'diagnosis',targetUrl:final,catalogVersion:'2026-10-13',checks:[{id:'technical',title:'공식 점검 표본',topic:'crawl',engines:['google'],status:'action',evidence:'공식 근거 표본',interpretation:'해석',steps:['설정 확인'],completion:'완료'}]};
 const report={...base,pageEvidence:{...page,finalUrl:final},naverOptimization:naver(final),officialSeoAudit:official,siteDiagnostics:{...audit,targetUrl:final}};
 const kept=reportForPresentation(report);assert.ok(kept.siteDiagnostics);assert.ok(kept.officialSeoAudit);
 assert.ok(diagnosisChecks(kept).some(c=>c.key==='naver:search-description'));
 assert.ok(buildExecutionPlan(report).tasks.some(t=>t.id==='official-technical'));
 for(const wrong of [url.replace('11','22'),'https://other.example/']){
  const cross={...report,naverOptimization:naver(wrong),officialSeoAudit:{...official,targetUrl:wrong},siteDiagnostics:{...audit,targetUrl:wrong}};
  const original=JSON.stringify(cross),presentation=reportForPresentation(cross);
  assert.equal(presentation.naverOptimization,undefined);assert.equal(presentation.officialSeoAudit,undefined);assert.equal(presentation.siteDiagnostics,undefined);
  assert.ok(!buildExecutionPlan(cross).tasks.some(t=>t.id==='naver-search-description'||t.id==='official-technical'));
  assert.ok(!buildReportDocument(cross).some(b=>b.text.includes(check.evidence)||b.text.includes('공식 근거 표본')));
  assert.equal(JSON.stringify(cross),original);
 }
 const orphan={...report,pageEvidence:{...page,requestedUrl:url.replace('11','22'),finalUrl:final}};
 assert.equal(reportForPresentation(orphan).naverOptimization,undefined);
 assert.ok(!diagnosisChecks(orphan).some(c=>c.key==='naver:search-description'));
});
test('content, site settings and manual account checks retain their correct destination and completion in the PDF',()=>{
 const manual:NaverCheck={...check,id:'ads-name',title:'비즈채널 이름 확인',category:'ads',owner:'marketer',status:'manual'};
 const technical:NaverCheck={...check,id:'ads-robots',title:'광고 수집 규칙',category:'ads',owner:'developer'};
 const report={...base,naverOptimization:naver(url,[check,technical,manual])},plan=buildExecutionPlan(report);
 assert.deepEqual(plan.tasks.filter(t=>t.group==='네이버').map(t=>[t.id,t.owner,t.zone]),[
  ['naver-search-description','direct','settings'],['naver-ads-robots','developer','settings'],['naver-ads-name','verify','account']]);
 const account=plan.tasks.find(t=>t.owner==='verify'&&t.guideScope==='account')!;
 assert.match(account.location,/관리 화면/);assert.equal(account.evidenceAnchor,'report-naver-check-ads-name');
 assert.ok(visibleWorkZones(plan).some(z=>z.id==='account'));assert.ok(!visibleWorkZones(buildExecutionPlan(base)).some(z=>z.id==='account'));
 const blocks=buildReportDocument(report);
 assert.ok(blocks.some(b=>b.text==='확인할 일: '+account.action));assert.ok(blocks.some(b=>b.text==='완료 확인: '+account.completion));
});
test('a newly measured, manual, inapplicable or unmatched-method item cannot be counted as a new fault or resolution',()=>{
 const passed={id:'row',label:'서비스 안내',status:'pass' as const,category:'content' as const,currentValue:'기존 근거',diagnosis:'점검',guide:'확인'};
 const before={...base,checklist:[passed],naverOptimization:naver(url,[{...check,status:'not_applicable'}])};
 const baseline=createDiagnosisBaseline(before,'before12');
 assert.equal(baseline.checks.find(c=>c.key==='naver:search-description')?.status,'not_applicable');
 const next={...before,checklist:[{...passed,status:'warning' as const},{...passed,label:'새 기준',status:'warning' as const}],criticalIssues:[{title:'확인할 사안',priority:'high' as const,evidenceStatus:'review' as const,problem:'근거 불충분',reason:'별도 확인',recommendation:'운영 확인'}],diagnosisBaseline:baseline,pageEvidence:{...page,h1:[],capturedAt:'2026-11-21T00:00:00Z'}};
 const items=buildDiagnosisComparison(next)!.items;
 assert.equal(items.find(i=>i.label==='서비스 안내')?.group,'new');
 assert.match(items.find(i=>i.label==='새 기준')?.reason||'',/이전 보고서에 같은 항목/);
 assert.equal(items.find(i=>i.label==='확인할 사안')?.after?.status,'review');
 assert.ok(!items.some(i=>i.key==='naver:search-description'));
 for(const report of [{...next,diagnosisMethod:undefined},{...next,diagnosisBaseline:{...baseline,method:undefined}}]){
  const compared=buildDiagnosisComparison(report)!.items;
  assert.equal(compared.find(i=>i.label==='서비스 안내')?.group,'unknown');
  assert.equal(compared.find(i=>i.key==='html:h1')?.group,'new');
 }
});
