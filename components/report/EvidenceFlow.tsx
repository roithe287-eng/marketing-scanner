import {CompactText} from './ReportVisualSummary';
import React from 'react';
import {reportExcerpt} from '@/lib/conciseReport';
import type {ReportRole} from '@/lib/reportRoles';
import {RoleLabel,reportRoleStyle} from './ReportRole';

/** Change the available reading width, never the saved explanation. */
export default function EvidenceFlow({items,label='근거와 실행 흐름'}:{items:{label:string;content:React.ReactNode;role?:ReportRole;kicker?:string}[];label?:string}) {
  const longForm=items.some(item=>typeof item.content==='string'&&reportExcerpt(item.content)===item.content.trim()&&(item.content.length>180||item.content.split('\n').length>3));
  return <dl className="report-evidence-flow" aria-label={label} data-columns={items.length} data-layout={longForm||items.length>3?'stacked':'columns'}>
    {items.map(item=><div key={item.label} className="report-role-box" data-report-role={item.role||'current'} style={reportRoleStyle(item.role||'current')}><dt><RoleLabel role={item.role||'current'} label={item.label} kicker={item.kicker}/></dt><dd className="report-role-content">{typeof item.content==='string'?<CompactText text={item.content}/>:item.content}</dd></div>)}
  </dl>;
}
