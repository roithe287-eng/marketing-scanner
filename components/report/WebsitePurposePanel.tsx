import ReportJumpLink from './ReportJumpLink';
import React from 'react';
import type {WebsitePurpose} from '@/lib/websitePurpose';
import CommunitySamples from './CommunitySamples';
export default function WebsitePurposePanel({purpose}:{purpose:WebsitePurpose}){
  return <section className="report-card" aria-label="페이지 목적별 분석">
    <div className="report-card-heading"><p className="report-eyebrow">PAGE PURPOSE</p><h3>페이지 목적에 맞춰 확인했습니다</h3><p className="report-note">분류 후보: <strong>{purpose.sector?.label||purpose.label}</strong> · 다음 행동 후보: <strong>{purpose.goal.label}</strong>{purpose.goal.observed?' · 문구 관측':' · 실제 목적 확인 필요'}</p></div>
    <div className="grid gap-4 md:grid-cols-2">{purpose.checks.filter(c=>c.status!=='not_applicable').map(c=><article key={c.id} className="min-w-0 rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold"><u className="service-fact-title">{c.label}</u></h4><span className="report-pill">{c.evidence.length?'원문 확인':'근거 미수집'}</span></div>{c.evidence.length?c.evidence.map((e,i)=><div key={i}><p className="break-words text-sm leading-7">{e.text}</p>{/^https?:\/\//.test(e.locator)&&<a className="text-sm underline" href={e.locator} target="_blank" rel="noopener noreferrer">원문 ↗</a>}</div>):<p>수집된 근거 없음</p>}</article>)}</div>
    {purpose.community&&<CommunitySamples context={purpose.community}/>}
    <details className="report-inline-details mt-5"><summary>분류 근거와 수집 범위</summary>{purpose.evidence.map((e,i)=><p className="break-words text-sm leading-7" key={i}>{e.text}</p>)}<p className="report-note">수집 시각: {purpose.capturedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(purpose.capturedAt))+' KST':'미기록'} · <ReportJumpLink id="report-site-guide">원문·링크 모음</ReportJumpLink></p></details>
  </section>;
}
