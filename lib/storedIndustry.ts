import {directIndustries} from './providerClaims';
import {buildAnswerContentPlan} from './answerContent';
import {apparelTerms,customApparelIdentity} from './customApparel';
import {placeSector,PLACE_DETECTION_ORDER} from './localPlaceCatalog';
import {buildStrategyFindings,nonCommerceEditorialSections} from './nonCommerceStrategy';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import type {MarketingReport,PageEvidence} from './reportSchema';
import type {DiagnosticPage} from './siteDiagnosticsSchema';
import {canonicalPage,matchesReportPage} from './geoComparison';
import {analyzeWebsitePurpose,isNonCommerce} from './websitePurpose';
import {providerIdentity,isSecondarySection,ownBusinessRole,classificationText,providerBody} from './websiteIdentity';
import {keywordList,withoutThirdPartyRoles} from './industryLanguage';
import {placeFromDescription} from './placeIndustry';
import {sameSite} from './siteIdentity';
import {firstPartyFortuneTools,hasFortuneOverview} from './fortuneService';

/** Observations survive a changed industry label in live, saved and exported views. */
export function retainSourceDocuments(page:PageEvidence,purpose:MarketingReport['sitePurpose']):PageEvidence {
  const documents=purpose?.business?.documents;
  return page.supplementalDocuments?.length||!documents?.length?page:{...page,supplementalDocuments:documents};
}

function correctedSector(page:DiagnosticPage,capturedBody:readonly string[]=[]){
  const old=page.localPlaceEvidence;
  if(!old)return;
  const role=ownBusinessRole({title:page.title,description:page.description});
  if((!role||role==='retail'||role==='manufacturing')&&customApparelIdentity(page.title,page.description))return 'custom_apparel';
  if(old.contextVersion===2||old.sector==='local')return old.sector;
  if(old.contextReviewed&&[old.identity,page.title,page.description].every(v=>withoutThirdPartyRoles(v)===v))return old.sector;
  const sector=placeSector(old.sector);
  const raw=[old.identity,page.title,page.description].join(' ');
  const headings=classificationText([old.identity,page.title].join(' '));
  if(sector.identity.test(headings))return old.sector;
  if(old.sector==='medical'&&(page.medical.length||page.medicalEvidence?.place?.facility))return old.sector;
  const body=(page.businessDocument?.sections||[]).filter(s=>!isSecondarySection(s.heading,s.text)).map(s=>s.text);
  const replacement=placeFromDescription(page.description,[...body,...capturedBody]);
  if(replacement?.id===old.sector)return old.sector;
  // Old snapshots lack the full DOM. Repair only when the saved text reveals the source of the mismatch.
  const ambiguous=sector.identity.test(raw)&&(!sector.identity.test(classificationText(raw))||
    keywordList(page.description)||sector.identity.test(page.description)&&!replacement);
  const priorMedicalFallback=old.sector==='medical'&&!page.medicalRelevant&&!page.medicalEvidence?.facilityCandidate;
  if(!ambiguous&&!priorMedicalFallback)return old.sector;
  return PLACE_DETECTION_ORDER.find(id=>id!=='local'&&placeSector(id).identity.test(headings))||replacement?.id||'local';
}

