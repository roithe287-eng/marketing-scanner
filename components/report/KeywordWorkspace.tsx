'use client';
import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import KeywordFrequencyCard from '@/components/KeywordFrequencyCard';
import KeywordRewritePanel from './KeywordRewritePanel';
import {KeywordOpportunities} from './InsightPanels';
import ReportJumpLink from './ReportJumpLink';

export default function KeywordWorkspace({report,data}:{report:MarketingReport;data:ReportInsights}) {
  const id='report-keywords';
  return <section className="report-card keyword-workspace" aria-labelledby={`${id}-heading`}>
    <div className="report-card-heading"><p className="report-eyebrow">KEYWORD & CONTENT</p><h3 id={`${id}-heading`}><span className="report-type-highlight">키워드와 문장</span>, 한곳에서 검토하기</h3><p className="report-note">먼저 실제 상품·서비스를 대표하는 표현을 고르세요. 전체 집계에서 등장 횟수를 보고, 표현별 수정안에서 바꿀 문장을 확인할 수 있습니다.</p></div>
    <nav className="keyword-workspace-nav" aria-label="키워드 검토 목차">{[['review','제목·설명에 쓸 표현'],['frequency','수집한 글의 등장 횟수'],['rewrite','표현별 문장 수정안']].map(([key,label])=><ReportJumpLink key={key} id={`${id}-${key}`} className="keyword-workspace-link">{label}</ReportJumpLink>)}</nav>
    <div id={`${id}-review`}><KeywordOpportunities data={data} compact/></div>
    <div id={`${id}-frequency`}>{report.keywordFrequency?<KeywordFrequencyCard frequency={report.keywordFrequency} compact/>:<p className="report-empty">이 보고서에는 빈도 집계가 저장되지 않았습니다. 새 진단으로 수집하세요.</p>}</div>
    <div id={`${id}-rewrite`}><KeywordRewritePanel report={report} compact/></div>
  </section>;
}
