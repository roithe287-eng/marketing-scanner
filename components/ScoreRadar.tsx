"use client";
import ReportJumpLink,{revealReportTarget} from './report/ReportJumpLink';
import type {ExecutionPlan} from '@/lib/reportExecution';
import React,{useId,useState,type CSSProperties} from 'react';
import DiagnosisIcon from './report/DiagnosisIcon';
import DiagnosisRadarGraphic from './DiagnosisRadarGraphic';
import type {MarketingReport} from '@/lib/reportSchema';
import {diagnosisScores,scoreGrade} from '@/lib/diagnosisVisuals';
import type {EvidenceReview} from '@/lib/evidenceReview';

export default function ScoreRadar({diagnosis,plan,review,featured=false,siteName}:{diagnosis:MarketingReport['diagnosis'];plan?:ExecutionPlan;review?:EvidenceReview;featured?:boolean;siteName?:string}) {
  const scores=diagnosisScores(diagnosis),ordered=[...scores].sort((a,b)=>a.score-b.score);
  const [selected,setSelected]=useState<string>(ordered[0].key);
  const current=scores.find(s=>s.key===selected)||ordered[0];
  const selectedIndex=scores.findIndex(s=>s.key===current.key);
  const detailId=useId();
  const currentReview=review?.axes.find(axis=>axis.key===current.key);
  const patterns:Record<string,RegExp>={firstView:/첫|제목|헤드라인/,cta:/CTA|버튼|문의/,copywriting:/카피|문구|본문|중복/,trust:/신뢰|후기|사례|인증/,conversionFlow:/전환|폼|문의/,adLanding:/랜딩|광고|CTA/,mobileUx:/모바일|속도|성능/,seo:/SEO|검색|메타|title/i};
  const task=plan?.tasks.find(t=>patterns[current.key]?.test(t.title));
  const target=task?.anchor||(['seo','mobileUx'].includes(current.key)?'report-growth-plan':'report-page-edits');
  const selectAndShow=(key:string)=>{setSelected(key);revealReportTarget(detailId);};
  return <section className={`report-card report-radar${featured?' report-radar-featured':''}`} aria-label="8개 영역 진단 인포그래픽">
    <div className="report-card-heading"><p className="report-eyebrow">MARKETING RADAR · AI 참고 평가</p><h3>{featured?'우리 사이트의 8개 영역 진단':'강점과 빈틈, 다음 행동까지'}</h3>{featured&&siteName&&<p className="report-radar-site">{siteName}</p>}<p className="report-note">수집 문서에 대한 AI 참고 평가입니다. 실제 전환율·모바일 동작을 측정한 점수가 아닙니다. 영역을 누르면 개선 방향을 확인할 수 있습니다.</p></div>
    <div className="report-radar-layout">
      <div className="report-radar-chart"><div className="report-radar-chart-heading"><strong>우리 사이트의 진단 지도</strong><span>8개 축 · AI 참고 점수</span></div><DiagnosisRadarGraphic scores={scores.map(s=>s.score)} selected={selectedIndex} reference/><p className="report-note">바깥쪽이 100점 · 가운데는 AI 참고 점수의 산술평균</p></div>
      <div className="report-axis-detail" id={detailId} style={{'--axis-color':current.color,'--axis-surface':current.surface} as CSSProperties} aria-live="polite">
        <div className="report-axis-detail-heading"><div><span className="report-pill">선택한 영역 · AI 참고</span><h4>{current.label}</h4></div><strong className="report-selected-score">{current.score}<small>/100</small></strong></div>
        {currentReview&&<p className="report-radar-scope">{currentReview.status==='unmeasured'?'실제 화면·동작은 별도 확인이 필요합니다.':'원문 관측 내용과 실제 운영 조건을 함께 대조하세요.'}</p>}
        <div key={current.key} className="report-guide-enter"><strong>이렇게 개선하세요</strong><p>{current.action}</p><div className="report-completion-check"><span>완료 확인</span><p>{current.check}</p></div></div>
        <ReportJumpLink className="report-next-action" id={target}>{task?`${task.title} · 수정 방법 열기`:'이 영역의 수정 방법 열기'}</ReportJumpLink>
      </div>
    </div>
    <div className="report-axis-grid" role="group" aria-label="진단 영역 선택">{scores.map(s=><button type="button" key={s.key} aria-pressed={current.key===s.key} aria-controls={detailId} onClick={()=>setSelected(s.key)} className="report-axis" style={{'--axis-color':s.color,'--axis-surface':s.surface} as CSSProperties}>
      <span className="report-axis-icon" aria-hidden="true"><DiagnosisIcon axis={s.key}/></span><span className="report-axis-title">{s.label}</span>
      <span className="report-axis-scoreline"><strong>{s.score}<small>/100</small></strong><span className="report-axis-grade">{scoreGrade(s.score)}</span></span>
      <span className="report-meter" aria-hidden="true"><i style={{width:`${s.score}%`,background:s.color}}/></span>
    </button>)}</div>
    {!featured&&<><div className="report-priority-heading"><h4>먼저 검토할 3개 영역</h4><span>점수가 낮은 순서 · 동점은 표시 순서 기준</span></div>
    <ol className="report-priority-trio">{ordered.slice(0,3).map((s,i)=><li key={s.key}><span>0{i+1}</span><div><strong>{s.label} · {s.score}점</strong><p>{s.action}</p></div><button type="button" onClick={()=>selectAndShow(s.key)} aria-controls={detailId} aria-label={`${s.label} 개선 방법 열기`}>개선 방법 열기 →</button></li>)}</ol></>}
  </section>;
}
