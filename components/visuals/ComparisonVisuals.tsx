import React from 'react';
import {percentageChange} from '@/lib/reportVisuals';
export function PairedBars({label,before,after,count}:{label:string;before:number|null;after:number|null;count:number}) {
  return <div className="min-w-0 rounded-2xl border bg-slate-50/60 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold">{label}</h3><span className="text-xs font-bold text-slate-600">{percentageChange(before,after)}</span></div><p className="mt-1 text-xs text-jm-gray">동일한 {count}쌍 기준</p>
    <div className="mt-4 space-y-3">{([['이전',before,'#94a3b8'],['현재',after,'#3564a7']] as const).map(([name,value,color])=><div key={name} className="grid grid-cols-[30px_minmax(0,1fr)_62px] items-center gap-2 text-xs"><span>{name}</span><div className="h-3 rounded-full bg-slate-200" aria-hidden="true">{value!==null&&<div className="h-full rounded-full" style={{width:`${value}%`,background:color}}/>}</div><strong className="text-right tabular-nums">{value===null?'비교 불가':`${value}%`}</strong></div>)}</div><div className="ml-10 mr-[70px] mt-2 flex justify-between text-[10px] text-jm-gray" aria-hidden="true"><span>0</span><span>50</span><span>100%</span></div>
  </div>;
}
export function ComparisonCoverage({matched,excluded}:{matched:number;excluded:number}) {
  const total=matched+excluded;
  return <div className="min-w-0 rounded-2xl border p-4"><p className="text-sm font-bold">비교에 사용한 관측</p><p className="mt-3 text-lg font-black">{matched}쌍 비교 · {excluded}쌍 제외</p><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span style={{width:`${total?matched/total*100:0}%`,background:'#087f72'}}/><span style={{width:`${total?excluded/total*100:0}%`,background:'#e0b764'}}/></div><p className="mt-3 text-xs leading-6 text-jm-gray">전체 {total}쌍 중 조건이 같은 정상 관측만 사용합니다.</p></div>;
}
