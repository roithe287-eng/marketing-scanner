import {CompactText} from './report/ReportVisualSummary';
import {RoleBox} from './report/ReportRole';
import React from 'react';
import ReadingDisclosure from './ReadingDisclosure';
import {Guidebook} from './report/SiteGuidebook';
import type {MarketingReport} from '@/lib/reportSchema';
export default function QuickWinsFlow({quickWins}:{quickWins:MarketingReport['quickWinsDetailed']}) {
  if(!quickWins?.length)return null;
  return <section className="report-quickwins" aria-label="빠른 개선 적용 순서"><div className="report-card-heading"><h3>빠른 개선 실행안</h3><p className="report-note">실행 일정에서 고른 작업의 적용 순서와 수정 전후 예시를 확인하세요.</p></div>
    <div className="report-quickwin-grid">{quickWins.map((win,i)=><article key={i} id={`report-quick-win-${i}`}><header><span className="report-phase-number">{String(i+1).padStart(2,'0')}</span><h4>{win.title}</h4></header><ol className="report-numbered-list">{win.steps?.map((step,j)=><li key={j}><span aria-hidden="true">{j+1}</span><CompactText text={step}/></li>)}</ol>{(win.beforeExample||win.afterExample)&&<div className="report-copy-pair">{win.beforeExample&&<RoleBox role="current" label="현재 예시" kicker="AS-IS"><p>{win.beforeExample}</p></RoleBox>}{win.afterExample&&<RoleBox role="proposal" label="수정 예시" kicker="TO-BE · 제안"><p>{win.afterExample}</p></RoleBox>}</div>}<ReadingDisclosure title="작업할 위치와 상세 적용 안내"><Guidebook title={win.title} current={win.beforeExample} instructions={win.steps} proposal={win.afterExample||win.steps.join("\n")}/></ReadingDisclosure></article>)}</div>
  </section>;
}
