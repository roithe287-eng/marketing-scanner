'use client';
import React,{useEffect,useId,useState} from 'react';
import {revealReportTarget} from './ReportJumpLink';

type ItemSelection={id:string;onSelect:(id:string)=>void};

/** A bounded detail view with all deep-link targets retained in the document. */
export default function ReportItemPanels({id,label,items,briefing=false,selection}:{id:string;label:string;items:{id:string;label:string;status?:{label:string;code:string};children:React.ReactNode;followup?:React.ReactNode}[];briefing?:boolean;selection?:ItemSelection}){
 const control=useId(),[selected,setSelected]=useState('');
 const desired=selection?.id??selected,onSelect=selection?.onSelect??setSelected;
 const active=items.some(item=>item.id===desired)?desired:items[0]?.id;
 const index=items.findIndex(item=>item.id===active);
 useEffect(()=>{
  const reveal=(event:Event)=>{
   const targetId=(event as CustomEvent<{id:string}>).detail?.id;
   let element=targetId?document.getElementById(targetId):null;
   while(element){if(element.dataset.reportItemGroup===id&&element.dataset.reportItem){onSelect(element.dataset.reportItem);break;}element=element.parentElement;}
  };
  document.addEventListener('report:reveal',reveal);
  return()=>document.removeEventListener('report:reveal',reveal);
 },[id,onSelect]);
 if(!items.length)return null;
 if(briefing)return <div className="briefing-reader" data-page-model="briefing">
   {items.length>1&&<nav className="question-status-map" aria-label="질문별 답변 준비 상태">
     <div className="question-status-heading"><strong>어떤 질문에 답할 근거가 있나요?</strong><span>고객 질문 {items.length}개</span></div>
     <ul style={{'--question-columns':Math.min(4,items.length)} as React.CSSProperties}>{items.map((item,i)=>{
       const target=id+'-'+(i+1);
       return <li key={item.id}><a href={'#'+target} aria-controls={target} aria-current={active===item.id?'true':undefined}
         onClick={event=>{
           if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
           if(revealReportTarget(target))event.preventDefault();
         }}>
         {item.status&&<span className="question-status-label" data-status={item.status.code}>{item.status.label}</span>}
         <span className="question-status-title">{item.label}</span>
       </a></li>;
     })}</ul>
   </nav>}
   {items.map((item,i)=><div key={item.id} id={id+'-'+(i+1)} data-report-item-group={id} data-report-item={item.id} hidden={active!==item.id} className="report-item-panel">{item.children}{item.followup}</div>)}
 </div>;
 return <div className="report-item-workspace">
  <div className="report-item-navigation"><label htmlFor={control}>{label}<select id={control} value={active} onChange={event=>onSelect(event.target.value)}>{items.map((item,i)=><option key={item.id} value={item.id}>{i+1}. {item.label}</option>)}</select></label><div><button type="button" disabled={index===0} aria-label={`${label} 이전 항목`} onClick={()=>onSelect(items[index-1].id)}>이전</button><span aria-live="polite">{index+1} / {items.length}</span><button type="button" disabled={index+1>=items.length} aria-label={`${label} 다음 항목`} onClick={()=>onSelect(items[index+1].id)}>다음</button></div></div>
  {items.map(item=><div key={item.id} data-report-item-group={id} data-report-item={item.id} hidden={active!==item.id} className="report-item-panel">{item.children}</div>)}
 </div>;
}
