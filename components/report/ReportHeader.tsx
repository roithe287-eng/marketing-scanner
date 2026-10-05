import React, {type ReactNode} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import {safeHttpUrl} from '@/lib/citationMeasurement';

export default function ReportHeader({report,data,actions}:{report:MarketingReport;data:ReportInsights;actions?:ReactNode}) {
  const site=report.meta?.siteName||report.meta?.domain||report.url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const url=safeHttpUrl(report.url);
  const ring=2*Math.PI*72;
  const outcomes=[
    {id:'geo',number:'01',title:'발견되는가',detail:'검색·AI 답변',metric:data.obs?`${data.questions.length}개 고객 질문`:'AI 관측 상태 확인'},
    {id:'competition',number:'02',title:'선택받는가',detail:'경쟁사·선택 정보',metric:data.competitorCount?`${data.competitorCount}개 비교 후보`:'비교 후보 수집 상태 확인'},
    {id:'actions',number:'03',title:'무엇을 바꿀까',detail:'개선안·실행·KPI',metric:`${data.tasks.length}개 보완 항목`},
  ];
  return <header className="report-hero" id="report-top">
    <div className="report-hero-main"><p className="report-eyebrow">YOUR NEXT MOVE · MARKETING REPORT</p><h1>{site}<span>마케팅 진단 리포트</span></h1>{url&&<a className="report-domain" href={url} target="_blank" rel="noopener noreferrer">{report.url} ↗</a>}<p className="report-hero-summary">{report.oneLineSummary}</p><p className="report-note">공개 페이지 기반 자동 진단 · 실행 전 담당자 검토</p></div>
    <div className="report-hero-score"><span>마케팅 종합 점수</span>
      <div className="report-score-dial" role="img" aria-label={`마케팅 종합 점수 ${report.overallScore}점, 100점 만점`}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="72" fill="none" stroke="#ffffff35" strokeWidth="9"/><circle cx="90" cy="90" r="72" fill="none" stroke="#e6f47b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(ring*report.overallScore/100).toFixed(2)} ${ring.toFixed(2)}`} transform="rotate(-90 90 90)"/><text x="90" y="92" textAnchor="middle" fontSize="49" fontWeight="850" fill="white">{report.overallScore}</text><text x="90" y="125" textAnchor="middle" fontSize="16" fontWeight="650" fill="#e4edff">/ 100</text></svg></div>
      <p>페이지 구조·콘텐츠 진단</p><small>8개 축 평균·AI 인용률과는<br/>구분되는 지표입니다.</small>
    </div>
    <div className="report-hero-bottom">
      <div className="report-outcome-links" aria-label="핵심 결과 바로가기">{outcomes.map(o=><a key={o.id} href={`#report-${o.id}`} data-outcome={o.id}><span className="report-outcome-number">{o.number}</span><strong>{o.title}</strong><span className="report-outcome-detail">{o.detail}</span><span className="report-outcome-metric">{o.metric}<b aria-hidden="true">↗</b></span></a>)}</div>
      {actions&&<div className="report-toolbar" data-hide-on-export>{actions}</div>}
    </div>
  </header>;
}
