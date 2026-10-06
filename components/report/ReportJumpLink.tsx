'use client';
import React from 'react';

/** Reveal the destination before scrolling so links into closed task groups work. */
export function revealReportTarget(id:string) {
  const target=document.getElementById(id);
  if(!target)return false;
  let parent:HTMLElement|null=target;
  while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
  if(target instanceof HTMLButtonElement&&target.dataset.reportTab==='true')target.click();
  requestAnimationFrame(()=>{
    target.scrollIntoView({behavior:'instant',block:'start'});
    target.tabIndex=-1;target.focus({preventScroll:true});
  });
  return true;
}
export default function ReportJumpLink({id,children,className='work-link'}:{id:string;children:React.ReactNode;className?:string}) {
  return <a className={className} href={`#${id}`} onClick={event=>{if(revealReportTarget(id))event.preventDefault();}}>{children}<span aria-hidden="true">→</span></a>;
}
