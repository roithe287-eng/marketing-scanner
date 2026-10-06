import {activeCitation} from '@/lib/activeCitation';
import React from 'react';
import type {LlmCitationQuestionResult, LlmCitationTest} from '@/lib/reportSchema';
import {citationFailure, httpCitationFailure} from '@/lib/citationFailure';

export default function CitationFailureSummary({citation}:{citation:LlmCitationTest}) {
  citation=activeCitation(citation);
  const failures=citation.results.filter(r=>r.status==='error'||r.status==='timeout'||r.status==='unavailable');
  if(!failures.length)return null;
  const groups=new Map<string,LlmCitationQuestionResult[]>();
  for(const row of failures){const key=JSON.stringify([row.engine,row.errorCode,row.httpStatus,row.providerCode,row.errorMessage]);groups.set(key,[...(groups.get(key)||[]),row]);}
  return <div aria-label="AI 호출 실패 원인과 조치" className="my-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-5">
    <h4 className="text-lg font-black text-amber-950">일부 AI 관측을 완료하지 못했습니다</h4>
    <p className="mt-2 text-sm leading-6 text-amber-950">아래 항목은 사이트가 인용되지 않았다는 뜻이 아닙니다. 실패한 관측은 인용률 계산에서 제외합니다.</p>
    <div className={`mt-4 grid min-w-0 gap-3 ${groups.size>1?'lg:grid-cols-2':''}`}>{[...groups.entries()].map(([key,rows])=>{
      const row=rows[0];const httpStatus=row.httpStatus || Number(row.errorMessage?.match(/\bHTTP (4\d\d|5\d\d)\b/)?.[1]) || undefined;
      const fallback=row.errorCode ? citationFailure(row.errorCode) : httpStatus ? httpCitationFailure(httpStatus,null) : citationFailure(row.status==='timeout'?'TIMEOUT':row.status==='unavailable'?'API_KEY_MISSING':'UNKNOWN');
      return <div key={key} className="min-w-0 rounded-xl border border-amber-200 bg-white p-4 text-sm leading-6 [overflow-wrap:anywhere]">
        <p className="font-black text-slate-900">OpenAI · {rows.length}건 {row.status==='unavailable'?'미설정':'관측 실패'}</p>
        <p className="mt-2 font-bold text-amber-900">{row.errorMessage || fallback.errorMessage}</p>
        <p className="mt-2 text-slate-700">{row.errorAction || fallback.errorAction}</p>
        <p className="mt-3 text-sm text-slate-600">{httpStatus && `HTTP ${httpStatus} · `}{row.providerCode || row.errorCode || '상세 코드 기록 없음'}</p>
        <details className="mt-3 border-t border-slate-200 pt-3"><summary className="cursor-pointer font-semibold text-slate-700">운영자 확인 정보</summary>
          <p className="mt-2">측정 모델: {row.model || '기록 없음'}</p>
          <ul className="mt-2 space-y-2">{rows.map((r,i)=><li key={r.diagnosticId||i}>{r.measuredAt?.replace('T',' ').replace('Z',' UTC') || '측정 시각 기록 없음'}<br/>오류 번호: {r.diagnosticId || '이전 리포트 · 상세 기록 없음'}</li>)}</ul>
        </details>
      </div>;
    })}</div>
  </div>;
}
