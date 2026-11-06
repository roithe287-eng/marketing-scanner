import React from 'react';
import DiagnosisIcon from './DiagnosisIcon';
import {reportRoleStyle} from './ReportRole';
import type {ReportDiagram} from '@/lib/reportDiagrams';

const roleNames={current:'현재 근거',review:'해석·조건',proposal:'수정 제안',location:'적용 위치',verify:'완료 확인'};
const kindNames:Record<ReportDiagram['kind'],string>={flow:'진행 순서',compare:'항목 대조',branch:'확인 항목',cycle:'반복 점검',equation:'계산식'};
export function ReportReadingKey(){
 return <aside className="report-reading-key" aria-label="보고서 색상과 구분 표시"><strong>읽는 법</strong>{(Object.keys(roleNames) as (keyof typeof roleNames)[]).map(role=><span key={role} data-reading-role={role} style={reportRoleStyle(role)}><i aria-hidden="true"/>{roleNames[role]}</span>)}</aside>;
}

function Connector({kind,index}:{kind:ReportDiagram['kind'];index:number}){
 return <svg className="report-diagram-connector" viewBox="0 0 38 30" width="38" height="30" aria-hidden="true" focusable="false" fill="none"><path d={kind==='equation'?(index===0?'M9 15h20m-10-8h.01m0 16h.01':'M9 10h20M9 20h20'):'M4 15h28m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function ReportSectionDiagram({diagram,id}:{diagram:ReportDiagram;id:string}){
 return <figure className="report-section-diagram" data-report-diagram={id} data-diagram-kind={diagram.kind} aria-label={diagram.title}>
  <figcaption><div><span className="report-diagram-kicker">{kindNames[diagram.kind]}</span><strong>{diagram.title}</strong></div>{diagram.scope&&<small>{diagram.scope}</small>}</figcaption>
  <ol className="report-diagram-nodes" style={{'--diagram-columns':diagram.nodes.length} as React.CSSProperties}>{diagram.nodes.map((n,i)=><li key={n.title} data-node-role={n.role} style={reportRoleStyle(n.role)}>
   <div className="report-diagram-node-top"><span className="report-diagram-node-icon"><DiagnosisIcon axis={n.icon}/></span>{(diagram.kind==='flow'||diagram.kind==='cycle')&&<span className="report-diagram-node-index">{String(i+1).padStart(2,'0')}</span>}<span className="report-diagram-node-role">{roleNames[n.role]}</span></div>
   <div className="report-diagram-node-copy"><strong>{n.title}</strong><p>{n.detail}</p></div>{n.value&&<span className="report-diagram-value">{n.value}</span>}
   {i+1<diagram.nodes.length&&diagram.kind!=='branch'&&diagram.kind!=='compare'&&<Connector kind={diagram.kind} index={i}/>}
  </li>)}</ol>
  <p className="report-diagram-note"><svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke="currentColor"/><path d="M9 8v5m0-8v1" stroke="currentColor" strokeWidth="1.6"/></svg>{diagram.note}</p>
 </figure>;
}
