import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildGrowthPlan,GROWTH_STATUS} from './growthPlan';
import {GROWTH_TITLE,GROWTH_SCOPE,GROWTH_CONCEPTS,GROWTH_MEASUREMENT,GROWTH_SOURCES,GROWTH_UPDATES} from './growthKnowledge';
export function buildGrowthDocument(report:MarketingReport):ReportBlock[] {
  const plan=buildGrowthPlan(report),b:ReportBlock[]=[{kind:'heading',text:'SEO · GEO · AEO 실행 및 KPI 가이드'},{kind:'body',text:GROWTH_TITLE},{kind:'body',text:GROWTH_SCOPE},{kind:'body',text:`공식 문서 확인 ${plan.reviewedAt} · 기술 원본 ${plan.hasTechnicalEvidence?'저장됨':'미관측 · 재진단 또는 담당자 확인'}`}];
  for(const c of GROWTH_CONCEPTS)b.push({kind:'subheading',text:`${c.id} · ${c.title}`},{kind:'body',text:c.text},{kind:'body',text:`확인할 지표: ${c.metric}`});
  for(const [i,t] of plan.tasks.entries()) {
    b.push({kind:'subheading',text:`${i+1}. ${t.title}`},{kind:'body',text:`${t.areas.join(' / ')} · ${t.channel} · ${GROWTH_STATUS[t.status]} · ${t.owner}`},{kind:'body',text:`현재 근거: ${t.evidence}`},{kind:'body',text:`수정 위치: ${t.location}`});
    t.steps.forEach((step,n)=>b.push({kind:'body',text:`${n+1}) ${step}`}));
    b.push({kind:'body',text:`TO-BE · 적용 목표 / 작성 틀: ${t.toBe}`},{kind:'body',text:`기대하는 변화: ${t.change}`},{kind:'body',text:`확인 KPI: ${t.kpi}`},{kind:'body',text:`완료 확인: ${t.verify}`});
    t.sources.forEach(id=>b.push({kind:'body',text:`공식 근거: ${GROWTH_SOURCES[id].title}`,href:GROWTH_SOURCES[id].url}));
  }
  b.push({kind:'heading',text:'숫자 3개로 계산하는 목표'},{kind:'body',text:'현재 전체 횟수와 완료 횟수, 목표 완료 횟수를 입력합니다. 현재 완료 비율이 유지된다고 가정할 때 필요한 전체 횟수 = 목표 완료 횟수 ÷ (현재 완료 횟수 ÷ 현재 전체 횟수)이며 올림하여 표시합니다. 문의·구매는 방문 세션, 검색 클릭은 검색 노출을 기준으로 각각 계산합니다. 완료가 0회이거나 수치가 없으면 필요한 횟수를 추정하지 않습니다.'},{kind:'body',text:'목표 조건을 충족했을 때의 산술 계산이며 개선 효과 예측이 아닙니다. 계정 실적은 미연동이며 화면에 직접 입력한 값은 공유 보고서·PDF에 저장하지 않습니다. 화면에서 계산 내용을 복사해 별도로 보관하세요.'});
  for(const m of GROWTH_MEASUREMENT)b.push({kind:'subheading',text:m.title},{kind:'body',text:m.where},{kind:'body',text:`지표: ${m.metric}`},{kind:'body',text:m.note},{kind:'body',text:'공식 측정 가이드',href:GROWTH_SOURCES[m.source].url});
  for(const u of GROWTH_UPDATES)b.push({kind:'subheading',text:u.title},{kind:'body',text:u.text},{kind:'body',text:'공식 변경 근거',href:GROWTH_SOURCES[u.source].url});
  return b;
}
