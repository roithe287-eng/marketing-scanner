"use client";

import { useRef, useState } from "react";
import {useAccess} from '@/components/access/useAccess';
import AccessBar from '@/components/access/AccessBar';
import ReportLayout from '@/components/report/ReportLayout';
import BrandHeader from "@/components/BrandHeader";
import LandingHero from "@/components/LandingHero";
import DownloadReportButton from "@/components/DownloadReportButton";
import ShareButton from "@/components/ShareButton";
import { MarketingReport, MarketingReportSchema } from "@/lib/reportSchema";

export default function HomePage() {
  const {access,refresh}=useAccess();
  const allowed=access.kind==='internal'||access.kind==='account';
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
    if(!allowed){window.location.assign('/inquiry');return;}
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
      void refresh();
    }
  }

  return (
    <main className={report && !loading ? "report-page" : undefined}>
      <BrandHeader />
      <AccessBar access={access}/>

      {report && !loading ? <details className="scanner-retry">
        <summary className="jm-container"><span>진단 결과가 준비됐습니다</span><strong>다른 URL 진단하기 <b aria-hidden="true">＋</b></strong></summary>
        <LandingHero onSubmit={handleAnalyze} loading={loading} allowed={allowed} checking={access.kind==='loading'}/>
      </details> : <LandingHero onSubmit={handleAnalyze} loading={loading} allowed={allowed} checking={access.kind==='loading'}/>}
      {access.kind==='error'&&<p role="alert" className="jm-container access-error">{access.message}</p>}

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
              사이트와 외부 서비스의 응답에 따라 시간이 달라질 수 있습니다.
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
            }:undefined} actions={<><DownloadReportButton targetId="report-area" report={report} pending={competitorLoading} direct/>{(access.kind==='internal'||access.account?.features.reports)&&<ShareButton report={report} competitorLoading={competitorLoading}/>}</>}/>

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
            © {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="/notice" className="hover:text-jm-black">진단 이용 안내</a>
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
