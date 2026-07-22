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
import DiscoverabilityPanel from "@/components/DiscoverabilityPanel";
import LlmCitationCard from "@/components/LlmCitationCard";
import AdWasteCalculator from "@/components/AdWasteCalculator";
import KeywordRankCard from "@/components/KeywordRankCard";
import Disclaimer from "@/components/Disclaimer";
import ContentProtection from "@/components/ContentProtection";

type Props = {
  report: MarketingReport;
  shareId: string;
};

// v42: 상단 헤더 통계 카드 셀 (0일 때 우아한 회색 처리)
function StatCell({
  icon,
  label,
  value,
  unit,
  color,
  pendingNote,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  pendingNote?: string;
}) {
  const isEmpty = value === 0;
  return (
    <div className="px-4 md:px-5 py-3 md:py-3.5 flex items-center gap-2 min-w-0">
      <span className={`text-base md:text-lg flex-shrink-0 ${isEmpty ? "grayscale opacity-40" : ""}`}>
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <div
          className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider truncate"
          style={{ color: isEmpty ? "#94a3b8" : color }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-xs md:text-sm font-black"
            style={{ color: isEmpty ? "#94a3b8" : "#0f172a" }}
          >
            {value}
            <span className="text-[10px] font-bold text-[#94a3b8] ml-0.5">{unit}</span>
          </span>
          {pendingNote && (
            <span className="text-[9px] md:text-[10px] font-semibold text-[#94a3b8] italic">
              ({pendingNote})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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
          {/* v42: 공유 페이지 헤더 (시인성 강화 + 우아한 빈 데이터 처리) */}
          {(() => {
            const cleanDomain = report.meta?.domain || report.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
            const s = report.overallScore;
            const grade =
              s >= 80
                ? { label: "우수", color: "#059669", bg: "#ecfdf5", barColor: "#10b981" }
                : s >= 60
                ? { label: "양호", color: "#2563eb", bg: "#eff6ff", barColor: "#3b82f6" }
                : s >= 40
                ? { label: "보통", color: "#d97706", bg: "#fffbeb", barColor: "#f59e0b" }
                : { label: "취약", color: "#dc2626", bg: "#fef2f2", barColor: "#ef4444" };

            const checklistCount =
              (report.checklist?.length || 0) + (report.naverAiReadiness?.checks?.length || 0);
            const urgentCount = report.criticalIssues?.filter((i) => i.priority === "high").length || 0;
            const quickWinCount = report.quickWinsDetailed?.length || 0;
            const competitorCount = report.competitorAnalysis?.competitors?.length || 0;

            return (
              <div className="mb-8 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
                {/* 점수 색 상단 액세드 바 */}
                <div className="h-1" style={{ backgroundColor: grade.barColor }} />

                {/* ① 메타 라벨 스트립 */}
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
                    <h2 className="text-2xl md:text-3xl lg:text-[34px] font-black leading-[1.25] tracking-tight text-[#0f172a]">
                      <span className="text-[#0f172a] break-all">
                        {cleanDomain}
                      </span>
                      <span className="text-[#64748b] font-bold">의</span>
                      <br />
                      <span className="text-[#0f172a]">마케팅 진단 결과</span>
                    </h2>
                  </div>
                  {/* 종합 점수 인라인 배지 */}
                  <div className="flex items-center gap-2.5 md:gap-3 flex-shrink-0">
                    <div className="text-right leading-none">
                      <div className="text-[10px] md:text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-1">
                        종합 점수
                      </div>
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span
                          className="text-4xl md:text-5xl font-black leading-none"
                          style={{ color: grade.color }}
                        >
                          {s}
                        </span>
                        <span className="text-sm md:text-base font-bold text-[#94a3b8]">/100</span>
                      </div>
                    </div>
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
                  </div>
                </div>

                {/* ③ URL pill */}
                <div className="px-5 md:px-7 pb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0]">
                    <span className="text-xs">🔒</span>
                    <span className="text-xs md:text-sm font-bold text-[#0f172a] break-all">
                      {cleanDomain}
                    </span>
                    <span className="text-[#cbd5e1] text-xs">·</span>
                    <span className="text-[11px] md:text-xs font-semibold text-[#10b981] inline-flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      분석 완료
                    </span>
                  </div>
                </div>

                {/* ④ 인용러 요약 */}
                <div className="mx-5 md:mx-7 mb-5 md:mb-6 px-4 md:px-5 py-3 md:py-4 bg-[#fef2f2] border-l-4 border-[#e31b23] rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-[#e31b23] text-xl md:text-2xl font-black leading-none flex-shrink-0">“</span>
                    <p className="text-sm md:text-base text-[#0f172a] leading-relaxed font-semibold flex-1 min-w-0">
                      {report.oneLineSummary}
                    </p>
                    <span className="text-[#e31b23] text-xl md:text-2xl font-black leading-none flex-shrink-0 self-end">”</span>
                  </div>
                </div>

                {/* ⑤ 통계 strip (0 일 때 우아하게 회색 처리) */}
                <div className="border-t border-[#e2e8f0] grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e2e8f0]">
                  <StatCell icon="📋" label="진단 항목" value={checklistCount} unit="개" color="#64748b" />
                  <StatCell icon="🔥" label="긴급 이슈" value={urgentCount} unit="건" color="#dc2626" />
                  <StatCell icon="⚡" label="퀵윈" value={quickWinCount} unit="건" color="#d97706" />
                  <StatCell
                    icon="🎯"
                    label="경쟁사"
                    value={competitorCount}
                    unit="개"
                    color="#2563eb"
                    pendingNote={competitorCount === 0 ? "데이터 없음" : undefined}
                  />
                </div>
              </div>
            );
          })()}

          {/* v39: 영역별 점수 분석 (풀폭 독립 섹션, 최상단) */}
          <ScoreRadar diagnosis={report.diagnosis} />

          {/* v44: 콘텐츠 발견성 & AI 답변 대응력 (ScoreRadar 바로 아래) */}
          {report.discoverability && (
            <div className="mt-8 md:mt-10">
              <DiscoverabilityPanel discoverability={report.discoverability} />
            </div>
          )}

          {/* v45-W1: AI 인용 시뮬레이션 */}
          {report.llmCitationTest && (
            <div className="mt-8 md:mt-10">
              <LlmCitationCard citation={report.llmCitationTest} />
            </div>
          )}

          {/* v45-W1: 광고비 낭비 시뮬레이터 */}
          {report.diagnosis && (
            <div className="mt-8 md:mt-10">
              <AdWasteCalculator
                diagnosis={report.diagnosis}
                defaultSimulation={report.adWasteSimulation}
              />
            </div>
          )}

          {/* v42: 핵심 개선 이슈 */}
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

          {/* v43: 경쟁사 데이터 없을 때 안내 (최종 실패 상태) */}
          {!report.competitorAnalysis?.competitors?.length && (
            <div className="mt-8 md:mt-10 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-2xl p-6 md:p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white border border-[#e2e8f0] mb-3">
                <span className="text-xl">🎯</span>
              </div>
              <h3 className="text-base md:text-lg font-black text-[#0f172a] mb-1">
                경쟁사 분석 데이터는 이 링크에 포함되지 않았습니다
              </h3>
              <p className="text-xs md:text-sm text-[#64748b] font-medium">
                이용 환경 또는 검색 API 제한으로 경쟁사 정보를 분석하지 못한 경우입니다.
                <br className="hidden md:block" />
                다른 모든 진단 항목은 정상적으로 표시됩니다.
              </p>
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

          {/* v45-W2: 네이버 키워드 순위 트래킹 */}
          {report.keywordRankTracking && (
            <div className="mt-8 md:mt-10">
              <KeywordRankCard tracking={report.keywordRankTracking} />
            </div>
          )}

          {report.competitorAnalysis &&
            report.competitorAnalysis.competitors.length > 0 && (
              <CompetitorComparison
                competitorAnalysis={report.competitorAnalysis}
                ourUrl={report.url}
                ourTitle={report.meta?.siteName || report.meta?.ogTitle}
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
