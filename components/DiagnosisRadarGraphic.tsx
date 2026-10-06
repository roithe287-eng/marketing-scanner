import React,{useId} from 'react';
import {diagnosisAxes, radarPoint} from '@/lib/diagnosisVisuals';

type Props = {
  scores: readonly number[];
  selected: number;
  example?: boolean;
  previousScores?:readonly number[];
};
const labels = [[220,18],[350,62],[405,172],[350,282],[220,326],[90,282],[35,172],[90,62]];

/** The same geometry and palette connect the landing preview and actual report. */
export default function DiagnosisRadarGraphic({scores,selected,example=false,previousScores}:Props) {
  const clipId=useId();
  const values = diagnosisAxes.map((_,i)=>Math.max(0,Math.min(100,scores[i]??0)));
  const average = Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
  const active = diagnosisAxes[selected]??diagnosisAxes[0];
  const point = (index:number,value:number)=>radarPoint(index,value,220,172,132);
  const polygon = (level?:number)=>values.map((value,i)=>{
    const p=point(i,level??value);return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
  const direction=Math.max(0,Math.min(7,selected));
  const tip=point(direction,91),base=point(direction,77),tail=point(direction,32);
  const angle=direction*Math.PI/4-Math.PI/2;
  const wing=(offset:number)=>`${base.x+Math.cos(angle+Math.PI/2)*offset},${base.y+Math.sin(angle+Math.PI/2)*offset}`;
  return <svg className="diagnosis-radar-graphic" viewBox="0 0 440 344" role="img" aria-label={`8방향 레이더 차트 · 8개 영역 진단 ${example?'예시':'결과'}. 평균 ${average}점. ${diagnosisAxes.map((a,i)=>`${a.label} ${previousScores?`이전 ${previousScores[i]}점, 현재 `:''}${values[i]}점`).join(', ')}. 바깥쪽이 100점입니다.`}>
    <defs><clipPath id={clipId}><polygon points={polygon(100)}/></clipPath></defs>
    <polygon data-radar-boundary points={polygon(100)} fill="#edf3ff"/>
    {[25,50,75,100].map(level=><polygon key={level} points={polygon(level)} fill="none" stroke="#b7c8e5" strokeWidth="1"/>)}
    {diagnosisAxes.map((a,i)=>{const p=point(i,100);return <line key={a.key} x1="220" y1="172" x2={p.x} y2={p.y} stroke="#c4d2e8"/>;})}

    {previousScores&&<polygon points={diagnosisAxes.map((_,i)=>{const p=point(i,Math.max(0,Math.min(100,previousScores[i]??0)));return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;}).join(' ')} fill="#a859b4" fillOpacity=".08" stroke="#9750a2" strokeWidth="3" strokeDasharray="6 5" strokeLinejoin="round"/>}
    <polygon points={polygon()} fill="#1745d1" fillOpacity=".22" stroke="#1745d1" strokeWidth="3" strokeLinejoin="round"/>
    <g data-radar-arrow clipPath={`url(#${clipId})`} opacity=".85" aria-hidden="true">
      <line x1={tail.x} y1={tail.y} x2={base.x} y2={base.y} stroke={active.color} strokeWidth="3" strokeLinecap="round"/>
      <polygon points={`${tip.x},${tip.y} ${wing(6)} ${wing(-6)}`} fill={active.color}/>
    </g>
    {diagnosisAxes.map((a,i)=>{const p=point(i,values[i]),[x,y]=labels[i];return <g key={a.key}>
      <circle cx={p.x} cy={p.y} r={i===selected?7:5} fill={a.color} stroke="white" strokeWidth="2"/>
      <rect className="diagnosis-radar-label-box" x={x-32} y={y-12} width="64" height="24" rx="8" fill={a.surface} stroke={i===selected?a.color:'transparent'} strokeWidth="2"/>
      <text className="diagnosis-radar-label" x={x} y={y} dominantBaseline="central" textAnchor="middle" fill={a.color} fontSize="16" fontWeight="750">{a.short}</text>
    </g>;})}
    <circle cx="220" cy="172" r="31" fill="white" stroke="#cedaef"/>
    <text className="diagnosis-radar-average" x="220" y="168" textAnchor="middle" fontSize="25" fontWeight="850" fill="#192a4d">{average}</text>
    <text className="diagnosis-radar-average-note" x="220" y="187" textAnchor="middle" fontSize="11" fontWeight="650" fill="#526078">{example?'평균 · 예시':'평균'}</text>
  </svg>;
}
