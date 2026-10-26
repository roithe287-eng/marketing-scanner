import {CompactText} from './ReportVisualSummary';
import React from 'react';
import {reportExcerpt} from '@/lib/conciseReport';

/** Change the available reading width, never the saved explanation. */
export default function EvidenceFlow({items,label='근거와 실행 흐름'}:{items:{label:string;content:React.ReactNode}[];label?:string}) {
  const longForm=items.some(item=>typeof item.content==='string'&&reportExcerpt(item.content)===item.content.trim()&&(item.content.length>180||item.content.split('\n').length>3));
  return <dl className="report-evidence-flow" aria-label={label} data-columns={items.length} data-layout={longForm||items.length>3?'stacked':'columns'}>
    {items.map((item,index)=><div key={item.label}><dt><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{item.label}</dt><dd>{typeof item.content==='string'?<CompactText text={item.content}/>:item.content}</dd></div>)}
  </dl>;
}
