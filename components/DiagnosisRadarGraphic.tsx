import React from 'react';
import {diagnosisAxes, radarPoint} from '@/lib/diagnosisVisuals';

type Props = {
  scores: readonly number[];
  selected: number;
  example?: boolean;
};
const labels = [[240,19],[363,63],[423,151],[363,239],[240,283],[117,239],[57,151],[117,63]];

/** The same geometry and palette connect the landing preview and actual report. */
export default function DiagnosisRadarGraphic({scores,selected,example=false}:Props) {
  const values = diagnosisAxes.map((_,i)=>Math.max(0,Math.min(100,scores[i]??0)));
  const average = Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
  const active = diagnosisAxes[selected]??diagnosisAxes[0];
  const point = (index:number,value:number)=>radarPoint(index,value,240,150,103);
  const polygon = (level?:number)=>values.map((value,i)=>{
    const p=point(i,level??value);return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');
  const edge=point(Math.max(0,Math.min(7,selected)),100);
  return <svg className="diagnosis-radar-graphic" viewBox="0 0 480 306" role="img" aria-label={`8방향 레이더 차트 · 8개 영역 진단 ${example?'예시':'결과'}. 평균 ${average}점. ${diagnosisAxes.map((a,i)=>`${a.label} ${values[i]}점`).join(', ')}. 바깥쪽이 100점입니다.`}>
    <polygon points={polygon(100)} fill="#edf3ff"/>
    {[25,50,75,100].map(level=><polygon key={level} points={polygon(level)} fill="none" stroke="#b7c8e5" strokeWidth="1"/>)}
    {diagnosisAxes.map((a,i)=>{const p=point(i,100);return <line key={a.key} x1="240" y1="150" x2={p.x} y2={p.y} stroke="#c4d2e8"/>;})}
    <line x1="240" y1="150" x2={edge.x} y2={edge.y} stroke={active.color} strokeWidth="20" opacity=".12"/>
    <polygon points={polygon()} fill="#1745d1" fillOpacity=".22" stroke="#1745d1" strokeWidth="3" strokeLinejoin="round"/>
    {diagnosisAxes.map((a,i)=>{const p=point(i,values[i]),[x,y]=labels[i];return <g key={a.key}>
      <circle cx={p.x} cy={p.y} r={i===selected?7:5} fill={a.color} stroke="white" strokeWidth="2"/>
      <rect x={x-43} y={y-15} width="86" height="30" rx="10" fill={a.surface} stroke={i===selected?a.color:'transparent'} strokeWidth="2"/>
      <text x={x} y={y+6} textAnchor="middle" fill={a.color} fontSize="18" fontWeight="750">{a.short}</text>
    </g>;})}
    <circle cx="240" cy="150" r="37" fill="white" stroke="#cedaef"/>
    <text className="diagnosis-radar-average" x="240" y="146" textAnchor="middle" fontSize="28" fontWeight="850" fill="#192a4d">{average}</text>
    <text className="diagnosis-radar-average-note" x="240" y="174" textAnchor="middle" fontSize="12" fontWeight="650" fill="#526078">{example?'평균 · 예시':'평균'}</text>
  </svg>;
}
