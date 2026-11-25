import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {WebsitePurpose} from '@/lib/websitePurpose';
import CompetitorUrlPanel from './CompetitorUrlPanel';
import ReportJumpLink from './ReportJumpLink';

const journey=[
  {title:'제품 고르기',checks:[['business-hair-type','숱 보충·길이 연장']]},
  {title:'옵션 비교',checks:[['business-hair-options','소재·길이·피스 수']]},
  {title:'색상과 착용',checks:[['business-hair-color','컬러차트·착용 컷'],['business-hair-care','착용·관리 방법']]},
  {title:'구매와 교환',checks:[['business-hair-checkout','옵션 선택·구매'],['business-hair-policy','배송·교환 조건']]},
];

export function WigPurchaseJourney({purpose}:{purpose:WebsitePurpose}){
  const checks=new Map(purpose.checks.map(check=>[check.id,check]));
  return <section className="report-card wig-report-panel" aria-label="가발·헤어피스 구매 흐름">
    <header><h3>가발·헤어피스 구매 흐름</h3><p>단계별로 원문에서 확인한 항목을 살펴보세요.</p></header>
    <ol className="wig-journey">
      {journey.map((step,index)=><li key={step.title}>
        <h4>{step.title}</h4>
        {step.checks.map(([id,label])=>{const observed=checks.get(id)?.status==='observed';return <div className="wig-check" key={id}>
          <span>{label}</span>
          <small className={observed?'wig-status-observed':'wig-status-review'}>{observed?'문구 확인':'추가 확인'}</small>
        </div>;})}
        {index<journey.length-1&&<span className="wig-journey-arrow" aria-hidden="true">→</span>}
      </li>)}
    </ol>
    <ReportJumpLink id="report-view-search-scope">단계별 근거와 점검 방법</ReportJumpLink>
  </section>;
}

export function WigStoreComparison({analysis:stored}:{analysis:NonNullable<MarketingReport['competitorAnalysis']>}){
  return <CompetitorUrlPanel analysis={stored}/>;
}
