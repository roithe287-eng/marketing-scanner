'use client';
import React,{useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildSourceLibrary,buildContentFacets,type ContentFacetId} from '@/lib/reportContent';
import DiagnosisIcon from './DiagnosisIcon';
import {RoleBox,RoleLabel} from './ReportRole';
import ReportJumpLink from './ReportJumpLink';
import {PagePatternGrid} from './PagePatternGuide';
import type {PagePattern} from '@/lib/reportPlainLanguage';

const examples:Record<ContentFacetId,{where:string;patterns:PagePattern[]}>= {
 offer:{where:'첫 화면 → 상품·서비스 소개',patterns:[{kind:'hero',title:'무엇을 제공하나요?',detail:'[상품·서비스명]을 한 문장으로'},{kind:'cost',title:'포함되는 내용',detail:'[제공 범위] / [별도 확인 항목]'},{kind:'action',title:'다음 행동',detail:'내용을 읽은 다음 문의·신청'}]},
 audience:{where:'상품·서비스 소개 → 대상·지역 안내',patterns:[{kind:'hero',title:'이용 대상',detail:'[대상 고객] · [필요한 자격]'},{kind:'cost',title:'이용 지역',detail:'[가능한 지역] / [제외 지역]'}]},
 process:{where:'이용 안내 → 신청 버튼 근처',patterns:[{kind:'action',title:'문의·신청',detail:'어떤 버튼으로 시작하는지'},{kind:'faq',title:'조건 확인',detail:'필요한 정보와 준비사항'},{kind:'flow',title:'이용 시작',detail:'신청 후 진행 순서를 안내'}]},
 conditions:{where:'가격·일정 문구 바로 아래',patterns:[{kind:'cost',title:'비용을 나누기',detail:'[기본 비용] / [별도 비용]'},{kind:'flow',title:'일정 표시',detail:'[시작 기준] → [소요 기간]'},{kind:'faq',title:'조건 함께 쓰기',detail:'[적용 대상] · [변경·제외 조건]'}]},
 proof:{where:'경력·성과·사례를 소개한 문구 옆',patterns:[{kind:'proof',title:'어떤 사례인가요?',detail:'[대상] · [시점] · [진행 내용]'},{kind:'faq',title:'확인할 자료',detail:'해당 주장에 맞는 출처 연결'}]},
 support:{where:'혜택·지원 안내 문구 바로 아래',patterns:[{kind:'cost',title:'지원 범위',detail:'[지원하는 것] / [별도 확인할 것]'},{kind:'flow',title:'지원 기간',detail:'[시작 시점] → [종료 시점]'},{kind:'faq',title:'이용 조건',detail:'[대상] · [신청 방법] · [제외 조건]'}]},
};

export default function SiteContentOverview({report}:{report:MarketingReport}){
 const library=useMemo(()=>buildSourceLibrary(report),[report]);
 const facets=useMemo(()=>buildContentFacets(library),[library]);
 const [selected,setSelected]=useState<ContentFacetId>(()=>facets.find(f=>f.count)?.id||'offer');
 const active=facets.find(f=>f.id===selected)!;
 const [message,setMessage]=useState('');
 const example=examples[active.id];
 const label=report.sitePurpose?.kind==='commerce'?'상품':report.sitePurpose?.kind==='content'?'콘텐츠':report.sitePurpose?.kind==='organization'?'사업':'서비스';
 return <section className="report-card site-content-overview" id="report-content-evidence" aria-label="홈페이지 내용과 진단 이유">
  <header className="report-card-heading"><p className="report-eyebrow">01 · 홈페이지 내용 확인</p><h3>홈페이지의 {label}, 이렇게 읽었습니다</h3><p className="report-note">항목을 누르면 현재 문구와 보완할 내용을 나란히 볼 수 있습니다.</p></header>
  <div className="content-facet-tabs" role="group" aria-label="홈페이지 내용 관점">{facets.map(f=><button type="button" key={f.id} aria-pressed={selected===f.id} onClick={()=>{setSelected(f.id);setMessage('');}}><DiagnosisIcon axis={f.icon}/><strong>{f.id==='offer'&&report.sitePurpose?.kind==='commerce'?'상품·주제':f.label}</strong><small>{f.count?`관련 문구 ${f.count}개`:'추가 확인'}</small></button>)}</div>
  <div className="content-evidence-heading"><h4>{active.question}</h4><span>현재 문구 → 보완할 내용</span></div>
  <div className="content-evidence-layout"><div className="content-evidence-quotes"><RoleLabel role="current" label="현재 홈페이지 문구" kicker="원문"/>{active.evidence.length?active.evidence.slice(0,1).map(e=><blockquote key={e.id}><span>{e.kinds.includes('description')?'검색 설명':e.kinds.includes('title')?'검색 제목':e.heading||'홈페이지 본문'}</span><p>{e.excerpt}</p>{(e.truncated||e.excerpted)&&<small>일부 발췌 · 전체 내용은 원문 모음에서 확인</small>}</blockquote>):<p className="report-empty">이 내용을 설명하는 원문을 수집하지 못했습니다. 실제 페이지를 먼저 확인하세요.</p>}</div>
   <div className="content-evidence-reason"><RoleBox role="review" label="이 문구를 고른 이유"><p>{active.why}</p></RoleBox><RoleBox role="proposal" label="이렇게 보완하세요" kicker="수정 제안"><p>{active.action}</p></RoleBox></div></div>
  <PagePatternGrid patterns={example.patterns} label={`이렇게 배치하세요 · ${example.where}`}/>
  <footer className="content-evidence-footer"><ReportJumpLink id="report-site-guide">전체 원문·링크 확인</ReportJumpLink><button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText([active.label,...active.evidence.map(e=>`원문: ${e.text}`),`해석: ${active.why}`,`수정: ${active.action}`].join('\n\n'));setMessage('근거와 수정 방향을 복사했습니다.');}catch{setMessage('복사할 문구를 직접 선택해 주세요.');}}}>근거·수정안 복사</button>{message&&<span role="status">{message}</span>}</footer>
  <p className="report-note content-evidence-scope">홈페이지 문구 기준입니다. 후기·경력·수상 등을 외부에서 검증한 결과는 아닙니다.</p>
 </section>;
}
