"use client";
import React,{useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildKeywordRewrites,KEYWORD_REWRITE_NOTE,rewriteClipboard,rewriteKinds,type KeywordRewrite} from '@/lib/keywordRewrite';
function RewriteCard({plan}:{plan:KeywordRewrite}) {
  const [message,setMessage]=useState('');
  return <article className="report-rewrite-card">
    <header><div><span className="report-pill">{plan.kind}</span><h4>{plan.item.keyword}</h4></div><span>{plan.item.count}회 · {plan.item.density}%</span></header>
    <div className="report-rewrite-comparison"><div><span className="report-eyebrow">AS-IS · 확인한 내용</span><p>{plan.reason}</p></div><div><span className="report-eyebrow">TO-BE · 수정 방향</span><p>{plan.action}</p></div></div>
    <div className="report-rewrite-template"><span>작성 틀 · 괄호 안을 확인된 사실로 교체</span><p>{plan.template}</p></div>
    <p className="report-rewrite-placement"><strong>권장 위치</strong> {plan.placement}</p>
    <details className="report-inline-details"><summary>근거와 완료 기준 확인</summary><div className="report-evidence"><strong>{plan.sourceLabel}</strong><p>{plan.source||'원문 문장이 없어 실제 문장을 수정한 결과 대신 작성 틀을 제공합니다.'}</p><strong>완료 확인</strong><p>{plan.check}</p></div></details>
    <div className="report-copy"><button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(rewriteClipboard(plan));setMessage('TO-BE 제안을 복사했습니다.');}catch{setMessage('복사하지 못했습니다. 아래 내용을 직접 선택해 주세요.');}}} aria-label={`${plan.item.keyword} TO-BE 복사`}>TO-BE 복사</button><span role="status">{message}</span></div>
  </article>;
}
export default function KeywordRewritePanel({report}:{report:MarketingReport}) {
  const plans=useMemo(()=>buildKeywordRewrites(report.keywordFrequency,report.meta),[report.keywordFrequency,report.meta]);
  const [tab,setTab]=useState<'singles'|'phrases'>('singles'),[filter,setFilter]=useState('전체'),[expanded,setExpanded]=useState(false);
  const all=plans[tab],filtered=all.filter(p=>filter==='전체'||p.kind===filter),shown=expanded?filtered:filtered.slice(0,4);
  const reset=()=>{setFilter('전체');setExpanded(false);};
  return <section className="report-card report-rewrite" aria-label="반복 표현 TO-BE 제안">
    <div className="report-card-heading"><p className="report-eyebrow">CONTENT REWRITE · AS-IS → TO-BE</p><h3>반복 표현, 어떻게 바꿀까요?</h3><p className="report-note">{KEYWORD_REWRITE_NOTE}</p></div>
    <div className="report-filter-row" role="group" aria-label="TO-BE 표현 단위"><button type="button" aria-pressed={tab==='singles'} onClick={()=>{setTab('singles');reset();}}>단어</button><button type="button" aria-pressed={tab==='phrases'} onClick={()=>{setTab('phrases');reset();}}>연속어구</button></div>
    <div className="report-rewrite-kinds" role="group" aria-label="TO-BE 수정 방향 필터">{rewriteKinds.map((kind,i)=>{const count=all.filter(p=>p.kind===kind).length;return <button type="button" key={kind} aria-pressed={filter===kind} onClick={()=>{setFilter(filter===kind?'전체':kind);setExpanded(false);}}><span className="report-index">0{i+1}</span><strong>{kind}</strong><b>{count}<small>개</small></b><span className="report-meter" aria-hidden="true"><i style={{width:`${all.length?count/all.length*100:0}%`}}/></span></button>;})}</div>
    <div className="report-rewrite-result"><p role="status">{filter} · {filtered.length}개 제안 {filtered.length>shown.length&&`중 ${shown.length}개 표시`}</p>{filter!=='전체'&&<button type="button" onClick={reset}>전체 보기</button>}</div>
    {shown.length?<div className="report-rewrite-grid">{shown.map(plan=><RewriteCard key={plan.id} plan={plan}/>)}</div>:<p className="report-empty">{all.length?'이 방향에 해당하는 표현이 없습니다.':'반복 표현 데이터가 없거나 조건에 맞는 항목이 없습니다.'}</p>}
    {filtered.length>4&&<button type="button" className="report-secondary-button mt-4" onClick={()=>setExpanded(!expanded)}>{expanded?'TO-BE 목록 접기':`전체 ${filtered.length}개 TO-BE 보기`}</button>}
    <div className="report-placement-guide"><h4>같은 말을 늘리기보다, 위치마다 다른 정보로</h4><ol>{[['첫 화면','누구에게 · 무엇을 제공하는지'],['서비스 본문','업무 범위 · 방식 · 산출물'],['근거 영역','확인한 사례 · 조건 · 출처'],['FAQ·문의','고객 질문 · 답변 · 다음 행동']].map(([label,note],i)=><li key={label}><span>0{i+1}</span><strong>{label}</strong><p>{note}</p></li>)}</ol></div>
  </section>;
}
