import React from 'react';
import type {WebsitePurpose} from '@/lib/websitePurpose';

const icons=['◎','◇','▤','↗','⌖','→'];
export default function NonCommerceSectorPanel({purpose}:{purpose:WebsitePurpose}){
  const sector=purpose.sector;if(!sector)return null;
  const observed=sector.checks.filter(c=>c.status==='observed').length;
  return <section className="report-card sector-overview" aria-label={`${sector.label} 맞춤 진단`}>
    <header className="sector-heading"><div><p className="report-eyebrow">YOUR PAGE · YOUR INDUSTRY</p><h3>{sector.label}<span>고객이 판단하는 6가지 정보</span></h3><p>이 URL에서 읽은 내용을 업종별 선택 기준과 연결했습니다.</p></div><div className="sector-count"><strong>{observed}<small> / 6</small></strong><span>관련 문구를 읽은 항목</span></div></header>
    <div className="sector-journey" aria-label="업종별 정보 탐색 흐름">{sector.journey.map((stage,i)=><div key={stage}><span>0{i+1}</span><strong>{stage}</strong>{i<2&&<b aria-hidden="true">→</b>}</div>)}</div>
    <div className="sector-check-grid">{sector.checks.map((c,i)=><article key={c.id} className={`sector-check sector-check-${c.status}`}>
      <header><span className="sector-icon" aria-hidden="true">{icons[i]}</span><h4>{c.label}</h4><span className="sector-status">{c.status==='observed'?'문구 확인':'보강 검토'}</span></header>
      <div className="sector-current"><span>홈페이지에서 읽은 내용</span>{c.evidence.length?<blockquote>{c.evidence[0].text.length>200?c.evidence[0].text.slice(0,200)+'…':c.evidence[0].text}</blockquote>:<p>연결할 문구를 수집하지 못했습니다. 실제 안내 화면과 먼저 대조하세요.</p>}</div>
      <div className="sector-next"><span>연결할 개선 방향</span><p>{c.guide}</p></div>
    </article>)}</div>
    <div className="sector-goal"><div><span>실제로 이어질 행동</span><strong>{purpose.goal.label}</strong></div><p>{purpose.goal.observed?purpose.goal.evidence.map(e=>e.text).join(' · '):'상담·예약·신청 중 실제 제공하는 경로와 완료 기준을 확인하세요.'}</p></div>
    <p className="sector-scope">입력 페이지의 문구 관측입니다. 항목 수는 품질 점수·성과·법적 적합성 판정이 아닙니다. {sector.caution}</p>
  </section>;
}
