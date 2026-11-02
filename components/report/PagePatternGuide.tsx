import React from 'react';
import {SourceSketch} from './ReportVisualSummary';
import {plainGuide,type PagePattern} from '@/lib/reportPlainLanguage';
import type {GuideTopic} from '@/lib/guideKnowledge';

export function PagePatternGrid({patterns,label='홈페이지에 배치할 구성 예시'}:{patterns:PagePattern[];label?:string}){
 return <figure className="page-pattern-guide" aria-label={label}>
  <figcaption><strong>{label}</strong><span>구성 예시 · 실제 화면 캡처 아님</span></figcaption>
  <div className="page-pattern-grid" style={{'--pattern-columns':patterns.length} as React.CSSProperties}>{patterns.map((p,i)=><div className="page-pattern-card" key={p.title}><SourceSketch type={p.kind}/><span className="page-pattern-number">0{i+1}</span><strong>{p.title}</strong><small>{p.detail}</small></div>)}</div>
 </figure>;
}

/** Explain jargon beside the original scoped finding, without changing the finding. */
export default function PagePatternGuide({title,topic}:{title:string;topic?:GuideTopic}){
 const guide=plainGuide(title,topic);
 return <aside className="plain-page-guide" aria-label="이 항목을 쉽게 이해하기">
  <div className="plain-page-meaning"><span>쉽게 말하면</span><p>{guide.meaning}</p></div>
  <PagePatternGrid patterns={guide.patterns}/>
 </aside>;
}
