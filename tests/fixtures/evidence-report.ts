/** Synthetic data only; production never imports this module. */
import {richReport} from './rich-report';
import {finalizeReportEvidence} from '../../lib/evidenceReview';
import {MarketingReportSchema} from '../../lib/reportSchema';
import type {ExtractedWebsiteData} from '../../lib/extractWebsite';

export async function evidenceReport(){
  const report=await richReport(),p=report.pageEvidence!;
  if(report.llmCitationTest)report.llmCitationTest={...report.llmCitationTest,results:report.llmCitationTest.results.map((r,i)=>({...r,branded:i===0}))};
  const data={url:report.url,finalUrl:p.finalUrl,title:p.title,description:p.description,ogTitle:'',ogDescription:'',h1:p.h1,h2:p.h2,buttons:p.ctaButtons,ctaButtons:p.ctaButtons,bodyText:p.bodyText,bodyTextLength:p.bodyText.length,anchorHrefs:['https://test.channel.io'],imageCount:2,imageWithoutAlt:1,hasContactInfo:true,hasForm:false,hasReviewKeyword:false,hasTrustKeyword:false,hasPriceKeyword:false,viewportMeta:'width=device-width',seoEvidence:{capturedAt:p.capturedAt,titleCount:1,descriptionCount:1,imagesEmptyAlt:0}} as unknown as ExtractedWebsiteData;
  return MarketingReportSchema.parse(finalizeReportEvidence(report,data));
}
