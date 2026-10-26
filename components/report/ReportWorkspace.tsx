'use client';
import React,{createContext,useContext,useEffect,useState} from 'react';
import {revealReportTarget} from './ReportJumpLink';

type Selection={chapter:string;panels:Record<string,string>};
const WorkspaceContext=createContext<Selection|null>(null);
export function ReportWorkspace({children}:{children:React.ReactNode}){
 const [selection,setSelection]=useState<Selection>({chapter:'overview',panels:{}});
 useEffect(()=>{
  const report=document.getElementById('report-area');
  if(!report)return;
  const chapters=Array.from(report.querySelectorAll<HTMLElement>('[data-chapter]'));
  let frame=0;
  const update=()=>{
   frame=0;
   const anchorOffset=chapters[0]?parseFloat(getComputedStyle(chapters[0]).scrollMarginTop)||0:0;
   const line=Math.max(report.querySelector('.report-nav')?.getBoundingClientRect().bottom||0,anchorOffset)+8;
   const active=chapters.filter(chapter=>chapter.getBoundingClientRect().top<=line).at(-1)||chapters[0];
   const chapter=active?.dataset.chapter;
   const panels=active?Array.from(active.querySelectorAll<HTMLElement>('[data-report-panel]')):[];
   const panel=(panels.filter(item=>item.getBoundingClientRect().top<=line).at(-1)||panels[0])?.dataset.reportPanel;
   if(chapter)setSelection(previous=>previous.chapter===chapter&&(!panel||previous.panels[chapter]===panel)?previous:{chapter,panels:panel?{...previous.panels,[chapter]:panel}:previous.panels});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);observer.observe(report);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame)cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{
  const activate=(event:Event)=>{
   const id=(event as CustomEvent<{id:string}>).detail?.id,target=id?document.getElementById(id):null;
   const chapter=target?.closest<HTMLElement>('[data-chapter]')?.dataset.chapter;
   const panel=target?.closest<HTMLElement>('[data-report-panel]')?.dataset.reportPanel;
   if(chapter)setSelection(previous=>({chapter,panels:panel?{...previous.panels,[chapter]:panel}:previous.panels}));
  };
  const fromHash=()=>{let id='';try{id=decodeURIComponent(window.location.hash.slice(1));}catch{return;}if(id)revealReportTarget(id,false);else setSelection(p=>({...p,chapter:'overview'}));};
  const fromLink=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element)?.closest<HTMLAnchorElement>('a[href^="#"]');
   if(!link?.closest('#report-area'))return;
   const id=link.getAttribute('href')!.slice(1);
   if(revealReportTarget(id))event.preventDefault();
  };
  document.addEventListener('report:reveal',activate);document.addEventListener('click',fromLink);
  window.addEventListener('hashchange',fromHash);window.addEventListener('popstate',fromHash);fromHash();
  return()=>{document.removeEventListener('report:reveal',activate);document.removeEventListener('click',fromLink);window.removeEventListener('hashchange',fromHash);window.removeEventListener('popstate',fromHash);};
 },[]);
 return <WorkspaceContext.Provider value={selection}>{children}</WorkspaceContext.Provider>;
}
export function useReportSelection(){return useContext(WorkspaceContext);}
export function ReportSections({chapter,items}:{chapter:string;items:{id:string;label:string;children:React.ReactNode}[]}){
 const selection=useReportSelection(),selected=items.some(i=>i.id===selection?.panels[chapter])?selection!.panels[chapter]:items[0]?.id;
 return <div className="report-section-workspace"><nav className="report-section-nav" aria-label={`${chapter} 세부 목차`}>{items.map(item=><a key={item.id} href={`#report-view-${item.id}`} aria-current={selected===item.id?'location':undefined} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(revealReportTarget(`report-view-${item.id}`))event.preventDefault();}}>{item.label}</a>)}</nav>
  {items.map(item=><section key={item.id} id={`report-view-${item.id}`} data-report-panel={item.id} aria-label={item.label} className="report-section-panel"><div className="report-stack">{item.children}</div></section>)}
 </div>;
}
export function ReportNavigation({chapters}:{chapters:readonly (readonly [string,string])[]}){
 const selection=useReportSelection();
 return <nav className="report-nav" aria-label="보고서 목차">{chapters.map(([id,label],i)=><a key={id} href={`#report-${id}`} aria-current={selection?.chapter===id?'location':undefined} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(revealReportTarget(`report-${id}`))event.preventDefault();}}><span>0{i+1}</span>{label}</a>)}</nav>;
}
