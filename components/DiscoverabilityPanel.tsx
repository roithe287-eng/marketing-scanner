"use client";
import {Guidebook} from './report/SiteGuidebook';
import React,{useState} from 'react';
import EvidenceFlow from './report/EvidenceFlow';
import type {Discoverability} from '@/lib/reportSchema';
import {readinessItems,readinessColors,readinessLabels} from '@/lib/reportVisuals';

export default function DiscoverabilityPanel({discoverability}:{discoverability?:Discoverability|null}) {
  const items=readinessItems(discoverability);
  const [selected,setSelected]=useState<string|null>(null);
  if(!discoverability)return null;
  const active=items.find(item=>item.key===selected)||[...items].sort((a,b)=>a.score-b.score)[0];
  return <section aria-label="GEO 준비도 점검판" className="jm-card report-readiness p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold text-jm-red">GEO READINESS</p><h3 className="mt-2 text-xl font-black md:text-2xl">GEO 준비도 점검판</h3><p className="mt-2 text-sm leading-6 text-jm-gray">입력 페이지의 8가지 준비도입니다. 항목을 누르면 현재 상태와 개선안을 볼 수 있습니다.</p></div><div className="rounded-2xl bg-slate-900 px-5 py-3 text-white"><span className="block text-xs">준비도 종합 점수</span><strong className="text-3xl tabular-nums">{discoverability.overallScore}</strong><span className="ml-1 text-xs">/ 100</span></div></div>
    <div className="report-readiness-grid mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{items.map(item=><button type="button" key={item.key} aria-pressed={active.key===item.key} onClick={()=>setSelected(item.key)} className={`min-w-0 rounded-2xl border p-4 text-left ${active.key===item.key?'border-slate-800 ring-1 ring-slate-800':'border-slate-200 hover:bg-slate-50'}`}>
      <span className="block min-h-10 break-words text-sm font-bold leading-5">{item.label}</span><span className="mt-3 flex items-baseline justify-between gap-1"><strong className="text-2xl tabular-nums">{item.score}</strong><span className="text-xs font-bold" style={{color:readinessColors[item.status]}}>{readinessLabels[item.status]}</span></span><span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full rounded-full" style={{width:`${item.score}%`,background:readinessColors[item.status]}}/></span>
    </button>)}</div>
    <div className="mt-4 flex flex-wrap gap-3 text-xs">{(['pass','warning','fail'] as const).map(status=><span key={status} style={{color:readinessColors[status]}}>● {readinessLabels[status]} {items.filter(i=>i.status===status).length}개</span>)}</div>
    <article className="mt-5 rounded-2xl bg-slate-50 p-5" aria-live="polite" aria-label="선택한 준비도 상세">
      <p className="text-xs font-bold text-jm-gray">선택한 점검 항목</p><h4 className="mt-2 text-lg font-black">{active.label} <span className="ml-2 text-sm font-normal">{active.score}점 · {readinessLabels[active.status]}</span></h4>
      <EvidenceFlow items={[{label:'현재',content:active.currentValue},{label:'진단',content:active.diagnosis},{label:'개선',content:active.guide}]}/>{active.status!=='pass'&&<Guidebook title={active.label} current={active.currentValue} evidence={active.diagnosis} proposal={active.guide}/>}
    </article>
    <details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-bold">종합 해석과 우선 실행 액션</summary><p className="mt-3 text-sm leading-7">{discoverability.summary}</p><ol className="mt-3 space-y-2">{discoverability.priorityActions?.map((a,i)=><li key={i} className="flex gap-3 text-sm leading-6"><span className="font-bold text-jm-red">{i+1}.</span><span>{a}</span></li>)}</ol></details>
    <p className="mt-4 text-xs leading-6 text-jm-gray">준비도는 페이지 콘텐츠·구조에 대한 진단입니다. AI 답변의 실제 인용률과는 다른 지표입니다.</p>
  </section>;
}
