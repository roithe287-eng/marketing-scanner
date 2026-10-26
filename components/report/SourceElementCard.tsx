'use client';
import React,{useEffect,useState} from 'react';
import type {PageElement} from '@/lib/siteEditingSchema';
import {elementLink} from '@/lib/siteGuidebook';

const labels:Record<string,string>={title:'검색 제목',description:'검색 설명',heading:'페이지 제목',text:'본문',image:'이미지 설명',cta:'링크·버튼',form:'입력 양식'};
function SourceGraphic({kind}:{kind:string}) {
 return <svg className="guide-source-graphic" viewBox="0 0 64 48" width="64" height="48" fill="none" aria-hidden="true" focusable="false">
  <rect x="3" y="3" width="58" height="42" rx="7" fill="white" stroke="currentColor" strokeOpacity=".35"/>
  <path d="M3 13h58" stroke="currentColor" strokeOpacity=".25"/><circle cx="10" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor" opacity=".4"/>
  {kind==='image'?<><rect x="13" y="19" width="38" height="19" rx="3" fill="currentColor" opacity=".12"/><path d="m15 35 10-9 8 7 7-5 9 8" stroke="currentColor" strokeWidth="2"/><circle cx="42" cy="24" r="3" fill="currentColor"/></>:
   kind==='cta'||kind==='form'?<><path d="M15 22h34" stroke="currentColor" strokeWidth="2" opacity=".35"/><rect x="19" y="29" width="26" height="9" rx="4.5" fill="currentColor"/><path d="M26 33.5h12m-3-2 3 2-3 2" stroke="white"/></>:
   <><path d="M13 22h38" stroke="currentColor" strokeWidth={kind==='title'||kind==='heading'?4:2.5} strokeLinecap="round"/><path d="M13 29h38m-38 7h26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".35"/></>}
 </svg>;
}
export default function SourceElementCard({element,url}:{element:PageElement;url:string;elements?:PageElement[];nearby?:boolean}) {
 const [message,setMessage]=useState(''),[copyFallback,setCopyFallback]=useState('');
 useEffect(()=>{setMessage('');setCopyFallback('');},[element.key]);
 const href=elementLink(url,element);
 async function copy(){try{await navigator.clipboard.writeText(element.text);setMessage('원문을 복사했습니다.');setCopyFallback('');}catch{setMessage('아래 원문을 선택해 복사하세요.');setCopyFallback(element.text);}}
 return <article className="guide-element" data-element-key={element.key} data-kind={element.kind}>
  <header className="guide-element-heading"><SourceGraphic kind={element.kind}/><strong>{labels[element.kind]||'수집 원문'}</strong><span className="guide-source-badge">원문</span></header>
  <blockquote>{element.text||(element.kind==='image'?'이미지 설명이 비어 있습니다.':'저장된 문구가 없습니다.')}</blockquote>
  <footer className="guide-original-actions">{element.text&&<button type="button" onClick={copy}><span aria-hidden="true">⧉</span> 원문 복사</button>}{href&&<a href={href} target="_blank" rel="noopener noreferrer">페이지 열기 ↗</a>}</footer>
  {message&&<p role="status" className="guide-note">{message}</p>}
  {copyFallback&&<textarea readOnly aria-label="직접 복사할 원문" value={copyFallback} rows={3}/>}
 </article>;
}
