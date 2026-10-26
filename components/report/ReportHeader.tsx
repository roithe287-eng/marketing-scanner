import React, {type ReactNode} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {nonCommerceOpening} from '@/lib/reportOpening';

export default function ReportHeader({report,data,actions}:{report:MarketingReport;data:ReportInsights;actions?:ReactNode}) {
  const site=report.meta?.siteName||report.meta?.domain||report.url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const url=safeHttpUrl(report.url);
  const opening=nonCommerceOpening(report);
  const ring=2*Math.PI*72;
  const review=report.evidenceReview,displayValue=review?review.passed:report.overallScore,displayTotal=review?review.assessed:100,ratio=displayTotal?displayValue/displayTotal:0;
  const outcomes=[
    {id:opening?'overview':'geo',number:'01',title:'발견되는가',detail:'검색·AI 답변',metric:opening?(opening.questions.length?`${opening.questions.length}개 추천 질문`:'고객 질문 작성 방향'):data.obs?`${data.questions.length}개 고객 질문`:'AI 관측 상태 확인'},
    {id:'competition',number:'02',title:'선택받는가',detail:'경쟁사·선택 정보',metric:data.competitorCount?`${data.competitorCount}개 비교 후보`:'비교 후보 수집 상태 확인'},
    {id:'actions',number:'03',title:'무엇을 바꿀까',detail:'개선안·실행·KPI',metric:`${data.tasks.length}개 ${opening?'실행 아이디어':'보완 항목'}`},
  ];
  return <header className="report-hero" id="report-top">
    <div className="report-hero-main"><p className="report-eyebrow">YOUR NEXT MOVE · MARKETING REPORT</p><h1>{site}<span>마케팅 진단 리포트</span></h1>{url&&<a className="report-domain" href={url} target="_blank" rel="noopener noreferrer">{report.url} ↗</a>}<p className="report-hero-summary">{opening?.summary||report.oneLineSummary}</p></div>
    {opening?<aside className="report-hero-purpose" aria-label="사이트 목적에 맞춘 분석 방향"><span>우리 사이트의 분석 방향</span><strong>{opening.purpose}</strong><dl><div><dt>고객이 찾을 주제</dt><dd>{opening.topic}</dd></div><div><dt>이어질 행동</dt><dd>{opening.goal}</dd></div></dl><small>입력 페이지의 목적 후보 기준</small></aside>:<div className="report-hero-score"><span>{review?'HTML 기본 항목 충족':'AI 참고 평가 · 세부 배점 미검증'}</span>
      <div className="report-score-dial" role="img" aria-label={review?`${displayTotal}개 관측 항목 중 ${displayValue}개 충족`:`AI 참고 평가 ${displayValue}점, 실측 아님`}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="72" fill="none" stroke="#ffffff35" strokeWidth="9"/><circle cx="90" cy="90" r="72" fill="none" stroke="#e6f47b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(ring*ratio).toFixed(2)} ${ring.toFixed(2)}`} transform="rotate(-90 90 90)"/><text x="90" y="92" textAnchor="middle" fontSize="49" fontWeight="850" fill="white">{displayValue}</text><text x="90" y="125" textAnchor="middle" fontSize="16" fontWeight="650" fill="#e4edff">/ {displayTotal}{review?'항목':''}</text></svg></div>
      <p>{review?'판정 기준·산식은 아래 근거에서 확인':'수집 문서에 대한 AI 의견'}</p>
    </div>}
    <div className="report-hero-bottom">
      <div className="report-outcome-links" aria-label="핵심 결과 바로가기">{outcomes.map(o=><a key={o.id} href={`#report-${o.id}`} data-outcome={o.id}><span className="report-outcome-number">{o.number}</span><strong>{o.title}</strong><span className="report-outcome-detail">{o.detail}</span><span className="report-outcome-metric">{o.metric}<b aria-hidden="true">↗</b></span></a>)}</div>
      {actions&&<div className="report-toolbar" data-hide-on-export>{actions}</div>}
    </div>
  </header>;
}
