import type {ExtractedWebsiteData} from './extractWebsite';
import type {PageEvidence} from './reportSchema';
import {captureSearchSignals} from './growthEvidence';
import {clipMetadata,METADATA_LIMITS} from './metadataCoverage';
export {METADATA_LIMITS as PAGE_EVIDENCE_METADATA_LIMITS};

/** Reuse the fetched page. No extra crawl or AI request is needed for a guide. */
export function capturePageEvidence(data:ExtractedWebsiteData,capturedAt=new Date().toISOString()):PageEvidence {
  const clip=(value:string,max:number)=>value.slice(0,max);
  const list=(values:string[],count:number,max:number)=>values.filter(v=>v.trim()).slice(0,count).map(v=>clip(v,max));
  return {version:1,requestedUrl:clip(data.url,4000),finalUrl:clip(data.finalUrl,4000),capturedAt,
    title:clipMetadata(data.title,METADATA_LIMITS.title),description:clipMetadata(data.description,METADATA_LIMITS.description),metadataTruncated:{title:data.title.length>METADATA_LIMITS.title,description:data.description.length>METADATA_LIMITS.description},h1:list(data.h1,6,500),h2:list(data.h2,12,500),ctaButtons:list(data.ctaButtons,12,200),
    bodyText:clip(data.bodyText,12000),bodyTruncated:data.bodyTextLength>Math.min(data.bodyText.length,12000),searchSignals:captureSearchSignals(data),siteEditing:data.siteEditing};
}
