import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {safeHttpUrl} from './citationMeasurement';
import {buildHospitalPlaceReview,PLACE_TITLE,PLACE_RULE,PLACE_ROLLOUT,PLACE_EXCLUSIONS} from './hospitalPlace';
import {comparisonTitle,comparisonScope} from './clinicPlaceInsights';
import {ANSWER_CONTENT_TITLE,ANSWER_STATUS,answerQuestionText} from './answerContent';
export function buildAnswerContentDocument(report:MarketingReport,opportunityFirst=false):ReportBlock[]{
  const place=buildHospitalPlaceReview(report.siteDiagnostics);
  const placeBlocks:ReportBlock[]=place?[
    {kind:'subheading',text:PLACE_TITLE+' · 등록 상태는 관리 화면에서 확인'},
    {kind:'body',text:'홈페이지에서 확인한 병의원 · '+place.profile.name,href:place.page.url},
    {kind:'body',text:PLACE_RULE+' '+PLACE_ROLLOUT},
    ...(place.coverage==='sample'?place.groups.map(g=>({kind:'body' as const,text:'홈페이지 후보 · '+g.category+' · '+(g.terms.map(t=>t.term+(t.basis==='context'?' (문맥 확인)':'')).join(', ')||'표본에서 미확인')})):
      [{kind:'body' as const,text:'공개 키워드 표본을 확인하려면 같은 URL로 다시 진단하세요.'}]),
    {kind:'body',text:place.link?(place.link.kind==='place'?'홈페이지의 플레이스 링크':'네이버 단축 링크 · 목적지 확인'):'홈페이지의 플레이스 링크 미확인',href:place.link?.url},
    {kind:'body',text:PLACE_EXCLUSIONS},
    {kind:'subheading',text:comparisonTitle},
    {kind:'body',text:'우리 홈페이지 메타 설명 · '+(place.page.description||'표본에서 미확인')},
    {kind:'body',text:place.page.media?'홈페이지 HTML 표본 · 이미지 '+place.page.media.images+'개 / 설명 있는 이미지 '+place.page.media.described+'개 / 영상 요소 '+place.page.media.videos+'개':'홈페이지 미디어 · 미측정'},
    {kind:'body',text:comparisonScope+' 화면에서 직접 입력한 일반 결과와 비교 내용은 해당 화면에서 확인하세요.'}
  ]:[];
  const plan=report.answerContentPlan;if(!plan)return placeBlocks;
  const scope:ReportBlock[]=[{kind:'body',text:plan.notice},{kind:'body',text:`분석 범위: ${plan.scope==='submitted-page-and-business'?'입력 페이지·자사 상세·이용안내':plan.scope==='submitted-page-and-products'?'입력 페이지·자사 상품 표본':'입력 페이지'} · 실제 네이버 노출: 미측정 · ${plan.mode==='ai-assisted'?'페이지 맞춤 질문':plan.mode==='limited'?'제한된 내용으로 작성':'기본 질문 가이드'}`},{kind:'body',text:`분석 URL: ${plan.targetUrl}`,href:plan.targetUrl}];
  const blocks:ReportBlock[]=[...placeBlocks,{kind:'heading',text:ANSWER_CONTENT_TITLE},...(opportunityFirst?[{kind:'body' as const,text:'대표 주제에서 고객의 질문을 고르고, 홈페이지에서 답할 내용을 구체화하세요.'}]:scope)];
  if(!plan.primaryKeyword){blocks.push({kind:'body',text:'대표 키워드를 판단할 페이지 내용이 부족합니다. 대표 상품·서비스가 있는 상세 페이지로 재진단해 주세요.'});if(opportunityFirst)blocks.push(...scope);return blocks;}
  for(const [index,k] of [plan.primaryKeyword,...plan.secondaryKeywords].entries()){
    blocks.push({kind:'subheading',text:`${index===0?'대표':'보조'} 키워드: ${k.term}`},{kind:'body',text:k.reason});
    for(const e of k.evidence)blocks.push({kind:'body',text:`${e.location}: ${e.text}`,href:safeHttpUrl(e.url??plan.targetUrl)||undefined});
  }
  if(plan.topicScope==='mixed')blocks.push({kind:'body',text:'여러 주제가 섞여 있습니다. 선택한 대표 키워드는 이 페이지의 후보이며, 상품·서비스별 상세 페이지에서도 확인하세요.'});
  for(const [i,q] of plan.questions.entries()){
    blocks.push({kind:'subheading',text:`추천 질문 ${i+1} · ${ANSWER_STATUS[q.status]}`},{kind:'body',text:answerQuestionText(q)},{kind:'body',text:`수정 위치 제안: ${q.placement}`});
    if(q.draft&&q.missingFacts.length&&!q.explanation)blocks.push({kind:'body',text:`추가 작성 형식 (대괄호 확인 후 사용): ${q.template}`});
    for(const e of q.evidence)blocks.push({kind:'body',text:`원문 위치: ${e.location}${e.selector?` · ${e.selector}`:''}`,href:safeHttpUrl(e.url??plan.targetUrl)||undefined});
    q.steps.forEach((s,j)=>blocks.push({kind:'body',text:`${j+1}. ${s}`}));
  }
  if(opportunityFirst)blocks.push({kind:'subheading',text:'질문 구성 방식과 확인 범위'},...scope);
  return blocks;
}
