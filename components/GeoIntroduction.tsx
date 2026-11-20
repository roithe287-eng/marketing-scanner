import ReadingDisclosure from './ReadingDisclosure';
import React from 'react';
import DiagnosisIcon from './report/DiagnosisIcon';
import {GEO_TITLE,GEO_DESCRIPTION,GEO_METRICS} from '@/lib/geoPresentation';

export default function GeoIntroduction() {
  return <section className="report-geo-intro mt-6 md:mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-5 md:p-7" aria-label="GEO 진단 안내">
    <p className="text-xs font-bold tracking-wide text-jm-red">GEO · 생성형 AI 검색·답변 최적화</p>
    <h3 className="mt-2 text-xl md:text-2xl font-black text-jm-black">{GEO_TITLE}</h3>
    <ReadingDisclosure className="mt-3" title="준비도·언급·인용의 차이 살펴보기" preview="준비도는 페이지 내용의 점검입니다. 언급과 인용은 실제 AI 답변에서 따로 확인합니다."><p className="report-note">{GEO_DESCRIPTION}</p>
    <dl className="mt-5 grid gap-3 md:grid-cols-3">
      {GEO_METRICS.map((metric,index)=><div key={metric.title} className="rounded-xl border border-red-100 bg-white p-4">
        <dt className="text-sm font-bold text-jm-black"><span className="report-concept-icon"><DiagnosisIcon axis={index===0?'seo':index===1?'copywriting':'trust'}/></span>{metric.title}</dt>
        <dd className="mt-2 text-xs leading-6 text-jm-gray">{['정보를 읽고 이해할 수 있는가','답변에 브랜드명이 등장하는가','근거 링크에 자사 URL이 있는가'][index]}</dd>
      </div>)}
    </dl><dl className="report-geo-definitions">{GEO_METRICS.map(m=><div key={m.title}><dt>{m.title}</dt><dd>{m.description}</dd></div>)}</dl></ReadingDisclosure>
  </section>;
}
