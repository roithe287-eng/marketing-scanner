import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import DiagnosisIcon from './report/DiagnosisIcon';
export default function CopyImprovement({exampleCopy,competitorAnalysis}:{exampleCopy:MarketingReport['exampleCopy'];competitorAnalysis?:MarketingReport['competitorAnalysis']}) {
  if(!exampleCopy)return null;
  const items=[{label:'메인 헤드라인',axis:'firstView' as const,current:exampleCopy.currentHeroHeadline,proposed:exampleCopy.heroHeadline},{label:'서브 헤드라인',axis:'copywriting' as const,current:undefined,proposed:exampleCopy.subHeadline},{label:'CTA 버튼 문구',axis:'cta' as const,current:exampleCopy.currentCtaText,proposed:exampleCopy.ctaText}];
  return <section className="report-copy-section" aria-label="카피 개선 제안"><div className="report-card-heading"><p className="report-eyebrow">COPY REVIEW</p><h3>카피 개선 제안</h3><p className="report-note">현재 문구와 제안을 대조하고, 실제 제공 범위와 맞는지 확인하세요.</p></div>
    <div className="report-stack">{items.map(item=><article className="report-copy-item" key={item.label}><h4><DiagnosisIcon axis={item.axis}/>{item.label}</h4><div className="report-copy-pair"><div><h5>AS-IS · 현재</h5><p>{item.current||'현재 카피 정보가 저장되지 않았습니다.'}</p></div><div data-variant="after"><h5>TO-BE · 제안</h5><p>{item.proposed||'저장된 제안이 없습니다.'}</p></div></div></article>)}</div>
    {exampleCopy.competitorCopyInsight&&<div className="report-callout"><strong>비교 후보에서 참고할 표현</strong><p>{exampleCopy.competitorCopyInsight}</p>{competitorAnalysis?.searchKeyword&&<p className="report-note">검색 키워드 · {competitorAnalysis.searchKeyword}</p>}</div>}
  </section>;
}
