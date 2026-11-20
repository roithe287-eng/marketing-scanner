import React from 'react';
import {RoleBox} from './report/ReportRole';
import {Guidebook} from './report/SiteGuidebook';
import ReportJumpLink from './report/ReportJumpLink';
import type {MarketingReport} from '@/lib/reportSchema';
import type {buildPageEdits} from '@/lib/reportExecution';
import {reportPhraseKey} from '@/lib/conciseReport';
import DiagnosisIcon from './report/DiagnosisIcon';

type Props = {
  exampleCopy: MarketingReport['exampleCopy'];
  competitorAnalysis?: MarketingReport['competitorAnalysis'];
  pageEdits?: ReturnType<typeof buildPageEdits>;
};

export default function CopyImprovement({exampleCopy,competitorAnalysis,pageEdits}:Props) {
  if(!exampleCopy)return null;

  const items=[
    {id:'hero',label:'대표 제목',axis:'firstView' as const,current:exampleCopy.currentHeroHeadline,proposed:exampleCopy.heroHeadline,hint:'대상과 대표 상품·서비스를 제목에서 바로 알아볼 수 있는지 확인하세요.'},
    {id:'sub',label:'보조 문구',axis:'copywriting' as const,current:undefined,proposed:exampleCopy.subHeadline,hint:'제목에 담기 어려운 제공 범위나 이용 조건을 한 문장으로 보완하세요.'},
    {id:'cta',label:'다음 행동 버튼',axis:'cta' as const,current:exampleCopy.currentCtaText,proposed:exampleCopy.ctaText,hint:'버튼 이름이 실제로 열리는 문의·신청·구매 화면과 일치하는지 확인하세요.'},
  ];

  return <section className="report-copy-section" aria-label="첫 화면 문구 조합">
    <div className="report-card-heading"><h3>제목부터 버튼까지 자연스럽게 이어지나요?</h3><p className="report-note">제목에서 제공 내용을 알리고, 보조 문구에서 조건을 설명하세요. 버튼에서 고객이 이어서 할 일을 안내하세요.</p></div>
    <div className="report-stack">{items.map(item=>{
      const edit=pageEdits?.find(field=>field.id===item.id);
      const sameCurrent=!!item.current&&item.current===edit?.before;
      const sameProposal=!!item.proposed&&reportPhraseKey(item.proposed)===reportPhraseKey(edit?.after);
      return <article className="report-copy-item" key={item.id}>
        <h4><DiagnosisIcon axis={item.axis}/>{item.label}</h4>
        <p className="report-note">{item.hint}</p>
        {((item.current&&!sameCurrent)||!sameProposal)&&<div className="report-copy-pair">
          {item.current&&!sameCurrent&&<RoleBox role="current" label="저장된 현재 문구"><p>{item.current}</p></RoleBox>}
          {!sameProposal&&<RoleBox role="proposal" label="문구 제안"><p>{item.proposed||'저장된 제안이 없습니다.'}</p></RoleBox>}
        </div>}
        {sameProposal||sameCurrent?<p className="report-related-link"><ReportJumpLink id={`report-edit-${item.id}`}>{item.label} 원문과 수정 위치 비교</ReportJumpLink></p>
          :<Guidebook title={item.label} current={item.current} proposal={item.proposed}/>}
      </article>;
    })}</div>
    {exampleCopy.competitorCopyInsight&&<div className="report-callout"><strong>비교 후보에서 참고할 표현</strong><p>{exampleCopy.competitorCopyInsight}</p>{competitorAnalysis?.searchKeyword&&<p className="report-note">검색 키워드 · {competitorAnalysis.searchKeyword}</p>}</div>}
  </section>;
}
