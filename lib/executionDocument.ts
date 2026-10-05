import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildExecutionPlan,buildPageEdits,workOwners,workZones} from './reportExecution';
import {buildDiagnosisComparison,comparisonGroups,DIAGNOSIS_COMPARISON_NOTE} from './diagnosisComparison';
import {comparisonTime} from './geoComparison';
export function buildExecutionDocument(report:MarketingReport):ReportBlock[] {
 const plan=buildExecutionPlan(report),blocks:ReportBlock[]=[{kind:'heading',text:'오늘 먼저 할 일 · 최대 3개'},{kind:'body',text:'기존 진단의 우선 보완 → 보완 → 내용 검토 순서에서 중복되는 점검 주제를 묶었습니다. 모든 근거는 담당별 실행 보드와 원래 진단에 유지됩니다.'}];
 for(const [i,t] of plan.first.entries())blocks.push({kind:'subheading',text:`${i+1}. ${t.title}`},{kind:'body',text:`문제: ${t.evidence}`},{kind:'body',text:`수정: ${t.action}`},{kind:'body',text:`관찰 KPI: ${t.kpi}`});
 if(!plan.first.length)blocks.push({kind:'body',text:'저장된 보완 항목이 없습니다. 실제 화면과 측정 상태를 함께 확인하세요.'});
 blocks.push({kind:'heading',text:'내 페이지 개선 전·후'},{kind:'body',text:'수집 원문과 제안·작성 틀을 비교합니다. 자동 적용된 내용이 아니며 담당자가 사실을 확인한 뒤 사용하세요.'});
 for(const e of buildPageEdits(report))blocks.push({kind:'subheading',text:e.label},{kind:'body',text:`수정 위치: ${e.location}`},{kind:'body',text:`원문 출처: ${e.source}`},{kind:'body',text:`현재: ${e.before||e.missing}`},{kind:'body',text:`제안·작성 틀: ${e.after||'저장된 제안 없음'}`},{kind:'body',text:`완료 확인: ${e.check}`});
 blocks.push({kind:'heading',text:'페이지 수정 위치 안내'},{kind:'body',text:'기존 보완 항목을 연결한 추천 구조도입니다. 실제 화면의 요소 좌표를 측정한 결과가 아닙니다.'});
 for(const zone of workZones){const tasks=plan.tasks.filter(t=>t.zone===zone.id);blocks.push({kind:'subheading',text:zone.label},{kind:'body',text:zone.hint},{kind:'body',text:`연결한 작업: ${tasks.map(t=>t.title).join(' / ')||'분류된 보완 항목 없음'}`},{kind:'body',text:`완료 확인: ${zone.check}`});}
 blocks.push({kind:'heading',text:'재진단 이전·현재 비교'},{kind:'body',text:DIAGNOSIS_COMPARISON_NOTE});
 const c=buildDiagnosisComparison(report);
 if(!c)blocks.push({kind:'body',text:'기준 보고서가 연결되지 않았습니다. 결과 보관 → 수정 → 같은 URL 재진단 → 이전 결과 연결 순서로 진행하세요.'});
 else if(c.blocked)blocks.push({kind:'body',text:c.blocked});
 else {
  blocks.push({kind:'body',text:`기준 보고서 ${c.baseline.reportId} · 이전 ${comparisonTime(c.baseline.capturedAt)} → 현재 ${comparisonTime(c.currentTime)}`});
  if(!c.methodMatched)blocks.push({kind:'body',text:'평가 기준·모델 기록이 없거나 달라 점수 차이는 참고용입니다.'});
  if(!c.timeKnown)blocks.push({kind:'body',text:'수집 시각이 없는 결과는 새 측정인지 확인할 수 없어 해결 판정을 보류합니다.'});
  for(const a of c.axes)blocks.push({kind:'body',text:`${a.label}: ${a.before} → ${a.after} (${a.delta>0?'+':''}${a.delta}점)`});
  for(const g of comparisonGroups){const items=c.items.filter(t=>t.group===g.id);blocks.push({kind:'subheading',text:`${g.label} · ${items.length}개`},{kind:'body',text:g.note});for(const item of items)blocks.push({kind:'subheading',text:item.label},{kind:'body',text:`이전: ${item.before?.evidence||'동일 항목 기록 없음'}`},{kind:'body',text:`현재: ${item.after?.evidence||'현재 결과에 없어 해결 여부 미확인'}`},{kind:'body',text:item.reason||'동일 항목의 저장 상태를 대조한 결과'});}
 }
 blocks.push({kind:'heading',text:'담당별 실행 보드'},{kind:'body',text:'담당과 수정 위치는 추천 분류입니다. 실제 수정 권한·업무 범위에 맞게 배정하세요.'});
 for(const owner of workOwners){const tasks=plan.tasks.filter(t=>t.owner===owner.id);blocks.push({kind:'subheading',text:`${owner.label} · ${tasks.length}개`});for(const t of tasks)blocks.push({kind:'subheading',text:t.title},{kind:'body',text:`진단 출처: ${t.source}`},{kind:'body',text:`근거: ${t.evidence}`},{kind:'body',text:`위치: ${t.location}`},{kind:'body',text:`실행: ${t.action}`},{kind:'body',text:`완료 확인: ${t.completion}`},{kind:'body',text:`관찰 KPI: ${t.kpi}`});}
 return blocks;
}
