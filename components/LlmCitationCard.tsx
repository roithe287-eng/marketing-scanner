"use client";
import {ReadingToggle} from './ReadingDisclosure';
import {CompactText} from './report/ReportVisualSummary';
import {activeCitation} from '@/lib/activeCitation';

import {RoleBox} from './report/ReportRole';
import React, { memo, useEffect, useMemo, useState } from 'react';
import {ObservationOverview,QuestionMatrix} from './visuals/ObservationVisuals';
import type { LlmCitationTest } from '@/lib/reportSchema';
import { safeHttpUrl } from '@/lib/citationMeasurement';
import CitationFailureSummary from './CitationFailureSummary';
import {citationNextAction} from '@/lib/reportNextAction';
import {buildObservationVisual,citationActionAnchor,observationQuestionAnchor,observationState,observationStates} from '@/lib/reportVisuals';
import ReportJumpLink from './report/ReportJumpLink';

const seoulTime=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'});
function readingTime(value?:string) {
  return value&&Number.isFinite(Date.parse(value))?`${seoulTime.format(new Date(value))} (한국시간)`:value;
}

const actionLabels = {review_cited:'인용 페이지 검토',improve_candidate:'입력 페이지 개선 검토',research_page:'관련 페이지 탐색·신규 검토',retry:'재측정 필요'};
function LlmCitationCard({citation:storedCitation,showActionPlan=true}:{citation?:LlmCitationTest|null;showActionPlan?:boolean}) {
  const [selectedQuestion,setSelectedQuestion]=useState<string|null|undefined>(undefined);
  const citation=useMemo(()=>storedCitation?activeCitation(storedCitation):null,[storedCitation]);
  const observation=useMemo(()=>buildObservationVisual(citation),[citation]);
  useEffect(()=>{
    const selectQuestion=(event:Event)=>{
      const id=(event as CustomEvent<{id:string}>).detail?.id;
      const match=observation?.questions.find(q=>observationQuestionAnchor(q.id)===id);
      if(!match||!id)return;
      setSelectedQuestion(match.question);
      const answer=document.getElementById(id)?.querySelector('details');
      if(answer)answer.open=true;
    };
    document.addEventListener('report:reveal',selectQuestion);
    return()=>document.removeEventListener('report:reveal',selectQuestion);
  },[observation]);
  if(!citation?.results.length)return null;
  const modern=!!observation;
  const selected=selectedQuestion===null?null:observation?.questions.find(q=>q.question===selectedQuestion)?.question||observation?.questions[0]?.question||null;
  const visibleResults=modern?citation.results.filter(r=>r.question.trim()===selected):citation.results;
  const groups=observation?.questions.map(q=>({id:observationQuestionAnchor(q.id),question:q.question,rows:q.cells.chatgpt.rows}))||[{id:undefined,question:null,rows:citation.results}];
  return <section className="report-geo-observations jm-card p-5 md:p-8" aria-label="AI 답변과 출처 관측">
    <p className="text-xs font-bold text-jm-red">GEO · 브랜드 언급과 출처 인용</p>
    <h3 className="text-2xl font-black mt-2">AI가 실제로 답한 내용</h3>
    <p className="mt-3 text-sm text-jm-charcoal leading-7">{modern?'질문마다 AI가 우리 이름을 썼는지, 우리 페이지를 근거로 연결했는지 확인하세요.':'아래 AI 결과는 고객 질문에 대한 브랜드 언급을 확인한 구버전 GEO 자료입니다. 자사 URL의 실제 출처 인용은 이 결과에서 측정하지 않았습니다.'}</p>
    {modern ? <ObservationOverview citation={citation}/> : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
      {[
        ['브랜드 언급률',`${citation.citationRate}% (구버전)`],
        ['자사 출처 인용률','미측정'],
        ['측정 실패·미설정','구분되지 않음'],
      ].map(([label,value]) => <div key={label} className="rounded-2xl bg-neutral-50 border p-4"><p className="text-sm text-jm-gray">{label}</p><p className="text-2xl font-black mt-2">{value}</p></div>)}
    </div>}
    {modern && <details className="report-text-detail mb-5"><summary>집계 기준과 관측 날짜<ReadingToggle variant="report"/></summary><div className="text-xs text-jm-gray leading-6">
      <p>정상 답변 {citation.validTests}건 · 검색 출처 판정 {citation.citationValidTests}건. 실패·검색 미확인 응답은 인용률 분모에서 제외합니다.</p>
      <p>관측 날짜 {readingTime(citation.measuredAt)||'기록 없음'}{citation.questionSetId&&` · 질문 세트 ${citation.questionSetId}`}{citation.cacheHit?' · 저장된 관측 결과':''}</p>
      <CompactText text={citation.summary}/>
      <p>API에서 관측한 결과이며 일반 ChatGPT 화면이나 시장 전체 노출률을 의미하지 않습니다.</p>
    </div></details>}
    {modern && <CitationFailureSummary citation={citation}/>}
    {modern && <QuestionMatrix citation={citation} selected={selected} onSelect={setSelectedQuestion}/>}
    {modern&&<p className="mt-4 text-sm" role="status">{selected?`선택한 질문: ${selected}`:'이 조건에서 선택할 질문이 없습니다.'}</p>}
    {groups.map(group=><div key={group.id||'legacy'} id={group.id} hidden={modern&&selected!==group.question} className="report-ai-question-detail space-y-3" aria-label={group.question||'이전 답변 기록'}>
      {modern&&selected===group.question&&<p className="report-action-line"><strong>다음 확인</strong><span>{citationNextAction(visibleResults)}</span></p>}
      {group.rows.map((r,i) => <details key={`${r.engine}-${i}`} className="geo-detail rounded-xl border p-4">
        <summary className="cursor-pointer font-bold text-sm leading-6">
          <span className="text-jm-red">OpenAI · GEO {modern?'답변 관측':'구버전 측정'} · {r.journey || r.questionType}</span>
          <span className="block mt-1 break-words">{r.question}</span>
          <span className="block font-normal text-jm-gray">{!modern ? (r.cited ? '브랜드 언급 있음' : '브랜드 언급 없음') : (r.status==='ok'||r.status==='unverified')?`브랜드 언급 ${typeof r.brandMentioned!=='boolean'?'미확인':r.brandMentioned?'있음':'없음'} · 자사 출처 ${observationState(r)==='cited'?'확인':observationState(r)==='uncited'?'미인용':'판정 불가'}`:r.errorMessage||observationStates[observationState(r)].label}</span>
          <ReadingToggle variant="report"/>
        </summary>
        <div className="pt-4 space-y-3 text-sm leading-7">
          <p className="text-xs text-jm-gray">{r.model} {r.measuredAt && `· ${readingTime(r.measuredAt)}`} {r.durationMs != null && `· ${(r.durationMs/1000).toFixed(1)}초`}</p>
          {r.errorAction && <p className="rounded-lg bg-amber-50 p-3 text-amber-950">{r.errorAction}</p>}
          {r.diagnosticId && <p className="break-all text-sm text-jm-gray">오류 번호: {r.diagnosticId}{r.httpStatus && ` · HTTP ${r.httpStatus}`}{r.providerCode && ` · ${r.providerCode}`}</p>}
          <RoleBox role="current" label="AI가 반환한 답변"><p className="whitespace-pre-wrap break-words">{r.responseText || r.responseSnippet || '수신한 답변이 없습니다.'}</p></RoleBox>
          {(r.sources || []).length > 0 ? <ul className="space-y-2">{r.sources!.map((s,j) => <li key={`${s.url}-${j}`} className="rounded-lg bg-neutral-50 p-3 break-words">
            <span className="text-xs font-bold">{s.ownership === 'own' ? '자사 출처' : s.ownership === 'unresolved' ? '대상 도메인 확인 필요' : '외부 출처'} · </span>
            {safeHttpUrl(s.url) && <a className="underline text-blue-700" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>}
          </li>)}</ul> : <p className="text-jm-gray">확인 가능한 출처 링크가 없습니다.</p>}
        </div>
      </details>)}
    </div>)}
    {showActionPlan?<CitationActionPlan citation={citation}/>:!!citation.actionPlan?.length&&<p className="report-related-link"><ReportJumpLink id="report-ai-question-actions">질문별 수정·재확인 방법 보기</ReportJumpLink></p>}
  </section>;
}

