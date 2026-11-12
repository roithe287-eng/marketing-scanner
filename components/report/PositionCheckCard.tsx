import React from 'react';
import {positionCheckReason,positionCheckNextStep,positionFieldFinding,positionFieldDirection,positionCheckDraft,type PositionRow,type PositionCheck} from '@/lib/competitorPositioning';
import {draftEmphasis} from '@/lib/reportEmphasis';
import ReportEmphasis from './ReportEmphasis';

export default function PositionCheckCard({row,check}:{row:PositionRow;check:PositionCheck}) {
  const state=row.x===null?'unknown':check.found?'found':'absent',draft=positionCheckDraft(row,check);
  return <div className="position-check-card" data-state={state}>
    <div className="position-check-heading"><strong className="report-key-emphasis">{check.label}</strong><span>{state==='unknown'?'판정 보류':state==='found'?'표현 확인':'미탐지'}</span></div>
    <h5 className="position-lens-question">{check.editorial.question}</h5>
    <p><ReportEmphasis text={positionCheckReason(row,check)} terms={[check.label,...check.signals]}/></p>
    <dl className="position-field-findings" aria-label={`${check.label} 필드별 확인 결과`}>
      {check.sources.map(source=><div key={source.label}><dt>{source.label}</dt><dd><ReportEmphasis text={positionFieldFinding(source)} terms={source.matches}/></dd></div>)}
    </dl>
    {draft?<section className="position-rewrite" aria-label={`${check.label} 제목과 설명 수정안`}>
      <h5>{check.found?'확인한 표현을 구체화하는 예시':'이 관점으로 제목·설명 바꾸기'}</h5>
      <p className="position-draft-caption">작성 예시 · [ ] 안은 사실 확인 후 교체</p>
      <div className="position-rewrite-field"><h6>페이지 제목 제안</h6><p><ReportEmphasis text={draft.title} terms={draftEmphasis(draft.title)}/></p></div>
      <div className="position-rewrite-field"><h6>메타 설명 제안</h6><p><ReportEmphasis text={draft.description} terms={draftEmphasis(draft.description)}/></p></div>
    </section>:<p className="position-rewrite-pending">{row.x===null?'원문 확보 후 제목·설명 수정안을 제시합니다.':'현재 미제공·예정으로 적힌 내용을 긍정 문구로 바꾸지 않습니다. 운영 상태를 확인한 후 수정안을 작성하세요.'}</p>}
    <div className="position-next-step"><h5>이 항목에서 확인할 일</h5><p>{positionCheckNextStep(row,check)}</p></div>
    <details className="position-check-detail">
      <summary>{check.label} · 탐지 기준과 편집 방향</summary>
      <div><p className="position-criterion-words">확인 기준 표현: {check.examples.join(' · ')}</p>
        {row.x!==null&&<p>중복 제외 {check.signalCount}/2개를 좌표·버블 크기에 반영했습니다.</p>}
        {check.sources.map(source=><p key={source.label}>{source.label}: {positionFieldDirection(source,check)}</p>)}
      </div>
    </details>
  </div>;
}
