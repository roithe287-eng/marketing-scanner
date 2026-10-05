"use client";
import React,{useId,useState,type CSSProperties} from 'react';
import DiagnosisIcon from './report/DiagnosisIcon';
import DiagnosisRadarGraphic from './DiagnosisRadarGraphic';
import type {MarketingReport} from '@/lib/reportSchema';
import {diagnosisScores,scoreGrade} from '@/lib/diagnosisVisuals';

export default function ScoreRadar({diagnosis}:{diagnosis:MarketingReport['diagnosis']}) {
  const scores=diagnosisScores(diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  const [selected,setSelected]=useState<string>(ordered[0].key);
  const current=scores.find(s=>s.key===selected)||ordered[0];
  const selectedIndex=scores.findIndex(s=>s.key===current.key);
  const detailId=useId();
  return <section className="report-card report-radar" aria-label="8개 영역 진단 인포그래픽">
    <div className="report-card-heading"><p className="report-eyebrow">YOUR MARKETING MAP · 8 DIRECTIONS</p><h3>강점과 빈틈, 다음 행동까지</h3><p className="report-note">8개 영역에서 현재 상태를 확인하세요. 아래 카드를 누르면 해당 영역의 개선 방향과 완료 기준이 바뀝니다.</p></div>
    <div className="report-radar-layout">
      <div className="report-radar-chart"><div className="report-radar-chart-heading"><strong>우리 사이트의 진단 지도</strong><span>8개 축 · 100점 척도</span></div><DiagnosisRadarGraphic scores={scores.map(s=>s.score)} selected={selectedIndex}/><p className="report-note">바깥쪽이 100점 · 가운데는 8개 영역의 산술평균</p></div>
      <div className="report-axis-detail" id={detailId} style={{'--axis-color':current.color,'--axis-surface':current.surface} as CSSProperties} aria-live="polite">
        <div className="report-axis-detail-heading"><div><span className="report-pill">선택한 영역</span><h4>{current.label}</h4></div><strong className="report-selected-score">{current.score}<small>/100</small></strong></div>
        <div key={current.key} className="report-guide-enter"><strong>이렇게 개선하세요</strong><p>{current.action}</p><div className="report-completion-check"><span>완료 확인</span><p>{current.check}</p></div></div>
        <a className="report-next-action" href="#report-actions">구체적인 실행 과제 보기 <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <div className="report-axis-grid" role="group" aria-label="진단 영역 선택">{scores.map(s=><button type="button" key={s.key} aria-pressed={current.key===s.key} aria-controls={detailId} onClick={()=>setSelected(s.key)} className="report-axis" style={{'--axis-color':s.color,'--axis-surface':s.surface} as CSSProperties}>
      <span className="report-axis-icon" aria-hidden="true"><DiagnosisIcon axis={s.key}/></span><span className="report-axis-title">{s.label}</span>
      <span className="report-axis-scoreline"><strong>{s.score}<small>/100</small></strong><span className="report-axis-grade">{scoreGrade(s.score)}</span></span>
      <span className="report-meter" aria-hidden="true"><i style={{width:`${s.score}%`,background:s.color}}/></span>
    </button>)}</div>
    <div className="report-priority-heading"><h4>먼저 검토할 3개 영역</h4><span>점수가 낮은 순서 · 동점은 표시 순서 기준</span></div>
    <ol className="report-priority-trio">{ordered.slice(0,3).map((s,i)=><li key={s.key}><span>0{i+1}</span><div><strong>{s.label} · {s.score}점</strong><p>{s.action}</p></div><button type="button" onClick={()=>setSelected(s.key)} aria-label={`${s.label} 개선 방향 보기`}>보기 ↗</button></li>)}</ol>
  </section>;
}
