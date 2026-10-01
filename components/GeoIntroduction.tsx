import {GEO_TITLE,GEO_DESCRIPTION,GEO_METRICS} from '@/lib/geoPresentation';

export default function GeoIntroduction() {
  return <section className="mt-6 md:mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-5 md:p-7" aria-label="GEO 진단 안내">
    <p className="text-xs font-bold tracking-wide text-jm-red">GEO · 생성형 AI 검색·답변 최적화</p>
    <h2 className="mt-2 text-xl md:text-2xl font-black text-jm-black">{GEO_TITLE}</h2>
    <p className="mt-3 text-sm leading-7 text-jm-charcoal">{GEO_DESCRIPTION}</p>
    <dl className="mt-5 grid gap-3 md:grid-cols-3">
      {GEO_METRICS.map(metric=><div key={metric.title} className="rounded-xl border border-red-100 bg-white p-4">
        <dt className="text-sm font-bold text-jm-black">{metric.title}</dt>
        <dd className="mt-2 text-xs leading-6 text-jm-gray">{metric.description}</dd>
      </div>)}
    </dl>
    <p className="mt-4 text-xs leading-6 text-jm-gray">페이지 준비도 점수와 AI 답변 관측 결과는 서로 다른 지표입니다. 브랜드 언급만으로 자사 사이트가 출처로 인용됐다고 판단하지 않습니다.</p>
  </section>;
}
