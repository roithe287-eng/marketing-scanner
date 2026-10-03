import type {KeywordRankItem,KeywordRankTracking} from './reportSchema';
export const KEYWORD_API_NOTE='네이버 웹문서 API 응답을 관측한 결과입니다. 통합검색·광고·블로그 순위와 다르며, 제한된 응답에서 찾지 못한 경우를 전체 미노출로 해석하지 않습니다.';
export function keywordObservationLabel(item:KeywordRankItem,version?:number) {
  if(version!==2)return item.naverWebRank===null?'미확인 · 구버전 오류 구분 없음':`응답 내 ${item.naverWebRank}번째 · 구버전`;
  switch(item.observationStatus) {
    case 'found':return `응답 내 ${item.naverWebRank}번째`;
    case 'not_found':return '응답 범위 내 미발견';
    case 'error':return '관측 오류';
    case 'unavailable':return 'API 미설정';
    default:return '관측 상태 미확인';
  }
}
export function keywordObservationSummary(tracking:KeywordRankTracking) {
  if(tracking.measurementVersion!==2)return '이전 보고서는 요청 오류와 미발견을 구분해 저장하지 않았습니다. 과거의 순위·미노출 판정 대신 저장된 응답 위치만 표시합니다. 새 기준으로 재진단해 주세요.';
  const found=tracking.keywords.filter(k=>k.observationStatus==='found').length;
  const missing=tracking.keywords.filter(k=>k.observationStatus==='not_found').length;
  const failed=tracking.keywords.length-found-missing;
  return `정상 ${found+missing}건 · 대상 발견 ${found}건 · 범위 내 미발견 ${missing}건 · 오류/미설정 ${failed}건`;
}
