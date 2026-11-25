import React, {type ReactNode} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {CompactText} from './ReportVisualSummary';
import ReportIndustryEvidence from './ReportIndustryEvidence';
import ReportOutcomeVisuals from './ReportOutcomeVisuals';
import {nonCommerceOpening} from '@/lib/reportOpening';

export default function ReportHeader({report,data,firstTaskCount,actions,topAnchor=true}:{report:MarketingReport;data:ReportInsights;firstTaskCount:number;actions?:ReactNode;topAnchor?:boolean}) {
  const site=report.meta?.siteName||report.meta?.domain||report.url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const url=safeHttpUrl(report.url);
  const opening=nonCommerceOpening(report);
  const ring=2*Math.PI*72;
  const review=report.evidenceReview,unmeasured=review?.assessed===0,displayValue=review?review.passed:report.overallScore,displayTotal=review?review.assessed:100,ratio=displayTotal?displayValue/displayTotal:0;
  return <header className="report-hero" id={topAnchor?'report-top':'report-header'}>
    <div className="report-hero-main"><h1>{site}<span>마케팅 진단 리포트</span></h1>{url&&<a className="report-domain" href={url} target="_blank" rel="noopener noreferrer">{report.url} ↗</a>}<div className="report-hero-conclusion"><strong>진단 한눈에 보기</strong><CompactText className="report-hero-summary" label="진단 요약 전문" text={opening?.summary||report.oneLineSummary}/></div></div>
    {opening?<aside className="report-hero-purpose" aria-label="사이트 목적에 맞춘 분석 방향"><span>우리 사이트의 분석 방향</span><strong>{opening.purpose}</strong><dl><div><dt>고객이 찾을 주제</dt><dd>{opening.topic}</dd></div><div><dt>이어질 행동</dt><dd>{opening.goal}</dd></div></dl></aside>:unmeasured?<div className="report-hero-score"><span>HTML 기본 항목</span><strong className="report-hero-score-unmeasured">판정 보류</strong><p>판정 가능한 근거가 없습니다.{review.unknown>0?` 확인이 필요한 항목은 ${review.unknown}개입니다.`:''}</p>{!topAnchor&&<a className="work-link" href="#report-html-observations">확인 범위 열기</a>}</div>:<div className="report-hero-score"><span>{review?'HTML 기본 항목 충족':'AI 참고 평가 · 세부 배점 미검증'}</span>
      <div className="report-score-dial" role="img" aria-label={review?`${displayTotal}개 관측 항목 중 ${displayValue}개 충족`:`AI 참고 평가 ${displayValue}점, 실측 아님`}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="72" fill="none" stroke="#ffffff35" strokeWidth="9"/><circle cx="90" cy="90" r="72" fill="none" stroke="#e6f47b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(ring*ratio).toFixed(2)} ${ring.toFixed(2)}`} transform="rotate(-90 90 90)"/><text x="90" y="92" textAnchor="middle" fontSize="49" fontWeight="850" fill="white">{displayValue}</text><text x="90" y="125" textAnchor="middle" fontSize="16" fontWeight="650" fill="#e4edff">/ {displayTotal}{review?'항목':''}</text></svg></div>
      <p>{review?'판정 기준·산식은 아래 근거에서 확인':'수집 문서에 대한 AI 의견'}</p>
    </div>}
    <div className="report-hero-bottom">
      <ReportIndustryEvidence report={report} linkToPurpose={!topAnchor}/>
      <ReportOutcomeVisuals report={report} data={data} firstTaskCount={firstTaskCount}/>
      {actions&&<div className="report-toolbar" data-hide-on-export>{actions}</div>}
    </div>
  </header>;
}
