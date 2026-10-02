"use client";
import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
export default function DiagnosisCard({issue,index}:{issue:MarketingReport['criticalIssues'][number];index:number}) {
  const labels={high:'긴급',medium:'중요',low:'보강'};
  return <article className="report-card"><div className="flex flex-wrap items-center gap-3"><span className="report-index">{String(index+1).padStart(2,'0')}</span><span className={`report-pill ${issue.priority==='high'?'danger':issue.priority==='medium'?'warning':''}`}>{labels[issue.priority]}</span><h3 className="text-lg font-bold">{issue.title}</h3></div><div className="mt-5 grid gap-5 md:grid-cols-3">{[['문제',issue.problem],['원인',issue.reason],['권장 조치',issue.recommendation]].map(([label,text])=><div key={label}><h4 className="mb-2 text-xs font-bold text-jm-gray">{label}</h4><p className="text-sm leading-7">{text}</p></div>)}</div>{(issue.badExample||issue.goodExample)&&<div className="report-two-grid mt-5 border-t pt-5">{issue.badExample&&<div><h4>현재 예시</h4><p className="report-note">{issue.badExample}</p></div>}{issue.goodExample&&<div><h4>개선 예시 · 적용 전 확인</h4><p className="text-sm leading-7">{issue.goodExample}</p></div>}</div>}{issue.exampleNote&&<p className="report-note mt-4">{issue.exampleNote}</p>}</article>;
}
