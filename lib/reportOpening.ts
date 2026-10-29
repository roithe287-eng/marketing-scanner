import type {MarketingReport} from './reportSchema';
import {isNonCommerce} from './websitePurpose';

/** A reading order for non-commerce reports; observations and scores stay intact. */
export function nonCommerceOpening(report:MarketingReport){
  const purpose=report.sitePurpose;
  if(!purpose||!isNonCommerce(purpose))return null;
  const topic=report.answerContentPlan?.primaryKeyword?.term||report.meta?.siteName||report.meta?.domain||purpose.label;
  const goal=purpose.goal.key==='unknown'?'다음 행동':purpose.goal.label;
  return {topic,goal,purpose:purpose.sector?.label||purpose.label,questions:report.answerContentPlan?.questions||[],
    summary:`${topic} 관련 고객 질문과 ${goal}에 필요한 정보를 중심으로, ${purpose.sector?purpose.sector.label+' 업종에 맞는 ':''}검색·AI 콘텐츠 개선 방향을 정리했습니다.`};
}
