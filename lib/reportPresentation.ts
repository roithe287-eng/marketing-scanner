import {nonCommercePlaybook} from './nonCommercePlaybook';
import {applyActionableGuides} from './actionableGuides';
import {analyzeWebsitePurpose} from './websitePurpose';
import {nonCommerceEditorialSections,buildStrategyFindings} from './nonCommerceStrategy';
import type {MarketingReport} from './reportSchema';
import {excludedPlatformReason} from './competitorSelection';
import {ownHost,safeHttpUrl} from './citationMeasurement';
import {competitorDisplay} from './competitorDisplay';
import {reconcileKeywordMetadata} from './analyzeKeywordFreq';
import {canonicalPage} from './geoComparison';
import {currentPlacePolicy,buildHospitalPlaceReview} from './hospitalPlace';
import {PAGE_EVIDENCE_METADATA_LIMITS} from './pageEvidence';

/** Reapply candidate policy to saved reports without mutating their observations. */
export function reportForPresentation(report:MarketingReport):MarketingReport {
  report=applyActionableGuides(report);
  const diagnostics=report.siteDiagnostics;
  if (diagnostics?.medicalAudit?.reviewedOn==='2026-11-04') report={...report,siteDiagnostics:{...diagnostics,medicalAudit:currentPlacePolicy(diagnostics.medicalAudit,!!buildHospitalPlaceReview(diagnostics))}};
  const page=report.pageEvidence;
  if(report.keywordFrequency&&page&&canonicalPage(page.requestedUrl)===canonicalPage(report.url)){
    const titleClipped=page.metadataTruncated?.title??page.title.length>=PAGE_EVIDENCE_METADATA_LIMITS.title;
    const descriptionClipped=page.metadataTruncated?.description??page.description.length>=PAGE_EVIDENCE_METADATA_LIMITS.description;
    report={...report,keywordFrequency:reconcileKeywordMetadata(report.keywordFrequency,titleClipped?undefined:page.title,descriptionClipped?undefined:page.description)};
  }
  // Reuse retained public source bodies when opening a saved report. No new request or invented fact.
  if(page&&report.serviceStrategy?.industry==='noncommerce'&&report.sitePurpose){
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
      const book=nonCommercePlaybook(fresh,[page.title,page.description,...page.h1].join(' '),place);
      report={...report,sitePurpose:fresh,serviceStrategy:{...plan,...nonCommerceEditorialSections(fresh,plan.sources,page.finalUrl,(page.h1[0]||page.title||fresh.label).slice(0,70),book),findings:buildStrategyFindings(fresh,plan.sources,page.finalUrl)}};
    }
  }
  const storedAnalysis=report.competitorAnalysis;if(!storedAnalysis)return report;const analysis=competitorDisplay(storedAnalysis);
  const excluded:NonNullable<typeof analysis.filtering>['excluded']=[];
  const competitors=analysis.competitors.filter(c=>{
    const url=safeHttpUrl(c.link);
    const reason=!url?'유효한 웹페이지 주소 미확인':ownHost(url,report.url)?'자사 도메인':excludedPlatformReason(new URL(url).hostname);
    if(!reason)return true;
    excluded.push({domain:c.domain,link:c.link,title:c.title,reason});return false;
  });
  if(!excluded.length)return analysis===storedAnalysis?report:{...report,competitorAnalysis:analysis};
  const recorded=analysis.filtering?.excluded||[];
  return {...report,competitorAnalysis:{...analysis,competitors:competitors.map((c,i)=>({...c,rank:i+1})),filtering:{
    policyVersion:analysis.filtering?.policyVersion||1,reviewedCount:analysis.filtering?.reviewedCount??analysis.competitors.length,
    metadataCheckedCount:analysis.filtering?.metadataCheckedCount??analysis.competitors.filter(c=>!!(c.metaTitle||c.metaDescription||c.h1||c.fetchError)).length,
    excluded:[...recorded,...excluded.filter(c=>!recorded.some(e=>e.link===c.link))],
  }}};
}
