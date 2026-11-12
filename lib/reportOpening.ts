import type {MarketingReport} from './reportSchema';
import {isNonCommerce} from './websitePurpose';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import {providerIdentity} from './websiteIdentity';

/** A reading order for non-commerce reports; observations and scores stay intact. */
export function nonCommerceOpening(report:MarketingReport){
  const purpose=report.sitePurpose;
  if(!purpose||!isNonCommerce(purpose))return null;
  const topic=report.answerContentPlan?.primaryKeyword?.term||report.meta?.siteName||report.meta?.domain||purpose.label;
  const goal=purpose.goal.key==='unknown'?'다음 행동':purpose.goal.label;
  const place=report.siteDiagnostics?.pages.find(p=>p.url===report.siteDiagnostics?.targetUrl)?.localPlaceEvidence;
  const book=nonCommercePlaybook(purpose,providerIdentity(report.pageEvidence||{}),place);
  const label=book.local?book.label:purpose.sector?.label||purpose.business?.label||purpose.label;
  return {topic,goal,purpose:label,questions:report.answerContentPlan?.questions||[],
    summary:`${topic} 관련 고객 질문과 ${goal}에 필요한 정보를 중심으로, ${label} 업종에 맞는 검색·AI 콘텐츠 개선 방향을 정리했습니다.`};
}
