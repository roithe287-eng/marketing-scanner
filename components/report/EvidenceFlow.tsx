import React from 'react';

/** Shared insets and label baselines keep evidence and actions easy to compare. */
export default function EvidenceFlow({items,label='근거와 실행 흐름'}:{items:{label:string;content:React.ReactNode}[];label?:string}) {
  return <dl className="report-evidence-flow" aria-label={label} data-columns={items.length}>
    {items.map((item,index)=><div key={item.label}><dt><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span>{item.label}</dt><dd>{item.content}</dd></div>)}
  </dl>;
}
