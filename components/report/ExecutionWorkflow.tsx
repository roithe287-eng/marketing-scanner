'use client';
import ReadingDisclosure from '../ReadingDisclosure';
import {CompactText,VisualSteps,SourceSketch} from './ReportVisualSummary';
import WorkLink from './ReportJumpLink';
import ReportItemPanels from './ReportItemPanels';
import {Guidebook} from './SiteGuidebook';
import {buildSiteGuide,guideInstruction} from '@/lib/siteGuidebook';
import {RoleBox,RoleLabel} from './ReportRole';
import EvidenceFlow from './EvidenceFlow';
import React,{useId,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {plainGuide} from '@/lib/reportPlainLanguage';
import {buildPageEdits,changedText,executionBrief,groupExecutionTasks,workOwners,workZones,type ExecutionPlan} from '@/lib/reportExecution';
import {needsVerification} from '@/lib/reportNextAction';
import {reportPhraseKey,reportReadingPoints} from '@/lib/conciseReport';

function taskIssueAnchor(task:ExecutionPlan['tasks'][number]) {
  const match=/^critical-(\d+)$/.exec(task.id);
  return match?`report-issue-${match[1]}`:undefined;
}

function Heading({eyebrow,title,note}:{eyebrow:string;title:React.ReactNode;note:string}) {return <div className="report-card-heading"><p className="report-eyebrow">{eyebrow}</p><h3>{title}</h3><CompactText className="report-note" text={note}/></div>;}
export function CopyWork({text,label='작업 지시서 복사'}:{text:string;label?:string}) {
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(text);setStatus('복사했습니다.');setFallback(false);}catch{setStatus('아래 내용을 직접 선택해 복사하세요.');setFallback(true);}}
 return <div className="work-copy"><button type="button" className="report-secondary-button" onClick={copy}>{label}</button><span role="status">{status}</span>{fallback&&<label>직접 복사할 내용<textarea readOnly value={text} rows={8}/></label>}</div>;
}
export function TodayWork({plan}:{plan:ExecutionPlan}) {
 return <section className="report-card report-workflow work-today" id="report-today" aria-label="오늘 먼저 할 일">
  <Heading eyebrow="우선 할 일" title="먼저 확인할 작업" note="내용과 완료 기준을 확인하세요. 전체 목록은 실행 계획에서 볼 수 있습니다."/>
  {plan.first.length?<ol className="work-today-grid">{plan.first.map((t,i)=>{
   const g=plainGuide(t.title,t.guideScope==='account'?'account':undefined),verify=needsVerification(t);
   const first=reportReadingPoints(t.instructions?.[0]||t.action)[0];
   const preview=first&&first.length<=105&&reportPhraseKey(first)!==reportPhraseKey(t.evidence)?first:verify?'실제 화면이나 운영 설정에서 이 항목을 먼저 확인하세요.':g.action;
   return <li key={t.id}>
    <div className="work-card-top"><span className="work-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><span>{workOwners.find(o=>o.id===t.owner)!.label}</span></div>
    <SourceSketch type={g.patterns[0].kind}/><h4>{g.title}</h4>
    <RoleBox role={verify?'review':'proposal'} label={verify?'확인 후 적용':'수정 제안'}><p>{preview}</p></RoleBox>
    <ReadingDisclosure title="수정 위치·완료 기준" className="task-reading"><RoleBox role="location" label="확인할 곳"><p>{t.location}</p></RoleBox><p className="report-action-line"><strong>완료 기준</strong><span>{t.completion}</span></p></ReadingDisclosure>
    <WorkLink id={t.anchor}>이 작업의 상세 안내 보기</WorkLink>
   </li>;
  })}</ol>:<p className="work-empty">현재 저장된 진단에 보완 항목이 없습니다.</p>}
 </section>;
}
export function PageEditPreview({report}:{report:MarketingReport}) {
 const [selected,setSelected]=useState('hero'),items=buildPageEdits(report),item=items.find(t=>t.id===selected)!;
 const id=useId();
 return <section className="report-card report-workflow" id="report-page-edits" aria-label="내 페이지 개선 전후">
  <Heading eyebrow="문구 수정" title={<>원문과 <span className="report-type-highlight">수정 제안</span> 비교</>} note="원문을 확보한 항목은 추가하거나 바꾼 표현에 밑줄을 표시합니다. 변경은 실제 사이트 관리자에서 적용하세요."/>
  <div className="work-tabs" role="group" aria-label="개선 전후 항목 선택">{items.map(t=><button type="button" key={t.id} id={`report-edit-${t.id}`} data-report-tab="true" aria-pressed={selected===t.id} aria-controls={id} onClick={()=>setSelected(t.id)}>{t.label}</button>)}</div>
  <div id={id} className="work-edit-content" aria-live="polite"><p className="work-location"><b>수정 위치</b> {item.location}</p><div className="work-before-after"><RoleBox role="current" label={item.before?"현재 문구":"현재 원문 미확인"} kicker="AS-IS"><h4>{item.label}</h4><p>{item.before||item.missing}</p><small>{item.source}</small></RoleBox><RoleBox role="proposal" label="수정할 문구" kicker="TO-BE · 제안"><h4>{item.before&&item.before===item.after?'현재 문구 유지':item.after.includes('[')?'사실로 채울 작성 틀':'수정 제안'}</h4><p>{item.after?(item.before?changedText(item.before,item.after).map((part,i)=>part.changed?<mark key={i}>{part.text}</mark>:<React.Fragment key={i}>{part.text}</React.Fragment>):item.after):'저장된 제안이 없습니다.'}</p><small>{item.before?(item.before===item.after?'현재 값과 제안이 같습니다.':item.after?'추가되거나 바뀐 표현에 밑줄을 표시했습니다.':''): `확인 범위: ${item.source}. 비교할 원문이 확보되지 않아 전후 차이를 표시하지 않았습니다. 오른쪽은 새 작성 제안입니다. ${item.id==='hero'?'화면에는 제목이 있어도 스크립트·이미지로 표시되면 H1 수집에 포함되지 않을 수 있습니다. 실제 화면의 제목과 HTML의 H1을 함께 확인하세요.':item.id==='cta'?'실제 화면의 버튼을 먼저 확인한 뒤 제안과 대조하세요.':'페이지 관리자 SEO 설정에서 현재 값을 확인한 뒤 제안과 대조하세요.'}`}</small></RoleBox></div><p className="report-action-line"><strong>완료 기준</strong><span>{item.check}</span></p><Guidebook key={item.id} title={item.label} current={item.before} topic={item.id==='hero'?'heading':item.id==='title'?'title':item.id==='description'?'description':'cta'} proposal={item.after}/><CopyWork label="이 수정안 복사" text={`대상 URL: ${report.url}\n위치: ${item.location}\n원문 출처: ${item.source}\n현재: ${item.before||item.missing}\n제안·작성 틀: ${item.after}\n완료 확인: ${item.check}\n\n${guideInstruction(buildSiteGuide(report,{title:item.label,current:item.before,proposal:item.after,topic:item.id==='hero'?'heading':item.id==='title'?'title':item.id==='description'?'description':'cta'}))}`}/></div>
 </section>;
}
export function PageWorkMap({plan}:{plan:ExecutionPlan}) {
 const [chosen,setChosen]=useState<string>(),id=useId();
 const selected=chosen||plan.first[0]?.zone||'hero',zone=workZones.find(z=>z.id===selected)!;
 const tasks=plan.tasks.filter(t=>t.zone===selected);
 return <section className="report-card report-workflow" id="report-work-map" aria-label="페이지 수정 위치 안내">
  <Heading eyebrow="WHERE TO EDIT" title={<>어디를 바꿀지, <span className="report-type-highlight">위치로</span> 살펴보세요</>} note="보완 항목을 수정 위치별로 연결한 추천 구조도입니다."/>
  <div className="work-map-layout"><div className="work-wireframe" role="group" aria-label="수정 위치 선택"><div className="work-window" aria-hidden="true"><i/><i/><i/><span>PAGE MAP</span></div>{workZones.map((z,i)=><button type="button" key={z.id} data-zone={z.id} aria-pressed={selected===z.id} aria-controls={id} onClick={()=>setChosen(z.id)}><span className="work-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><strong>{z.label}<small>{z.hint}</small></strong><b>{plan.tasks.filter(t=>t.zone===z.id).length}<small>개</small></b></button>)}</div>
   <div className="work-map-detail" id={id}><span className="work-kicker">선택한 위치</span><h4>{zone.label}</h4><p>{zone.hint}</p><p className="work-map-count" role="status">{zone.label}에 해당하는 작업 {tasks.length}개</p>{tasks.length?<ul>{tasks.map(t=><li key={t.id}><WorkLink id={t.anchor}>{t.title}</WorkLink><p>{workOwners.find(o=>o.id===t.owner)!.label} · {t.source}</p></li>)}</ul>:<p className="work-empty">이 위치로 분류된 보완 항목이 없습니다.</p>}<RoleBox role="verify" className="work-check" label="완료 확인"><p>{zone.check}</p></RoleBox></div>
  </div>
 </section>;
}
export function ExecutionBoard({report,plan,linkIssueDetails=false}:{report:MarketingReport;plan:ExecutionPlan;linkIssueDetails?:boolean}) {
 return <section className="report-card report-workflow work-board" id="report-execution-board" aria-label="담당별 실행 보드">
  <Heading eyebrow="MAKE YOUR NEXT MOVE" title={<>이제, 할 일을 나누고 <span className="report-type-highlight">실행하세요</span></>} note="담당별로 모은 실행 과제입니다. 실제 수정 권한과 업무 범위에 맞춰 배정하세요."/>
  <VisualSteps kind="execution" label="작업 배정과 완료 확인"/>
  <div className="work-owner-groups">
   <ReportItemPanels id="execution-tasks" label="담당자·작업 선택" items={workOwners.flatMap(owner=>{
    const tasks=plan.tasks.filter(task=>task.owner===owner.id);
    return groupExecutionTasks(tasks).map(({primary:task,related,members})=>{
     const issueAnchor=linkIssueDetails?taskIssueAnchor(task):undefined;
     const facts:React.ComponentProps<typeof EvidenceFlow>['items']=[
      {label:'수정 위치',role:'location',content:task.location},
      {label:'완료 확인',role:'verify',content:task.completion},
     ];
     if(issueAnchor){
      facts.push({label:'적용 후 볼 지표',role:'review',content:task.kpi});
     }else{
      facts.unshift({label:'확인 근거',role:'current',content:task.evidence});
      facts.splice(2,0,{label:'할 일',role:'proposal',content:task.action});
     }
     return {id:task.id,label:`${owner.label} · ${task.title}`,children:
      <section className="work-owner-group" data-owner={owner.id}>
       <header className="work-owner-summary">
        <strong>{owner.label}</strong><p>{owner.note}</p>
        <CopyWork text={executionBrief(report,tasks,owner.label)} label={`${owner.label} ${tasks.length}개 작업 복사`}/>
       </header>
       <div className="work-owner-body"><div className="work-task-list"><details open id={task.anchor}>
        <summary>
         <span className="work-status">{needsVerification(task)?'먼저 확인':task.status==='fail'?'우선 수정':'수정 진행'}{related.length?` · 관련 진단 ${members.length}개 통합`:''}</span>
         <strong>{task.title}</strong><span aria-hidden="true">＋</span>
        </summary>
        <div className="work-detail">
         <EvidenceFlow label="실행 과제의 근거와 완료 조건" items={facts}/>
         {issueAnchor&&<p className="report-related-link"><WorkLink id={issueAnchor}>이 이슈의 관측 내용과 수정 제안 보기</WorkLink></p>}
         <Guidebook title={task.title} scope={task.guideScope} instructions={task.instructions} completion={task.completion} current={task.current} evidence={task.evidence} proposal={task.action} hideRepeatedProposal/>
         {related.map(other=>{
          const otherIssue=linkIssueDetails?taskIssueAnchor(other):undefined;
          return <details open key={other.id} id={other.anchor} className="work-related-task"><summary>함께 발견된 내용 · {other.title}</summary><div>
           <p><strong>출처</strong>{other.source}</p>
           {otherIssue?<WorkLink id={otherIssue}>이 이슈의 관측 내용과 수정 제안</WorkLink>:<><p><strong>확인 근거</strong>{other.evidence}</p><p><strong>추가할 작업</strong>{other.action}</p></>}
           <p><strong>완료 확인</strong>{other.completion}</p>
           <Guidebook title={other.title} scope={other.guideScope} instructions={other.instructions} completion={other.completion} current={other.current} evidence={other.evidence} proposal={other.action} hideRepeatedProposal/>
          </div></details>;
         })}
         <CopyWork text={executionBrief(report,members)} label={related.length?'관련 작업 한 번에 복사':'작업 내용 복사'}/>
        </div>
       </details></div></div>
      </section>};
    });
   })}/>
   {!plan.tasks.length&&<p className="work-empty">저장된 실행 과제가 없습니다.</p>}
  </div>
  <div className="work-finish"><div><span className="work-kicker">작업을 마쳤다면</span><h4>같은 URL로 다시 진단하세요.</h4><p>이전 결과와 비교해 진단 변화와 실제 사업 성과를 각각 확인하세요.</p></div><a className="work-link" href="/">새 진단 시작하기 <span aria-hidden="true">→</span></a></div>
 </section>;
}
