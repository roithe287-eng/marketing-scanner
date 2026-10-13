'use client';
import React,{useId,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import KeywordFrequencyCard from '@/components/KeywordFrequencyCard';
import KeywordRewritePanel from './KeywordRewritePanel';
import {KeywordOpportunities} from './InsightPanels';

export default function KeywordWorkspace({report,data}:{report:MarketingReport;data:ReportInsights}) {
  const [tab,setTab]=useState('review'),id=useId();
  return <section className="report-card keyword-workspace" aria-labelledby={`${id}-heading`}>
    <div className="report-card-heading"><p className="report-eyebrow">KEYWORD & CONTENT</p><h3 id={`${id}-heading`}>키워드와 문장, 한곳에서 검토하기</h3><p className="report-note">제목에 쓸 표현을 먼저 검토하고, 필요할 때 전체 등장 횟수와 표현별 수정안을 확인하세요. 단어·연속어구와 기존 상세 자료를 모두 모았습니다.</p></div>
    <div className="keyword-workspace-nav" role="group" aria-label="키워드 검토 화면">{[['review','제목·설명 검토'],['frequency','전체 빈도 집계'],['rewrite','표현별 검토·수정']].map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} aria-controls={`${id}-${key}`} onClick={()=>setTab(key)}>{label}</button>)}</div>
    <div id={`${id}-review`} hidden={tab!=='review'}><KeywordOpportunities data={data} compact/></div>
    <div id={`${id}-frequency`} hidden={tab!=='frequency'}>{report.keywordFrequency?<KeywordFrequencyCard frequency={report.keywordFrequency} compact/>:<p className="report-empty">이 보고서에는 빈도 집계가 저장되지 않았습니다. 새 진단으로 수집하세요.</p>}</div>
    <div id={`${id}-rewrite`} hidden={tab!=='rewrite'}><KeywordRewritePanel report={report} compact/></div>
  </section>;
}
