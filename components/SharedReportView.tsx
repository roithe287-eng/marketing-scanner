"use client";

import { MarketingReport } from "@/lib/reportSchema";
import BrandHeader from "@/components/BrandHeader";
import ScoreRadar from "@/components/ScoreRadar";
import DiagnosisCard from "@/components/DiagnosisCard";
import PriorityMatrix from "@/components/PriorityMatrix";
import FinalCTA from "@/components/FinalCTA";
import CompetitorComparison from "@/components/CompetitorComparison";
import DiagnosisChecklist from "@/components/DiagnosisChecklist";
import QuickWinsFlow from "@/components/QuickWinsFlow";
import CopyImprovement from "@/components/CopyImprovement";
import Disclaimer from "@/components/Disclaimer";
import ContentProtection from "@/components/ContentProtection";

type Props = {
  report: MarketingReport;
  shareId: string;
};

export default function SharedReportView({ report, shareId }: Props) {
  const siteName = report.meta?.siteName || report.meta?.domain || "분석 사이트";
  const ogImage = report.meta?.ogImage;
  const brandUrl =
    process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com";

  return (
    <main>
      {/* v25: 공유 페이지 콘텐츠 보호 (F12/우클릭/소스추출 차단) */}
      <ContentProtection />

      {/* 공유 페이지 전용: 좌측 로고 클릭으로 메인 이동 불가 */}
      <BrandHeader lockHome />

      {/* 공유 페이지 안내 배너 (광고주용 - 다른 사이트 분석 경로 없음) */}
      <section className="jm-container pt-8">
        <div className="rounded-2xl border border-jm-border bg-jm-light-gray p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {ogImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ogImage}
                alt={siteName}
                className="h-14 w-14 rounded-xl object-cover border border-jm-border shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wider text-jm-red">
                MARKETING DIAGNOSIS REPORT
              </p>
              <p className="mt-1 font-black text-lg truncate">
                {siteName} 마케팅 진단 결과
              </p>
              <p className="text-xs text-jm-gray break-all">{report.url}</p>
            </div>
          </div>
          {/* 광고주를 위한 안내 - 메인으로 가는 링크 대신 진짜마케팅 상담 안내 */}
          <a
            href={brandUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-jm-black text-white px-5 py-2.5 text-sm font-bold hover:bg-jm-charcoal transition"
          >
            진짜마케팅 알아보기 →
          </a>
        </div>
      </section>

      {/* Report */}
      <section className="jm-container pb-24 pt-6">
        <div
          id="report-area"
          className="scroll-mt-24 bg-white p-0 md:p-4 rounded-3xl"
        >
          <div className="mb-8">
            <p className="text-xs font-black tracking-wider text-jm-red">
              DIAGNOSIS REPORT
            </p>
            <h2 className="mt-2 text-3xl font-black">마케팅 진단 결과</h2>
            <p className="mt-2 text-sm text-jm-gray break-all">
              분석 URL: {report.url}
            </p>
            <p className="mt-3 text-jm-charcoal text-base leading-7 max-w-2xl">
              {report.oneLineSummary}
            </p>
          </div>

          {/* 점수 + 레이더 + 핵심 이슈 */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-[360px_1fr]">
            <div className="jm-card p-8">
              <p className="text-xs font-bold tracking-wider text-jm-gray">
                종합 점수
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-black text-jm-red">
                  {report.overallScore}
                </span>
                <span className="mb-2 text-xl font-bold text-jm-gray">
                  / 100
                </span>
              </div>
              <div className="mt-2 text-xs text-jm-gray">
                마케팅/전환 관점 종합 점수
              </div>
              <div className="mt-6">
                <ScoreRadar diagnosis={report.diagnosis} />
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries({
                  firstView: "첫 화면 설득력",
                  cta: "CTA 명확도",
                  copywriting: "카피라이팅",
                  trust: "신뢰 요소",
                  conversionFlow: "전환 흐름",
                  adLanding: "광고 랜딩 적합도",
                  mobileUx: "모바일 UX",
                  seo: "SEO 기본",
                }).map(([key, label]) => {
                  const score = (report.diagnosis as any)[key] as number;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-jm-gray">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-jm-light-gray overflow-hidden">
                          <div
                            className="h-full bg-jm-red"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="w-9 text-right font-bold">{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4">
              {report.criticalIssues?.map((issue, index) => (
                <DiagnosisCard key={index} issue={issue} index={index} />
              ))}
            </div>
          </div>

          {report.checklist && report.checklist.length > 0 && (
            <DiagnosisChecklist checklist={report.checklist} />
          )}

          {report.quickWinsDetailed && report.quickWinsDetailed.length > 0 && (
            <QuickWinsFlow quickWins={report.quickWinsDetailed} />
          )}

          <PriorityMatrix roadmap={report.priorityRoadmap} />

          <CopyImprovement
            exampleCopy={report.exampleCopy}
            competitorAnalysis={report.competitorAnalysis}
          />

          {report.competitorAnalysis &&
            report.competitorAnalysis.competitors.length > 0 && (
              <CompetitorComparison
                competitorAnalysis={report.competitorAnalysis}
                ourUrl={report.url}
              />
            )}

          <FinalCTA report={report} />

          {/* v23: 면책 안내 (PDF에도 포함) */}
          <Disclaimer />
        </div>
      </section>

      {/* Footer - 메인으로 가는 링크 없음, 브랜드 사이트 링크만 유지 */}
      <footer
        className="border-t border-jm-border bg-jm-light-gray py-10"
        style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="jm-container flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-jm-gray">
          <div>
            © {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너
          </div>
          <div className="flex gap-4">
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-jm-black"
            >
              prorealmkt.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
