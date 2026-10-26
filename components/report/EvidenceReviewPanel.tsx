import {CompactText} from './ReportVisualSummary';
import {RoleBox} from './ReportRole';
import React from 'react';
import type {EvidenceReview} from '@/lib/evidenceReview';

export default function EvidenceReviewPanel({review}:{review:EvidenceReview}) {
  return <section className="report-card report-radar" aria-label="8개 영역 근거와 측정 범위">
    <div className="report-card-heading"><p className="report-eyebrow">EVIDENCE & REVIEW</p><h3>확인한 사실과 더 확인할 부분</h3><p className="report-note">HTML 기본 항목 {review.assessed}개 중 {review.passed}개 충족 · 미확인 {review.unknown}개. 실제 화면·전환·모바일의 미측정 항목에는 점수를 부여하지 않습니다.</p></div>
    <div className="grid gap-4 md:grid-cols-2">{review.axes.map(axis=><article key={axis.key} className="min-w-0 rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-bold">{axis.label}</h4><span className="report-pill">{axis.status==='unmeasured'?'미측정':'원문 관측·검토'}</span></div><div className="report-role-stack"><RoleBox role="current" label="관측한 내용"><CompactText text={axis.evidence}/></RoleBox><RoleBox role="verify" label="추가로 확인할 것"><CompactText text={axis.nextStep}/></RoleBox></div></article>)}</div>
    <details open className="report-inline-details mt-5"><summary>HTML 항목 충족률의 산식과 원문 근거</summary><p className="report-note">{review.note}</p><p className="report-note">수집 시각: {new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(review.capturedAt))} KST · <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">수집 페이지 확인 ↗</a></p><div className="mt-4 space-y-4">{review.criteria.map(c=><div key={c.id} className="rounded-xl bg-slate-50 p-4"><h4 className="font-bold">{c.label} · {c.status==='pass'?'충족':c.status==='review'?'미확인':'보완 검토'}</h4><p className="mt-2 text-sm leading-7">기준: {c.rule}</p><p className="break-words text-sm leading-7">원문 관측: {c.evidence}</p><p className="text-sm leading-7 text-slate-600">확인 위치: {c.locator}</p></div>)}</div></details>
  </section>;
}
