import React from 'react';
import {reportRoles,type ReportRole} from '@/lib/reportRoles';

export function reportRoleStyle(role:ReportRole):React.CSSProperties {
  const color=reportRoles[role];
  return {'--role-accent':color.accent,'--role-bg':color.background,'--role-border':color.border,'--role-ink':color.ink} as React.CSSProperties;
}
function RoleIcon({role}:{role:ReportRole}) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {role==='current'?<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></>:role==='review'?<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M10 6v5M10 14h.01"/></>:role==='proposal'?<><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 6h17"/></>:role==='location'?<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 15h6M9 18h3"/></>}
  </svg>;
}
export function RoleLabel({role,label,kicker}:{role:ReportRole;label:React.ReactNode;kicker?:string}) {
  return <span className="report-role-label" data-report-role={role} style={reportRoleStyle(role)}><span className="report-role-icon"><RoleIcon role={role}/></span><span className="report-role-caption">{kicker&&<span className="report-role-kicker">{kicker}</span>}<strong>{label}</strong></span></span>;
}
export function RoleBox({role,label,kicker,children,className=''}:{role:ReportRole;label:React.ReactNode;kicker?:string;children:React.ReactNode;className?:string}) {
  return <div className={`report-role-box ${className}`} data-report-role={role} style={reportRoleStyle(role)}><RoleLabel role={role} label={label} kicker={kicker}/><div className="report-role-content">{children}</div></div>;
}
