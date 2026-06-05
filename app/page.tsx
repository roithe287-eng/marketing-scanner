"use client";

import { useState } from "react";
import BrandHeader from "@/components/BrandHeader";
import UrlForm from "@/components/UrlForm";
import ScoreRadar from "@/components/ScoreRadar";
import DiagnosisCard from "@/components/DiagnosisCard";
import PriorityMatrix from "@/components/PriorityMatrix";
import FinalCTA from "@/components/FinalCTA";
import DownloadReportButton from "@/components/DownloadReportButton";
import { MarketingReport } from "@/lib/reportSchema";

export default function HomePage() {
  const [report, setReport] = useState<MarketingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(url: string) {
    setLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "분석에 실패했습니다.");
        return;
      }
      setReport(data);
      // 결과로 부드럽게 스크롤
      setTimeout(() => {
        document
          .getElementById("report-area")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <BrandHeader />

      {/* Hero */}
      <section className="jm-container py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs md:text-sm font-black tracking-widest text-jm-red">
            JINJJA MARKETING SCANNER
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            URL 하나로 확인하는
            <br />
            우리 사이트의 <span className="text-jm-red">마케팅 약점</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg leading-8 text-jm-gray">
            첫 화면, CTA, 카피, 신뢰 요소, 광고 랜딩 적합도까지
            <br className="hidden md:block" />
            진짜마케팅 관점으로 자동 진단하고 개선 방향을 리포트로
            정리해드립니다.
          </p>
          <div className="mt-10">
            <UrlForm onSubmit={handleAnalyze} loading={loading} />
            <p className="mt-4 text-xs text-jm-gray">
              💡 분석은 보통 20~40초 정도 소요됩니다. SPA(React/Vue) 사이트는
              일부 콘텐츠가 분석되지 않을 수 있습니다.
            </p>
          </div>
        </div>

        {/* 특징 3개 */}
        <div className="mt-16 grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
          {[
            {
              title: "8개 항목 자동 진단",
              desc: "첫 화면 · CTA · 카피 · 신뢰 · 전환 · 광고 · 모바일 · SEO",
            },
            {
              title: "실행 가능한 개선안",
              desc: "일반론이 아닌, 사이트 실제 데이터를 인용한 구체 개선안",
            },
            {
              title: "PDF 리포트 제공",
              desc: "그대로 팀과 공유하거나 광고주에게 전달 가능한 진단서",
            },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-jm-border p-5">
              <p className="text-xs font-black tracking-wider text-jm-red">
                FEATURE 0{i + 1}
              </p>
              <p className="mt-2 font-black">{f.title}</p>
              <p className="mt-2 text-sm text-jm-gray leading-6">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="jm-container pb-20">
          <div className="jm-card p-10 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-jm-light-gray border-t-jm-red" />
            </div>
            <p className="mt-4 text-xl font-black">사이트를 분석 중입니다</p>
            <p className="mt-3 text-jm-gray text-sm">
              페이지의 마케팅 요소를 수집하고 진단 리포트를 생성하고 있습니다.
              <br />
              평균 20~40초가 소요됩니다.
            </p>
          </div>
        </section>
      )}

      {/* Error */}
      {error && !loading && (
        <section className="jm-container pb-20">
          <div className="jm-card p-8 text-center border-jm-red">
            <p className="text-xl font-black text-jm-red">분석 실패</p>
            <p className="mt-3 text-jm-gray text-sm">{error}</p>
          </div>
        </section>
      )}

      {/* Report */}
      {report && !loading && (
        <section className="jm-container pb-24">
          <div
            id="report-area"
            className="scroll-mt-24 bg-white p-2 md:p-4 rounded-3xl"
          >
            {/* 헤더 */}
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
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
              <div data-hide-on-export>
                <DownloadReportButton
                  targetId="report-area"
                  report={report}
                />
              </div>
            </div>

            {/* 점수 + 레이더 + 핵심 이슈 */}
            <div className="grid gap-6 md:grid-cols-[360px_1fr]">
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

                {/* 항목별 점수 리스트 */}
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
                          <span className="w-9 text-right font-bold">
                            {score}
                          </span>
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

            {/* Quick Wins */}
            {report.quickWins && report.quickWins.length > 0 && (
              <div className="jm-card mt-8 p-8">
                <p className="text-xs font-black tracking-wider text-jm-red">
                  QUICK WINS
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  오늘 바로 적용 가능한 개선
                </h3>
                <ul className="mt-6 grid gap-3 md:grid-cols-2">
                  {report.quickWins.map((w, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-2xl bg-jm-light-gray p-4 text-sm leading-7"
                    >
                      <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-jm-black text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 로드맵 */}
            <div className="mt-8">
              <PriorityMatrix roadmap={report.priorityRoadmap} />
            </div>

            {/* 카피 예시 */}
            <div className="jm-card mt-8 p-8">
              <p className="text-xs font-black tracking-wider text-jm-red">
                COPY IMPROVEMENT
              </p>
              <h3 className="mt-2 text-2xl font-black">
                바로 적용 가능한 카피 예시
              </h3>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-jm-light-gray p-5">
                  <p className="text-xs font-bold tracking-wider text-jm-gray">
                    메인 헤드라인
                  </p>
                  <p className="mt-3 font-black leading-7">
                    {report.exampleCopy?.heroHeadline}
                  </p>
                </div>
                <div className="rounded-2xl bg-jm-light-gray p-5">
                  <p className="text-xs font-bold tracking-wider text-jm-gray">
                    서브 문구
                  </p>
                  <p className="mt-3 font-medium leading-7">
                    {report.exampleCopy?.subHeadline}
                  </p>
                </div>
                <div className="rounded-2xl bg-jm-red p-5 text-white">
                  <p className="text-xs font-bold tracking-wider text-white/70">
                    CTA 버튼
                  </p>
                  <p className="mt-3 font-black text-lg">
                    {report.exampleCopy?.ctaText}
                  </p>
                </div>
              </div>
            </div>

            {/* Final CTA */}
            <FinalCTA report={report} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-jm-border bg-jm-light-gray py-10">
        <div className="jm-container flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-jm-gray">
          <div>
            © {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너 (MVP)
          </div>
          <div className="flex gap-4">
            <a
              href={process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com"}
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
