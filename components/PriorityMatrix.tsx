import {CompactText} from './report/ReportVisualSummary';
import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {reportPhraseKey} from '@/lib/conciseReport';
import ReportJumpLink from './report/ReportJumpLink';
export default function PriorityMatrix({roadmap,quickWins}:{roadmap:MarketingReport['priorityRoadmap'];quickWins?:MarketingReport['quickWinsDetailed']}) {
  if(!roadmap)return null;
  const phases=[{key:'immediately',label:'즉시 실행',note:'오늘 검토할 일',items:roadmap.immediately||[]},{key:'thisWeek',label:'이번 주',note:'7일 내 검토할 일',items:roadmap.thisWeek||[]},{key:'thisMonth',label:'이번 달',note:'30일 내 검토할 일',items:roadmap.thisMonth||[]}];
  const references=new Map<string,{anchor:string;label:string}>();
  quickWins?.forEach((win,index)=>{
    const key=reportPhraseKey(win.title);
    if(key&&!references.has(key))references.set(key,{anchor:`report-quick-win-${index}`,label:`빠른 개선 ${index+1}의 적용 단계 보기`});
  });
  return <section className="report-roadmap" aria-label="우선순위 로드맵"><div className="report-card-heading"><p className="report-eyebrow">ACTION ROADMAP</p><h3>우선순위 로드맵</h3><p className="report-note">담당자와 작업 범위를 확인해 조정할 제안 일정입니다.</p></div>
    <ol className="report-roadmap-grid">{phases.map((phase,i)=><li key={phase.key}><header><span className="report-phase-number">{String(i+1).padStart(2,'0')}</span><div><h4>{phase.label}</h4><p>{phase.note}</p></div><span className="report-pill">{phase.items.length}개</span></header><ul className="report-numbered-list">{phase.items.length?phase.items.map((item,j)=>{
      const key=reportPhraseKey(item),anchor=`report-roadmap-${phase.key}-${j}`;
      const reference=references.get(key);
      if(key&&!reference)references.set(key,{anchor,label:`${phase.label} ${j+1}번 작업 다시 확인`});
      return <li id={anchor} key={j}><span aria-hidden="true">{j+1}</span>{reference?<ReportJumpLink id={reference.anchor}>{reference.label}</ReportJumpLink>:<CompactText text={item}/>}</li>;
    }):<li><p className="report-note">해당 항목이 없습니다.</p></li>}</ul></li>)}</ol>
  </section>;
}
