import React from 'react';
import {PairedBars,ComparisonCoverage} from './visuals/ComparisonVisuals';
import type {LlmCitationQuestionResult, MarketingReport} from '@/lib/reportSchema';
import {buildGeoComparison,changeLabels,comparisonReasons,comparisonTime,GEO_COMPARISON_NOTE,GEO_COMPARISON_TITLE,observationLabel} from '@/lib/geoComparison';

function Evidence({row,label}:{row?:LlmCitationQuestionResult;label:string}) {
  return <div className="min-w-0 rounded-xl bg-neutral-50 p-4">
    <h4 className="font-bold">{label} · {observationLabel(row)}</h4>
    <p className="mt-2 text-xs leading-6 text-jm-gray">{comparisonTime(row?.measuredAt)}<br/>요청 모델: {row?.model || '기록 없음'}<br/>브랜드 언급: {typeof row?.brandMentioned==='boolean'?(row.brandMentioned?'있음':'없음'):'판정 불가'}</p>
    {row?.errorMessage && <p className="mt-3 text-xs leading-6 text-amber-800">{row.errorMessage}</p>}
    {row?.errorAction && <p className="mt-2 text-sm leading-6 text-amber-900">{row.errorAction}</p>}
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{row?.responseText||row?.responseSnippet||'저장된 답변이 없습니다.'}</p>
    {!!row?.sources?.length && <ul className="mt-3 space-y-2">{row.sources.map((source,i)=><li key={`${source.url}-${i}`}><a href={source.url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-blue-700 underline">{source.ownership==='own'?'자사':source.ownership==='unresolved'?'대상 미확인':'외부'} · {source.title||source.url}</a></li>)}</ul>}
  </div>;
}
export default function GeoComparisonPanel({report}:{report:MarketingReport}) {
  const result=buildGeoComparison(report);if (!result) return null;
  return <section aria-label={GEO_COMPARISON_TITLE} className="report-geo-comparison jm-card mt-6 p-5 md:p-7">
    <p className="text-xs font-bold text-jm-red">GEO COMPARISON</p><h2 className="mt-2 text-xl font-black md:text-2xl">{GEO_COMPARISON_TITLE}</h2>
    <p className="mt-3 text-sm leading-7 text-jm-gray">{GEO_COMPARISON_NOTE}</p>
    <p className="mt-3 text-xs leading-6 text-jm-gray">이전 {comparisonTime(result.baseline.citation.measuredAt)}<br/>현재 {comparisonTime(result.current?.measuredAt)}</p>
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      <PairedBars label="자사 출처 인용률" before={result.beforeRate} after={result.afterRate} count={result.matched}/>
      <PairedBars label="브랜드 언급률" before={result.beforeMention} after={result.afterMention} count={result.mentionCount}/>
      <ComparisonCoverage matched={result.matched} excluded={result.excluded}/>
    </div>
    {result.matched>0 ? <p className="mt-4 text-sm leading-6">새로 인용 {result.gained}건 · 이번에 미확인 {result.lost}건 · 인용 유지 {result.kept}건</p> : <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-7">비교 가능한 관측이 없습니다. 제외 이유를 확인하고, 이번 결과를 공유해 다음 측정의 기준으로 사용할 수 있습니다.</p>}
    <div className="mt-5 space-y-3">{result.pairs.map(pair=><details key={pair.key} className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm leading-7"><span className="mr-2 font-bold">OpenAI</span><span className="break-words">{pair.question}</span><span className="mt-1 block text-xs text-jm-gray">{pair.reason?`비교 제외 · ${comparisonReasons[pair.reason]}`:changeLabels[pair.change!]} · 이전·현재 답변과 출처 보기</span></summary>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><Evidence row={pair.before} label="이전"/><Evidence row={pair.after} label="현재"/></div>
    </details>)}</div>
    <p className="mt-4 text-xs leading-6 text-jm-gray">기준 보고서 ID: {result.baseline.reportId}. 이전 관측을 함께 저장해도 기준 보고서의 만료일은 연장되지 않습니다. 상세 내용을 펼칠 때 AI를 다시 호출하지 않습니다.</p>
  </section>;
}
