import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {describeCoverageWarning} from '@/lib/reportCoverage';
import ReportJumpLink from './ReportJumpLink';

export default function ReportCoverageWarnings({warnings}:{warnings:MarketingReport['analysisWarnings']}) {
  if(!warnings?.length)return null;
  return <section className="report-card report-coverage-warnings" aria-labelledby="report-coverage-warnings-heading">
    <h3 id="report-coverage-warnings-heading">이번 진단에서 확인이 제한된 항목</h3>
    <p className="report-note">어떤 자료를 더 확인해야 할지 살펴보세요. 제한된 항목은 보완 필요 상태와 별도로 표시합니다.</p>
    <ul>{warnings.map((warning,i)=>{
      const entry=describeCoverageWarning(warning);
      return <li key={`${warning.key}-${i}`}>
        <div className="report-coverage-row-heading"><h4>{entry.title}</h4><span className="report-pill warning">{entry.status}</span></div>
        {entry.observation&&<p className="report-note">{entry.observation}</p>}
        <dl><div><dt>결과에 미치는 영향</dt><dd>{entry.impact}</dd></div><div><dt>이어서 확인할 것</dt><dd>{entry.guide}</dd></div></dl>
        {entry.target&&<ReportJumpLink id={entry.target}>이 항목의 결과로 이동</ReportJumpLink>}
      </li>;
    })}</ul>
  </section>;
}
