import type { MarketingReport } from './reportSchema';
import { safeHttpUrl } from './citationMeasurement';

export type GeoTask = {id: string; title: string; evidence: string; nextStep: string; completion: string; targetUrl?: string};
export function buildGeoFocus(report: MarketingReport) {
  const citation = report.llmCitationTest;
  if (citation?.measurementVersion !== 2) return null;
  const questions = [...new Set(citation.results.map(row => row.question.trim()).filter(Boolean))].slice(0, 5);
  const measured = citation.results.filter(row => row.status === 'ok' && row.searchUsed && row.citationVerified);
  const failed = citation.results.filter(row => ['error', 'timeout', 'unavailable', 'unverified'].includes(row.status || ''));
  const tasks: GeoTask[] = [];
  const own = measured.flatMap(row => row.sources || []).find(source => source.ownership === 'own' && safeHttpUrl(source.url));
  if (own) tasks.push({id: 'review-source', title: '인용된 자사 페이지의 정보 확인',
    evidence: `이번 답변의 자사 출처에서 “${own.title || own.url}”를 확인했습니다.`,
    nextStep: '인용 문단을 실제 가격·서비스 범위·근거 자료·업데이트 날짜와 대조하세요.',
    completion: '원문과 실제 정보의 일치 여부를 확인하고 변경 내용을 기록', targetUrl: own.url});
  const uncited = measured.find(row => !row.cited && !(row.sources || []).some(source => source.ownership === 'own'));
  const action = uncited && citation.actionPlan?.find(item => item.question === uncited.question && item.action !== 'retry');
  if (uncited) tasks.push({id: 'answer-question', title: '자사 출처가 없는 질문에 직접 답변 보완',
    evidence: `“${uncited.question}”의 검색·출처 판정은 완료됐지만 자사 출처를 확인하지 못했습니다.`,
    nextStep: action?.nextStep || `사이트 내 관련 페이지를 먼저 찾고 “${uncited.question}”의 직접 답변·적용 조건·확인 가능한 근거를 보완하세요.`,
    completion: '관련 페이지의 위치와 답변·적용 조건·근거·업데이트 날짜를 확인',
    targetUrl: action?.targetUrl && safeHttpUrl(action.targetUrl) ? action.targetUrl : undefined});
  if (measured.length > 0 && report.discoverability?.priorityActions?.[0]) tasks.push({id: 'page-readiness',
    title: '페이지 준비도에서 확인한 첫 과제 실행', evidence: '입력한 페이지의 구조·콘텐츠 준비도 진단에서 제안한 과제입니다.',
    nextStep: report.discoverability.priorityActions[0], completion: '해당 변경을 반영한 페이지와 실제 표시 내용을 확인',
    targetUrl: safeHttpUrl(report.url) || undefined});
  if (failed.length > 0 || measured.length === 0) {
    const engines = [...new Set(failed.map(row => row.engine === 'chatgpt' ? 'OpenAI' : 'Gemini'))];
    const retry = {id: 'restore-measurement', title: '실패·미확인 관측을 복구하고 다시 확인',
      evidence: measured.length === 0 ? '출처 판정이 완료된 응답이 없어 콘텐츠의 인용 여부를 확정할 수 없습니다.'
        : `${engines.join('·')}에서 실패·검색 미확인 ${failed.length}건이 있습니다. 이 응답으로 인용 여부를 판단하지 않습니다.`,
      nextStep: '아래 엔진별 오류 안내에 따라 호출 상태를 확인한 후, 같은 질문으로 다시 측정하세요.',
      completion: '정상 답변과 검색 출처 판정이 가능한 응답을 확보'};
    if (measured.length === 0) tasks.unshift(retry); else tasks.splice(Math.min(2, tasks.length), 0, retry);
  }
  return {tasks: tasks.slice(0, 3), questions, measuredCount: measured.length};
}
