import {CompactText} from './ReportVisualSummary';
import React from 'react';
import type {ReportRole} from '@/lib/reportRoles';
import {RoleLabel,reportRoleStyle} from './ReportRole';

/** Fit parallel facts to the available container width without hiding any values. */
export default function EvidenceFlow({items,label='근거와 실행 흐름'}:{items:{label:string;content:React.ReactNode;role?:ReportRole;kicker?:string}[];label?:string}) {
  return <dl className="report-evidence-flow" aria-label={label} data-columns={items.length} data-layout="columns">
    {items.map(item=><div key={item.label} className="report-role-box" data-report-role={item.role||'current'} style={reportRoleStyle(item.role||'current')}><dt><RoleLabel role={item.role||'current'} label={item.label} kicker={item.kicker}/></dt><dd className="report-role-content">{typeof item.content==='string'?<CompactText text={item.content}/>:item.content}</dd></div>)}
  </dl>;
}
