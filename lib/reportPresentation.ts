import type {MarketingReport} from './reportSchema';
import {excludedPlatformReason} from './competitorSelection';
import {ownHost,safeHttpUrl} from './citationMeasurement';
import {competitorDisplay} from './competitorDisplay';
import {reconcileKeywordMetadata} from './analyzeKeywordFreq';
import {canonicalPage} from './geoComparison';
import {PAGE_EVIDENCE_METADATA_LIMITS} from './pageEvidence';

/** Reapply candidate policy to saved reports without mutating their observations. */
export function reportForPresentation(report:MarketingReport):MarketingReport {
  const page=report.pageEvidence;
  if(report.keywordFrequency&&page&&canonicalPage(page.requestedUrl)===canonicalPage(report.url)){
    const titleClipped=page.metadataTruncated?.title??page.title.length>=PAGE_EVIDENCE_METADATA_LIMITS.title;
    const descriptionClipped=page.metadataTruncated?.description??page.description.length>=PAGE_EVIDENCE_METADATA_LIMITS.description;
    report={...report,keywordFrequency:reconcileKeywordMetadata(report.keywordFrequency,titleClipped?undefined:page.title,descriptionClipped?undefined:page.description)};
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
