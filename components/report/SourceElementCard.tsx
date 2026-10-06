'use client';
import React,{useEffect,useState} from 'react';
import type {PageElement} from '@/lib/siteEditingSchema';
import {elementLocation} from '@/lib/guideGrounding';
import {elementLink} from '@/lib/siteGuidebook';
import {safeHttpUrl} from '@/lib/citationMeasurement';

export default function SourceElementCard({element,url,elements=[],nearby=false}:{element:PageElement;url:string;elements?:PageElement[];nearby?:boolean}) {
  const [message,setMessage]=useState(''),[copyFallback,setCopyFallback]=useState('');
  useEffect(()=>{setMessage('');setCopyFallback('');},[element.key]);
  const href=elementLink(url,element),pageUrl=safeHttpUrl(url);
  const index=elements.findIndex(e=>e.key===element.key);
  const context=index<0?[element]:elements.slice(Math.max(0,index-2),index+3);
  const visibleText=!['title','description','image','form'].includes(element.kind);
  const findText=visibleText?element.text:element.section?.label||element.heading;
  async function copy(text:string,label:string){try{await navigator.clipboard.writeText(text);setMessage(`${label} 복사했습니다.`);setCopyFallback('');}catch{setMessage('아래 내용을 직접 선택해 복사하세요.');setCopyFallback(text);}}
  return <article className="guide-element" data-element-key={element.key}>
    <div><span>{nearby?'추가할 곳 주변의 원문':`선택한 원문 · ${element.kind==='image'?'이미지 설명':element.tag.toUpperCase()}`}</span><small>문서 순서 {element.order}</small></div>
    <p className="guide-context"><strong>위치</strong> {elementLocation(element)}</p>
    <blockquote>{element.text||'이미지 설명이 비어 있습니다.'}</blockquote>
    <details className="guide-source-context">
      <summary>수집 원문에서 위치 보기</summary>
      <p className="guide-note">수집 당시 문서 순서입니다. 테두리와 ‘선택한 항목’ 표시로 대상 요소를 구분했습니다.</p>
      <ol>{context.map(e=><li key={e.key} aria-current={e.key===element.key?'true':undefined}><span>{e.key===element.key?'선택한 항목':e.order<element.order?'앞의 내용':'뒤의 내용'} · {e.tag.toUpperCase()} · {e.order}</span><p>{e.text||'설명 없는 이미지'}</p></li>)}</ol>
    </details>
    <div className="guide-original-actions">
      {href&&<a href={href} target="_blank" rel="noopener noreferrer">실제 페이지의 {element.anchor?'해당 구역':'원문 문구'} 열기 ↗</a>}
      {!href&&pageUrl&&<a href={pageUrl} target="_blank" rel="noopener noreferrer">실제 페이지 열기 ↗</a>}
      {findText&&<button type="button" onClick={()=>copy(findText.slice(0,160),'찾을 문구를')}>찾을 문구 복사</button>}
    </div>
    <p className="guide-note">{element.kind==='image'?'이미지 설명은 화면에 보이는 문장이 아니므로 자동으로 이동하지 않을 수 있습니다. 위의 소속 구역과 아래 이미지 파일을 대조하세요.':element.kind==='title'||element.kind==='description'?'검색 제목·설명은 본문에 표시되지 않습니다. 페이지의 SEO 설정에서 이 값과 대조하세요.':'새 창에서 위치가 이동하지 않으면 Ctrl+F(맥은 ⌘F)를 누르고 복사한 문구를 붙여 넣으세요.'}</p>
    <details className="guide-selector">
      <summary>개발자용 정확한 요소 위치</summary>
      <p><strong>현재 선택: {element.tag.toUpperCase()} · 문서 순서 {element.order}</strong></p>
      <code>{element.selector}</code>
      <button type="button" className="report-secondary-button" onClick={()=>copy(element.selector,'요소 선택자를')}>선택자 복사</button>
      <p>실제 페이지에서 개발자 도구 → Elements(요소) → Ctrl+F(⌘F)에 붙여 넣으세요. 다른 원문을 선택하면 이 선택자와 아래 값도 함께 바뀝니다.</p>
      {element.attributes?.src&&<p>이미지 파일: <code>{element.attributes.src}</code></p>}
      {element.href&&<p>이 요소의 연결 주소: <code>{element.href}</code></p>}
      <small>수집 이후 페이지가 바뀌었다면 새로 진단해 주세요.</small>
    </details>
    <p role="status" className="guide-note">{message}</p>
    {copyFallback&&<textarea readOnly aria-label="직접 복사할 위치 정보" value={copyFallback} rows={3}/>}
  </article>;
}
