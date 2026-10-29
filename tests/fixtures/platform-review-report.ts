import type {MarketingReport} from '../../lib/reportSchema';
import {serviceReviewReport} from './service-review-report';

/** Coherent, fictional editing example. The review route is disabled in production. */
export function platformReviewReport():MarketingReport{
 const report=serviceReviewReport(),page=report.pageEvidence!,plan=report.answerContentPlan!;
 const answer='상담 신청 후 목표와 준비 상황을 확인하고, 학교별 조건과 준비 서류를 검토합니다. 제출 전 일정과 지원 범위를 다시 확인합니다.';
 return {...report,exampleCopy:{heroHeadline:'목표에 맞는 어학연수와 진학 과정을 비교하세요',subHeadline:'국가별 지원 대상과 준비 서류를 확인하고 상담을 신청하세요.',ctaText:'유학 상담 신청',currentCtaText:'어학연수 상담'},pageEvidence:{...page,siteEditing:{...page.siteEditing!,signals:[{id:'imweb',kind:'cms',evidence:['가상 화면 검수용 제작 도구 단서']}]}},answerContentPlan:{...plan,primaryKeyword:{term:'어학연수',evidence:[{id:'t1',kind:'title',text:page.title,location:'제목'}],confidence:'high',reason:'가상 제목의 표현'},questions:[{id:'q1',question:'유학 상담은 어떤 순서로 진행되나요?',intent:'process',status:'supported',draft:answer,template:'[진행 단계]를 확인하세요.',evidence:[{id:'b1',kind:'body',text:answer,location:'가상 페이지 본문'}],missingFacts:[],placement:'프로그램 안내 다음',steps:[]},{id:'q2',question:'어학연수 비용에는 무엇이 포함되나요?',intent:'price',status:'not_observed',draft:'',template:'[포함 비용]과 [별도 비용]을 확인하세요.',evidence:[],missingFacts:['프로그램별 포함·별도 비용'],placement:'비용 안내 다음',steps:[]}]}};
}
