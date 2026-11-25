import React, {type ReactNode} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {CompactText} from './ReportVisualSummary';
import ReportIndustryEvidence from './ReportIndustryEvidence';
import {nonCommerceOpening} from '@/lib/reportOpening';

export default function ReportHeader({report,data,firstTaskCount,actions,topAnchor=true}:{report:MarketingReport;data:ReportInsights;firstTaskCount:number;actions?:ReactNode;topAnchor?:boolean}) {
  const site=report.meta?.siteName||report.meta?.domain||report.url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  const url=safeHttpUrl(report.url);
  const opening=nonCommerceOpening(report);
  const ring=2*Math.PI*72;
  const review=report.evidenceReview,unmeasured=review?.assessed===0,displayValue=review?review.passed:report.overallScore,displayTotal=review?review.assessed:100,ratio=displayTotal?displayValue/displayTotal:0;
  const outcomes=[
    {id:'geo',target:'report-view-geo-observations',number:'01',title:'실제 AI 답변 확인',detail:'질문별 답변과 연결된 출처',metric:data.obs?.sourceTotal?`출처 판정 ${data.obs.sourceTotal}건 중 자사 인용 ${data.obs.sourceCount}건`:'AI 답변 관측 상태 보기'},
    {id:'competition',target:'report-view-competition-map',number:'02',title:'경쟁사 URL 보기',detail:'공통 상품·서비스와 원문 링크',metric:data.competitorCount?`저장된 비교 후보 ${data.competitorCount}곳`:'비교 후보 수집 상태 보기'},
    {id:'actions',target:'report-view-overview-priority',number:'03',title:'우선 할 일 확인',detail:'먼저 검토할 위치와 완료 기준',metric:firstTaskCount?`먼저 볼 작업 ${firstTaskCount}개`:'저장된 보완 항목 없음'},
  ];
  return <header className="report-hero" id={topAnchor?'report-top':'report-header'}>
    <div className="report-hero-main"><h1>{site}<span>마케팅 진단 리포트</span></h1>{url&&<a className="report-domain" href={url} target="_blank" rel="noopener noreferrer">{report.url} ↗</a>}<div className="report-hero-conclusion"><strong>진단 한눈에 보기</strong><CompactText className="report-hero-summary" label="진단 요약 전문" text={opening?.summary||report.oneLineSummary}/></div></div>
    {opening?<aside className="report-hero-purpose" aria-label="사이트 목적에 맞춘 분석 방향"><span>우리 사이트의 분석 방향</span><strong>{opening.purpose}</strong><dl><div><dt>고객이 찾을 주제</dt><dd>{opening.topic}</dd></div><div><dt>이어질 행동</dt><dd>{opening.goal}</dd></div></dl></aside>:unmeasured?<div className="report-hero-score"><span>HTML 기본 항목</span><strong className="report-hero-score-unmeasured">판정 보류</strong><p>판정 가능한 근거가 없습니다.{review.unknown>0?` 확인이 필요한 항목은 ${review.unknown}개입니다.`:''}</p>{!topAnchor&&<a className="work-link" href="#report-html-observations">확인 범위 열기</a>}</div>:<div className="report-hero-score"><span>{review?'HTML 기본 항목 충족':'AI 참고 평가 · 세부 배점 미검증'}</span>
      <div className="report-score-dial" role="img" aria-label={review?`${displayTotal}개 관측 항목 중 ${displayValue}개 충족`:`AI 참고 평가 ${displayValue}점, 실측 아님`}><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="72" fill="none" stroke="#ffffff35" strokeWidth="9"/><circle cx="90" cy="90" r="72" fill="none" stroke="#e6f47b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(ring*ratio).toFixed(2)} ${ring.toFixed(2)}`} transform="rotate(-90 90 90)"/><text x="90" y="92" textAnchor="middle" fontSize="49" fontWeight="850" fill="white">{displayValue}</text><text x="90" y="125" textAnchor="middle" fontSize="16" fontWeight="650" fill="#e4edff">/ {displayTotal}{review?'항목':''}</text></svg></div>
      <p>{review?'판정 기준·산식은 아래 근거에서 확인':'수집 문서에 대한 AI 의견'}</p>
    </div>}
    <div className="report-hero-bottom">
      <ReportIndustryEvidence report={report} linkToPurpose={!topAnchor}/>
      <nav className="report-outcome-links" aria-label="핵심 결과 바로가기">{outcomes.map(o=><a key={o.id} href={`#${o.target}`} data-outcome={o.id} aria-labelledby={`report-outcome-${o.id}`} aria-describedby={`report-outcome-detail-${o.id} report-outcome-metric-${o.id}`}><span className="report-outcome-number" aria-hidden="true">{o.number}</span><strong id={`report-outcome-${o.id}`}>{o.title}</strong><span className="report-outcome-detail" id={`report-outcome-detail-${o.id}`}>{o.detail}</span><span className="report-outcome-metric" id={`report-outcome-metric-${o.id}`}>{o.metric}</span></a>)}</nav>
      {actions&&<div className="report-toolbar" data-hide-on-export>{actions}</div>}
    </div>
  </header>;
}
