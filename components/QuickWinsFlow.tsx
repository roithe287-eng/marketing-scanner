import React from 'react';
import {Guidebook} from './report/SiteGuidebook';
import type {MarketingReport} from '@/lib/reportSchema';
export default function QuickWinsFlow({quickWins}:{quickWins:MarketingReport['quickWinsDetailed']}) {
  if(!quickWins?.length)return null;
  return <section className="report-quickwins" aria-label="퀵윈 액션 플랜"><div className="report-card-heading"><p className="report-eyebrow">QUICK WINS</p><h3>빠른 개선 실행안</h3><p className="report-note">작업 순서를 따라 확인하고, 수정 전후 문구를 비교하세요.</p></div>
    <div className="report-quickwin-grid">{quickWins.map((win,i)=><article key={i}><header><span className="report-phase-number">{String(i+1).padStart(2,'0')}</span><h4>{win.title}</h4></header><ol className="report-numbered-list">{win.steps?.map((step,j)=><li key={j}><span aria-hidden="true">{j+1}</span><p>{step}</p></li>)}</ol>{(win.beforeExample||win.afterExample)&&<div className="report-copy-pair">{win.beforeExample&&<div><h5>AS-IS · 현재 예시</h5><p>{win.beforeExample}</p></div>}{win.afterExample&&<div data-variant="after"><h5>TO-BE · 수정 예시</h5><p>{win.afterExample}</p></div>}</div>}<Guidebook title={win.title} current={win.beforeExample} instructions={win.steps} proposal={win.afterExample||win.steps.join("\n")}/></article>)}</div>
  </section>;
}
