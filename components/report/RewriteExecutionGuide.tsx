"use client";
import React,{useId,useState} from 'react';
import {fillRewriteTemplate,rewriteFields,rewriteInstruction,type ExecutableRewrite,type RewriteValues} from '@/lib/keywordExecution';

export default function RewriteExecutionGuide({plan,values,onChange}:{plan:ExecutableRewrite;values:RewriteValues;onChange:(token:string,value:string)=>void}) {
  const id=useId(),[message,setMessage]=useState('');
  const g=plan.guide,preview=fillRewriteTemplate(plan.template,values),remaining=rewriteFields(preview).length;
  return <details className="report-execution-guide">
    <summary><span><strong>이 URL에서 따라하기</strong><small>원문 근거 → 수정 순서 → 문장 완성 → 완료 확인</small></span><b aria-hidden="true">+</b></summary>
    <div className="report-execution-content">
      <div className="report-execution-source"><span className="report-pill">{g.evidence.length?'원문 근거 연결':'문구 위치 확인 필요'}</span><h5>{g.site}</h5>{g.url&&<a href={g.url} target="_blank" rel="noopener noreferrer">{g.url} ↗</a>}<p className="report-note">{g.coverage}</p>
        {g.evidence.length?g.evidence.map((e,i)=><blockquote key={`${e.label}-${i}`}><span>{e.label}</span><p>{e.text}</p></blockquote>):<p className="report-empty">이 표현과 일치하는 원문을 저장된 범위에서 찾지 못했습니다. 페이지에 없다는 뜻은 아닙니다. 먼저 원문에서 위치를 확인하세요.</p>}
      </div>
      <ol className="report-execution-steps">{g.steps.map((s,i)=><li key={s.title}><span aria-hidden="true">0{i+1}</span><div><h5>{s.title}</h5><p>{s.detail}</p></div></li>)}</ol>
      <div className="report-rewrite-workbench"><h5>내 정보로 문장 완성하기</h5><p className="report-note">실제 확인한 내용만 입력하세요. 입력한 초안은 이 화면에서만 유지됩니다. 공유·PDF에는 저장된 진단의 실행 가이드와 작성 틀이 담기며, 입력 초안은 복사해 사용하세요.</p>
        <div className="report-rewrite-fields">{g.fields.map((f,i)=><label key={f.token} htmlFor={`${id}-${i}`}><span>{f.label}</span><input id={`${id}-${i}`} type="text" value={values[f.token]||''} onChange={e=>onChange(f.token,e.target.value)} maxLength={240} placeholder="확인한 실제 내용 입력" aria-label={`${plan.item.keyword} · ${f.label}`} aria-describedby={`${id}-hint-${i}`}/><small id={`${id}-hint-${i}`}>{f.hint}</small></label>)}</div>
        <div className="report-draft-preview" aria-label={`${plan.item.keyword} 작성 초안`}><div><strong>작성 초안 · 사실 확인 후 사용</strong><span role="status">{remaining?`채울 괄호 ${remaining}개`:'괄호 입력 완료 · 사실 재확인 필요'}</span></div><p>{preview}</p></div>
        <button type="button" className="report-secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(rewriteInstruction(plan,values));setMessage('입력한 초안과 수정 순서를 복사했습니다.');}catch{setMessage('복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');}}} aria-label={`${plan.item.keyword} 작성 초안과 작업 지시서 복사`}>초안·작업 지시서 복사</button><p role="status" className="report-note">{message}</p>
      </div>
      <div className="report-execution-checks"><h5>반영 후 완료 확인</h5><ul>{g.checks.map(check=><li key={check}><span aria-hidden="true">□</span>{check}</li>)}</ul></div>
    </div>
  </details>;
}
