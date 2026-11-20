import {CompactText} from './report/ReportVisualSummary';
import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {reportPhraseKey} from '@/lib/conciseReport';
import ReportJumpLink from './report/ReportJumpLink';
export default function PriorityMatrix({roadmap,quickWins,legacyQuickWins}:{roadmap:MarketingReport['priorityRoadmap'];quickWins?:MarketingReport['quickWinsDetailed'];legacyQuickWins?:MarketingReport['quickWins']}) {
  if(!roadmap)return null;
  const phases=[{key:'immediately',label:'즉시 실행',note:'오늘 검토할 일',items:roadmap.immediately||[]},{key:'thisWeek',label:'이번 주',note:'7일 내 검토할 일',items:roadmap.thisWeek||[]},{key:'thisMonth',label:'이번 달',note:'30일 내 검토할 일',items:roadmap.thisMonth||[]}];
  const references=new Map<string,{anchor:string;label:string}>();
  const quickWinTitles=quickWins?.length?quickWins.map(win=>win.title):legacyQuickWins;
  quickWinTitles?.forEach((title,index)=>{
    const key=reportPhraseKey(title);
    if(key&&!references.has(key))references.set(key,{anchor:`report-quick-win-${index}`,label:quickWins?.length?'적용 순서와 예시 보기':'보관된 빠른 개선 보기'});
  });
  return <section className="report-roadmap" aria-label="우선순위 로드맵"><div className="report-card-heading"><p className="report-eyebrow">ACTION ROADMAP</p><h3>우선순위 로드맵</h3><p className="report-note">먼저 처리할 작업을 정하세요. 같은 작업이 여러 시기에 나와도 각 시기의 기록을 확인할 수 있습니다.</p></div>
    <ol className="report-roadmap-grid">{phases.map((phase,i)=><li key={phase.key}><header><span className="report-phase-number">{String(i+1).padStart(2,'0')}</span><div><h4>{phase.label}</h4><p>{phase.note}</p></div><span className="report-pill">{phase.items.length}개</span></header><ul className="report-numbered-list">{phase.items.length?phase.items.map((item,j)=>{
      const key=reportPhraseKey(item),anchor=`report-roadmap-${phase.key}-${j}`;
      const reference=references.get(key);
      if(key&&!reference)references.set(key,{anchor,label:`${phase.label} ${j+1}번 작업 다시 확인`});
      return <li id={anchor} key={j}><span aria-hidden="true">{j+1}</span>{reference?<div className="report-roadmap-reference"><strong>{item}</strong><ReportJumpLink id={reference.anchor}>{reference.label}</ReportJumpLink></div>:<CompactText text={item}/>}</li>;
    }):<li><p className="report-note">해당 항목이 없습니다.</p></li>}</ul></li>)}</ol>
  </section>;
}
