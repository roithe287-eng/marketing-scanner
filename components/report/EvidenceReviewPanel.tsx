import React from 'react';
import ReadingDisclosure from '../ReadingDisclosure';
import ReportJumpLink from './ReportJumpLink';
import {CompactText} from './ReportVisualSummary';
import type {EvidenceReview} from '@/lib/evidenceReview';

export default function EvidenceReviewPanel({review}:{review:EvidenceReview}) {
  return <section id="report-html-observations" className="report-card report-evidence-review" aria-label="8개 영역 근거와 측정 범위">
    <div className="report-card-heading">
      <p className="report-eyebrow">EVIDENCE &amp; REVIEW</p>
      <h3>확인한 사실과 더 확인할 부분</h3>
      <p className="report-note">{review.assessed ? `판정한 HTML 기본 항목 ${review.assessed}개 중 ${review.passed}개가 기준을 충족했습니다.` : 'HTML 기본 항목 판정을 보류했습니다.'} 미확인 {review.unknown}개입니다. 실제 화면과 전환은 아래 안내에 따라 직접 확인하세요.</p>
    </div>
    {review.axes.length > 0 && <div className="report-evidence-overview">
      <div className="report-evidence-columns" aria-hidden="true"><span>진단 영역</span><span>추가로 확인할 것</span></div>
      <ul role="list" aria-label="영역별 다음 확인 항목">
        {review.axes.map(axis => <li key={axis.key} className="report-evidence-row">
          <div className="report-evidence-topic">
            <h4>{axis.label}</h4>
            <span className="report-pill">{axis.status === 'unmeasured' ? '미측정' : '원문 관측·검토'}</span>
          </div>
          <div className="report-evidence-next">
            <strong className="report-evidence-next-label">추가로 확인할 것</strong>
            <CompactText text={axis.nextStep} verbatim/>
            <ReadingDisclosure title={`${axis.label} 관측 근거`} className="report-supporting-detail">
              <CompactText text={axis.evidence} verbatim/>
            </ReadingDisclosure>
          </div>
        </li>)}
      </ul>
    </div>}
    <ReadingDisclosure title="HTML 항목 충족률의 산식과 원문 근거" className="report-supporting-detail">
      <p className="report-note">{review.note}</p>
      <p className="report-note">수집 시각: {new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(review.capturedAt))} KST · <ReportJumpLink id="report-site-guide">원문·링크 모음</ReportJumpLink></p>
      <div className="report-evidence-criteria">
        {review.criteria.map(criterion => <article key={criterion.id}>
          <h4>{criterion.label} · {criterion.status === 'pass' ? '충족' : criterion.status === 'review' ? '미확인' : '보완 검토'}</h4>
          <p><strong>기준</strong> {criterion.rule}</p>
          <p><strong>원문 관측</strong> {criterion.evidence}</p>
        </article>)}
      </div>
    </ReadingDisclosure>
  </section>;
}