export function CitationActionPlan({citation}: {citation?:LlmCitationTest|null}) {
  const actions=citation?activeCitation(citation).actionPlan:undefined;
  if(!actions?.length)return null;
  return <section id="report-ai-question-actions" className="report-card mt-7"><h4 className="text-xl font-black">질문별 수정·재확인 방법</h4><p className="text-xs text-jm-gray mt-2">입력한 페이지와 관측 출처에 근거한 검토 제안입니다. 사실 정확도와 사이트 전체 콘텐츠 유무는 담당자가 확인해야 합니다.</p>
      <div className="space-y-3 mt-4">{actions.map((a,i) => <details id={citationActionAnchor(i)} className="geo-detail rounded-xl border p-4" key={i}>
        <summary className="cursor-pointer font-bold text-sm leading-6">{i+1}. {a.question}<span className="block text-jm-red text-xs">{actionLabels[a.action]}</span></summary>
        <div className="pt-3 text-sm leading-7 space-y-2"><RoleBox role="current" label="관측 근거"><p>{a.evidence}</p></RoleBox>{a.targetUrl && safeHttpUrl(a.targetUrl) && <a className="block break-all underline text-blue-700" href={a.targetUrl} target="_blank" rel="noopener noreferrer">검토 페이지: {a.targetUrl}</a>}<RoleBox role="proposal" label="실행 제안"><p>{a.nextStep}</p></RoleBox><p className="text-xs text-jm-gray">정확도: 검토 필요</p></div>
      </details>)}</div>
  </section>;
}
export default memo(LlmCitationCard);
