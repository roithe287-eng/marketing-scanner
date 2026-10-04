"use client";
import React,{useState,type CSSProperties} from 'react';
import DiagnosisIcon from './report/DiagnosisIcon';
import type {MarketingReport} from '@/lib/reportSchema';
import {diagnosisScores,radarPoint,scoreGrade} from '@/lib/diagnosisVisuals';
export default function ScoreRadar({diagnosis}:{diagnosis:MarketingReport['diagnosis']}) {
  const scores=diagnosisScores(diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  const [selected,setSelected]=useState<string>(ordered[0].key);
  const current=scores.find(s=>s.key===selected)||ordered[0];
  const selectedIndex=scores.findIndex(s=>s.key===current.key);
  const selectedPoint=radarPoint(selectedIndex,current.score),selectedEdge=radarPoint(selectedIndex,100);
  const avg=Math.round(scores.reduce((sum,s)=>sum+s.score,0)/8);
  const points=(level?:number)=>scores.map((s,i)=>{const p=radarPoint(i,level??s.score);return `${p.x},${p.y}`;}).join(' ');
  return <section className="report-card report-radar" aria-label="8개 영역 진단 인포그래픽">
    <div className="report-card-heading"><p className="report-eyebrow">MARKETING DIAGNOSIS · 8 DIRECTIONS</p><h3>8개 영역을 한눈에, 개선 방향까지</h3><p className="report-note">영역 카드를 누르면 점수와 연결된 검토 가이드를 볼 수 있습니다. 평균은 8개 영역의 산술평균입니다.</p></div>
    <div className="report-radar-layout">
      <div className="report-radar-chart"><svg viewBox="0 0 500 500" role="img" aria-label={`8방향 레이더 차트, 평균 ${avg}점. ${scores.map(s=>`${s.label} ${s.score}점`).join(', ')}`}>
        <polygon points={points(100)} fill="#EDF3FE"/>
        {[20,40,60,80,100].map(n=><polygon key={n} points={points(n)} fill="none" stroke="#dfe4eb" strokeWidth="1"/>)}
        {scores.map((s,i)=>{const p=radarPoint(i,100);return <line key={s.key} x1="250" y1="250" x2={p.x} y2={p.y} stroke="#e1e5ea"/>;})}
        <line className="report-radar-beam" x1="250" y1="250" x2={selectedEdge.x} y2={selectedEdge.y} stroke={current.color} strokeWidth="12" opacity=".09"/>
        <polygon points={points()} fill="#1745D1" fillOpacity=".17" stroke="#1745D1" strokeWidth="2.5"/>
        <circle className="report-radar-halo" cx={selectedPoint.x} cy={selectedPoint.y} r="15" fill={current.color} opacity=".14"/>
        {scores.map((s,i)=>{const p=radarPoint(i,s.score),label=radarPoint(i,100,250,250,205);return <g key={s.key}><circle cx={p.x} cy={p.y} r={s.key===current.key?8:5} fill={s.key===current.key?s.color:'white'} stroke={s.color} strokeWidth="3"/><rect x={label.x-42} y={label.y-34} width="84" height="68" rx="10" fill={s.surface} stroke={s.key===current.key?s.color:'#e1e5ea'} strokeWidth={s.key===current.key?2:1}/><text x={label.x} y={label.y-11} className="report-radar-label" textAnchor="middle" fontSize="17" fill="#606875">{s.short}</text><text x={label.x} y={label.y+23} className="report-radar-value" textAnchor="middle" fontSize="21" fontWeight="800" fill={s.color}>{s.score}</text></g>;})}
        <circle cx="250" cy="250" r="37" fill="white" stroke="#dfe4eb"/><text x="250" y="253" textAnchor="middle" fontSize="26" fontWeight="800" fill="#202329">{avg}</text><text x="250" y="272" textAnchor="middle" fontSize="12" fill="#606875">평균</text>
      </svg><p className="report-note">차트의 바깥쪽이 100점입니다.</p></div>
      <div className="report-axis-grid" role="group" aria-label="진단 영역 선택">{scores.map(s=><button type="button" key={s.key} aria-pressed={current.key===s.key} onClick={()=>setSelected(s.key)} className="report-axis" style={{'--axis-color':s.color,'--axis-surface':s.surface} as CSSProperties}><span className="report-axis-icon" aria-hidden="true" style={{color:s.color}}><DiagnosisIcon axis={s.key}/></span><span className="report-axis-title">{s.label}</span><strong style={{color:s.color}}>{s.score}<small>/100</small></strong><span className="report-meter"><i style={{width:`${s.score}%`,background:s.color}}/></span><span className="report-axis-grade">{scoreGrade(s.score)}</span></button>)}</div>
    </div>
    <div className="report-axis-detail" style={{'--axis-color':current.color,'--axis-surface':current.surface} as CSSProperties} aria-live="polite"><div><span className="report-pill">선택한 영역 · {current.score}점</span><h4>{current.label}</h4></div><div key={current.key} className="report-guide-enter"><strong>검토 가이드</strong><p>{current.action}</p><span>완료 확인 · {current.check}</span></div></div>
    <div className="report-priority-heading"><h4>점수 기준 먼저 검토할 3개 영역</h4><span>동점은 표시 순서 기준</span></div>
    <ol className="report-priority-trio">{ordered.slice(0,3).map((s,i)=><li key={s.key}><span>0{i+1}</span><div><strong>{s.label} · {s.score}점</strong><p>{s.action}</p></div><button type="button" onClick={()=>setSelected(s.key)} aria-label={`${s.label} 개선 방향 보기`}>보기</button></li>)}</ol>
  </section>;
}
