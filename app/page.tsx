"use client";

import { useEffect, useRef, useState } from "react";
import {useAccess} from '@/components/access/useAccess';
import AccessBar from '@/components/access/AccessBar';
import ReportLayout from '@/components/report/ReportLayout';
import BrandHeader from "@/components/BrandHeader";
import LandingHero from "@/components/LandingHero";
import DownloadReportButton from "@/components/DownloadReportButton";
import ShareButton from "@/components/ShareButton";
import {requestJson,RequestError} from '@/lib/client/request';
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

  const mainRequest=useRef<AbortController|null>(null);
  const competitorController=useRef<AbortController|null>(null);
  const scrollTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{
    ++analysisRun.current;
    mainRequest.current?.abort();
    competitorController.current?.abort();
    if(scrollTimer.current)clearTimeout(scrollTimer.current);
  },[]);

  async function fetchCompetitor(url:string,hints:unknown,run:number) {
    if(analysisRun.current!==run || competitorController.current)return;
    const controller=new AbortController();competitorController.current=controller;
    const current=()=>analysisRun.current===run&&!controller.signal.aborted;
    competitorRequest.current={url,hints,run};
    setCompetitorLoading(true);
    setReport(prev=>prev?{...prev,competitorStatus:{status:'pending',message:'경쟁사 비교를 분석하고 있습니다.'}}:prev);
    try{
      const data=await requestJson<{competitorAnalysis:unknown}>('/api/competitor',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({url,hints}),signal:controller.signal,
      },60000);
      const parsed=MarketingReportSchema.shape.competitorAnalysis.safeParse(data?.competitorAnalysis);
      if(!parsed.success||!parsed.data)throw new Error('경쟁사 비교 결과를 수집하지 못했습니다.');
      const competitorAnalysis=parsed.data;
      if(current())setReport(prev=>prev?{...prev,competitorAnalysis,competitorStatus:{
        status:competitorAnalysis.competitors.length?'complete':'empty',
        message:competitorAnalysis.competitors.length?'경쟁사 비교를 완료했습니다.':'현재 검색 결과에서 비교할 경쟁사를 찾지 못했습니다.',
      }}:prev);
    }catch(error){
      if(current())setReport(prev=>prev?{...prev,competitorStatus:{
        status:error instanceof RequestError&&error.status===504?'timeout':'error',
        message:error instanceof Error?error.message:'경쟁사 비교 결과를 수집하지 못했습니다.',
      }}:prev);
    }finally{
      if(competitorController.current===controller)competitorController.current=null;
      if(current())setCompetitorLoading(false);
    }
  }

  async function handleAnalyze(url:string,geoQuestions?:string[],baselineId?:string) {
    if(!allowed){window.location.assign('/inquiry');return;}
    if(mainRequest.current)return;
    const run=++analysisRun.current;
    const controller=new AbortController();mainRequest.current=controller;
    const current=()=>analysisRun.current===run&&!controller.signal.aborted;
    competitorController.current?.abort();competitorController.current=null;
    if(scrollTimer.current)clearTimeout(scrollTimer.current);
    setLoading(true);setError(null);setCompetitorLoading(false);
    // Keep the last valid report until its replacement has passed validation.
    setReport(prev=>prev?.competitorStatus?.status==='pending'?{...prev,competitorStatus:{status:'unavailable',message:'새 진단을 시작해 이전 경쟁사 분석을 중단했습니다.'}}:prev);
    competitorRequest.current=null;
    try{
      const data=await requestJson<Record<string,unknown>>('/api/analyze',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({url,geoQuestions,baselineId}),signal:controller.signal,
      },65000);
      const parsed=MarketingReportSchema.safeParse(data);
      if(!parsed.success)throw new Error('진단 결과의 필수 항목을 확인하지 못했습니다. 다시 시도해 주세요.');
      if(!current())return;
      const canAnalyzeCompetitors=Boolean(data._hasCompetitor&&data._websiteHints);
      setReport({...parsed.data,competitorStatus:{status:canAnalyzeCompetitors?'pending':'unavailable',message:canAnalyzeCompetitors?'경쟁사 비교를 분석하고 있습니다.':'현재 경쟁사 비교 결과를 제공할 수 없습니다.'}});
      scrollTimer.current=setTimeout(()=>{
        if(current())document.getElementById('report-area')?.scrollIntoView({behavior:'smooth',block:'start'});
      },150);
      if(canAnalyzeCompetitors)void fetchCompetitor(parsed.data.url||url,data._websiteHints,run);
    }catch(error){
      if(current())setError(error instanceof Error?error.message:'분석에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }finally{
      if(mainRequest.current===controller)mainRequest.current=null;
      if(current()){setLoading(false);void refresh();}
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
            <p className="text-xl font-black text-jm-red">{report?'새 진단을 완료하지 못했습니다':'분석을 완료하지 못했습니다'}</p>
            <p className="mt-3 text-jm-gray text-sm">{error}</p>
            {report&&<p className="mt-3 font-semibold">이전에 완료한 진단 결과는 아래에 유지됩니다.</p>}
          </div>
        </section>
      )}

      {/* Report */}
      {report && !loading && (
        <section className="jm-container pb-24">
          <div
            className="report-page-content"
          >
            <ReportLayout report={report} onComparisonChange={baseline=>setReport(prev=>prev?{...prev,diagnosisBaseline:baseline}:prev)} competitorLoading={competitorLoading} onRetry={competitorRequest.current?()=>{
              const request=competitorRequest.current;
              if(request && !competitorLoading) void fetchCompetitor(request.url,request.hints,request.run);
            }:undefined} actions={<><DownloadReportButton targetId="report-area" report={report} pending={competitorLoading} direct/>{(access.kind==='internal'||access.account?.features.reports)&&<ShareButton report={report} competitorLoading={competitorLoading} onShareCreated={setReport}/>}</>}/>

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
