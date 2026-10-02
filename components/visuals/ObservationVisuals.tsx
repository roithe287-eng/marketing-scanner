"use client";
import React,{useState} from 'react';
import type {LlmCitationTest} from '@/lib/reportSchema';
import {buildObservationVisual,engineNames,engines,observationStates} from '@/lib/reportVisuals';

export function MetricRing({value,label,numerator,denominator,color='#087f72'}:{value:number|null;label:string;numerator:number;denominator:number;color?:string}) {
  return <div className="flex min-w-0 items-center gap-4 rounded-2xl border bg-white p-4">
    <div className="relative h-24 w-24 shrink-0"><svg viewBox="0 0 100 100" aria-hidden="true" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r="41" fill="none" stroke="#edf0f4" strokeWidth="8"/>{value!==null&&<circle cx="50" cy="50" r="41" fill="none" stroke={color} strokeWidth="8" pathLength="100" strokeDasharray={`${value} 100`}/>}</svg><span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums">{value===null?'—':`${value}%`}</span></div>
    <div className="min-w-0"><p className="text-sm font-bold">{label}</p><p className="mt-2 text-xs leading-6 text-jm-gray">{denominator?`${denominator}건 중 ${numerator}건`:'판정 가능한 관측 없음'}</p></div>
  </div>;
}
export function ObservationOverview({citation}:{citation:LlmCitationTest}) {
  const data=buildObservationVisual(citation);if(!data)return null;
  return <div aria-label="GEO 관측 요약 차트" className="my-5 rounded-2xl bg-slate-50 p-4 md:p-5">
    <div className="grid gap-3 md:grid-cols-2"><MetricRing label="브랜드 언급률" value={data.mentionRate} numerator={data.mentionCount} denominator={data.mentionTotal} color="#3564a7"/><MetricRing label="자사 출처 인용률" value={data.citationRate} numerator={data.sourceCount} denominator={data.sourceTotal}/></div>
    <h4 className="mt-5 text-sm font-bold">엔진별 관측 상태 <span className="font-normal text-jm-gray">· 총 {data.total}건</span></h4>
    <div className="mt-3 space-y-4">{data.distributions.map(d=><div key={d.engine}><div className="mb-2 flex items-center justify-between text-xs"><strong>{engineNames[d.engine]}</strong><span>{d.total}건</span></div><div className="flex h-4 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">{Object.entries(d.counts).map(([key,count])=><div key={key} style={{width:`${d.total?100*count/d.total:0}%`,background:observationStates[key as keyof typeof d.counts].color}}/>)}</div><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5">{Object.entries(d.counts).filter(([,count])=>count>0).map(([key,count])=><span key={key} style={{color:observationStates[key as keyof typeof d.counts].color}}>{observationStates[key as keyof typeof d.counts].symbol} {observationStates[key as keyof typeof d.counts].label} {count}건</span>)}{!d.total&&<span>관측 없음</span>}</p></div>)}</div>
    <p className="mt-4 text-xs leading-6 text-jm-gray">막대는 측정 상태의 구성입니다. 실패·판정 불가를 인용률의 0점으로 처리하지 않습니다.</p>
  </div>;
}
const filters=[['all','전체 질문'],['cited','인용 확인 포함'],['uncited','미인용 포함'],['unknown','판정 불가 포함']] as const;
export function QuestionMatrix({citation,selected,onSelect}:{citation:LlmCitationTest;selected:string|null;onSelect:(question:string|null)=>void}) {
  const [filter,setFilter]=useState<string>('all');
  const data=buildObservationVisual(citation);if(!data)return null;
  const questions=data.questions.filter(q=>filter==='all'||Object.values(q.cells).some(c=>filter==='unknown'?['failed','unverified','missing','duplicate'].includes(c.state):c.state===filter));
  return <div aria-label="질문별 AI 관측 지도">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="text-lg font-black">질문별 AI 관측 지도</h4><p className="mt-1 text-xs leading-6 text-jm-gray">질문을 선택하면 아래에서 답변과 출처를 확인할 수 있습니다.</p></div><p role="status" className="text-xs text-jm-gray">{questions.length} / {data.questions.length}개 질문</p></div>
    <div className="my-3 flex flex-wrap gap-2" role="group" aria-label="질문 상태 필터">{filters.map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>{setFilter(key);onSelect(null);}} className={`rounded-full border px-3 py-2 text-xs font-bold ${filter===key?'border-slate-900 bg-slate-900 text-white':'bg-white text-slate-600'}`}>{label}</button>)}</div>
    <div className="space-y-2">{questions.map(q=><button key={q.question} type="button" aria-pressed={selected===q.question} onClick={()=>onSelect(q.question)} className={`grid w-full gap-3 rounded-xl border p-4 text-left md:grid-cols-[minmax(0,1fr)_260px] ${selected===q.question?'border-blue-600 bg-blue-50/50':'bg-white hover:bg-slate-50'}`}>
      <span className="min-w-0"><span className="mb-1 block text-xs font-bold text-jm-gray">Q{q.id} · {q.journey}</span><span className="block break-words text-sm font-semibold leading-6">{q.question}</span></span>
      <span className="grid grid-cols-2 gap-2">{engines.map(engine=>{const cell=q.cells[engine],state=observationStates[cell.state];return <span key={engine} className="rounded-lg px-3 py-2" style={{background:state.background,color:state.color}}><span className="block text-xs font-bold">{engineNames[engine]}</span><span className="mt-1 block text-xs font-bold">{state.symbol} {state.label}</span><span className="mt-1 block text-[11px]">브랜드 {cell.mentioned===null?'미확인':cell.mentioned?'언급 있음':'언급 없음'}</span></span>;})}</span>
    </button>)}</div>
    {!questions.length&&<p className="rounded-xl border border-dashed p-5 text-sm text-jm-gray">이 조건에 해당하는 질문이 없습니다. 전체 질문에서 다른 관측을 확인하세요.</p>}
  </div>;
}
