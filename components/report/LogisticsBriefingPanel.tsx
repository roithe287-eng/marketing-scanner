import DraftText from './DraftText';
import React from 'react';
import type {LogisticsBriefing} from '@/lib/logisticsBriefing';
import {safeHttpUrl} from '@/lib/citationMeasurement';

function Link({url,children}:{url:string;children:React.ReactNode}){const href=safeHttpUrl(url);return href?<a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>:<span>{children}</span>;}
function Evidence({sources}:{sources:LogisticsBriefing['blocks'][number]['evidence']}){
  return sources.length?<details className="logistics-briefing-evidence"><summary>판단에 사용한 자사 원문 {sources.length}개</summary>{sources.map(s=><div key={s.url+'#'+s.text}><blockquote>{s.text}</blockquote><Link url={s.url}>{s.title||'자사 원문'}</Link></div>)}</details>:<p className="report-note">이번 수집에서는 연결할 자사 원문을 확보하지 못했습니다. 실제 내용의 존재 여부를 추가 확인하세요.</p>;
}

export default function LogisticsBriefingPanel({plan}:{plan:LogisticsBriefing}){
  return <section className="report-card service-strategy logistics-briefing" aria-label="해외이사 AI 브리핑 대응 설계">
    <p className="report-eyebrow">SEARCH CONTENT · 사례 기반 제안</p>
    <h3>해외이사 검색 고객의 질문에 먼저 답하세요</h3>
    <p className="service-strategy-lead">{plan.strategy}</p>
    <aside className="logistics-briefing-reference"><strong>참고한 검색 화면의 구조</strong><p>{plan.reference}</p><p>{plan.scope}</p></aside>
    <h4 className="service-strategy-section-title">검색 사례의 구성 → 현재 원문 → 보완안</h4>
    <div className="service-strategy-grid">{plan.blocks.map(s=><article key={s.id}>
      <h4>{s.label}</h4><h5>검색 사례에서 보인 내용</h5><p>{s.example}</p>
      <h5>자사에서 확인한 원문 단서</h5><p>{s.observed.join(' · ')||'수집 범위에서 미확인'}</p>
      <h5>추가로 대조할 내용</h5><p>{s.review.length?`${s.review.join(' · ')} 관련 단서를 이번 수집에서 확인하지 못했습니다. 실제 안내의 존재 여부를 확인하세요.`:'관련 표현은 확인했습니다. 각 항목의 설명이 충분한지, 현재 조건과 일치하는지 대조하세요.'}</p>
      <Evidence sources={s.evidence}/><h5>구체적인 보완 제안</h5><p>{s.action}</p><h5>적용 위치</h5><p>{s.placement}</p>
      <div className="service-strategy-copy"><span>작성 초안 · 대괄호는 실제 운영 조건 확인 후 작성</span><p><DraftText text={s.draft}/></p></div>
    </article>)}</div>
    <h4 className="service-strategy-section-title">5단계마다 고객 준비·업체 역할·확인 기준을 작성하세요</h4>
    <ol className="service-strategy-funnel">{plan.steps.map((s,i)=><li key={s.title}><span>{String(i+1).padStart(2,'0')}</span><div><h4>{s.title}</h4><h5>고객이 준비할 일</h5><p>{s.customer}</p><h5>업체가 설명할 일</h5><p>{s.operator}</p><h5>작성 전 확인</h5><p>{s.verify}</p><Evidence sources={s.evidence}/></div></li>)}</ol>
    <h4 className="service-strategy-section-title">홈페이지·블로그·사진에 맡길 역할</h4>
    <div className="service-strategy-grid">{plan.channels.map(c=><article key={c.name}><h4>{c.name}</h4><p className="service-strategy-role">{c.role}</p><h5>제작 내용</h5><p>{c.deliverable}</p><h5>원문과 상담 연결</h5><p>{c.connection}</p></article>)}</div>
    <h4 className="service-strategy-section-title">실제 자료를 갖춰 작성할 블로그 6편</h4>
    <p>아래 제목·목차는 기획안입니다. 실제 제공 국가·작업 기록·운영 기준을 확인해 채우고, 주제마다 다른 고객 질문에 답하세요.</p>
    <div className="service-strategy-grid">{plan.articles.map(a=><article key={a.title}><h4>{a.title}</h4><p className="service-strategy-role">{a.intent}</p><ol>{a.outline.map(o=><li key={o}>{o}</li>)}</ol><h5>준비할 자료</h5><p>{a.asset}</p><h5>다음 행동</h5><p>{a.cta}</p></article>)}</div>
    <h4 className="service-strategy-section-title">발행·검색 반영·인용·상담을 따로 확인하세요</h4>
    <div className="service-strategy-grid">{plan.verification.map(v=><article key={v.title}><h4>{v.title}</h4><p>{v.action}</p><h5>기록할 지표</h5><p>{v.metric}</p></article>)}</div>
    <details className="logistics-briefing-evidence"><summary>공식 안내와 이 제안의 적용 범위</summary>{plan.references.map(r=><p key={r.url}><Link url={r.url}>{r.label}</Link><br/>{r.scope}</p>)}</details>
  </section>;
}
