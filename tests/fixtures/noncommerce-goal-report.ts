import {load} from 'cheerio';
import {captureSiteEditing} from '../../lib/captureSiteEditing';
import {analyzeWebsitePurpose} from '../../lib/websitePurpose';
import {buildAnswerContentPlan} from '../../lib/answerContent';
import {buildNonCommerceStrategy} from '../../lib/nonCommerceStrategy';
import type {MarketingReport} from '../../lib/reportSchema';
import {radarReviewReport} from './radar-review-report';
import {sectorIntegrationCases} from './noncommerce-sectors';

const portalLinks='<p>서비스</p><a href="https://ai.yeonwoo.example.com/">연우 AI</a><a href="https://tools.yeonwoo.example.com/">연우 만세력</a>';
const portalHtml='<title>연우서비스</title><meta name="description" content="신년운세, 사주, 주역, 타로와 궁합을 연우에서 만나보세요."><main>';
export const nonCommerceGoalCases={
  'medical-goal':{...sectorIntegrationCases.find(row=>row.id==='medical')!,completion:'진료 예약 확정'},
  'legal-goal':{...sectorIntegrationCases.find(row=>row.id==='legal')!,completion:'문의 접수'},
  'fortune-booking':{url:'https://counsel.example.com/',completion:'상담 예약 확정',html:'<title>연우철학관 | 사주 상담</title><meta name="description" content="방문과 실시간 전화로 사주 상담을 진행합니다."><main><h1>연우철학관 사주 상담</h1><p>전화와 대면 상담은 사전 예약으로 진행합니다.</p><a href="/reserve">상담 예약</a></main>'},
  'fortune-reading':{url:'https://yeonwoo.example.com/item',completion:'풀이 결과 열람',html:`${portalHtml}${portalLinks}<h2>새 콘텐츠</h2><p>이번 주 별자리 이야기입니다.</p></main>`},
  'fortune-overview':{url:'https://yeonwoo.example.com/item',completion:'운세 안내 열람',html:`${portalHtml}<p>서비스 항목을 불러옵니다.</p></main>`},
};
export type NonCommerceGoalSample=keyof typeof nonCommerceGoalCases;
export function nonCommerceGoalPage(html:string,url:string) {
  const $=load(html);
  const headings=(selector:string)=>$(selector).toArray().map(el=>$(el).text());
  const siteEditing=captureSiteEditing($,url,new Headers());
  return {url,finalUrl:url,title:$('title').text(),description:$('meta[name="description"]').attr('content')||'',ogDescription:'',h1:headings('h1'),h2:headings('h2'),ctaButtons:siteEditing.elements.filter(element=>element.kind==='cta').map(element=>element.text),bodyText:$('main').text(),siteEditing,isJsHeavy:false};
}

export function nonCommerceGoalReport(sample:NonCommerceGoalSample):MarketingReport {
  const entry=nonCommerceGoalCases[sample],input=nonCommerceGoalPage(entry.html,entry.url);
  const base=radarReviewReport(),sitePurpose=analyzeWebsitePurpose(input),capturedAt=base.evidenceReview!.capturedAt;
  return {...base,url:entry.url,meta:{...base.meta,siteName:input.title,domain:new URL(entry.url).hostname},
    pageEvidence:{version:1,requestedUrl:entry.url,finalUrl:entry.url,capturedAt,title:input.title,description:input.description,h1:input.h1,h2:input.h2,ctaButtons:input.ctaButtons,bodyText:input.bodyText,bodyTruncated:false,siteEditing:input.siteEditing},
    sitePurpose,answerContentPlan:buildAnswerContentPlan(input),siteDiagnostics:undefined,serviceStrategy:buildNonCommerceStrategy(input),
    llmCitationTest:null,competitorAnalysis:null,competitorStatus:undefined,
    exampleCopy:{heroHeadline:input.title,subHeadline:input.description,ctaText:sitePurpose.goal.evidence[0]?.text||sitePurpose.goal.label},
    criticalIssues:[],
    evidenceReview:{...base.evidenceReview!,sourceUrl:entry.url,criteria:base.evidenceReview!.criteria.map(item=>({...item,evidence:item.id==='title'?input.title:input.description}))},
  };
}
