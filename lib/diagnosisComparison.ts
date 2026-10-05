import {DiagnosisBaselineSchema,type DiagnosisBaseline,type DiagnosisCheck,type MarketingReport} from './reportSchema';
import {canonicalPage} from './geoComparison';
import {growthPageEvidence} from './growthPlan';
import {diagnosisAxes} from './diagnosisVisuals';

export const DIAGNOSIS_METHOD='marketing-diagnosis-2026-10-v1';
export const DIAGNOSIS_COMPARISON_NOTE='같은 URL의 저장 결과를 비교합니다. 진단 점수는 AI 평가와 수집 범위에 따라 달라질 수 있으며 매출·노출 성과나 수정의 인과 효과가 아닙니다. 통과 전환도 실제 화면과 담당자 검토로 확인하세요.';
const normal=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
export function diagnosisChecks(report:MarketingReport):DiagnosisCheck[] {
 const rows:DiagnosisCheck[]=(report.checklist||[]).map(c=>({key:`check:${c.category}:${normal(c.label)}`,label:c.label,status:c.status,evidence:c.currentValue,source:'기본 체크리스트'}));
 const p=growthPageEvidence(report);
 if(p)for(const [key,label,value] of [['title','검색 제목 존재',p.title],['description','메타 설명 존재',p.description],['h1','H1 존재',p.h1.join('\n')]] as const)rows.push({key:`html:${key}`,label,status:value?'pass':'warning',evidence:value||'수집한 정적 HTML에서 미감지 · 렌더링 결과 확인 필요',source:'정적 HTML 수집'});
 if(report.naverOptimization?.mode==='diagnosis'&&canonicalPage(report.naverOptimization.targetUrl)===canonicalPage(report.url))for(const c of report.naverOptimization.checks)rows.push({key:`naver:${c.id}`,label:c.title,status:c.status==='observed'?'pass':c.status==='action'?'warning':'review',evidence:c.evidence,source:'네이버 관측'});
 for(const c of report.criticalIssues)rows.push({key:`issue:${normal(c.title)}`,label:c.title,status:c.priority==='high'?'fail':c.priority==='medium'?'warning':'review',evidence:c.problem,source:'핵심 이슈'});
 return rows;
}
export function createDiagnosisBaseline(report:MarketingReport,reportId:string):DiagnosisBaseline {
 const p=growthPageEvidence(report);
 return DiagnosisBaselineSchema.parse({version:1,reportId,url:report.url,finalUrl:p?.finalUrl,capturedAt:p?.capturedAt,method:report.diagnosisMethod,overallScore:report.overallScore,diagnosis:report.diagnosis,checks:diagnosisChecks(report)});
}
export const comparisonGroups=[{id:'resolved',label:'통과 전환',note:'동일 항목이 보완에서 통과로 변경'},{id:'kept',label:'보완 유지',note:'양쪽 결과에서 보완 필요'},{id:'new',label:'새로 보완',note:'현재 결과에서 새로 확인한 보완 항목'},{id:'unknown',label:'재확인 필요',note:'누락·중복·수동 확인 등으로 해결 판단 보류'}] as const;
export type DiagnosisChange=typeof comparisonGroups[number]['id'];
export function buildDiagnosisComparison(report:MarketingReport) {
 const baseline=report.diagnosisBaseline;if(!baseline)return null;
 const p=growthPageEvidence(report),target=canonicalPage(report.url);
 let blocked='';
 if(!target||target!==canonicalPage(baseline.url))blocked='서로 다른 URL입니다. 같은 페이지의 이전 보고서를 선택하세요.';
 else if(p?.finalUrl&&baseline.finalUrl&&canonicalPage(p.finalUrl)!==canonicalPage(baseline.finalUrl))blocked='리디렉션된 최종 URL이 다릅니다. 같은 페이지인지 확인한 후 비교하세요.';
 else if(p?.capturedAt&&baseline.capturedAt&&Date.parse(p.capturedAt)<=Date.parse(baseline.capturedAt))blocked='현재 결과가 기준 보고서보다 나중에 수집된 결과가 아닙니다. 새로 진단한 결과로 비교하세요.';
 const current=diagnosisChecks(report),index=(rows:DiagnosisCheck[])=>{const map=new Map<string,DiagnosisCheck[]>();for(const c of rows)map.set(c.key,[...(map.get(c.key)||[]),c]);return map;};
 const previous=index(baseline.checks),now=index(current);
 const items=[...new Set([...previous.keys(),...now.keys()])].flatMap(key=>{
   const old=previous.get(key)||[],next=now.get(key)||[],before=old[0],after=next[0];
   if(before?.status==='pass'&&after?.status==='pass'&&old.length===1&&next.length===1)return [];
   if(!before&&after?.status==='pass')return [];
   let group:DiagnosisChange='unknown';
   if(!blocked&&p?.capturedAt&&baseline.capturedAt&&old.length<=1&&next.length<=1&&before?.status!=='review'&&after?.status!=='review'){
     if((key.startsWith('check:')||key.startsWith('issue:'))&&report.diagnosisMethod&&baseline.method&&report.diagnosisMethod!==baseline.method)group='unknown';
     else if(before&&before.status!=='pass'&&after?.status==='pass')group='resolved';
     else if(before&&before.status!=='pass'&&after&&after.status!=='pass')group='kept';
     else if(after&&after.status!=='pass'&&(!before||before.status==='pass'))group='new';
   }
   return [{key,label:(after||before).label,before,after,group,reason:old.length>1||next.length>1?'동일 항목이 여러 번 저장되어 자동 비교 보류':!after?'현재 결과에서 빠졌으므로 해결 여부 미확인':group==='unknown'?'측정 조건·수동 확인 항목 대조 필요':''}];
 });
 return {baseline,blocked,items,axes:diagnosisAxes.map(a=>({...a,before:baseline.diagnosis[a.key],after:report.diagnosis[a.key],delta:report.diagnosis[a.key]-baseline.diagnosis[a.key]})),methodMatched:!!report.diagnosisMethod&&report.diagnosisMethod===baseline.method,timeKnown:!!p?.capturedAt&&!!baseline.capturedAt,currentTime:p?.capturedAt};
}
