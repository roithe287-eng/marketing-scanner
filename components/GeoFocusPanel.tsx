"use client";
import {activeCitation} from '@/lib/activeCitation';
import {citationActionAnchor} from '@/lib/reportVisuals';
import ReportJumpLink from './report/ReportJumpLink';
import {RoleBox} from './report/ReportRole';
import React,{useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildGeoFocus} from '@/lib/geoFocus';

export default function GeoFocusPanel({report,linkToDetails=false}: {report: MarketingReport;linkToDetails?:boolean}) {
  const focus = buildGeoFocus(report);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  if (!focus) return null;
  const actions=linkToDetails&&report.llmCitationTest?activeCitation(report.llmCitationTest).actionPlan||[]:[];
  const questionText = focus.questions.join('\n');
  async function copyQuestions() {
    try {await navigator.clipboard.writeText(questionText); setCopyState('copied');}
    catch {setCopyState('manual');}
  }
  return <section aria-label="GEO 우선 실행 과제" className="report-geo-focus jm-card mt-6 p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold text-jm-red">GEO ACTION PLAN</p>
        <h3 className="mt-2 text-xl md:text-2xl font-black">AI 답변을 개선할 첫 작업</h3>
        <p className="mt-2 text-sm text-jm-gray leading-6">먼저 할 작업마다 판단 근거와 완료 기준을 확인하세요. 구체적인 문구 수정은 아래 질문별 방법에서 볼 수 있습니다.</p>
      </div>
      {focus.questions.length > 0 && <button type="button" onClick={copyQuestions} className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold" data-hide-on-export>
        {copyState === 'copied' ? '질문 세트를 복사했습니다' : '같은 질문 세트 복사'}
      </button>}
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-900 p-3 text-center text-xs font-bold text-white" aria-label="실행 과제의 확인 순서"><span>01 관측 근거</span><span>02 실행 제안</span><span>03 완료 확인</span></div>
    <ol className={`mt-4 grid gap-3 ${focus.tasks.length === 3 ? 'md:grid-cols-3' : focus.tasks.length === 2 ? 'md:grid-cols-2' : ''}`}>{focus.tasks.map((task, i) => {
      const actionIndex=task.question?actions.findIndex(action=>action.question===task.question&&action.nextStep===task.nextStep):-1;
      return <li key={task.id} className="min-w-0 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">{i+1}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{task.id==='restore-measurement'?'관측 복구':task.id==='review-source'?'정보 검토':task.id==='page-readiness'?'구조 보완':'직접 답변'}</span></div>
      <h4 className="mt-4 font-bold leading-6">{task.title}</h4>
      {task.targetUrl && <a className="mt-3 block break-all text-xs text-blue-700 underline" href={task.targetUrl} target="_blank" rel="noopener noreferrer">검토 페이지 열기 ↗</a>}
      <details open className="mt-4 border-t pt-3"><summary className="cursor-pointer text-xs font-bold">근거·실행·완료 기준 보기</summary><div className="report-role-stack"><RoleBox role="current" label="관측 근거"><p>{task.evidence}</p></RoleBox><RoleBox role="proposal" label="실행 제안">
        {actionIndex>=0?<ReportJumpLink id={citationActionAnchor(actionIndex)}>이 질문에 맞는 수정 방법 열기</ReportJumpLink>
          :linkToDetails&&task.id==='page-readiness'?<ReportJumpLink id="report-page-readiness-priorities">페이지에서 먼저 보강할 항목 열기</ReportJumpLink>
          :<p>{task.nextStep}</p>}
      </RoleBox><RoleBox role="verify" label="완료 확인"><p>{task.completion}</p></RoleBox></div></details>
    </li>;
    })}</ol>
    {!focus.tasks.length&&<p className="report-empty">이 결과에서 먼저 실행할 과제가 지정되지 않았습니다. 질문별 관측과 수정 기준을 확인하세요.</p>}
    {focus.questions.length > 0 && <details open className="mt-4 rounded-xl border p-4 text-sm">
      <summary className="cursor-pointer font-bold">재사용할 고객 질문 {focus.questions.length}개 보기</summary>
      <p className="mt-3 text-xs text-jm-gray leading-6">직접 질문 입력란에 한 줄씩 붙여 넣으면 질문 조건을 유지할 수 있습니다. 엔진·시점·저장된 관측 사용 여부는 상세 결과에서 함께 확인하세요.</p>
      <textarea aria-label="재사용할 GEO 고객 질문" className="mt-3 min-h-32 w-full rounded-lg border p-3 text-sm leading-6" readOnly value={questionText}/>
    </details>}
    <p role="status" aria-live="polite" className="mt-3 text-xs text-jm-gray">{copyState === 'copied' ? '질문을 한 줄씩 복사했습니다.' : copyState === 'manual' ? '질문 목록을 펼쳐 직접 선택하고 복사해 주세요.' : ''}</p>
  </section>;
}
