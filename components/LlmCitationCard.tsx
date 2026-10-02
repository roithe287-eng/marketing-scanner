"use client";
import React, { memo, useState } from 'react';
import {ObservationOverview,QuestionMatrix} from './visuals/ObservationVisuals';
import type { LlmCitationTest } from '@/lib/reportSchema';
import { safeHttpUrl } from '@/lib/citationMeasurement';

const percent = (value:number|null|undefined) => value == null ? '측정 불가' : `${value}%`;
const actionLabels = {review_cited:'인용 페이지 검토',improve_candidate:'입력 페이지 개선 검토',research_page:'관련 페이지 탐색·신규 검토',retry:'재측정 필요'};
function LlmCitationCard({citation}:{citation?:LlmCitationTest|null}) {
  const [selectedQuestion,setSelectedQuestion]=useState<string|null>(null);
  if (!citation) return null;
  const modern = citation.measurementVersion === 2;
  const selected=selectedQuestion && citation.results.some(r=>r.question.trim()===selectedQuestion) ? selectedQuestion : null;
  const visibleResults=modern ? citation.results.filter(r=>r.question.trim()===selected) : citation.results;
  return <section className="jm-card p-5 md:p-8" aria-label="GEO 질문·출처·실행 과제">
    <p className="text-xs font-bold text-jm-red">GEO · 브랜드 언급과 출처 인용</p>
    <h3 className="text-2xl font-black mt-2">AI 답변에서 확인한 GEO 결과</h3>
    <p className="mt-3 text-sm text-jm-charcoal leading-7">{modern?'고객 질문에 대한 AI 답변에서 우리 브랜드가 언급되는지, 우리 사이트가 근거 출처로 인용되는지 확인합니다. 아래 OpenAI·Gemini 결과는 이 GEO 진단을 위한 관측입니다.':'아래 AI 결과는 고객 질문에 대한 브랜드 언급을 확인한 구버전 GEO 자료입니다. 자사 URL의 실제 출처 인용은 이 결과에서 측정하지 않았습니다.'}</p>
    <p className="mt-3 text-sm text-jm-gray leading-6">{modern ? citation.summary : '이 리포트는 구버전의 브랜드 언급 기반 측정입니다. 실제 URL 출처 인용률과 비교할 수 없습니다.'}</p>
    {modern ? <ObservationOverview citation={citation}/> : <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
      {[
        ['브랜드 언급률',modern ? percent(citation.mentionRate) : `${citation.citationRate}% (구버전)`],
        ['자사 출처 인용률',modern ? percent(citation.ownedCitationRate) : '미측정'],
        ['측정 실패·미설정',modern ? `${citation.failedTests || 0}건 / ${citation.totalTests}건` : '구분되지 않음'],
      ].map(([label,value]) => <div key={label} className="rounded-2xl bg-neutral-50 border p-4"><p className="text-sm text-jm-gray">{label}</p><p className="text-2xl font-black mt-2">{value}</p></div>)}
    </div>}
    {modern && <div className="text-xs text-jm-gray leading-6 mb-5">
      <p>브랜드 포함 질문 인용률 {percent(citation.brandedCitationRate)} · 미포함 질문 {percent(citation.unbrandedCitationRate)}</p>
      <p>정상 답변 {citation.validTests}건 · 검색 출처 판정 {citation.citationValidTests}건. 실패·검색 미확인 응답은 인용률 분모에서 제외합니다.</p>
      <p>측정: {citation.measuredAt?.replace('T',' ').replace('Z',' UTC')} · 질문 세트 {citation.questionSetId}{citation.cacheHit ? ' · 저장된 관측 결과' : ''}</p>
      <p>API에서 관측한 결과이며 일반 ChatGPT·Gemini 화면이나 시장 전체 노출률을 의미하지 않습니다.</p>
    </div>}
    {modern && <QuestionMatrix citation={citation} selected={selected} onSelect={setSelectedQuestion}/>}
    {modern && <div className="mb-3 mt-6 border-t pt-5" aria-live="polite"><h4 className="text-sm font-black">선택한 질문의 답변·출처</h4><p className="mt-2 text-sm leading-6 text-jm-gray">{selected || '위 관측 지도에서 질문을 선택해 주세요.'}</p></div>}
    <div className="space-y-3">
      {visibleResults.map((r,i) => <details key={`${r.engine}-${i}`} className="geo-detail rounded-xl border p-4">
        <summary className="cursor-pointer font-bold text-sm leading-6">
          <span className="text-jm-red">{r.engine === 'chatgpt' ? 'OpenAI' : 'Gemini'} · GEO {modern?'답변 관측':'구버전 측정'} · {r.journey || r.questionType}</span>
          <span className="block mt-1 break-words">{r.question}</span>
          <span className="block font-normal text-jm-gray">{!modern ? (r.cited ? '브랜드 언급 있음' : '브랜드 언급 없음') : r.status === 'ok' ? `브랜드 언급 ${r.brandMentioned ? '있음' : '없음'} · 자사 출처 ${r.cited ? '확인' : '없음'}` : r.status === 'unverified' ? '답변 수신 · 검색 또는 출처 확인 불가' : r.errorMessage || '측정 실패'} · 답변·출처 펼치기</span>
        </summary>
        <div className="pt-4 space-y-3 text-sm leading-7">
          <p className="text-xs text-jm-gray">{r.model} {r.measuredAt && `· ${r.measuredAt}`} {r.durationMs != null && `· ${(r.durationMs/1000).toFixed(1)}초`}</p>
          <p className="whitespace-pre-wrap break-words">{r.responseText || r.responseSnippet || '수신한 답변이 없습니다.'}</p>
          {(r.sources || []).length > 0 ? <ul className="space-y-2">{r.sources!.map((s,j) => <li key={`${s.url}-${j}`} className="rounded-lg bg-neutral-50 p-3 break-words">
            <span className="text-xs font-bold">{s.ownership === 'own' ? '자사 출처' : s.ownership === 'unresolved' ? '대상 도메인 확인 필요' : '외부 출처'} · </span>
            {safeHttpUrl(s.url) && <a className="underline text-blue-700" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>}
          </li>)}</ul> : <p className="text-jm-gray">확인 가능한 출처 링크가 없습니다.</p>}
        </div>
      </details>)}
    </div>
    {!!citation.actionPlan?.length && <div className="mt-7"><h4 className="text-xl font-black">질문별 실행 과제</h4><p className="text-xs text-jm-gray mt-2">입력한 페이지와 관측 출처에 근거한 검토 제안입니다. 사실 정확도와 사이트 전체 콘텐츠 유무는 담당자가 확인해야 합니다.</p>
      <div className="space-y-3 mt-4">{citation.actionPlan.map((a,i) => <details className="geo-detail rounded-xl border p-4" key={i}>
        <summary className="cursor-pointer font-bold text-sm leading-6">{i+1}. {a.question}<span className="block text-jm-red text-xs">{actionLabels[a.action]}</span></summary>
        <div className="pt-3 text-sm leading-7 space-y-2"><p>{a.evidence}</p>{a.targetUrl && safeHttpUrl(a.targetUrl) && <a className="block break-all underline text-blue-700" href={a.targetUrl} target="_blank" rel="noopener noreferrer">검토 페이지: {a.targetUrl}</a>}<p className="font-semibold">{a.nextStep}</p><p className="text-xs text-jm-gray">정확도: 검토 필요</p></div>
      </details>)}</div>
    </div>}
  </section>;
}
export default memo(LlmCitationCard);
