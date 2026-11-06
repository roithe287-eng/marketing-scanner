'use client';
import React from 'react';
import type {MedicalAudit} from '@/lib/medicalAuditSchema';
import {MEDICAL_STATUS_LABELS} from '@/lib/medicalAudit';
import EvidenceFlow from './EvidenceFlow';
import {RoleBox} from './ReportRole';

function TopicSummary({title,status}:{title:string;status:string}){
  return <summary className="medical-topic-summary">
    <strong>{title}</strong>
    <span className="medical-topic-status">{status}</span>
    <span className="medical-topic-toggle" aria-hidden="true">
      <span className="medical-show">펼치기</span><span className="medical-hide">접기</span>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" focusable="false"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </span>
  </summary>;
}

export default function MedicalAuditPanel({audit}:{audit?:MedicalAudit}){
  if(!audit)return null;
  const observed=audit.checks.filter(c=>c.status==='observed').length;
  const review=audit.checks.filter(c=>['needs_review','clinical_review'].includes(c.status)).length;

  return <section className="report-card official-seo medical-audit" aria-labelledby="medical-audit-title">
    <div className="report-card-heading"><div><p className="report-eyebrow">병의원 맞춤 진단</p><h3 id="medical-audit-title">진료분야·의료진·검색 정보</h3></div><span className="report-note">기준 확인 {audit.reviewedOn}</span></div>
    <p className="report-note">{audit.scopeNote}</p>
    <div className="medical-classification"><strong>{audit.systems.join(' · ')||'의료체계 확인 필요'}</strong><span>{audit.institutions.join(' · ')||'기관 종별 확인 필요'}</span><p>진료분야·시술 제공·전문의 자격은 각각 다른 정보입니다.</p></div>
    <div className="naver-counts"><div data-state="observed"><span>원문 신호 확인</span><strong>{observed}<small>항목</small></strong></div><div data-state="manual"><span>보강·전문 검토</span><strong>{review}<small>항목</small></strong></div><div><span>추가 자료 필요</span><strong>{audit.checks.filter(c=>c.status==='unverified').length}<small>항목</small></strong></div></div>
    <p className="report-note">항목 수는 병원 신뢰도·의학적 정확성·검색 순위·AI 추천 확률 점수가 아닙니다.</p>
    {!audit.profiles.length&&<p className="report-empty">기관 관련 정보는 관측했지만 세부 진료분야를 확정하지 않았습니다. 실제 제공 진료를 먼저 확인하세요.</p>}
    <div className="medical-checks" id="medical-audit-topics" role="group" aria-label="병의원 진단 주제">
      {audit.profiles.length>0&&<details className="medical-topic medical-profile-topic">
        <TopicSummary title="진료분야별 안내" status={audit.profiles.length===1?audit.profiles[0].label:audit.profiles.length+'개 분야'}/>
        <div className="medical-topic-body"><div className="medical-profile-grid">{audit.profiles.map(profile=><article className="medical-profile" key={profile.id}>
          <h4>{profile.label}</h4><p>{profile.focus}</p>
          <strong>방문 전 답할 질문</strong><ul>{profile.questions.map(q=><li key={q}>{q}</li>)}</ul>
          <p className="report-note">{profile.schemaHint}</p>
          <div className="naver-sources">{profile.evidence.map((e,i)=><a key={i} href={e.url} target="_blank" rel="noopener noreferrer">분류 근거 · {e.locator} ↗</a>)}</div>
        </article>)}</div></div>
      </details>}
      {audit.checks.map(check=><details key={check.id} id={'medical-check-'+check.id} className="medical-topic medical-topic-check" data-status={check.status}>
        <TopicSummary title={check.label} status={MEDICAL_STATUS_LABELS[check.status]}/>
        <div className="medical-topic-body">
          <p className="medical-topic-detail">{check.detail}</p>
          {check.evidence.length>0&&<EvidenceFlow items={check.evidence.map(e=>({label:'원문 · '+e.locator,role:'current' as const,content:e.text}))}/>}
          <RoleBox role="proposal" label="실행·완료 확인"><p>{check.action}</p></RoleBox>
          {(check.evidence.length>0||check.sources.length>0)&&<div className="naver-sources medical-topic-sources">
            {[...new Set(check.evidence.map(e=>e.url))].map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">관측 원문 ↗</a>)}
            {check.sources.map(id=>audit.sources.find(s=>s.id===id)).filter((s):s is MedicalAudit['sources'][number]=>!!s).map(s=><a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>)}
          </div>}
        </div>
      </details>)}
    </div>
  </section>;
}
