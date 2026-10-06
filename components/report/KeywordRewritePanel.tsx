"use client";
import {keywordFrequencyScope} from '@/lib/keywordFrequencyPresentation';
import {Guidebook} from './SiteGuidebook';
import React,{useMemo,useState} from 'react';
import RewriteExecutionGuide from './RewriteExecutionGuide';
import {buildExecutableRewrites,fillRewriteTemplate,rewriteInstruction,type ExecutableRewrite,type RewriteValues} from '@/lib/keywordExecution';
import type {MarketingReport} from '@/lib/reportSchema';
import {KEYWORD_REWRITE_NOTE,rewriteKinds} from '@/lib/keywordRewrite';
function RewriteCard({plan,values,onChange}:{plan:ExecutableRewrite;values:RewriteValues;onChange:(token:string,value:string)=>void}) {
  const [message,setMessage]=useState('');
  return <article className="report-rewrite-card">
    <header><div><span className="report-pill">{plan.kind}</span><h4>{plan.item.keyword}</h4></div><span>{plan.item.count}회 · {plan.item.density}%</span></header>
    <div className="report-rewrite-comparison"><div><span className="report-eyebrow"><b className="report-rewrite-step" aria-hidden="true">01</b> 현재 문구의 문제</span><p>{plan.reason}</p></div><div><span className="report-eyebrow"><b className="report-rewrite-step" aria-hidden="true">02</b> 바꿀 내용</span><p>{plan.action}</p></div></div>
    <div className="report-rewrite-template"><span>작성 틀 · 괄호 안을 확인된 사실로 교체</span><p>{plan.template.split(/(\[[^\]\n]+\])/g).map((part,i)=>part.startsWith('[')&&part.endsWith(']')?<mark key={i}>{part}</mark>:part)}</p></div>
    <Guidebook title={`반복 표현 · ${plan.item.keyword}`} keyword={plan.item.keyword} topic={plan.kind==='배치'?'title':'content'} proposal={fillRewriteTemplate(plan.template,values)}/><p className="report-rewrite-placement"><strong>권장 위치</strong> {plan.placement}</p>
    <RewriteExecutionGuide plan={plan} values={values} onChange={onChange}/>
    <div className="report-copy"><button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(rewriteInstruction(plan,values));setMessage('URL 근거와 단계별 실행 가이드를 복사했습니다.');}catch{setMessage('복사하지 못했습니다. 아래 작업 지시서를 펼쳐 직접 선택해 주세요.');}}} aria-label={`${plan.item.keyword} 수정안 복사`}>수정안 복사</button><span role="status">{message}</span></div><details className="report-copy-fallback"><summary>작업 지시서 보기 · 직접 선택해 복사</summary><textarea readOnly rows={8} aria-label={`${plan.item.keyword} TO-BE 작업 지시서`} value={rewriteInstruction(plan,values)} onFocus={event=>event.currentTarget.select()}/></details>
  </article>;
}
export default function KeywordRewritePanel({report}:{report:MarketingReport}) {
  const plans=useMemo(()=>buildExecutableRewrites(report),[report]);
  const [drafts,setDrafts]=useState<Record<string,RewriteValues>>({}),[query,setQuery]=useState(''),[copyMessage,setCopyMessage]=useState('');
  const [tab,setTab]=useState<'singles'|'phrases'>('singles'),[filter,setFilter]=useState('전체'),[expanded,setExpanded]=useState(false);
  const all=plans[tab],filtered=all.filter(p=>(filter==='전체'||p.kind===filter)&&p.item.keyword.toLowerCase().includes(query.trim().toLowerCase())),shown=expanded?filtered:filtered.slice(0,4);
  const reset=()=>{setFilter('전체');setExpanded(false);setQuery('');};
  return <section className="report-card report-rewrite" aria-label="반복 표현 수정 제안">
    <div className="report-card-heading"><p className="report-eyebrow">CONTENT REWRITE · AS-IS → TO-BE</p><h3>반복 표현, 어떻게 바꿀까요?</h3><p className="report-note">{KEYWORD_REWRITE_NOTE}</p>{report.keywordFrequency&&<p className="report-note keyword-scope-note">{keywordFrequencyScope(report.keywordFrequency)}</p>}</div>
    <div className="report-filter-row" role="group" aria-label="TO-BE 표현 단위"><button type="button" aria-pressed={tab==='singles'} onClick={()=>{setTab('singles');reset();}}>단어</button><button type="button" aria-pressed={tab==='phrases'} onClick={()=>{setTab('phrases');reset();}}>연속어구</button></div>
    <div className="report-rewrite-tools"><label><span>표현 찾기</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setExpanded(false);}} placeholder="수정할 단어를 입력하세요"/></label><button type="button" className="report-secondary-button" disabled={!filtered.length} onClick={async()=>{try{await navigator.clipboard.writeText(filtered.map(p=>rewriteInstruction(p,drafts[p.id]||{})).join('\n\n────────\n\n'));setCopyMessage(`현재 필터의 ${filtered.length}개 작업 지시서를 복사했습니다.`);}catch{setCopyMessage('복사하지 못했습니다. 각 항목에서 다시 시도해 주세요.');}}}>{filtered.length}개 작업 지시서 복사</button></div><p role="status" className="report-note">{copyMessage}</p>
    <div className="report-rewrite-kinds" role="group" aria-label="TO-BE 수정 방향 필터">{rewriteKinds.map((kind,i)=>{const count=all.filter(p=>p.kind===kind).length;return <button type="button" key={kind} aria-pressed={filter===kind} onClick={()=>{setFilter(filter===kind?'전체':kind);setExpanded(false);}}><span className="report-index">0{i+1}</span><strong>{kind}</strong><b>{count}<small>개</small></b><span className="report-meter" aria-hidden="true"><i style={{width:`${all.length?count/all.length*100:0}%`}}/></span></button>;})}</div>
    <div className="report-rewrite-result"><p role="status">{filter} · {filtered.length}개 제안 {filtered.length>shown.length&&`중 ${shown.length}개 표시`}</p>{filter!=='전체'&&<button type="button" onClick={reset}>전체 보기</button>}</div>
    {shown.length?<div className="report-rewrite-grid">{shown.map(plan=><RewriteCard key={plan.id} plan={plan} values={drafts[plan.id]||{}} onChange={(token,value)=>setDrafts(previous=>({...previous,[plan.id]:{...previous[plan.id],[token]:value}}))}/>)}</div>:<p className="report-empty">{all.length?'이 방향에 해당하는 표현이 없습니다.':'반복 표현 데이터가 없거나 조건에 맞는 항목이 없습니다.'}</p>}
    {filtered.length>4&&<button type="button" className="report-secondary-button mt-4" onClick={()=>setExpanded(!expanded)}>{expanded?'TO-BE 목록 접기':`전체 ${filtered.length}개 TO-BE 보기`}</button>}

  </section>;
}
