import {RoleBox} from './report/ReportRole';
import React from 'react';
import {Guidebook} from './report/SiteGuidebook';
import type {MarketingReport} from '@/lib/reportSchema';
import EvidenceFlow,{LongReadingText} from './report/EvidenceFlow';
import ReportJumpLink from './report/ReportJumpLink';
import {reportPhraseKey} from '@/lib/conciseReport';
export default function DiagnosisCard({issue,index,taskAnchor}:{issue:MarketingReport['criticalIssues'][number];index:number;taskAnchor?:string}) {
  const labels={high:'긴급',medium:'중요',low:'보강'};
  const problem=reportPhraseKey(issue.problem),reason=reportPhraseKey(issue.reason),recommendation=reportPhraseKey(issue.recommendation);
  const items:React.ComponentProps<typeof EvidenceFlow>['items']=[
    {label:'확인한 내용',role:'current',content:issue.problem},
  ];
  if(reason&&reason!==problem)items.push({label:'고객에게 줄 수 있는 영향',role:'review',content:<LongReadingText text={issue.reason}/>});
  if(recommendation&&recommendation!==reason&&recommendation!==problem)items.push({label:'수정 제안',role:'proposal',content:<LongReadingText text={issue.recommendation}/>});
  return <article id={`report-issue-${index}`} className="report-card report-issue">
    <div className="report-issue-heading"><span className="report-index">{String(index+1).padStart(2,'0')}</span><h3>{issue.title}</h3><span className={`report-pill ${issue.priority==='high'?'danger':issue.priority==='medium'?'warning':''}`}>{issue.evidenceStatus==='review'?'근거 재확인':labels[issue.priority]}</span></div>
    {issue.evidenceNote&&<p className="report-note text-amber-800 mb-3">{issue.evidenceNote}</p>}
    <EvidenceFlow label="핵심 이슈의 사실·해석·수정 방향" items={items}/>
    {(issue.badExample||issue.goodExample)&&<div className="report-copy-pair">{issue.badExample&&<RoleBox role="current" label="현재 예시" kicker="AS-IS"><p>{issue.badExample}</p></RoleBox>}{issue.goodExample&&<RoleBox role="proposal" label="개선 예시 · 적용 전 확인" kicker="TO-BE · 제안"><p>{issue.goodExample}</p></RoleBox>}</div>}
    {taskAnchor?<p className="report-related-link"><ReportJumpLink id={taskAnchor}>이 이슈의 수정 위치와 완료 기준</ReportJumpLink></p>:<Guidebook title={issue.title} current={issue.badExample} evidence={issue.problem} proposal={issue.goodExample||issue.recommendation}/>}
    {issue.exampleNote&&<p className="report-note mt-4">{issue.exampleNote}</p>}
  </article>;
}
