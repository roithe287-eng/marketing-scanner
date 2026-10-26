'use client';
import ReportJumpLink from './ReportJumpLink';
import {CompactText} from './ReportVisualSummary';
import {growthGuideTopic} from '@/lib/siteGuidebook';
import {Guidebook} from './SiteGuidebook';
import {RoleBox} from './ReportRole';
import React,{useMemo,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildGrowthPlan,growthBrief,GROWTH_STATUS,type GrowthArea} from '@/lib/growthPlan';
import {GROWTH_CONCEPTS,GROWTH_SOURCES,GROWTH_TITLE,GROWTH_UPDATES} from '@/lib/growthKnowledge';

export default function GrowthPlanPanel({report}:{report:MarketingReport}) {
  const plan=useMemo(()=>buildGrowthPlan(report),[report]);
  const [filter,setFilter]=useState<'all'|GrowthArea>('all'),[expanded,setExpanded]=useState(true);
  const [copyState,setCopyState]=useState(''),[fallback,setFallback]=useState('');
  const filtered=plan.tasks.filter(t=>filter==='all'||t.areas.includes(filter));
  const shown=expanded?filtered:filtered.slice(0,3);
  async function copy(id:string) {
    const task=plan.tasks.find(t=>t.id===id);if(!task)return;
    const text=growthBrief(report,task);setFallback('');
    try{await navigator.clipboard.writeText(text);setCopyState(id);}catch{setCopyState('');setFallback(text);}
  }
  return <section className="report-card report-growth" aria-label="SEO GEO AEO 실행 가이드" id="report-growth-plan">
    <div className="report-card-heading"><p className="report-eyebrow">SEARCH → ANSWER → ACTION</p><h3>{GROWTH_TITLE}</h3><p className="report-note">검색에서 발견 → 답변으로 이해 → 문의·구매로 연결</p></div>
    <div className="growth-concepts">{GROWTH_CONCEPTS.map(c=><article key={c.id} data-area={c.id}><span>{c.id}</span><h4>{c.title}</h4><p>{c.text}</p><small>확인할 지표</small><strong>{c.metric}</strong></article>)}</div>
    <ol className="growth-path" aria-label="사이트 개선과 측정의 연결"><li><span>01</span><strong>읽을 수 있는 페이지</strong><p>접근·색인 확인</p></li><li><span>02</span><strong>선택할 이유가 있는 제목</strong><p>노출·CTR 관찰</p></li><li><span>03</span><strong>근거가 있는 답변</strong><p>AI 노출·인용 관측</p></li><li><span>04</span><strong>완료할 수 있는 행동</strong><p>문의·구매 확인</p></li></ol>
    <div className="growth-plan-heading"><div><h4>{plan.site} 실행 가이드</h4><p>{plan.tasks.length}개 작업 · {plan.tasks.filter(t=>t.status==='action').length}개 우선 보완 검토 · 공식 문서 확인 {plan.reviewedAt}</p></div>{plan.url&&<ReportJumpLink id="report-site-guide">원문·링크 모음</ReportJumpLink>}</div>
    {!plan.hasTechnicalEvidence&&<p className="growth-evidence-note">이전 보고서에는 새 기술 관측값이 없습니다. 확인하지 못한 항목은 ‘담당자 확인’으로 표시합니다. 기존에 저장된 제목·본문이 있으면 해당 근거로 실행안을 제공합니다.</p>}
    <div className="report-filter-row" role="group" aria-label="실행 가이드 관점 필터">{(['all','SEO','GEO','AEO'] as const).map(f=><button type="button" key={f} aria-pressed={filter===f} onClick={()=>{setFilter(f);setExpanded(true);}}>{f==='all'?'전체 관점':f}</button>)}<span role="status">{filtered.length}개 중 {shown.length}개 표시</span></div>
    <div className="growth-actions">{shown.map((task,i)=><details open className="growth-action" key={task.id}>
      <summary><span className="growth-action-index">{String(i+1).padStart(2,'0')}</span><span><span className="growth-action-meta">{task.channel} · {task.areas.join(' / ')}</span><strong>{task.title}</strong><small>{task.owner} · {task.kpi}</small></span><span className={`report-pill ${task.status==='action'?'warning':''}`}>{GROWTH_STATUS[task.status]}</span></summary>
      <div className="growth-action-body"><div className="report-role-pair"><RoleBox role="current" label="이 URL에서 확인한 근거" kicker="AS-IS"><CompactText text={task.evidence}/></RoleBox><RoleBox role="proposal" label="적용 목표 / 작성 틀" kicker="TO-BE · 제안"><CompactText text={task.toBe}/></RoleBox></div><RoleBox role="location" label="어디를 수정하나요?"><CompactText text={task.location}/></RoleBox>
        <h5>이 순서대로 진행하세요</h5><ol className="growth-steps">{task.steps.map((step,n)=><li key={step}><span>{n+1}</span><p>{step}</p></li>)}</ol>
        <RoleBox role="proposal" label="사이트에서 기대하는 변화"><CompactText text={task.change}/></RoleBox>
        <Guidebook compact title={task.title} evidence={task.evidence} instructions={task.steps} topic={growthGuideTopic(task.id)} proposal={task.toBe}/><div className="report-role-pair"><RoleBox role="verify" label="변화를 확인할 지표"><p>{task.kpi}</p></RoleBox><RoleBox role="verify" label="완료 확인"><CompactText text={task.verify}/></RoleBox></div>
        <div className="growth-action-footer"><div>{task.sources.map(id=><a href={GROWTH_SOURCES[id].url} key={id} target="_blank" rel="noopener noreferrer">{GROWTH_SOURCES[id].title} ↗</a>)}</div><button type="button" className="report-secondary-button" onClick={()=>copy(task.id)}>{copyState===task.id?'작업 지시서 복사됨':'담당자용 작업 지시서 복사'}</button></div>
      </div>
    </details>)}</div>
    {filtered.length>3&&<button type="button" className="report-secondary-button growth-show-all" onClick={()=>setExpanded(!expanded)}>{expanded?'우선 작업 3개만 보기':`나머지 포함 ${filtered.length}개 실행 가이드 모두 보기`}</button>}
    <span className="sr-only" role="status">{copyState?'작업 지시서를 복사했습니다.':fallback?'복사가 제한되어 직접 복사할 내용을 표시합니다.':''}</span>
    {fallback&&<label className="growth-copy-fallback">직접 선택해서 복사하세요<textarea readOnly value={fallback} rows={10}/></label>}
    <details open className="growth-official-updates"><summary>최신 공식 가이드로 바로잡은 내용</summary><div>{GROWTH_UPDATES.map(u=><article key={u.title}><h4>{u.title}</h4><p>{u.text}</p><a href={GROWTH_SOURCES[u.source].url} target="_blank" rel="noopener noreferrer">공식 근거 ↗</a></article>)}</div></details>
  </section>;
}
