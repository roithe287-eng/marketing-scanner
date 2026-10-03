import type {ReportBlock} from './reportDocument';
import type {MarketingReport} from './reportSchema';
import {NAVER_CATEGORIES,NAVER_OWNERS,NAVER_STATUS,NAVER_SCOPE,NAVER_REVIEWED_AT,NAVER_SOURCES} from './naverKnowledge';
import {KEYWORD_API_NOTE,keywordObservationLabel,keywordObservationSummary} from './keywordObservationPresentation';
import {safeHttpUrl} from './citationMeasurement';
export function buildNaverReportDocument(report:MarketingReport):ReportBlock[] {
  const blocks:ReportBlock[]=[{kind:'heading',text:'네이버 최적화 · 근거와 실행 가이드'}];
  const naver=report.naverOptimization;
  if(naver?.mode==='diagnosis') {
    blocks.push({kind:'body',text:`공식 문서 확인일: ${naver.rulesReviewedAt} · 관측 시각: ${naver.observedAt||'미확인'}`},{kind:'body',text:NAVER_SCOPE});
    for(const check of naver.checks) {
      blocks.push({kind:'subheading',text:`[${NAVER_CATEGORIES[check.category]}] ${check.title}`},
        {kind:'body',text:`${NAVER_STATUS[check.status]} · ${NAVER_OWNERS[check.owner]} · ${check.basis==='official'?'공식 안내 기반':'스캐너 관측·운영 제안'}`},
        {kind:'body',text:`확인 근거: ${check.evidence}`},{kind:'body',text:check.interpretation});
      check.steps.forEach((step,i)=>blocks.push({kind:'body',text:`${i+1}. ${step}`}));
      blocks.push({kind:'body',text:`완료 확인: ${check.completion}`});
      for(const source of naver.sources.filter(s=>check.sourceIds.includes(s.id))) {
        const url=safeHttpUrl(source.url);if(url)blocks.push({kind:'body',text:`공식 근거: ${source.title} · 확인 ${source.reviewedAt}${source.updatedAt?` · 개정 ${source.updatedAt}`:''}`,href:url});
      }
    }
  } else {
    blocks.push({kind:'body',text:`이전 보고서는 ${NAVER_REVIEWED_AT}에 검증한 새 기준의 원본 관측이 없습니다. 구버전 네이버 준비도·기술 점수와 자동 생성 과제를 대신 표시하지 않습니다. 현재 상태는 재진단으로 확인해 주세요.`});
    for(const source of NAVER_SOURCES.filter(s=>['ownership','ads-status','search-api'].includes(s.id)))blocks.push({kind:'body',text:`공식 가이드: ${source.title}`,href:source.url});
  }
  const tracking=report.keywordRankTracking;
  if(tracking) {
    blocks.push({kind:'heading',text:'네이버 웹문서 API 관측'},{kind:'body',text:KEYWORD_API_NOTE},{kind:'body',text:keywordObservationSummary(tracking)});
    for(const item of tracking.keywords) {
      blocks.push({kind:'subheading',text:item.keyword},{kind:'body',text:keywordObservationLabel(item,tracking.measurementVersion)});
      if(tracking.measurementVersion===2) {
        if(['found','not_found'].includes(item.observationStatus||''))blocks.push({kind:'body',text:`최대 ${item.requestedCount??'미확인'}건 요청 · ${item.returnedCount??'미확인'}건 수신 · API 전체 결과 수 ${item.totalResults??'미확인'}건`});
        if(item.errorMessage)blocks.push({kind:'body',text:item.errorMessage});
        if(item.observedAt)blocks.push({kind:'body',text:`관측 시각(UTC): ${item.observedAt}`});
        const url=safeHttpUrl(item.matchedUrl);if(url)blocks.push({kind:'body',text:`발견한 URL: ${url}`,href:url});
      }
    }
  }
  return blocks;
}
