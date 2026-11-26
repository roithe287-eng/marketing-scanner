'use client';
import React,{useEffect} from 'react';

type ReportLocation={id:string;container?:HTMLElement};
/** Let a filtered or paginated panel materialize the exact requested item. */
export function useReportLocator(containerId:string,locate:(id:string)=>boolean){
 useEffect(()=>{
  const handle=(event:Event)=>{
   const detail=(event as CustomEvent<ReportLocation>).detail;
   const host=document.getElementById(containerId);
   if(host&&!detail.container&&locate(detail.id))detail.container=host;
  };
  document.addEventListener('report:locate',handle);
  return ()=>document.removeEventListener('report:locate',handle);
 },[containerId,locate]);
}
function openAncestors(element:HTMLElement){
 for(let node:HTMLElement|null=element;node;node=node.parentElement)if(node instanceof HTMLDetailsElement)node.open=true;
}
let navigation=0;
export function revealReportTarget(id:string,updateHistory=true) {
 const location:ReportLocation={id};
 let target=document.getElementById(id);
 if(!target){
  document.dispatchEvent(new CustomEvent('report:locate',{detail:location}));
  target=location.container||null;
 }
 if(!target)return false;
 const visit=++navigation;
 document.dispatchEvent(new CustomEvent('report:reveal',{detail:{id,target}}));
 const hash='#'+encodeURIComponent(id);
 if(updateHistory&&window.location.hash!==hash)window.history.pushState(window.history.state,'',hash);
 openAncestors(target);
 const section=target.matches('[data-report-panel]')?target.querySelector(':scope > .section-reading'):null;
 if(section instanceof HTMLDetailsElement)section.open=true;
 if(target instanceof HTMLButtonElement&&target.dataset.reportTab==='true')target.click();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const destination=document.getElementById(id);
  if(visit!==navigation||!destination)return;
  openAncestors(destination);
  destination.scrollIntoView({behavior:'instant',block:'start'});
  if(!destination.matches('button,input,select,textarea,a[href]'))destination.tabIndex=-1;
  destination.focus({preventScroll:true});
 }));
 return true;
}
export default function ReportJumpLink({id,children,className='work-link'}:{id:string;children:React.ReactNode;className?:string}) {
 return <a className={className} href={'#'+encodeURIComponent(id)} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(revealReportTarget(id))event.preventDefault();}}>{children}<span aria-hidden="true">→</span></a>;
}
