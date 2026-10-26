import {CompactText} from './report/ReportVisualSummary';
import React from 'react';
import DiagnosisIcon from './report/DiagnosisIcon';
import {GEO_TITLE,GEO_DESCRIPTION,GEO_METRICS} from '@/lib/geoPresentation';

export default function GeoIntroduction() {
  return <section className="report-geo-intro mt-6 md:mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-5 md:p-7" aria-label="GEO 진단 안내">
    <p className="text-xs font-bold tracking-wide text-jm-red">GEO · 생성형 AI 검색·답변 최적화</p>
    <h2 className="mt-2 text-xl md:text-2xl font-black text-jm-black">{GEO_TITLE}</h2>
    <CompactText className="mt-3 text-sm leading-7 text-jm-charcoal" text={GEO_DESCRIPTION} summary="AI가 브랜드를 찾고, 답변에 활용하기 쉽게 만드는 작업입니다."/>
    <dl className="mt-5 grid gap-3 md:grid-cols-3">
      {GEO_METRICS.map((metric,index)=><div key={metric.title} className="rounded-xl border border-red-100 bg-white p-4">
        <dt className="text-sm font-bold text-jm-black"><span className="report-concept-icon"><DiagnosisIcon axis={index===0?'seo':index===1?'copywriting':'trust'}/></span>{metric.title}</dt>
        <dd className="mt-2 text-xs leading-6 text-jm-gray">{['정보를 읽고 이해할 수 있는가','답변에 브랜드명이 등장하는가','근거 링크에 자사 URL이 있는가'][index]}</dd>
      </div>)}
    </dl><details className="report-text-detail"><summary>세 지표의 정의</summary><div>{GEO_METRICS.map(m=><p key={m.title}><strong>{m.title}</strong> · {m.description}</p>)}</div></details>
    <p className="mt-4 text-xs leading-6 text-jm-gray">준비도 ≠ 실제 답변 · 브랜드 언급 ≠ 자사 출처 인용</p>
  </section>;
}
