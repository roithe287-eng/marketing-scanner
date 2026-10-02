"use client";
import {useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildGeoFocus} from '@/lib/geoFocus';

export default function GeoFocusPanel({report}: {report: MarketingReport}) {
  const focus = buildGeoFocus(report);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  if (!focus) return null;
  const questionText = focus.questions.join('\n');
  async function copyQuestions() {
    try {await navigator.clipboard.writeText(questionText); setCopyState('copied');}
    catch {setCopyState('manual');}
  }
  return <section aria-label="GEO 우선 실행 과제" className="jm-card mt-6 p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold text-jm-red">GEO ACTION PLAN</p>
        <h2 className="mt-2 text-xl md:text-2xl font-black">먼저 실행할 GEO 과제</h2>
        <p className="mt-2 text-sm text-jm-gray leading-6">현재 관측 근거로 고른 최대 3가지입니다. 완료 기준은 수정·확인 작업이며 인용률 상승을 보장하는 조건은 아닙니다.</p>
      </div>
      {focus.questions.length > 0 && <button type="button" onClick={copyQuestions} className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold" data-hide-on-export>
        {copyState === 'copied' ? '질문 세트를 복사했습니다' : '같은 질문 세트 복사'}
      </button>}
    </div>
    <ol className={`mt-5 grid gap-3 ${focus.tasks.length === 3 ? 'md:grid-cols-3' : focus.tasks.length === 2 ? 'md:grid-cols-2' : ''}`}>{focus.tasks.map((task, i) => <li key={task.id} className="rounded-xl border bg-neutral-50 p-4 min-w-0">
      <p className="text-xs font-bold text-jm-red">우선 과제 {i + 1}</p><h3 className="mt-2 font-bold leading-6">{task.title}</h3>
      <p className="mt-3 text-xs text-jm-gray leading-6 break-words">근거: {task.evidence}</p>
      <p className="mt-3 text-sm leading-7 break-words">{task.nextStep}</p>
      {task.targetUrl && <a className="mt-3 block break-all text-xs text-blue-700 underline" href={task.targetUrl} target="_blank" rel="noopener noreferrer">검토 페이지 열기</a>}
      <p className="mt-4 border-t pt-3 text-xs leading-6"><strong>완료 기준</strong><br/>{task.completion}</p>
    </li>)}</ol>
    {focus.questions.length > 0 && <details className="mt-4 rounded-xl border p-4 text-sm">
      <summary className="cursor-pointer font-bold">재사용할 고객 질문 {focus.questions.length}개 보기</summary>
      <p className="mt-3 text-xs text-jm-gray leading-6">직접 질문 입력란에 한 줄씩 붙여 넣으면 질문 조건을 유지할 수 있습니다. 엔진·시점·저장된 관측 사용 여부는 상세 결과에서 함께 확인하세요.</p>
      <textarea aria-label="재사용할 GEO 고객 질문" className="mt-3 min-h-32 w-full rounded-lg border p-3 text-sm leading-6" readOnly value={questionText}/>
    </details>}
    <p role="status" aria-live="polite" className="mt-3 text-xs text-jm-gray">{copyState === 'copied' ? '질문을 한 줄씩 복사했습니다.' : copyState === 'manual' ? '질문 목록을 펼쳐 직접 선택하고 복사해 주세요.' : ''}</p>
  </section>;
}
