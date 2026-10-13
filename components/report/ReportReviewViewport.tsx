'use client';
import React,{useState} from 'react';

/** Preview-only fixture harness. The server route remains disabled in production. */
export default function ReportReviewViewport(){
  const [width,setWidth]=useState('100%');
  return <main style={{background:'#e9eef5',minHeight:'100vh'}}>
    <header style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:10,padding:'12px 16px'}}>
      <strong>가상 보고서 화면 검수</strong>
      {([['100%','데스크톱'],['390px','모바일 390px'],['320px','모바일 320px']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={width===value} onClick={()=>setWidth(value)} style={{padding:'8px 12px',border:'1px solid #bccbe1',borderRadius:8,background:width===value?'#2454c6':'white',color:width===value?'white':'#173253'}}>{label}</button>)}
    </header>
    <iframe title="진단 결과 검수 화면" src="/review/report?frame=1" style={{display:'block',margin:'0 auto',border:0,width,maxWidth:'100%',height:'calc(100vh - 70px)',background:'white'}}/>
  </main>;
}
