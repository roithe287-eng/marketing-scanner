"use client";
import { useState } from 'react';
import { AD_BUDGET_NOTE, calculateAdBudget } from '@/lib/adBudgetScenario';
const fields = [['spend', '동일 기간 광고비 (원)'], ['conversions', '동일 기간 전환 수 (건)'], ['targetCpa', '직접 정한 목표 CPA (원)']] as const;
const money = (value: number | null) => value === null ? '입력 후 계산' : `${Math.round(value).toLocaleString('ko-KR')}원`;
export default function AdWasteCalculator() {
    const [input, setInput] = useState({ spend: '', conversions: '', targetCpa: '' });
    const result = calculateAdBudget(input);
    return <section className="report-simulation jm-card p-5 md:p-7">
  <h3 className="text-xl md:text-2xl font-extrabold">내 실적과 목표 CPA로 확인하는 예산 시나리오</h3>
  <p className="mt-3 text-base leading-7">{AD_BUDGET_NOTE}</p>
  <div className="grid gap-4 md:grid-cols-3 mt-5">{fields.map(([key, label]) => <label key={key} className="min-w-0 font-bold">{label}<input className="mt-2 w-full min-w-0 rounded-xl border p-3 text-base font-normal" type="number" min={key === 'targetCpa' ? 1 : 0} step={key === 'conversions' ? 1 : 'any'} inputMode="decimal" value={input[key]} onChange={e => setInput(prev => ({ ...prev, [key]: e.target.value }))}/></label>)}</div>
  {!!result.errors.length && <p role="alert" className="mt-3 text-red-700">{result.errors.join(' ')}</p>}
  {result.values.conversions === 0 && !result.errors.length && <p className="mt-3">전환이 0건이면 CPA와 예산 차이를 계산할 수 없습니다.</p>}
  <dl className="grid gap-3 md:grid-cols-3 mt-5" aria-live="polite">{[['입력 실적 기준 CPA', money(result.cpa)], ['같은 전환 수의 목표 예산', money(result.targetSpend)], ['현재 광고비 − 목표 예산', money(result.difference)]].map(([label, value], i) => <div key={label} className={`min-w-0 rounded-2xl p-4 ${i === 0 ? 'bg-sky-50' : i === 1 ? 'bg-violet-50' : 'bg-lime-50'}`}><dt className="text-sm font-bold leading-6">{label}</dt><dd className="mt-2 text-2xl font-extrabold break-all">{value}</dd></div>)}</dl>
  <details className="mt-5"><summary className="font-bold cursor-pointer">계산식과 해석 범위</summary><div className="mt-3 space-y-2 text-base leading-7"><p>CPA = 광고비 ÷ 전환 수. 목표 예산 = 직접 정한 목표 CPA × 현재 전환 수.</p><p>차이가 양수면 목표 조건에서 필요한 예산이 작고, 음수면 더 큽니다. 같은 전환 수 유지와 목표 CPA 달성을 가정한 산술값이며, 개선 작업이 이 차이를 실현한다는 예측이 아닙니다.</p><p>목표 CPA의 실현 가능성은 실제 캠페인 실험으로 확인하세요. 입력값은 화면에만 유지되며 공유·PDF에는 저장되지 않습니다.</p></div></details>
 </section>;
}
