import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildReportInsights} from './reportInsights';
import {buildPageEdits} from './reportExecution';
import {buildGrowthPlan} from './growthPlan';
import {buildKeywordRewrites} from './keywordRewrite';
import {buildCompetitorPositioning,positioningActions} from './competitorPositioning';
import {buildSiteGuide,editingPlatform,growthGuideTopic,type GuideRequest} from './siteGuidebook';
import {GUIDE_REVIEWED_AT,GUIDE_SOURCES} from './guideKnowledge';

export function guidebookRequests(report:MarketingReport):GuideRequest[]{
 const keywords=buildKeywordRewrites(report.keywordFrequency,report.meta),competition=buildCompetitorPositioning(report);
 const requests:GuideRequest[]=[
  ...buildPageEdits(report).map(e=>({title:e.label,current:e.before,proposal:e.after,topic:e.id==='hero'?'heading' as const:e.id==='title'?'title' as const:e.id==='description'?'description' as const:'cta' as const})),
  ...buildReportInsights(report).tasks.map(t=>({title:t.title,scope:t.guideScope,instructions:t.instructions,completion:t.completion,current:t.current,evidence:t.evidence,proposal:t.action})),
  ...buildGrowthPlan(report).tasks.map(t=>({title:t.title,evidence:t.evidence,instructions:t.steps,proposal:t.toBe,topic:growthGuideTopic(t.id)})),
  ...report.criticalIssues.map(t=>({title:t.title,current:t.badExample,evidence:t.problem,proposal:t.goodExample||t.recommendation})),
  ...(report.quickWinsDetailed||[]).map(t=>({title:t.title,current:t.beforeExample,instructions:t.steps,proposal:t.afterExample||t.steps.join('\n')})),
  {title:'메인 헤드라인',current:report.exampleCopy.currentHeroHeadline,proposal:report.exampleCopy.heroHeadline},{title:'서브 헤드라인',proposal:report.exampleCopy.subHeadline},{title:'CTA 버튼 문구',current:report.exampleCopy.currentCtaText,proposal:report.exampleCopy.ctaText},
  ...[...keywords.singles,...keywords.phrases].map(t=>({title:`반복 표현 · ${t.item.keyword}`,keyword:t.item.keyword,proposal:t.template,topic:t.kind==='배치'?'title' as const:'content' as const})),
  ...(competition?positioningActions(competition.own).map(t=>({title:t.title,proposal:t.template})):[]),
 ];
 const seen=new Set<string>();return requests.filter(r=>{const k=JSON.stringify(r);if(seen.has(k))return false;seen.add(k);return true;});
}
export function buildSiteGuidebookDocument(report:MarketingReport):ReportBlock[]{
 const blocks:ReportBlock[]=[{kind:'heading',text:'URL 맞춤 편집 가이드북 · 위치·기대효과·검증'},
 {kind:'body',text:`제작 도구: ${editingPlatform(report).label} · 공식 문서 검토 ${GUIDE_REVIEWED_AT}`},
 {kind:'body',text:'공개 HTML의 원문과 문서 순서를 연결합니다. 브라우저 화면 캡처·관리자 화면·화면 좌표는 수집하지 않았습니다. 공식 문서는 작동 원리를 뒷받침하며 해당 사이트의 순위·매출·문의 상승을 실증하거나 보장하지 않습니다.'}];
 for(const [i,r] of guidebookRequests(report).entries()){
  const g=buildSiteGuide(report,r),add=(text:string)=>blocks.push({kind:'body',text});
  blocks.push({kind:'subheading',text:`${i+1}. ${g.title}`});add(`대상: ${g.url||report.url}`);add(`기대효과 · 조건부: ${g.effect.expected}`);add(`효과 한계: ${g.effect.limit}`);
  add(`편집 경로: ${g.route.path.join(' → ')}`);add(g.route.scope);add(g.route.instruction);
  add(`위치 연결: ${g.matchLabel} · ${g.matchReason}`);add(`선택한 위치: ${g.location}`);
  for(const field of g.fields){add(`수정 필드: ${field.label}`);add(`현재: ${field.before}`);add(`작업: ${field.action}`);add(`완료 조건: ${field.done}`);}
  for(const setting of g.settings){add(`설정 ${setting.name}: ${setting.value}`);add(`HTML 위치: ${setting.selector}`);}
  if(!g.targets.length&&!g.settings.length)add('일치하는 수집 요소 없음 · 실제 페이지에서 위치 확인 후 수정');
  if(g.targets.length>1)add(`연결 원문 ${g.targets.length}개 중 기본 표시 위치입니다. 다른 위치는 결과 화면의 원문 선택에서 확인하세요.`);
  for(const e of g.focus?[g.focus]:[]){add(`수집 ${e.tag} · HTML 순서 ${e.order}${e.truncated?' · 일부 발췌':''}: ${e.text}`);add(`위치 선택자: ${e.selector}`);}
  for(const s of g.steps)add(`${s.title}: ${s.detail}`);
  add(`TO-BE · 사실 확인 후 사용: ${g.proposal||'원래 작업 지시 참조'}`);add(`공식 근거의 원리: ${g.effect.mechanism}`);add(`확인 지표: ${g.effect.metric}`);
  for(const id of new Set([...g.effect.sources,...g.route.sources]))blocks.push({kind:'body',text:GUIDE_SOURCES[id].title,href:GUIDE_SOURCES[id].url});
 }
 return blocks;
}
