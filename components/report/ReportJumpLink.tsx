'use client';
import React from 'react';

/** Reveal the destination before scrolling so links into closed task groups work. */
export function revealReportTarget(id:string,updateHistory=true) {
  const target=document.getElementById(id);
  if(!target)return false;
  document.dispatchEvent(new CustomEvent('report:reveal',{detail:{id}}));
  if(updateHistory&&window.location.hash!==`#${id}`)window.history.pushState(null,'',`#${id}`);
  let parent:HTMLElement|null=target;
  while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
  if(target instanceof HTMLButtonElement&&target.dataset.reportTab==='true')target.click();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    target.scrollIntoView({behavior:'instant',block:'start'});
    if(!target.matches('button,input,select,textarea,a[href]'))target.tabIndex=-1;target.focus({preventScroll:true});
  }));
  return true;
}
export default function ReportJumpLink({id,children,className='work-link'}:{id:string;children:React.ReactNode;className?:string}) {
  return <a className={className} href={`#${id}`} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(revealReportTarget(id))event.preventDefault();}}>{children}<span aria-hidden="true">→</span></a>;
}
