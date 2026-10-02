"use client";

import { useRef, useState } from "react";
import ReportLayout from '@/components/report/ReportLayout';
import BrandHeader from "@/components/BrandHeader";
import UrlForm from "@/components/UrlForm";
import LivePreviewCard from "../components/LivePreviewCard";
import DownloadReportButton from "@/components/DownloadReportButton";
import ShareButton from "@/components/ShareButton";
import { MarketingReport, MarketingReportSchema } from "@/lib/reportSchema";

export default function HomePage() {
  const [report, setReport] = useState<MarketingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysisRun = useRef(0);
  const competitorRequest=useRef<{url:string;hints:unknown;run:number}|null>(null);

  // v14: 백그라운드 경쟁사 분석 호출
  async function fetchCompetitor(url: string, hints: any, run: number) {
    if(analysisRun.current!==run) return;
    competitorRequest.current={url,hints,run};
    setCompetitorLoading(true);
    setReport(prev=>prev?{...prev,competitorStatus:{status:'pending',message:'경쟁사 비교를 분석하고 있습니다.'}}:prev);
    try {
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, hints }),
        signal: AbortSignal.timeout(55000),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error('경쟁사 분석 서버가 응답하지 않습니다.');
      }
      const data = await res.json();
      if(!res.ok) throw new Error('경쟁사 분석에 실패했습니다.');
      const parsed=MarketingReportSchema.shape.competitorAnalysis.safeParse(data?.competitorAnalysis);
      if(!parsed.success || !parsed.data) throw new Error('경쟁사 비교 결과를 수집하지 못했습니다.');
      const competitorAnalysis=parsed.data;
      if (analysisRun.current === run) {
        // 기존 report에 경쟁사 데이터 병합
        setReport((prev) =>
          prev ? { ...prev, competitorAnalysis,competitorStatus:{status:competitorAnalysis.competitors.length?'complete':'empty',message:competitorAnalysis.competitors.length?'경쟁사 비교를 완료했습니다.':'현재 검색 결과에서 비교할 경쟁사를 찾지 못했습니다.'} } : prev
        );


      }
    } catch (e: any) {
      if(analysisRun.current===run) setReport(prev=>prev?{...prev,competitorStatus:{status:e?.name==='TimeoutError'?'timeout':'error',message:e?.name==='TimeoutError'?'응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.':'경쟁사 비교 결과를 수집하지 못했습니다. 잠시 후 다시 시도해주세요.'}}:prev);
    } finally {
      if (analysisRun.current === run) setCompetitorLoading(false);
    }
  }

  async function handleAnalyze(url: string, geoQuestions?: string[], baselineId?: string) {
    const run = ++analysisRun.current;
    setLoading(true);
    setReport(null);
    setError(null);
    setCompetitorLoading(false);
    competitorRequest.current=null;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, geoQuestions, baselineId }),
        signal: AbortSignal.timeout(90000),
      });
      
      // JSON 이 아닌 응답 처리 (Vercel timeout 등)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        if (res.status === 504 || res.status === 408) {
          setError(
            "분석 시간이 초과되었습니다. 해당 사이트가 매우 무거우거나 응답이 느릴 수 있습니다. 잠시 후 다시 시도하거나 다른 URL로 테스트해보세요."
          );
        } else if (res.status === 502 || res.status === 503) {
          setError(
            "서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요."
          );
        } else {
          setError(
            `서버 응답 오류 (HTTP ${res.status}). 잠시 후 다시 시도해주세요.`
          );
        }
        return;
      }
      
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "분석에 실패했습니다.");
        return;
      }
      const canAnalyzeCompetitors=Boolean(data?._hasCompetitor && data?._websiteHints);
      setReport({...data,competitorStatus:{status:canAnalyzeCompetitors?'pending':'unavailable',message:canAnalyzeCompetitors?'경쟁사 비교를 분석하고 있습니다.':'현재 경쟁사 비교 결과를 제공할 수 없습니다.'}});
      // 결과로 부드럽게 스크롤
      setTimeout(() => {
        document
          .getElementById("report-area")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);

      // v14: 메인 결과 받자마자 백그라운드로 경쟁사 분석 호출
      if (canAnalyzeCompetitors) {
        // await 안함 (백그라운드 실행)
        fetchCompetitor(data.url || url, data._websiteHints, run);
      }
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={report && !loading ? "report-page" : undefined}>
      <BrandHeader />

      {/* v35: Hero — Split Layout (좌 45% 카피 / 우 55% LivePreviewCard) */}
      <section className="relative overflow-hidden">
        {/* 백그라운드 그래픽 (1개만) — 좌상단 막대차트 라인아트 */}
        <svg
          className="pointer-events-none absolute -top-8 -left-12 w-[420px] h-[420px] opacity-[0.06] z-0"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          {/* X축 베이스라인 */}
          <line x1="20" y1="170" x2="180" y2="170" stroke="#0f172a" strokeWidth="1.5" />
          {/* Y축 */}
          <line x1="20" y1="170" x2="20" y2="30" stroke="#0f172a" strokeWidth="1.5" />
          {/* 막대 5개 (점점 높아짐) */}
          <rect x="35" y="130" width="20" height="40" stroke="#0f172a" strokeWidth="1.5" fill="none" />
          <rect x="63" y="110" width="20" height="60" stroke="#0f172a" strokeWidth="1.5" fill="none" />
          <rect x="91" y="85" width="20" height="85" stroke="#0f172a" strokeWidth="1.5" fill="none" />
          <rect x="119" y="60" width="20" height="110" stroke="#0f172a" strokeWidth="1.5" fill="none" />
          <rect x="147" y="35" width="20" height="135" stroke="#0f172a" strokeWidth="1.5" fill="none" />
          {/* 상승 애로우 */}
          <path d="M 30 155 L 160 30 M 160 30 L 150 38 M 160 30 L 152 22" stroke="#e31b23" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="jm-container relative z-10 py-6 md:py-10 lg:py-14">
          {/* 상단 라이브 상태바 */}
          <div className="mb-4 md:mb-6 flex items-center gap-2 text-[11px] md:text-xs text-[#64748b] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-bold text-[#10b981]">Live</span>
            </span>
            <span className="text-[#cbd5e1]">·</span>
            <span>14,237 sites diagnosed</span>
            <span className="text-[#cbd5e1]">·</span>
            <span className="font-mono">v3.4</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_45fr)_minmax(0,_55fr)] gap-8 md:gap-10 lg:gap-12 items-center">
            {/* 좌측 — 카피 영역 */}
            <div className="order-1">
              <p className="mb-2.5 md:mb-3 text-[11px] md:text-xs font-black tracking-widest text-[#e31b23]">
                JINJJA MARKETING SCANNER · v3.4
              </p>
              <h1 className="text-[26px] sm:text-[32px] md:text-[40px] lg:text-[42px] xl:text-[48px] font-black leading-[1.35] md:leading-[1.3] tracking-tight text-[#0f172a]">
                URL 하나로, <span className="whitespace-nowrap">13개 진단 항목</span><br />
                <span className="whitespace-nowrap">경쟁사 분석까지</span>{" "}
                <span className="text-[#e31b23] whitespace-nowrap">30초 안에</span><br />
                끝냅니다
              </h1>
              <p className="mt-4 md:mt-5 text-sm md:text-base leading-relaxed text-[#64748b] font-medium">
                네이버 AI 광고 적합도 · 경쟁사 포지셔닝 맵 · 퀵윈 액션 플랜
                <br className="hidden md:block" />
                진짜마케팅 시니어 컨설턴트가 검수한 자동 진단 시스템
              </p>

              <div className="mt-6 md:mt-7">
                <UrlForm onSubmit={handleAnalyze} loading={loading} />
              </div>

              {/* 신뢰 배지 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#e2e8f0] bg-white text-[11px] md:text-xs font-bold text-[#0f172a]">
                  <span className="text-[#10b981]">✓</span> 13개 진단 항목
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#e2e8f0] bg-white text-[11px] md:text-xs font-bold text-[#0f172a]">
                  <span className="text-[#10b981]">✓</span> 카톡 URL 공유
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#e2e8f0] bg-white text-[11px] md:text-xs font-bold text-[#0f172a]">
                  <span className="text-[#10b981]">✓</span> 네이버 AI 광고 적합도
                </span>
              </div>

              <p className="mt-3 text-[11px] md:text-xs text-[#94a3b8] leading-relaxed">
                · 분석은 보통 20~40초 소요되며, SPA(React/Vue) 사이트는 일부 콘텐츠가 분석되지 않을 수 있습니다.
              </p>
            </div>

            {/* 우측 — LivePreviewCard */}
            <div className="order-2 relative">
              <LivePreviewCard />
            </div>
          </div>
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
            className="report-page-content"
          >
            <ReportLayout report={report} competitorLoading={competitorLoading} onRetry={competitorRequest.current?()=>{
              const request=competitorRequest.current;
              if(request && !competitorLoading) void fetchCompetitor(request.url,request.hints,request.run);
            }:undefined} actions={<><DownloadReportButton targetId="report-area" report={report} pending={competitorLoading}/><ShareButton report={report} competitorLoading={competitorLoading}/></>}/>

          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className="border-t border-jm-border bg-jm-light-gray py-10"
        style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
      >
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
