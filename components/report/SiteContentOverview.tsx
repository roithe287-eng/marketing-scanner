'use client';
import React,{useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildSourceLibrary,buildContentFacets,type ContentFacetId} from '@/lib/reportContent';
import DiagnosisIcon from './DiagnosisIcon';
import {RoleBox,RoleLabel} from './ReportRole';
import ReportJumpLink from './ReportJumpLink';

export default function SiteContentOverview({report}:{report:MarketingReport}){
 const library=useMemo(()=>buildSourceLibrary(report),[report]);
 const facets=useMemo(()=>buildContentFacets(library),[library]);
 const [selected,setSelected]=useState<ContentFacetId>('offer');
 const active=facets.find(f=>f.id===selected)!;
 const [message,setMessage]=useState('');
 const label=report.sitePurpose?.kind==='content'?'콘텐츠':report.sitePurpose?.kind==='organization'?'사업':'서비스';
 return <section className="report-card site-content-overview" id="report-content-evidence" aria-label="홈페이지 내용과 진단 이유">
  <header className="report-card-heading"><p className="report-eyebrow">YOUR CONTENT → OUR REASONING</p><h3>홈페이지에서 읽은 {label}, 이렇게 연결했습니다</h3><p className="report-note">항목을 선택하면 실제 발췌문과 해석, 보강할 내용을 함께 볼 수 있습니다.</p></header>
  <div className="content-facet-tabs" role="group" aria-label="홈페이지 내용 관점">{facets.map(f=><button type="button" key={f.id} aria-pressed={selected===f.id} onClick={()=>{setSelected(f.id);setMessage('');}}><DiagnosisIcon axis={f.icon}/><strong>{f.label}</strong><small>{f.count?`관련 문구 ${f.count}개`:'추가 확인'}</small></button>)}</div>
  <div className="content-evidence-heading"><h4>{active.question}</h4><span>원문 → 해석 → 보강</span></div>
  <div className="content-evidence-layout"><div className="content-evidence-quotes"><RoleLabel role="current" label="홈페이지에서 확인한 표현" kicker="AS-IS"/>{active.evidence.length?active.evidence.map(e=><blockquote key={e.id}><span>{e.kinds.includes('description')?'검색 설명':e.kinds.includes('title')?'검색 제목':e.kinds.includes('text')?'홈페이지 본문':e.kinds.includes('heading')?'제목·소제목':'링크·버튼 문구'}</span><p>{e.excerpt}</p>{(e.truncated||e.excerpted)&&<small>일부 발췌</small>}</blockquote>):<p className="report-empty">이 항목에 연결할 원문이 저장되지 않았습니다.</p>}</div>
   <div className="content-evidence-reason"><RoleBox role="review" label="이렇게 해석한 이유"><p>{active.why}</p></RoleBox><RoleBox role="proposal" label="다음 수정 방향" kicker="TO-BE · 제안"><p>{active.action}</p></RoleBox></div></div>
  <footer className="content-evidence-footer"><ReportJumpLink id="report-site-guide">전체 원문·링크 확인</ReportJumpLink><button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText([active.label,...active.evidence.map(e=>`원문: ${e.text}`),`해석: ${active.why}`,`수정: ${active.action}`].join('\n\n'));setMessage('근거와 수정 방향을 복사했습니다.');}catch{setMessage('복사할 문구를 직접 선택해 주세요.');}}}>근거·수정안 복사</button>{message&&<span role="status">{message}</span>}</footer>
  <p className="report-note content-evidence-scope">수집한 홈페이지 문구 기준입니다. 후기·경력·수상 등의 주장을 외부에서 검증한 결과는 아닙니다.</p>
 </section>;
}
