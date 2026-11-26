'use client';
import React,{useState} from 'react';

export function CopyWork({text,label='작업 지시서 복사'}:{text:string|(()=>string);label?:string}) {
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState('');
 async function copy(){
  const value=typeof text==='function'?text():text;
  try{await navigator.clipboard.writeText(value);setStatus('복사했습니다.');setFallback('');}
  catch{setStatus('아래 내용을 직접 선택해 복사하세요.');setFallback(value);}
 }
 return <div className="work-copy"><button type="button" className="report-secondary-button" onClick={copy}>{label}</button><span role="status">{status}</span>{fallback&&<label>직접 복사할 내용<textarea readOnly value={fallback} rows={6} onFocus={e=>e.currentTarget.select()}/></label>}</div>;
}
