import type {ExtractedWebsiteData} from './extractWebsite';
import {collectRestrictedBusinessEvidence} from './businessResearch';

/** Empty HTML observations stay empty; third-party snippets never impersonate merchant HTML. */
export async function restrictedBusinessWebsite(url:string):Promise<ExtractedWebsiteData|null>{
  const businessDocuments=await collectRestrictedBusinessEvidence(url);
  if(!businessDocuments.length)return null;
  return {
    url,finalUrl:url,detectedEncoding:'unavailable',title:'',description:'',ogTitle:'',ogDescription:'',ogImage:'',ogSiteName:'',faviconUrl:'',keywords:'',
    h1:[],h2:[],h3:[],buttons:[],ctaButtons:[],links:[],bodyText:'',imageAlts:[],imageCount:0,imageWithoutAlt:0,
    hasForm:false,hasReviewKeyword:false,hasPriceKeyword:false,hasTrustKeyword:false,hasContactInfo:false,viewportMeta:'',hasFavicon:false,
    naverSiteVerification:false,rssLink:'',hasMapEmbed:false,hasNaverPlaceLink:false,scriptCount:0,internalLinkCount:0,externalLinkCount:0,isJsHeavy:true,
    responseTimeMs:0,pageSizeBytes:0,contentTypeOk:false,redirectChain:[],selfRedirect:false,h1Count:0,anchorHrefs:[],headSyncScripts:[],headStylesheets:[],bodyTextLength:0,
    jsonLdSchemas:[],schemaTypes:[],schemaHasDescription:false,schemaHasName:false,schemaHasPrice:false,schemaHasRating:false,trackingScripts:[],hasNaverConversionScript:false,hasGTM:false,hasGA:false,
    businessDocuments,collectionNotice:'자체 수집 로봇 차단 · 검색 요약 기반 제한 진단 · HTML·예약 동작 미검증',
  };
}
