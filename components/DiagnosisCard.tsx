import React from 'react';
import {Guidebook} from './report/SiteGuidebook';
import type {MarketingReport} from '@/lib/reportSchema';
import EvidenceFlow from './report/EvidenceFlow';
export default function DiagnosisCard({issue,index}:{issue:MarketingReport['criticalIssues'][number];index:number}) {
  const labels={high:'긴급',medium:'중요',low:'보강'};
  return <article className="report-card report-issue">
    <div className="report-issue-heading"><span className="report-index">{String(index+1).padStart(2,'0')}</span><h3>{issue.title}</h3><span className={`report-pill ${issue.priority==='high'?'danger':issue.priority==='medium'?'warning':''}`}>{issue.evidenceStatus==='review'?'근거 재확인':labels[issue.priority]}</span></div>
    {issue.evidenceNote&&<p className="report-note text-amber-800 mb-3">{issue.evidenceNote}</p>}
    <EvidenceFlow items={[{label:'문제',content:issue.problem},{label:'원인',content:issue.reason},{label:'권장 조치',content:issue.recommendation}]}/>
    {(issue.badExample||issue.goodExample)&&<div className="report-copy-pair">{issue.badExample&&<div><h4>현재 예시</h4><p>{issue.badExample}</p></div>}{issue.goodExample&&<div data-variant="after"><h4>개선 예시 · 적용 전 확인</h4><p>{issue.goodExample}</p></div>}</div>}
    <Guidebook title={issue.title} current={issue.badExample} evidence={issue.problem} proposal={issue.goodExample||issue.recommendation}/>
    {issue.exampleNote&&<p className="report-note mt-4">{issue.exampleNote}</p>}
  </article>;
}
