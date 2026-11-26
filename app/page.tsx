"use client";

import { useEffect, useRef, useState } from "react";
import {useAccess} from '@/components/access/useAccess';
import AccessBar from '@/components/access/AccessBar';
import SmartstoreReportView from '@/components/report/SmartstoreReport';
import {SmartstoreReportSchema,type SmartstoreReport} from '@/lib/smartstore';
import RestrictedWebsiteReportView from '@/components/report/RestrictedWebsiteReport';
import {RestrictedWebsiteReportSchema,type RestrictedWebsiteReport} from '@/lib/restrictedWebsite';
import {canReadClinicWebsite} from '@/lib/clinicPlaceInsights';
import ReportLayout from '@/components/report/ReportLayout';
import BrandHeader from "@/components/BrandHeader";
import LandingHero from "@/components/LandingHero";
import ScanFeedback from "@/components/ScanFeedback";
import LandingActivityPanel from "@/components/LandingActivity";
import DownloadReportButton from "@/components/DownloadReportButton";
import ShareButton from "@/components/ShareButton";
import {requestJson,RequestError} from '@/lib/client/request';
import { MarketingReport, MarketingReportSchema } from "@/lib/reportSchema";
import {accountPlan} from '@/lib/saas/types';

export default function HomePage() {
  const {access,refresh}=useAccess();
  const allowed=access.kind==='internal'||access.kind==='account';
  const plan=accountPlan(access.account);
  const singleUsed=plan!=='monthly'&&!!access.usage?.analyze;
  const [report, setReport] = useState<MarketingReport | null>(null);
  const [storeReport,setStoreReport]=useState<SmartstoreReport|null>(null);
  const [restrictedReport,setRestrictedReport]=useState<RestrictedWebsiteReport|null>(null);
  const hasFullReport = Boolean(report || storeReport);
  const [loading, setLoading] = useState(false);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedUrl, setSubmittedUrl] = useState<string>();
  const analysisRun = useRef(0);
  const displayedRun = useRef(0);
  const [reportKey,setReportKey]=useState(0);
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
    if(displayedRun.current!==run || competitorController.current)return;
    const controller=new AbortController();competitorController.current=controller;
    const current=()=>displayedRun.current===run&&!controller.signal.aborted;
    competitorRequest.current={url,hints,run};
    setCompetitorLoading(true);
    setReport(prev=>prev?{...prev,competitorStatus:{status:'pending',message:'경쟁사 비교를 분석하고 있습니다.'}}:prev);
    try{
      const data=await requestJson<{competitorAnalysis:unknown;competitorStatus?:unknown}>('/api/competitor',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({url,hints}),signal:controller.signal,
      },60000);
      const state=MarketingReportSchema.shape.competitorStatus.safeParse(data?.competitorStatus);
      if(data?.competitorAnalysis===null&&state.success&&state.data?.status==='unavailable'){
        const unavailable=state.data;
        if(current())setReport(prev=>prev?{...prev,competitorAnalysis:null,competitorStatus:unavailable}:prev);
        return;
      }
      const parsed=MarketingReportSchema.shape.competitorAnalysis.safeParse(data?.competitorAnalysis);
      if(!parsed.success||!parsed.data)throw new Error('경쟁사 비교 결과를 수집하지 못했습니다.');
      const competitorAnalysis=parsed.data;
      if(current())setReport(prev=>prev?{...prev,competitorAnalysis,competitorStatus:{
        status:competitorAnalysis.research?.selectionStatus==='lookup_unavailable'?'error':competitorAnalysis.competitors.length?'complete':'empty',
        message:competitorAnalysis.research?.selectionMessage||(competitorAnalysis.competitors.length?'경쟁사 비교를 완료했습니다.':'현재 검색 결과에서 비교할 경쟁사를 찾지 못했습니다.'),
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
    if(singleUsed){window.location.assign('/account');return;}
    if(mainRequest.current)return;
    const run=++analysisRun.current;
    const controller=new AbortController();mainRequest.current=controller;
    const current=()=>analysisRun.current===run&&!controller.signal.aborted;
    if(scrollTimer.current)clearTimeout(scrollTimer.current);
    setSubmittedUrl(url);
    setLoading(true);setError(null);
    // Keep the displayed report and its comparison alive until a valid replacement arrives.
    function acceptReport(){
      if(/^#report(?:-|$)/.test(location.hash))history.replaceState(history.state,'',location.pathname+location.search);
      displayedRun.current=run;setReportKey(run);
      competitorController.current?.abort();competitorController.current=null;
      competitorRequest.current=null;setCompetitorLoading(false);
    }
    function scrollToResult(){
      scrollTimer.current=setTimeout(()=>{
        if(!current())return;
        const area=document.getElementById('report-area');
        if(!area)return;
        area.tabIndex=-1;area.focus({preventScroll:true});
        area.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      },150);
    }
    try{
      const data=await requestJson<Record<string,unknown>>('/api/analyze',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({url,geoQuestions,baselineId}),signal:controller.signal,
      },65000);
      if(data.kind==='smartstore'){
        const result=SmartstoreReportSchema.parse(data);
        if(!current())return;
        acceptReport();setStoreReport(result);setReport(null);setRestrictedReport(null);
        scrollToResult();
        return;
      }
      if(data.kind==='restricted_website'){
        const result=RestrictedWebsiteReportSchema.parse(data);
        if(!current())return;
        acceptReport();setRestrictedReport(result);setStoreReport(null);setReport(null);
        return;
      }
      const parsed=MarketingReportSchema.safeParse(data);
      if(!parsed.success)throw new Error('진단 결과의 필수 항목을 확인하지 못했습니다. 다시 시도해 주세요.');
      if(!current())return;
      acceptReport();setStoreReport(null);
      setRestrictedReport(null);
      const canAnalyzeCompetitors=Boolean(data._hasCompetitor&&data._websiteHints);
      setReport({...parsed.data,competitorStatus:canAnalyzeCompetitors?{status:'pending',message:'경쟁사 비교를 분석하고 있습니다.'}:parsed.data.competitorStatus||{status:'unavailable',message:'현재 경쟁사 비교 결과를 제공할 수 없습니다.'}});
      scrollToResult();
      if(canAnalyzeCompetitors)void fetchCompetitor(parsed.data.url||url,data._websiteHints,run);
    }catch(error){
      if(current())setError(error instanceof Error?error.message:'분석에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }finally{
      if(mainRequest.current===controller)mainRequest.current=null;
      if(current()){setLoading(false);void refresh();}
    }
  }

  const competitorPhase=report?.competitorStatus?.status;
  const resultTitle=competitorLoading?'기본 진단 완료 · 경쟁사 확인 중'
    :competitorPhase==='timeout'?'기본 진단 완료 · 경쟁사 조회 시간 초과'
    :competitorPhase==='error'?'기본 진단 완료 · 경쟁사 조회 미완료'
    :'진단 결과가 준비됐습니다';
  const feedback = <ScanFeedback
    loading={loading}
    error={error}
    restrictedReport={restrictedReport}
    hasPreviousResult={hasFullReport || Boolean(restrictedReport)}
    submittedUrl={submittedUrl}
    previousUrl={report?.url||storeReport?.url||restrictedReport?.url}
  />;
  const entry = <LandingHero
    onSubmit={handleAnalyze}
    loading={loading}
    allowed={allowed}
    checking={access.kind === 'loading'}
    compact={hasFullReport}
    singleUse={plan!=='monthly'}
    showExamples={!hasFullReport && !restrictedReport}
    submittedUrl={submittedUrl}
    feedback={feedback}
  />;

  return (
    <main className={hasFullReport ? "report-page" : "scanner-home-page"}>
      <BrandHeader landing={!hasFullReport} accountMenu={<AccessBar access={access} compact />} />
      {hasFullReport && <AccessBar access={access}/>}

      {singleUsed&&!loading?<div className="jm-container access-notice"><p>1회 진단권을 사용했습니다.</p>{plan==='single-pdf'&&<a href="/account">보관한 진단 결과 보기</a>}</div>:hasFullReport ? <details className="scanner-retry" open={loading || Boolean(error) || undefined}>
        <summary className="jm-container"><span>{loading?'새 URL을 진단하고 있습니다':error?'이전 진단 결과를 표시합니다':resultTitle}</span><strong>다른 URL 진단하기 <b aria-hidden="true">＋</b></strong></summary>
        {entry}
      </details> : entry}
      {access.kind==='error'&&<p role="alert" className="jm-container access-error">{access.message}</p>}
      {singleUsed&&!hasFullReport&&!restrictedReport&&!loading&&<div className="jm-container scanner-live-account"><LandingActivityPanel /></div>}

      {storeReport&&<section key={reportKey} hidden={loading} className="jm-container pb-24"><SmartstoreReportView report={storeReport}/></section>}
      {restrictedReport&&<section key={reportKey} hidden={loading} className="jm-container pb-24"><RestrictedWebsiteReportView report={restrictedReport}/></section>}

      {/* Report */}
      {report && (
        <section key={reportKey} hidden={loading} className="jm-container pb-24">
          <div
            className="report-page-content"
          >
            <ReportLayout report={report} canDeepDive={access.kind==='internal'||!!access.account?.features.deepdive} searchEvidenceAllowed={allowed} clinicWebAllowed={canReadClinicWebsite(access)} onComparisonChange={plan==='monthly'?baseline=>{if(displayedRun.current===reportKey)setReport(prev=>prev?{...prev,diagnosisBaseline:baseline}:prev);}:undefined} competitorLoading={competitorLoading} onRetry={competitorRequest.current?()=>{
              const request=competitorRequest.current;
              if(request && !competitorLoading) void fetchCompetitor(request.url,request.hints,request.run);
            }:undefined} actions={<>{allowed&&plan!=='single'&&<DownloadReportButton targetId="report-area" report={report} pending={competitorLoading} direct/>}{(access.kind==='internal'||(plan==='monthly'&&access.account?.features.reports))&&<ShareButton report={report} competitorLoading={competitorLoading} onShareCreated={saved=>{if(displayedRun.current===reportKey)setReport(saved);}}/>}</>}/>

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
            <a href="/pricing" className="hover:text-jm-black">이용요금</a>
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
