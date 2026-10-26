import React from 'react';
import {positionCheckReason,positionCheckNextStep,positionFieldFinding,type PositionRow,type PositionCheck} from '@/lib/competitorPositioning';

export default function PositionCheckCard({row,check}:{row:PositionRow;check:PositionCheck}) {
  const state=row.x===null?'unknown':check.found?'found':'absent';
  return <div className="position-check-card" data-state={state}>
    <div className="position-check-heading"><strong>{check.label}</strong><span>{state==='unknown'?'판정 보류':state==='found'?'표현 확인':'미탐지'}</span></div>
    <p>{positionCheckReason(row,check)}</p>
    <details open className="position-check-detail">
      <summary>{check.label} · 확인 기준과 원문 보기</summary>
      <div>
        <h5>어떤 정보를 찾았나요?</h5>
        <p>{check.description}</p>
        <p className="position-criterion-words">기준 표현: {check.examples.join(' · ')}</p>
        <p>띄어쓰기와 영문 대소문자는 구분하지 않습니다. 표현 일치 여부를 확인하며, 문장의 모든 의미나 실제 제공 여부를 판정하는 검사는 아닙니다.</p>
        <h5>어디에서 확인했나요?</h5>
        {check.sources.map(source=><div className="position-field-result" key={source.label}>
          <h6>{source.label}</h6><p>{positionFieldFinding(source)}</p>
          <blockquote>{source.text||'저장된 원문이 없습니다.'}</blockquote>
        </div>)}
        <h5>다음에 확인할 내용</h5><p>{positionCheckNextStep(row,check)}</p>
      </div>
    </details>
  </div>;
}
