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
import NaverAiReadiness from "@/components/NaverAiReadiness";
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
          {/* v41: 마케팅 진단 결과 헤더 (6요소 통합 카드형) */}
          <div className="mb-8 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
            {/* ① 메타 라벨 스트립 (상단) */}
            <div className="px-5 md:px-7 pt-5 md:pt-6 pb-3 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fef2f2] text-[#e31b23] text-[10px] md:text-[11px] font-black tracking-widest">
                📋 DIAGNOSIS REPORT
              </span>
              <span className="text-[10px] md:text-[11px] font-mono text-[#94a3b8]">v3.4</span>
              <span className="text-[10px] md:text-[11px] text-[#cbd5e1]">·</span>
              <span className="text-[10px] md:text-[11px] font-semibold text-[#64748b]">
                진짜마케팅 시니어 컨설턴트 검수
              </span>
            </div>

            {/* ② 타이틀 + 종합 점수 인라인 */}
            <div className="px-5 md:px-7 pb-4 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl md:text-3xl lg:text-[34px] font-black leading-tight tracking-tight text-[#0f172a]">
                  <span className="text-[#e31b23] break-all">
                    {report.meta?.domain || report.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span className="block md:inline"> 의</span>
                  <br className="hidden md:block" />
                  <span> 마케팅 진단 결과</span>
                </h2>
              </div>
              {/* 종합 점수 인라인 배지 */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right leading-none">
                  <div className="text-[10px] md:text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                    종합 점수
                  </div>
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className="text-4xl md:text-5xl font-black text-[#e31b23] leading-none">
                      {report.overallScore}
                    </span>
                    <span className="text-sm md:text-base font-bold text-[#94a3b8]">/100</span>
                  </div>
                </div>
                {/* 등급 배지 */}
                {(() => {
                  const s = report.overallScore;
                  const grade =
                    s >= 80
                      ? { label: "우수", color: "#059669", bg: "#ecfdf5" }
                      : s >= 60
                      ? { label: "양호", color: "#2563eb", bg: "#eff6ff" }
                      : s >= 40
                      ? { label: "보통", color: "#d97706", bg: "#fffbeb" }
                      : { label: "취약", color: "#dc2626", bg: "#fef2f2" };
                  return (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs md:text-sm font-black border"
                      style={{
                        color: grade.color,
                        backgroundColor: grade.bg,
                        borderColor: `${grade.color}33`,
                      }}
                    >
                      {grade.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* ③ URL pill */}
            <div className="px-5 md:px-7 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-xs">🔒</span>
                <span className="text-xs md:text-sm font-bold text-[#0f172a] break-all">
                  {report.meta?.domain || report.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
                <span className="text-[#cbd5e1] text-xs">·</span>
                <span className="text-[11px] md:text-xs font-semibold text-[#10b981] inline-flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  분석 완료
                </span>
              </div>
            </div>

            {/* ④ 인용러 요약 (one-line summary) */}
            <div className="mx-5 md:mx-7 mb-5 md:mb-6 px-4 md:px-5 py-3 md:py-4 bg-[#fef2f2] border-l-4 border-[#e31b23] rounded-r-lg">
              <div className="flex items-start gap-2">
                <span className="text-[#e31b23] text-xl md:text-2xl font-black leading-none flex-shrink-0">“</span>
                <p className="text-sm md:text-base text-[#0f172a] leading-relaxed font-semibold flex-1 min-w-0">
                  {report.oneLineSummary}
                </p>
                <span className="text-[#e31b23] text-xl md:text-2xl font-black leading-none flex-shrink-0 self-end">”</span>
              </div>
            </div>

            {/* ⑤ 통계 strip (하단) */}
            <div className="border-t border-[#e2e8f0] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e2e8f0]">
              <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-2 min-w-0">
                <span className="text-base md:text-lg flex-shrink-0">📋</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] md:text-[10px] font-bold text-[#64748b] uppercase tracking-wider truncate">
                    진단 항목
                  </div>
                  <div className="text-xs md:text-sm font-black text-[#0f172a]">
                    {(report.checklist?.length || 0) + (report.naverAiReadiness?.checks?.length || 0)}
                    <span className="text-[10px] font-bold text-[#94a3b8] ml-0.5">개</span>
                  </div>
                </div>
              </div>
              <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-2 min-w-0">
                <span className="text-base md:text-lg flex-shrink-0">🔥</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] md:text-[10px] font-bold text-[#dc2626] uppercase tracking-wider truncate">
                    긴급 이슈
                  </div>
                  <div className="text-xs md:text-sm font-black text-[#0f172a]">
                    {report.criticalIssues?.filter((i) => i.priority === "high").length || 0}
                    <span className="text-[10px] font-bold text-[#94a3b8] ml-0.5">건</span>
                  </div>
                </div>
              </div>
              <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-2 min-w-0">
                <span className="text-base md:text-lg flex-shrink-0">⚡</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] md:text-[10px] font-bold text-[#d97706] uppercase tracking-wider truncate">
                    퀵윈
                  </div>
                  <div className="text-xs md:text-sm font-black text-[#0f172a]">
                    {report.quickWinsDetailed?.length || 0}
                    <span className="text-[10px] font-bold text-[#94a3b8] ml-0.5">건</span>
                  </div>
                </div>
              </div>
              <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-2 min-w-0">
                <span className="text-base md:text-lg flex-shrink-0">🎯</span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[9px] md:text-[10px] font-bold text-[#2563eb] uppercase tracking-wider truncate">
                    경쟁사
                  </div>
                  <div className="text-xs md:text-sm font-black text-[#0f172a]">
                    {report.competitorAnalysis?.competitors?.length || 0}
                    <span className="text-[10px] font-bold text-[#94a3b8] ml-0.5">개</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* v39: 영역별 점수 분석 (풀폭 독립 섹션, 최상단) */}
          <ScoreRadar diagnosis={report.diagnosis} />

          {/* v41: 핵심 개선 이슈 (종합점수는 상단 헤더에 포함됨) */}
          {report.criticalIssues && report.criticalIssues.length > 0 && (
            <div className="mt-8 md:mt-10">
              <div className="flex items-center gap-3 mb-5 md:mb-6">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#e31b23] flex items-center justify-center flex-shrink-0">
                  <span className="text-lg md:text-xl">🔥</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tight leading-tight">
                    핵심 개선 이슈
                  </h2>
                  <p className="text-xs md:text-sm text-[#64748b] mt-0.5 font-medium">
                    가장 먼저 해결해야 할 {report.criticalIssues.length}개의 이슈
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {report.criticalIssues.map((issue, index) => (
                  <DiagnosisCard key={index} issue={issue} index={index} />
                ))}
              </div>
            </div>
          )}

          {report.checklist && report.checklist.length > 0 && (
            <DiagnosisChecklist checklist={report.checklist} />
          )}

          {report.quickWinsDetailed && report.quickWinsDetailed.length > 0 && (
            <QuickWinsFlow quickWins={report.quickWinsDetailed} />
          )}

          {/* v26: 네이버 AI 광고 준비도 점검 (2026.7 정식 오픈) */}
          {report.naverAiReadiness && (
            <NaverAiReadiness readiness={report.naverAiReadiness} />
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