/** Repair editorial outputs from the original capture, without network calls or new measurements. */
export function reconcileStoredIndustry(report:MarketingReport):MarketingReport{
  // Older snapshots may include observations from a different scan.
  const {naverOptimization,officialSeoAudit,siteDiagnostics}=report;
  if(naverOptimization&&!matchesReportPage(report,naverOptimization.targetUrl))report={...report,naverOptimization:undefined};
  if(officialSeoAudit&&!matchesReportPage(report,officialSeoAudit.targetUrl))report={...report,officialSeoAudit:undefined};
  if(siteDiagnostics&&!matchesReportPage(report,siteDiagnostics.targetUrl))report={...report,siteDiagnostics:undefined};
  const target=report.llmCitationTest?.targetUrl;
  if(target&&!matchesReportPage(report,target)){
    const warnings=report.analysisWarnings||[];
    const alert={key:'citationTarget',label:'AI 답변의 관측 주소 불일치',status:'unavailable' as const};
    report={...report,llmCitationTest:null,analysisWarnings:[alert,...warnings.filter(w=>w.key!==alert.key)].slice(0,10)};
  }
  if(report.industryDecision)return report;
  const page=report.pageEvidence, diagnostics=report.siteDiagnostics;
  if(!page||canonicalPage(page.requestedUrl)!==canonicalPage(report.url)||!sameSite(page.finalUrl,report.url))return report;
  const root=diagnostics?.pages.find(p=>canonicalPage(p.url)===canonicalPage(page.finalUrl));
  const capturedBody=providerBody(page).split(/\n+/u);
  const old=root?.localPlaceEvidence, sector=root&&correctedSector(root,capturedBody);
  const changedPlace=!!old&&!!sector&&old.sector!==sector;
  const needsApparel=report.sitePurpose?.business?.id!=='custom_apparel'&&customApparelIdentity(page.title,page.description);
  const previous=report.sitePurpose;
  const reviewPurpose=!!previous&&(!!previous.business||!!previous.sector)&&
    [page.title,page.description,...page.h1].some(v=>withoutThirdPartyRoles(v)!==v);
  const reviewClaim=!!previous&&!previous.declaredIndustry&&!previous.business&&!previous.sector&&(!old||old.sector==='local')&&
    [page.title,page.description,...page.h1].some(v=>directIndustries(v).length>0);
  const reviewFortune=previous?.kind==='unknown'&&(hasFortuneOverview(page.description)||firstPartyFortuneTools(page.finalUrl,page.siteEditing?.elements).length>=2);
  if(!changedPlace&&!needsApparel&&!reviewPurpose&&!reviewClaim&&!reviewFortune)return report;

  const pages=diagnostics?.pages.map(p=>{
    const item=p.localPlaceEvidence, next=p===root?sector:correctedSector(p);
    if(!item||!next||next===item.sector)return p;
    const terms=item.terms.filter(term=>term.group!=='상품·서비스');
    if(next==='custom_apparel')for(const term of apparelTerms){
      if((p.title+' '+p.description).includes(term))terms.push({group:'상품·서비스',term});
    }
    const clearMedical=item.sector==='medical'&&next!=='medical'&&!p.medical.length&&!p.medicalEvidence?.place?.facility;
    return {...p,...(clearMedical?{medicalRelevant:false,medicalEvidence:undefined}:{}),localPlaceEvidence:{...item,contextReviewed:true as const,contextVersion:2 as const,sector:next,terms:terms.slice(0,32),signals:item.signals.filter(s=>s.key!=='offer'),seasonal:undefined}};
  });
  const current=pages?.find(p=>p.url===root?.url);
  const sourcePlan=report.serviceStrategy;
  const sources=(sourcePlan?.sources||[]).filter(s=>sameSite(s.url,page.finalUrl)&&!isSecondarySection(s.title,s.text,s.url));
  const documents=(pages||[]).filter(p=>!p.noindex&&sameSite(p.url,page.finalUrl)).flatMap(p=>p.businessDocument?[p.businessDocument]:[]);
  for(const url of new Set(sources.map(s=>s.url))){
    if(documents.some(d=>d.url===url))continue;
    const entries=sources.filter(s=>s.url===url);
    documents.push({url,title:entries[0].title,capturedAt:page.capturedAt,source:'merchant_html',sections:entries.slice(0,16).map(s=>({heading:s.title.slice(0,180),text:s.text}))});
  }
  const data={...page,url:report.url,ogDescription:'',isJsHeavy:report.answerContentPlan?.coverage==='limited',businessDocuments:documents,
    productContext:report.productContext??undefined,communityContext:report.sitePurpose?.community,diagnosticSeed:current?{page:current,links:[]}:undefined};
  const purpose=analyzeWebsitePurpose(data);
  const changedPurpose=(reviewPurpose&&(purpose.business?.id!==previous?.business?.id||purpose.sector?.id!==previous?.sector?.id))||
    (reviewFortune&&(purpose.business?.id==='fortune_digital'||(purpose.kind==='content'&&purpose.declaredIndustry?.category==='fortune')));
  if(!changedPlace&&!changedPurpose&&!(reviewClaim&&purpose.declaredIndustry)&&purpose.business?.id!=='custom_apparel')return report;
  purpose.capturedAt=report.sitePurpose?.capturedAt||page.capturedAt;
  const book=nonCommercePlaybook(purpose,providerIdentity(page),current?.localPlaceEvidence);
  const rebuilt=buildAnswerContentPlan(data);
  const staleBenchmark=!!report.industryBenchmark&&(changedPlace||changedPurpose||reviewClaim&&!!purpose.declaredIndustry&&purpose.declaredIndustry.category!==report.industryBenchmark.category)||report.industryBenchmark?.category==='medical'&&book.id!=='medical'&&current?.localPlaceEvidence?.sector!=='medical';
  const comparison=report.competitorAnalysis;
  return {...report,pageEvidence:retainSourceDocuments(page,report.sitePurpose),sitePurpose:purpose,
    ...((changedPlace||changedPurpose)&&comparison?.ourSite?.scope&&[old?.sector,previous?.business?.id,previous?.sector?.id,previous?.kind==='unknown'?'unknown':undefined].includes(comparison.ourSite.scope.profile)?
      {competitorAnalysis:null,competitorStatus:{status:'unavailable' as const,message:'업종을 바로잡아 이전 업종으로 수집한 경쟁사 비교를 제외했습니다.'}}:{}),
    ...(report.evidenceReview&&report.oneLineSummary.startsWith('HTML 기본 항목 ')?{oneLineSummary:`HTML 기본 항목 ${report.evidenceReview.assessed}개 중 ${report.evidenceReview.passed}개 충족 · ${purpose.label} · ${purpose.goal.label} 동선과 실제 화면은 별도 확인이 필요합니다.`}:{}),
    ...(diagnostics&&pages?{siteDiagnostics:{...diagnostics,pages,...(changedPlace?{localPlaceLookup:undefined}:{}),
      ...(changedPlace&&!pages.some(p=>p.medicalRelevant)?{medicalAudit:undefined}:{}),
      findings:diagnostics.findings.filter(f=>!f.id.startsWith('medical-missing-')||pages.some(p=>p.medicalRelevant&&f.urls.includes(p.url))).map(f=>
      f.id.startsWith('background-')?{...f,action:f.action.replace('진료·상품 설명','상품·서비스의 핵심 설명')}:f)}}:{}),
    ...(staleBenchmark?{industryBenchmark:null}:{}),
    ...(sourcePlan?.industry==='noncommerce'?{serviceStrategy:isNonCommerce(purpose)?{...sourcePlan,sources,
      ...nonCommerceEditorialSections(purpose,sources,page.finalUrl,page.h1[0]||page.title,book),
      findings:buildStrategyFindings(purpose,sources,page.finalUrl)}:undefined}:{}),
    answerContentPlan:{...rebuilt,observedAt:report.answerContentPlan?.observedAt||page.capturedAt},
  };
}
