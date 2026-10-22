import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {ANSWER_CONTENT_TITLE,ANSWER_STATUS,answerQuestionText} from './answerContent';
export function buildAnswerContentDocument(report:MarketingReport):ReportBlock[]{
  const plan=report.answerContentPlan;if(!plan)return [];
  const blocks:ReportBlock[]=[{kind:'heading',text:ANSWER_CONTENT_TITLE},{kind:'body',text:plan.notice},{kind:'body',text:`분석 범위: 입력 페이지 · 실제 네이버 노출: 미측정 · ${plan.mode==='ai-assisted'?'페이지 맞춤 질문':plan.mode==='limited'?'제한된 내용으로 작성':'기본 질문 가이드'}`},{kind:'body',text:`분석 URL: ${plan.targetUrl}`,href:plan.targetUrl}];
  if(!plan.primaryKeyword){blocks.push({kind:'body',text:'대표 키워드를 판단할 페이지 내용이 부족합니다. 대표 상품·서비스가 있는 상세 페이지로 재진단해 주세요.'});return blocks;}
  for(const [index,k] of [plan.primaryKeyword,...plan.secondaryKeywords].entries()){
    blocks.push({kind:'subheading',text:`${index===0?'대표':'보조'} 키워드: ${k.term}`},{kind:'body',text:k.reason});
    for(const e of k.evidence)blocks.push({kind:'body',text:`${e.location}: ${e.text}`});
  }
  if(plan.topicScope==='mixed')blocks.push({kind:'body',text:'여러 주제가 섞여 있습니다. 선택한 대표 키워드는 이 페이지의 후보이며, 상품·서비스별 상세 페이지에서도 확인하세요.'});
  for(const [i,q] of plan.questions.entries()){
    blocks.push({kind:'subheading',text:`추천 질문 ${i+1} · ${ANSWER_STATUS[q.status]}`},{kind:'body',text:answerQuestionText(q)},{kind:'body',text:`수정 위치 제안: ${q.placement}`});
    if(q.draft&&q.missingFacts.length)blocks.push({kind:'body',text:`추가 작성 형식 (대괄호 확인 후 사용): ${q.template}`});
    for(const e of q.evidence)blocks.push({kind:'body',text:`원문 위치: ${e.location}${e.selector?` · ${e.selector}`:''}`});
    q.steps.forEach((s,j)=>blocks.push({kind:'body',text:`${j+1}. ${s}`}));
  }
  return blocks;
}
