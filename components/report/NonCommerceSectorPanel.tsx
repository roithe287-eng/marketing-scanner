import React from 'react';
import {ReadingToggle} from '../ReadingDisclosure';
import type {WebsitePurpose} from '@/lib/websitePurpose';
import ReportJumpLink from './ReportJumpLink';
import {purposeCheckAnchor} from './WebsitePurposePanel';
import {safeHttpUrl} from '@/lib/citationMeasurement';

export default function NonCommerceSectorPanel({purpose}:{purpose:WebsitePurpose}){
  const sector=purpose.sector;if(!sector)return null;
  const observed=sector.checks.filter(c=>c.status==='observed').length;
  const checks=purpose.checks.filter(c=>c.status!=='not_applicable');
  const goalIndex=checks.findIndex(check=>check.id==='goal');
  return <section className="report-card sector-overview" aria-label={`${sector.label} 맞춤 진단`}>
    <header className="sector-heading"><div><h3>{sector.label}<span>고객이 먼저 확인할 정보</span></h3><p>고객이 결정을 내리기 전 읽어야 할 정보입니다. 근거를 열어 실제 페이지와 대조하세요.</p></div><div className="sector-count"><strong>{observed}<small> / {sector.checks.length}</small></strong><span>관련 문구를 읽은 항목</span></div></header>
    <ol className="sector-journey" aria-label="업종별 정보 탐색 순서" data-page-model="sector-journey">{sector.journey.map((stage,i)=><li key={stage}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span><strong>{stage}</strong>{i<sector.journey.length-1&&<b aria-hidden="true">→</b>}</li>)}</ol>
    <div className="sector-check-grid">{sector.checks.map(c=>{const index=checks.findIndex(check=>check.id===c.id&&check.status===c.status&&JSON.stringify(check.evidence)===JSON.stringify(c.evidence));return <details key={c.id} className={`sector-check reading-fold sector-check-${c.status}`}>
      <summary className="reading-summary"><span className="reading-caption"><strong>{c.label}</strong>
        <span className="sector-status">{c.status==='observed'?'문구 확인':'근거 미수집'}</span></span><ReadingToggle/></summary>
      <div className="reading-body">
        <div className="sector-current">{index>=0?<><span>{c.evidence.length?`원문 근거 ${c.evidence.length}개`:'수집된 근거 없음'}</span><ReportJumpLink id={purposeCheckAnchor(index)}>{c.label} 확인 방법과 근거 보기</ReportJumpLink></>:<><span>홈페이지에서 읽은 내용</span>{c.evidence.length
          ? c.evidence.map((e,i)=><blockquote key={i}>{e.text}{safeHttpUrl(e.locator)&&<a href={e.locator} target="_blank" rel="noopener noreferrer"> 원문 ↗</a>}</blockquote>)
          : <p>수집된 근거 없음</p>}</>}</div>

      </div>
    </details>;})}</div>
    <div className="sector-goal"><div><span>이 페이지의 다음 행동</span><strong>{purpose.goal.label}</strong></div><p>{purpose.goal.observed?'연결 단서를 읽었습니다. 클릭 뒤 어떤 화면으로 가는지 확인하세요.':'안내에서 실제 이용 경로와 완료 기준을 확인하세요.'}{goalIndex>=0&&<ReportJumpLink id={purposeCheckAnchor(goalIndex)}>다음 행동의 근거 보기</ReportJumpLink>}</p></div>

  </section>;
}
