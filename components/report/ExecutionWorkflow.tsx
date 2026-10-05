'use client';
import React,{useId,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildPageEdits,changedText,executionBrief,workOwners,workZones,type ExecutionPlan} from '@/lib/reportExecution';

function Heading({eyebrow,title,note}:{eyebrow:string;title:string;note:string}) {return <div className="report-card-heading"><p className="report-eyebrow">{eyebrow}</p><h3>{title}</h3><p className="report-note">{note}</p></div>;}
function WorkLink({id,children}:{id:string;children:React.ReactNode}) {
 return <a className="work-link" href={`#${id}`} onClick={()=>{let e:HTMLElement|null=document.getElementById(id);while(e){if(e instanceof HTMLDetailsElement)e.open=true;e=e.parentElement;}}}>{children}<span aria-hidden="true">↗</span></a>;
}
export function CopyWork({text,label='작업 지시서 복사'}:{text:string;label?:string}) {
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(text);setStatus('복사했습니다.');setFallback(false);}catch{setStatus('아래 내용을 직접 선택해 복사하세요.');setFallback(true);}}
 return <div className="work-copy"><button type="button" className="report-secondary-button" onClick={copy}>{label}</button><span role="status">{status}</span>{fallback&&<label>직접 복사할 내용<textarea readOnly value={text} rows={8}/></label>}</div>;
}
export function TodayWork({plan}:{plan:ExecutionPlan}) {
 return <section className="report-card report-workflow work-today" id="report-today" aria-label="오늘 먼저 할 일">
  <Heading eyebrow="START WITH THREE" title="오늘, 여기부터 바꿔 보세요" note="기존 진단의 우선 보완 → 보완 → 내용 검토 순서에서 중복되는 점검 주제를 묶은 최대 3개입니다. 상세 근거와 실행 내용은 각 작업에 그대로 연결했습니다."/>
  {plan.first.length?<ol className="work-today-grid">{plan.first.map((t,i)=><li key={t.id}><div className="work-card-top"><span className="work-number">0{i+1}</span><span>{workOwners.find(o=>o.id===t.owner)!.label}</span></div><h4>{t.title}</h4><dl><div><dt>수정 위치</dt><dd>{t.location}</dd></div><div><dt>확인할 지표</dt><dd>{t.kpi}</dd></div></dl><details><summary>발견된 문제와 수정 작업</summary><div className="work-detail"><strong>발견된 문제 · {t.source}</strong><p>{t.evidence}</p><strong>이렇게 수정하세요</strong><p>{t.action}</p></div></details><WorkLink id={t.anchor}>작업 지시서 확인</WorkLink></li>)}</ol>:<p className="work-empty">현재 저장된 진단에 보완 항목이 없습니다. 추가 문제가 없다는 보장은 아니므로 실제 화면과 측정 상태를 함께 확인하세요.</p>}
 </section>;
}
export function PageEditPreview({report}:{report:MarketingReport}) {
 const [selected,setSelected]=useState('hero'),items=buildPageEdits(report),item=items.find(t=>t.id===selected)!;
 const id=useId();
 return <section className="report-card report-workflow" id="report-page-edits" aria-label="내 페이지 개선 전후">
  <Heading eyebrow="YOUR PAGE · BEFORE & AFTER" title="바꿀 문장을, 원문 옆에서 확인하세요" note="수집한 HTML 원문과 제안·작성 틀을 비교합니다. 색상은 제안에서 달라진 표현입니다. 실제 사이트에는 자동으로 적용되지 않습니다."/>
  <div className="work-tabs" role="group" aria-label="개선 전후 항목 선택">{items.map(t=><button type="button" key={t.id} aria-pressed={selected===t.id} aria-controls={id} onClick={()=>setSelected(t.id)}>{t.label}</button>)}</div>
  <div id={id} className="work-edit-content" aria-live="polite"><p className="work-location"><b>수정 위치</b> {item.location}</p><div className="work-before-after"><article><span className="work-kicker">BEFORE · 수집 원문</span><h4>{item.label}</h4><p>{item.before||item.missing}</p><small>{item.source}</small></article><article><span className="work-kicker">TO-BE · 적용 전 검토</span><h4>{item.after.includes('[')?'사실로 채울 작성 틀':'저장된 개선 제안'}</h4><p>{item.after?(item.before?changedText(item.before,item.after).map((part,i)=>part.changed?<mark key={i}>{part.text}</mark>:<React.Fragment key={i}>{part.text}</React.Fragment>):item.after):'저장된 제안이 없습니다.'}</p><small>{item.before?'표현 차이를 강조했습니다.':'원문이 없어 변경된 표현을 판정하지 않습니다.'}</small></article></div><div className="work-check"><strong>적용 순서</strong><ol><li>{item.check}</li><li>운영 중인 CMS 또는 해당 코드에서 위 위치를 수정하고 PC·모바일 화면을 확인하세요.</li><li>배포 후 같은 URL을 재진단하고 실제 클릭·문의 실적은 별도로 확인하세요.</li></ol></div><CopyWork label="이 수정안 복사" text={`대상 URL: ${report.url}\n위치: ${item.location}\n원문 출처: ${item.source}\n현재: ${item.before||item.missing}\n제안·작성 틀: ${item.after}\n완료 확인: ${item.check}`}/></div>
 </section>;
}
export function PageWorkMap({plan}:{plan:ExecutionPlan}) {
 const [selected,setSelected]=useState<string>('hero'),id=useId(),zone=workZones.find(z=>z.id===selected)!;
 const tasks=plan.tasks.filter(t=>t.zone===selected);
 return <section className="report-card report-workflow" id="report-work-map" aria-label="페이지 수정 위치 안내">
  <Heading eyebrow="WHERE TO EDIT" title="어디를 바꿀지, 위치로 살펴보세요" note="기존 보완 항목을 수정 위치별로 연결한 추천 구조도입니다. 실제 사이트의 화면·요소 좌표를 측정한 결과는 아닙니다."/>
  <div className="work-map-layout"><div className="work-wireframe" role="group" aria-label="수정 위치 선택"><div className="work-window" aria-hidden="true"><i/><i/><i/><span>PAGE MAP</span></div>{workZones.map((z,i)=><button type="button" key={z.id} data-zone={z.id} aria-pressed={selected===z.id} aria-controls={id} onClick={()=>setSelected(z.id)}><span className="work-number">0{i+1}</span><strong>{z.label}<small>{z.hint}</small></strong><b>{plan.tasks.filter(t=>t.zone===z.id).length}<small>개</small></b></button>)}</div>
   <div className="work-map-detail" id={id} aria-live="polite"><span className="work-kicker">선택한 위치</span><h4>{zone.label}</h4><p>{zone.hint}</p>{tasks.length?<ul>{tasks.map(t=><li key={t.id}><WorkLink id={t.anchor}>{t.title}</WorkLink><p>{workOwners.find(o=>o.id===t.owner)!.label} · {t.source}</p></li>)}</ul>:<p className="work-empty">이 위치로 분류된 보완 항목이 없습니다. 해당 영역의 존재·품질이 확인됐다는 뜻은 아닙니다.</p>}<div className="work-check"><strong>완료 확인</strong><p>{zone.check}</p></div></div>
  </div>
 </section>;
}
export function ExecutionBoard({report,plan}:{report:MarketingReport;plan:ExecutionPlan}) {
 return <section className="report-card report-workflow work-board" id="report-execution-board" aria-label="담당별 실행 보드">
  <Heading eyebrow="MAKE YOUR NEXT MOVE" title="이제, 할 일을 나누고 실행하세요" note="기존 보완 목록의 모든 근거를 담당 유형별로 모았습니다. 담당과 위치는 추천 분류이며 실제 수정 권한·업무 범위에 맞춰 배정하세요."/>
  <div className="work-owner-groups">{workOwners.map(owner=>{const tasks=plan.tasks.filter(t=>t.owner===owner.id);return <details className="work-owner-group" key={owner.id} data-owner={owner.id} id={`execution-owner-${owner.id}`}><summary><span><strong>{owner.label}</strong><small>{owner.note}</small></span><b>{tasks.length}<small>개 작업</small></b><span className="work-owner-toggle" aria-hidden="true">＋</span></summary><div className="work-owner-body">
   {!!tasks.length&&<CopyWork text={executionBrief(report,tasks,owner.label)} label={`${owner.label} ${tasks.length}개 작업 복사`}/>}
   <div className="work-task-list">{tasks.length?tasks.map(t=><details key={t.id} id={t.anchor}><summary><span className="work-status">{t.status==='fail'?'우선 보완':t.status==='warning'?'보완':'내용 검토'}</span><strong>{t.title}</strong><span aria-hidden="true">＋</span></summary><div className="work-detail"><dl><div><dt>진단 출처</dt><dd>{t.source}</dd></div><div><dt>확인 근거</dt><dd>{t.evidence}</dd></div><div><dt>수정 위치</dt><dd>{t.location}</dd></div><div><dt>실행할 내용</dt><dd>{t.action}</dd></div><div><dt>완료 확인</dt><dd>{t.completion}</dd></div><div><dt>관찰 KPI</dt><dd>{t.kpi}</dd></div></dl><CopyWork text={executionBrief(report,[t])}/></div></details>):<p className="work-empty">이 유형에 배정할 저장된 보완 항목이 없습니다.</p>}</div>
  </div></details>;})}</div>
  <div className="work-finish"><div><span className="work-kicker">작업을 마쳤다면</span><h4>같은 URL로 다시 진단하세요.</h4><p>이전 결과와 비교해 진단 변화와 실제 사업 성과를 각각 확인하세요.</p></div><a className="work-link" href="#report-recheck">재진단 비교로 이동 <span aria-hidden="true">↑</span></a></div>
 </section>;
}
