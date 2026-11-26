import {reconcileStoredIndustry,retainSourceDocuments} from './storedIndustry';
import {providerIdentity} from './websiteIdentity';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import {applyActionableGuides} from './actionableGuides';
import {analyzeWebsitePurpose} from './websitePurpose';
import {nonCommerceEditorialSections,buildStrategyFindings} from './nonCommerceStrategy';
import type {MarketingReport} from './reportSchema';
import {excludedPlatformReason} from './competitorSelection';
import {ownHost,safeHttpUrl} from './citationMeasurement';
import {competitorDisplay,applyCompetitorExclusions} from './competitorDisplay';
import {reconcileKeywordMetadata} from './analyzeKeywordFreq';
import {canonicalPage} from './geoComparison';
import {currentPlacePolicy,buildHospitalPlaceReview} from './hospitalPlace';
import {PAGE_EVIDENCE_METADATA_LIMITS} from './pageEvidence';

/** Reapply candidate policy to saved reports without mutating their observations. */
export function reportForPresentation(report:MarketingReport):MarketingReport {
  report=applyActionableGuides(reconcileStoredIndustry(report));
  if(report.evidenceReview?.assessed===0){
    const summary=report.oneLineSummary.replace(/^HTML 기본 항목 0개 중 0개 충족/,'HTML 기본 항목 판정 보류');
    const description=report.finalCta.description.replace(/^수집한 HTML 기본 항목 0개 중 0개가 점검 기준을 충족했습니다\./,'HTML 기본 항목의 충족 여부를 판정할 근거가 부족합니다.');
    if(summary!==report.oneLineSummary||description!==report.finalCta.description)
      report={...report,oneLineSummary:summary,finalCta:{...report.finalCta,description}};
  }
  const diagnostics=report.siteDiagnostics;
  if (diagnostics?.medicalAudit?.reviewedOn==='2026-11-04') report={...report,siteDiagnostics:{...diagnostics,medicalAudit:currentPlacePolicy(diagnostics.medicalAudit,!!buildHospitalPlaceReview(diagnostics))}};
  const page=report.pageEvidence;
  if(report.keywordFrequency&&page&&canonicalPage(page.requestedUrl)===canonicalPage(report.url)){
    const titleClipped=page.metadataTruncated?.title??page.title.length>=PAGE_EVIDENCE_METADATA_LIMITS.title;
    const descriptionClipped=page.metadataTruncated?.description??page.description.length>=PAGE_EVIDENCE_METADATA_LIMITS.description;
    report={...report,keywordFrequency:reconcileKeywordMetadata(report.keywordFrequency,titleClipped?undefined:page.title,descriptionClipped?undefined:page.description)};
  }
  // Reuse retained public source bodies when opening a saved report. No new request or invented fact.
  if(!report.industryDecision&&page&&report.serviceStrategy?.industry==='noncommerce'&&report.sitePurpose&&report.sitePurpose.business?.id!=='custom_apparel'){
    const plan=report.serviceStrategy;
    const documents=(report.siteDiagnostics?.pages||[]).filter(p=>!p.noindex).flatMap(p=>p.businessDocument?[p.businessDocument]:[]);
    for(const s of plan.sources){
      if(!ownHost(s.url,report.url)||documents.some(d=>d.url===s.url))continue;
      const group=plan.sources.filter(v=>v.url===s.url);
      documents.push({url:s.url,title:s.title,capturedAt:plan.capturedAt,source:'merchant_html',sections:group.slice(0,16).map(v=>({heading:v.title.slice(0,180),text:v.text}))});
    }
    const place=report.siteDiagnostics?.pages.find(p=>canonicalPage(p.url)===canonicalPage(page.finalUrl))?.localPlaceEvidence;
    const fresh=analyzeWebsitePurpose({url:report.url,finalUrl:page.finalUrl,title:page.title,description:page.description,h1:page.h1,h2:page.h2,bodyText:page.bodyText,siteEditing:page.siteEditing,ctaButtons:page.ctaButtons,businessDocuments:documents,localPlaceEvidence:place});
    if(fresh.kind===report.sitePurpose.kind&&(fresh.sector?.id===report.sitePurpose.sector?.id||!fresh.sector&&((place?.sector==='veterinary'&&report.sitePurpose.sector?.id==='medical')||(!!place?.branch&&['restaurant','cafe'].includes(place.sector)&&report.sitePurpose.sector?.id==='franchise')))){
      const book=nonCommercePlaybook(fresh,providerIdentity(page),place);
      report={...report,pageEvidence:retainSourceDocuments(page,report.sitePurpose),sitePurpose:fresh,serviceStrategy:{...plan,...nonCommerceEditorialSections(fresh,plan.sources,page.finalUrl,(page.h1[0]||page.title||fresh.label).slice(0,70),book),findings:buildStrategyFindings(fresh,plan.sources,page.finalUrl)}};
    }
  }
  const storedAnalysis=report.competitorAnalysis;if(!storedAnalysis)return report;const analysis=competitorDisplay(storedAnalysis);
  const excluded:NonNullable<typeof analysis.filtering>['excluded']=[];
  const competitors=analysis.competitors.filter(c=>{
    const addresses=new Set([c.link,c.finalUrl??c.link]);
    for(const address of addresses){
      const url=safeHttpUrl(address);
      const reason=!url?'유효한 웹페이지 주소 미확인':ownHost(url,report.url)?'자사 도메인':excludedPlatformReason(new URL(url).hostname);
      if(reason){excluded.push({domain:c.domain,link:c.link,title:c.title,reason});return false;}
    }
    return true;
  });
  const visible=applyCompetitorExclusions(analysis,competitors,excluded);
  if(visible===storedAnalysis)return report;
  const previous=report.competitorStatus;
  const status=visible.research?.selectionStatus==='lookup_unavailable'?'error':visible.competitors.length?'complete':'empty';
  return {...report,competitorAnalysis:visible,
    ...((!previous||previous.status==='complete'||previous.status==='empty')&&{competitorStatus:{
      status,message:visible.research?.selectionMessage||(status==='error'?'공식 URL 조회를 완료하지 못했습니다.':status==='complete'?'비교 기준에 맞는 후보를 표시합니다.':'저장된 후보 중 현재 비교 기준에 맞는 URL이 없습니다.'),
    }}),
  };
}
