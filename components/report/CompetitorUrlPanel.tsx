import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {competitionScopeLabel} from '@/lib/competitionScope';
import {sharedCompetitorOffering} from '@/lib/competitorSelection';
import {competitorDisplay} from '@/lib/competitorDisplay';
import ReportJumpLink from './ReportJumpLink';

type Comparison=NonNullable<MarketingReport['competitorAnalysis']>;
export default function CompetitorUrlPanel({analysis:stored,linkToDetails=false}:{analysis:Comparison;linkToDetails?:boolean}){
  const analysis=competitorDisplay(stored);
  const research=analysis.research;
  const scope=analysis.ourSite?.scope;
  const official=research?.provider==='official_wig_stores';
  const confirmed=official||(analysis.filtering?.policyVersion||0)>=3;
  const candidates=analysis.competitors.flatMap(candidate=>{
    const url=safeHttpUrl(candidate.link);
    return url?[{...candidate,url}]:[];
  });
  const excluded=analysis.filtering?.excluded||[];
  const lookupIncomplete=research?.selectionStatus==='lookup_unavailable';
  if(lookupIncomplete&&!excluded.length)return null;
  const basis=scope?competitionScopeLabel(scope):analysis.searchKeyword;
  const checked=analysis.filtering?.metadataCheckedCount;
  const steps=[
    {label:'비교 기준',value:basis||'저장 근거 확인'},
    {label:'원문 확인 시도',value:typeof checked==='number'?`${checked}곳`:'저장 기록 확인'},
    {label:'비교 후보',value:lookupIncomplete||research?.selectionStatus==='insufficient_source'?'판정 보류':`${candidates.length}곳`},
  ];
  return <section className="report-card report-competitor-urls" data-page-model="competitor-urls" aria-label={official?'가발·헤어피스 경쟁사':'경쟁사 원문 URL'}>
    <header><h3>{!candidates.length?'경쟁사 후보 확인 결과':official?'같은 상품군을 판매하는 공식몰':confirmed?'원문으로 확인한 경쟁사':'저장된 경쟁사 후보'}</h3></header>
    <ol className="report-competitor-flow" aria-label="경쟁사 선정 과정">
      {steps.map(({label,value})=><li key={label}><span>{label}</span><strong>{value}</strong></li>)}
    </ol>
    {candidates.length?<ul className={`report-competitor-url-grid${official?' wig-store-list':''}`}>
      {candidates.map((candidate,index)=>{
        const name=(official?candidate.title:candidate.metaTitle||candidate.h1||candidate.domain).trim()||candidate.domain;
        const common=candidate.matchedOffer?.length?candidate.matchedOffer:sharedCompetitorOffering(scope,candidate.scope);
        const terms=common.length?common:candidate.matchedTerms||[];
        const source=candidate.sourceExcerpt||candidate.metaDescription;
        const url=new URL(candidate.url);
        const address=url.host+(url.pathname==='/'?'':url.pathname)+url.search;
        return <li key={candidate.url} className="report-competitor-url-card">
          <h4>{name}</h4>
          {terms.length>0?<ul className="report-competitor-common" aria-label={common.length?'공통 상품·서비스':'원문 확인 표현'}>{terms.slice(0,4).map(term=><li key={term}>{term}</li>)}</ul>:null}
          <a className="report-competitor-original" href={candidate.url} target="_blank" rel="noopener noreferrer" aria-label={`${official?candidate.title:candidate.domain} ${official?'공식몰':'원문'} 열기`}>
            <span>{address}</span> <span aria-hidden="true">↗</span>
          </a>
          {source&&source!==name&&!candidate.fetchError&&<details className="report-competitor-excerpt"><summary>원문에서 확인한 문구</summary><blockquote>{source.slice(0,240)}</blockquote></details>}
          {linkToDetails&&<ReportJumpLink id={`report-competitor-page-${index+1}`}>후보 상세 보기</ReportJumpLink>}
        </li>;
      })}
    </ul>:!lookupIncomplete&&<p className="report-note">{research?.selectionMessage||'같은 상품·서비스를 확인한 URL이 없습니다.'}</p>}
    {!!excluded.length&&<details className="report-competitor-exclusions"><summary>제외한 URL과 이유 · {excluded.length}건</summary><ul>
      {excluded.map((item,index)=><li key={`${item.link}-${index}`}><strong>{item.domain}</strong> · {item.reason}</li>)}
    </ul></details>}
  </section>;
}
