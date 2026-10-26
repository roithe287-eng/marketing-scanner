'use client';
import {CompactText} from './ReportVisualSummary';
import React,{useEffect,useState} from 'react';
import type {PageElement} from '@/lib/siteEditingSchema';
import {elementLocation} from '@/lib/guideGrounding';
import {elementLink} from '@/lib/siteGuidebook';
import {RoleBox} from './ReportRole';

export default function SourceElementCard({element,url,elements=[],nearby=false}:{element:PageElement;url:string;elements?:PageElement[];nearby?:boolean}) {
  const [message,setMessage]=useState(''),[copyFallback,setCopyFallback]=useState('');
  useEffect(()=>{setMessage('');setCopyFallback('');},[element.key]);
  const href=elementLink(url,element);
  const index=elements.findIndex(e=>e.key===element.key);
  const context=index<0?[element]:elements.slice(Math.max(0,index-2),index+3);
  const visibleText=!['title','description','image','form'].includes(element.kind);
  const findText=visibleText?element.text:undefined;
  async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setMessage(`${label} 복사했습니다.`);setCopyFallback('');}catch{setMessage('아래 내용을 직접 선택해 복사하세요.');setCopyFallback(text);}}
  return <article className="guide-element" data-element-key={element.key}>
    <header className="guide-element-heading"><strong>{nearby?'추가할 곳 주변의 원문':`선택한 원문 · ${element.kind==='image'?'이미지 설명':element.tag.toUpperCase()}`}</strong><small>문서 순서 {element.order}</small></header>
    <div className="guide-source-grid">
      <RoleBox role="current" label="수집한 원문" kicker="현재 내용"><blockquote>{element.text||'이미지 설명이 비어 있습니다.'}</blockquote></RoleBox>
      <RoleBox role="location" label="원문이 있는 위치"><p className="guide-context">{elementLocation(element)}</p><small>{element.kind==='title'||element.kind==='description'?'페이지 본문이 아닌 검색·공유 설정':element.kind==='image'?'화면 문구가 아닌 이미지 대체 설명':'수집 HTML의 구역·문서 순서 기준'}</small></RoleBox>
    </div>
    <details className="guide-source-context">
      <summary>수집 원문에서 위치 보기</summary>
      <p className="guide-note">수집 당시 문서 순서입니다. 테두리와 ‘선택한 항목’ 표시로 대상 요소를 구분했습니다.</p>
      <ol>{context.map(e=><li key={e.key} aria-current={e.key===element.key?'true':undefined}><span>{e.key===element.key?'선택한 항목':e.order<element.order?'앞의 내용':'뒤의 내용'} · {e.tag.toUpperCase()} · {e.order}</span><p>{e.text||'설명 없는 이미지'}</p></li>)}</ol>
    </details>
    <RoleBox role="verify" label="원문 확인 방법">
    <CompactText className="guide-note" text={element.kind==='image'?'이미지 설명은 화면에 보이는 문장이 아니므로 자동으로 이동하지 않을 수 있습니다. 위의 소속 구역과 아래 이미지 파일을 대조하세요.':element.kind==='title'||element.kind==='description'?'검색 제목·설명은 본문에 표시되지 않습니다. 페이지의 SEO 설정에서 이 값과 대조하세요.':'새 창에서 위치가 이동하지 않으면 Ctrl+F(맥은 ⌘F)를 누르고 복사한 문구를 붙여 넣으세요.'} summary={element.kind==='image'?'이미지 대체 설명 · 실제 이미지 파일과 대조':element.kind==='title'||element.kind==='description'?'검색 설정 값 · 본문이 아닌 SEO 설정에서 대조':'원문 이동이 안 되면 페이지 찾기(Ctrl+F / ⌘F) 사용'}/>
    <div className="guide-original-actions">
      {href&&<a href={href} target="_blank" rel="noopener noreferrer">실제 페이지의 {element.anchor?'해당 구역':'원문 문구'} 열기 ↗</a>}
      {findText&&<button type="button" onClick={()=>copy(findText.slice(0,160),'찾을 문구를')}>찾을 문구 복사</button>}
    </div>
    </RoleBox>
    <details className="guide-selector">
      <summary>개발자용 요소 위치 확인</summary>
      <p><strong>현재 선택: {element.tag.toUpperCase()} · 문서 순서 {element.order}</strong></p>
      <code>{element.selector}</code>
      <button type="button" className="report-secondary-button" onClick={()=>copy(element.selector,'요소 선택자를')}>선택자 복사</button>
      <p>실제 페이지에서 개발자 도구 → Elements(요소) → Ctrl+F(⌘F)에 붙여 넣으세요. 다른 원문을 선택하면 이 선택자와 아래 값도 함께 바뀝니다.</p>
      {element.attributes?.src&&<p>이미지 파일: <code>{element.attributes.src}</code></p>}
      {element.href&&<p>이 요소의 연결 주소: <code>{element.href}</code></p>}
      <small>개발자 도구의 변경은 내 브라우저에만 임시 적용됩니다. 저장·배포는 사이트 관리자나 원본 코드에서 진행하세요. 수집 이후 페이지가 바뀌었다면 새로 진단해 주세요.</small>
    </details>
    <p role="status" className="guide-note">{message}</p>
    {copyFallback&&<textarea readOnly aria-label="직접 복사할 위치 정보" value={copyFallback} rows={3}/>}
  </article>;
}
