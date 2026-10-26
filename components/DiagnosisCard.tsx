import {RoleBox} from './report/ReportRole';
import React from 'react';
import {Guidebook} from './report/SiteGuidebook';
import type {MarketingReport} from '@/lib/reportSchema';
import EvidenceFlow from './report/EvidenceFlow';
export default function DiagnosisCard({issue,index}:{issue:MarketingReport['criticalIssues'][number];index:number}) {
  const labels={high:'긴급',medium:'중요',low:'보강'};
  return <article className="report-card report-issue">
    <div className="report-issue-heading"><span className="report-index">{String(index+1).padStart(2,'0')}</span><h3>{issue.title}</h3><span className={`report-pill ${issue.priority==='high'?'danger':issue.priority==='medium'?'warning':''}`}>{issue.evidenceStatus==='review'?'근거 재확인':labels[issue.priority]}</span></div>
    {issue.evidenceNote&&<p className="report-note text-amber-800 mb-3">{issue.evidenceNote}</p>}
    <EvidenceFlow items={[{label:'문제',role:'current',kicker:'AS-IS',content:issue.problem},{label:'원인',role:'review',content:issue.reason},{label:'권장 조치',role:'proposal',kicker:'TO-BE · 제안',content:issue.recommendation}]}/>
    {(issue.badExample||issue.goodExample)&&<div className="report-copy-pair">{issue.badExample&&<RoleBox role="current" label="현재 예시" kicker="AS-IS"><p>{issue.badExample}</p></RoleBox>}{issue.goodExample&&<RoleBox role="proposal" label="개선 예시 · 적용 전 확인" kicker="TO-BE · 제안"><p>{issue.goodExample}</p></RoleBox>}</div>}
    <Guidebook title={issue.title} current={issue.badExample} evidence={issue.problem} proposal={issue.goodExample||issue.recommendation}/>
    {issue.exampleNote&&<p className="report-note mt-4">{issue.exampleNote}</p>}
  </article>;
}
