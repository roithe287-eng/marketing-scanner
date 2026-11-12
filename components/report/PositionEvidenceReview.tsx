import React from 'react';
import {POSITION_CHECK_SCOPE,POSITION_DRAFT_NOTE,type PositionRow} from '@/lib/competitorPositioning';
import PositionCheckCard from './PositionCheckCard';

export default function PositionEvidenceReview({row}:{row:PositionRow}){
 return <div className="position-evidence-review">
  <section className="position-shared-source" aria-label="네 항목이 함께 확인한 원문">
   <h5>현재 제목·설명 <small>같은 원문 · 네 가지 판단 관점</small></h5>
   <div className="position-source-fields">
    <div><h6>페이지 제목</h6><blockquote>{row.title||'원문 미확보'}</blockquote></div>
    <div><h6>메타 설명</h6><blockquote>{row.description||'원문 미확보'}</blockquote></div>
   </div>
   <p>{row.sourceLabel}{row.sourceLabel?' · ':''}{row.own?'입력한 페이지의 저장된 원문입니다.':'비교 후보의 저장된 원문입니다.'}</p>
   {row.url&&<a href={row.url} target="_blank" rel="noopener noreferrer">원문 페이지 확인 ↗</a>}
  </section>
  <div className="position-reading-guide"><h5>관점별로 이렇게 읽으세요</h5><p>{POSITION_CHECK_SCOPE}</p><p>{POSITION_DRAFT_NOTE}</p></div>
  <div className="position-checks">{row.checks.map(check=><PositionCheckCard key={`${row.id}-${check.id}`} row={row} check={check}/>)}</div>
  <p className="position-source-footnote">구버전 후보는 메타 설명과 OG 설명의 대체 여부가 기록되지 않았습니다. 같은 시점·같은 필드의 비교가 필요하면 다시 분석하세요.</p>
 </div>;
}
