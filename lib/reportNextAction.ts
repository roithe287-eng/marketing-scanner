import type {KeywordRankItem,LlmCitationQuestionResult} from './reportSchema';
import type {ExecutionPlan} from './reportExecution';
import {observationCell} from './reportVisuals';

/** Short reading aids derived from existing states; never a new diagnosis or score. */
export function needsVerification(task:ExecutionPlan['tasks'][number]) {
  return task.status==='review'||task.owner==='verify'||task.guideScope==='account';
}

export function citationNextAction(rows:LlmCitationQuestionResult[]) {
  switch(observationCell(rows).state) {
    case 'cited':return '인용된 페이지의 답변과 이용 조건이 최신인지 확인하세요.';
    case 'uncited':return '관련 페이지의 답변·조건을 점검하고 같은 질문으로 다시 확인하세요.';
    case 'unavailable':return 'AI 연결 설정을 확인한 뒤 같은 질문으로 다시 관측하세요.';
    case 'failed':return '오류 안내에 따라 복구한 뒤 같은 질문으로 다시 관측하세요.';
    default:return '같은 질문의 답변·검색 상태를 다시 확인한 뒤 수정 여부를 정하세요.';
  }
}

export function keywordNextAction(item:KeywordRankItem,version?:number) {
  if(version!==2)return '새 기준으로 재진단한 뒤 검색어와 URL을 대조하세요.';
  switch(item.observationStatus) {
    case 'found':return '발견한 페이지의 제목·내용이 검색어와 맞는지 확인하세요.';
    case 'not_found':return '검색어·URL을 대조하고 서치어드바이저에서 수집·색인을 확인하세요.';
    case 'unavailable':return '검색 API 연결 설정을 확인한 뒤 다시 관측하세요.';
    default:return '정상 응답을 받은 뒤 페이지 수정 여부를 판단하세요.';
  }
}
