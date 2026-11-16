import type {MarketingReport} from './reportSchema';

/** Ordinary Search API credentials do not license paid diagnostic processing.
 * Enable only under separate authorization covering this specific processing. */
export function naverReportSearchAllowed() {
  return process.env.NAVER_REPORT_SEARCH_AUTHORIZED === 'true' &&
    !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET;
}

export function commercialSearchSnapshot(report:MarketingReport):MarketingReport{
  if(naverReportSearchAllowed())return report;
  const rest={...report};
  if(report.keywordRankTracking)rest.keywordRankTracking=null;
  if(report.competitorAnalysis?.research?.provider==='naver_web'){
    rest.competitorAnalysis=null;
    rest.competitorStatus={status:'unavailable',message:'외부 검색 API 기반의 비교 자료는 이 보고서에 표시하지 않습니다.'};
  }
  if(rest.productContext&&['naver_web','naver_shop'].includes(rest.productContext.discovery))delete rest.productContext;
  if(rest.siteDiagnostics?.localPlaceLookup?.items.length){
    const {localPlaceLookup,...siteDiagnostics}=rest.siteDiagnostics;
    rest.siteDiagnostics=siteDiagnostics;
  }
  return rest;
}
