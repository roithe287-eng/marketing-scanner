import React from 'react';
import {ReadingToggle} from '../ReadingDisclosure';
import type {WebsitePurpose} from '@/lib/websitePurpose';

export default function NonCommerceSectorPanel({purpose}:{purpose:WebsitePurpose}){
  const sector=purpose.sector;if(!sector)return null;
  const observed=sector.checks.filter(c=>c.status==='observed').length;
  return <section className="report-card sector-overview" aria-label={`${sector.label} 맞춤 진단`}>
    <header className="sector-heading"><div><p className="report-eyebrow">YOUR PAGE · YOUR INDUSTRY</p><h3>{sector.label}<span>고객이 판단하는 6가지 정보</span></h3><p>이 URL에서 읽은 내용을 업종별 선택 기준과 연결했습니다.</p></div><div className="sector-count"><strong>{observed}<small> / 6</small></strong><span>관련 문구를 읽은 항목</span></div></header>
    <div className="sector-journey" aria-label="업종별 정보 탐색 흐름">{sector.journey.map((stage,i)=><div key={stage}><span>{String(i+1).padStart(2,'0')}</span><strong>{stage}</strong>{i<2&&<b aria-hidden="true">→</b>}</div>)}</div>
    <div className="sector-check-grid">{sector.checks.map(c=><details key={c.id} className={`sector-check reading-fold sector-check-${c.status}`}>
      <summary className="reading-summary"><span className="reading-caption"><strong>{c.label}</strong>
        <span className="sector-status">{c.status==='observed'?'문구 확인':'근거 미수집'}</span></span><ReadingToggle/></summary>
      <div className="reading-body">
        <div className="sector-current"><span>홈페이지에서 읽은 내용</span>{c.evidence.length
          ? c.evidence.map((e,i)=><blockquote key={i}>{e.text}{/^https?:\/\//.test(e.locator)&&<a href={e.locator} target="_blank" rel="noopener noreferrer"> 원문 ↗</a>}</blockquote>)
          : <p>수집된 근거 없음</p>}</div>

      </div>
    </details>)}</div>
    <div className="sector-goal"><div><span>실제로 이어질 행동</span><strong>{purpose.goal.label}</strong></div><p>{purpose.goal.observed?purpose.goal.evidence.map(e=>e.text).join(' · '):'상담·예약·신청 중 실제 제공하는 경로와 완료 기준을 확인하세요.'}</p></div>

  </section>;
}
