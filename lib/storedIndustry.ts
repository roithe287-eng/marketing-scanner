import {buildAnswerContentPlan} from './answerContent';
import {apparelTerms,customApparelIdentity} from './customApparel';
import {placeSector,PLACE_DETECTION_ORDER} from './localPlaceCatalog';
import {buildStrategyFindings,nonCommerceEditorialSections} from './nonCommerceStrategy';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import type {MarketingReport} from './reportSchema';
import type {DiagnosticPage} from './siteDiagnosticsSchema';
import {canonicalPage} from './geoComparison';
import {analyzeWebsitePurpose,isNonCommerce} from './websitePurpose';
import {providerIdentity,isSecondarySection,ownBusinessRole} from './websiteIdentity';
import {sameSite} from './siteIdentity';

function correctedSector(page:DiagnosticPage){
  const old=page.localPlaceEvidence;
  if(!old)return;
  const role=ownBusinessRole({title:page.title,description:page.description});
  if((!role||role==='retail'||role==='manufacturing')&&customApparelIdentity(page.title,page.description))return 'custom_apparel';
  if(old.sector!=='medical'||page.medicalRelevant||page.medicalEvidence?.facilityCandidate)return old.sector;
  const identity=[old.identity,page.description].join(' ');
  if(placeSector('medical').identity.test(identity))return old.sector;
  return PLACE_DETECTION_ORDER.find(id=>id!=='local'&&placeSector(id).identity.test(identity))||'local';
}

/** Repair editorial outputs from the original capture, without network calls or new measurements. */
export function reconcileStoredIndustry(report:MarketingReport):MarketingReport{
  const page=report.pageEvidence, diagnostics=report.siteDiagnostics;
  if(!page||canonicalPage(page.requestedUrl)!==canonicalPage(report.url)||!sameSite(page.finalUrl,report.url))return report;
  const root=diagnostics?.pages.find(p=>canonicalPage(p.url)===canonicalPage(page.finalUrl));
  const old=root?.localPlaceEvidence, sector=root&&correctedSector(root);
  const changedPlace=!!old&&!!sector&&old.sector!==sector;
  const needsApparel=report.sitePurpose?.business?.id!=='custom_apparel'&&customApparelIdentity(page.title,page.description);
  if(!changedPlace&&!needsApparel)return report;

  const pages=diagnostics?.pages.map(p=>{
    const item=p.localPlaceEvidence, next=correctedSector(p);
    if(!item||!next||next===item.sector)return p;
    const terms=item.terms.filter(term=>term.group!=='상품·서비스');
    if(next==='custom_apparel')for(const term of apparelTerms){
      if((p.title+' '+p.description).includes(term))terms.push({group:'상품·서비스',term});
    }
    return {...p,localPlaceEvidence:{...item,sector:next,terms:terms.slice(0,32),signals:item.signals.filter(s=>s.key!=='offer'),seasonal:undefined}};
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
  if(!changedPlace&&purpose.business?.id!=='custom_apparel')return report;
  purpose.capturedAt=report.sitePurpose?.capturedAt||page.capturedAt;
  const book=nonCommercePlaybook(purpose,providerIdentity(page),current?.localPlaceEvidence);
  const rebuilt=buildAnswerContentPlan(data);
  const staleBenchmark=report.industryBenchmark?.category==='medical'&&book.id!=='medical'&&current?.localPlaceEvidence?.sector!=='medical';
  return {...report,sitePurpose:purpose,
    ...(report.evidenceReview&&report.oneLineSummary.startsWith('HTML 기본 항목 ')?{oneLineSummary:`HTML 기본 항목 ${report.evidenceReview.assessed}개 중 ${report.evidenceReview.passed}개 충족 · ${purpose.label} · ${purpose.goal.label} 동선과 실제 화면은 별도 확인이 필요합니다.`}:{}),
    ...(diagnostics&&pages?{siteDiagnostics:{...diagnostics,pages,findings:diagnostics.findings.map(f=>
      f.id.startsWith('background-')?{...f,action:f.action.replace('진료·상품 설명','상품·서비스의 핵심 설명')}:f)}}:{}),
    ...(staleBenchmark?{industryBenchmark:null}:{}),
    ...(sourcePlan?.industry==='noncommerce'?{serviceStrategy:isNonCommerce(purpose)?{...sourcePlan,sources,
      ...nonCommerceEditorialSections(purpose,sources,page.finalUrl,page.h1[0]||page.title,book),
      findings:buildStrategyFindings(purpose,sources,page.finalUrl)}:undefined}:{}),
    answerContentPlan:{...rebuilt,observedAt:report.answerContentPlan?.observedAt||page.capturedAt},
  };
}
