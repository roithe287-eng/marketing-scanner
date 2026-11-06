'use client';
import React,{useEffect,useId,useState} from 'react';
import ReportJumpLink from './ReportJumpLink';

/** A bounded detail view with all deep-link targets retained in the document. */
export default function ReportItemPanels({id,label,items,briefing=false}:{id:string;label:string;items:{id:string;label:string;children:React.ReactNode;followup?:React.ReactNode}[];briefing?:boolean}){
 const control=useId(),[selected,setSelected]=useState('');
 const active=items.some(item=>item.id===selected)?selected:items[0]?.id;
 const index=items.findIndex(item=>item.id===active);
 useEffect(()=>{
  const reveal=(event:Event)=>{
   const targetId=(event as CustomEvent<{id:string}>).detail?.id;
   let element=targetId?document.getElementById(targetId):null;
   while(element){if(element.dataset.reportItemGroup===id&&element.dataset.reportItem){setSelected(element.dataset.reportItem);break;}element=element.parentElement;}
  };
  document.addEventListener('report:reveal',reveal);
  return()=>document.removeEventListener('report:reveal',reveal);
 },[id]);
 if(!items.length)return null;
 if(briefing)return <div className="briefing-reader" data-page-model="briefing">
   {items.map((item,i)=><div key={item.id} id={id+'-'+(i+1)} data-report-item-group={id} data-report-item={item.id} hidden={active!==item.id} className="report-item-panel">{item.children}</div>)}
   {items.length>1&&<nav className="briefing-related" aria-label="관련 질문"><strong>관련 질문</strong>
     <div>{items.map((item,i)=>active!==item.id&&<ReportJumpLink key={item.id} id={id+'-'+(i+1)} className="briefing-next">{item.label}</ReportJumpLink>)}</div>
   </nav>}
   {items[index]?.followup}
 </div>;
 return <div className="report-item-workspace">
  <div className="report-item-navigation"><label htmlFor={control}>{label}<select id={control} value={active} onChange={event=>setSelected(event.target.value)}>{items.map((item,i)=><option key={item.id} value={item.id}>{i+1}. {item.label}</option>)}</select></label><div><button type="button" disabled={index===0} aria-label={`${label} 이전 항목`} onClick={()=>setSelected(items[index-1].id)}>이전</button><span aria-live="polite">{index+1} / {items.length}</span><button type="button" disabled={index+1>=items.length} aria-label={`${label} 다음 항목`} onClick={()=>setSelected(items[index+1].id)}>다음</button></div></div>
  {items.map(item=><div key={item.id} data-report-item-group={id} data-report-item={item.id} hidden={active!==item.id} className="report-item-panel">{item.children}</div>)}
 </div>;
}
