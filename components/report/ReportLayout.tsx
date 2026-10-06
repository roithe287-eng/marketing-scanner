"use client";
import {SiteGuideProvider,SiteGuidebookOverview} from './SiteGuidebook';
import CompetitorLandscape from './CompetitorLandscape';
import ReportHeader from './ReportHeader';
import ReportRetentionNotice from './ReportRetentionNotice';
import ReportEvidenceGuide from './ReportEvidenceGuide';
import {TodayWork,PageEditPreview,PageWorkMap,ExecutionBoard} from './ExecutionWorkflow';
import DiagnosisComparisonPanel from './DiagnosisComparisonPanel';
import {buildExecutionPlan} from '@/lib/reportExecution';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {MarketingReport,DiagnosisBaseline} from '@/lib/reportSchema';
import {buildReportInsights} from '@/lib/reportInsights';
import {CollectionCoverage,ConversionPath,AnswerPageMap,BrandReview,SourceDirectory,MessageMap,KeywordOpportunities,ActionBacklog} from './InsightPanels';
import ScoreRadar from '@/components/ScoreRadar';
import KeywordRewritePanel from './KeywordRewritePanel';
import DiagnosisCard from '@/components/DiagnosisCard';
import PriorityMatrix from '@/components/PriorityMatrix';
import FinalCTA from '@/components/FinalCTA';
import CompetitorComparison from '@/components/CompetitorComparison';
import CompetitorStatusNotice from '@/components/CompetitorStatusNotice';
import DiagnosisChecklist from '@/components/DiagnosisChecklist';
import QuickWinsFlow from '@/components/QuickWinsFlow';
import CopyImprovement from '@/components/CopyImprovement';
import KeywordFrequencyCard from '@/components/KeywordFrequencyCard';
import DiscoverabilityPanel from '@/components/DiscoverabilityPanel';
import LlmCitationCard from '@/components/LlmCitationCard';
import GeoIntroduction from '@/components/GeoIntroduction';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import GeoFocusPanel from '@/components/GeoFocusPanel';
import AdWasteCalculator from '@/components/AdWasteCalculator';
import NaverOptimizationPanel from './NaverOptimizationPanel';
import KeywordRankCard from '@/components/KeywordRankCard';
import IndustryBenchmarkCard from '@/components/IndustryBenchmarkCard';
import Disclaimer from '@/components/Disclaimer';
import GrowthPlanPanel from './GrowthPlanPanel';
import GrowthKpiPanel from './GrowthKpiPanel';
const chapters=[['overview','핵심 요약'],['geo','AI·GEO'],['search','검색·페이지'],['competition','경쟁사'],['actions','실행 과제']] as const;
function Chapter({id,number,title,note,children}:{id:string;number:string;title:string;note:string;children:React.ReactNode}) {return <section id={`report-${id}`} className="report-chapter" data-chapter={id} aria-labelledby={`report-title-${id}`}><div className="report-chapter-heading"><span>{number}</span><div><h2 id={`report-title-${id}`}>{title}</h2><p>{note}</p></div><a href="#report-top" aria-label={`${title}에서 보고서 처음으로`}>↑</a></div><div className="report-stack">{children}</div></section>;}
function Disclosure({title,note,children}:{title:string;note:string;children:React.ReactNode}) {return <details className="report-disclosure"><summary><span><strong>{title}</strong><small>{note}</small></span><b aria-hidden="true">+</b></summary><div className="report-legacy">{children}</div></details>;}
export default function ReportLayout({report,actions,competitorLoading=false,onRetry,onComparisonChange}:{report:MarketingReport;actions?:React.ReactNode;competitorLoading?:boolean;onRetry?:()=>void;onComparisonChange?:(baseline?:DiagnosisBaseline)=>void}) {
  const expiry=Math.min(...[report.sharedRetention?.expiresAt,report.diagnosisBaseline?.expiresAt,report.geoBaseline?.expiresAt].filter((v):v is number=>typeof v==='number'));
  const [expired,setExpired]=useState(false);
  useEffect(()=>{
    const check=()=>setExpired(Number.isFinite(expiry)&&Date.now()>=expiry);
    check();if(!Number.isFinite(expiry))return;
    const timer=setTimeout(check,Math.max(0,expiry-Date.now()));
    window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);
    return()=>{clearTimeout(timer);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);};
  },[expiry]);
  const readingProgress=useRef<HTMLDivElement>(null);
  const data=useMemo(()=>buildReportInsights(report),[report]);
  const execution=useMemo(()=>buildExecutionPlan(report,data),[report,data]);const [active,setActive]=useState('overview');
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const nav=document.querySelector('.report-nav');
      const threshold=Math.max(80,nav?.getBoundingClientRect().bottom??150)+80;
      let current:string='overview';
      for(const [id] of chapters){
        const section=document.getElementById(`report-${id}`);
        if(section&&section.getBoundingClientRect().top<=threshold)current=id;
      }
      setActive(current);
      const report=document.getElementById('report-area');
      if(report&&readingProgress.current){
        const bounds=report.getBoundingClientRect();
        const distance=Math.max(1,bounds.height-window.innerHeight);
        const fraction=Math.max(0,Math.min(1,-bounds.top/distance));
        readingProgress.current.style.transform=`scaleX(${fraction})`;
      }
    };
    const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(update);};
    update();
    const observer=new ResizeObserver(schedule);
    const area=document.getElementById('report-area');if(area)observer.observe(area);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return()=>{observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame)window.cancelAnimationFrame(frame);};
  },[]);
  if(expired)return <section className="report-card" role="status"><h2 className="text-xl font-bold">보고서 보관 기간이 만료되었습니다</h2><p className="mt-3">이 결과에 포함된 보관·비교 자료는 더 이상 열람할 수 없습니다. 새 진단으로 현재 상태를 확인해 주세요.</p><a className="jm-button mt-4" href="/">새로 진단하기</a></section>;
  return <SiteGuideProvider report={report}><div className="report-v2" id="report-area">
    <ReportHeader report={report} data={data} actions={actions}/>
    <ReportRetentionNotice report={report}/><ReportEvidenceGuide report={report}/>
    {!!report.analysisWarnings?.length&&<aside className="jm-card p-5 my-4" role="status"><h2 className="text-lg font-black">핵심 진단은 완료했고, 일부 추가 항목은 확인이 필요합니다</h2><p className="mt-2 text-sm leading-7">아래 항목은 점수나 성과로 추정하지 않았습니다. 완료된 진단과 실행 가이드는 계속 확인·보관할 수 있습니다.</p><ul className="mt-3 flex flex-wrap gap-2">{report.analysisWarnings.map(w=><li key={w.key} className="rounded-xl bg-amber-50 px-3 py-2 text-sm"><strong>{w.label}</strong> · {w.status==='timeout'?'응답 시간 초과':w.status==='unavailable'?'수집되지 않음':'일시적 오류'}</li>)}</ul></aside>}
    <nav className="report-nav" aria-label="보고서 목차">{chapters.map(([id,label],i)=><a key={id} href={`#report-${id}`} aria-current={active===id?'location':undefined} onClick={()=>setActive(id)}><span>0{i+1}</span>{label}</a>)}<div className="report-reading-track" aria-hidden="true"><div ref={readingProgress}/></div></nav>
    <Chapter id="overview" number="01" title="먼저 파악할 핵심" note="전체 상태를 확인하고, 점수가 낮은 단계부터 상세 근거를 살펴보세요."><TodayWork plan={execution}/><ScoreRadar diagnosis={report.diagnosis}/><DiagnosisComparisonPanel key={`comparison:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report} onChange={onComparisonChange}/><ConversionPath data={data}/><CollectionCoverage data={data}/></Chapter>
    <Chapter id="geo" number="02" title="AI가 브랜드를 읽는 방식" note="페이지 준비도, 실제 답변, 출처를 각각 확인합니다.">
      {(report.discoverability||report.llmCitationTest)&&<GeoIntroduction/>}
      {report.discoverability&&<DiscoverabilityPanel discoverability={report.discoverability}/>}
      {report.llmCitationTest&&<LlmCitationCard citation={report.llmCitationTest}/>}
      <AnswerPageMap data={data}/><BrandReview data={data}/><SourceDirectory data={data}/><GeoComparisonPanel report={report}/>
    </Chapter>
    <Chapter id="search" number="03" title="검색과 페이지의 연결" note="SEO·GEO·AEO의 근거를 확인하고, 해당 URL에서 실행할 작업을 정하세요."><SiteGuidebookOverview report={report}/><PageEditPreview key={`edits:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/><PageWorkMap plan={execution}/><GrowthPlanPanel key={`growth:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/><KeywordRewritePanel key={`${report.url}:${report.pageEvidence?.capturedAt||report.meta?.ogDescription||'legacy'}`} report={report}/><KeywordOpportunities data={data}/>
      {report.keywordRankTracking&&<KeywordRankCard tracking={report.keywordRankTracking}/>}
      <NaverOptimizationPanel optimization={report.naverOptimization} targetUrl={report.url}/>
      {report.keywordFrequency&&<Disclosure title="전체 키워드 빈도" note={report.keywordFrequency.methodVersion===2?'수집 본문 기준 · 집계 범위·포함 여부 확인':'이전 방식의 저장 집계 · 재진단 권장'}><KeywordFrequencyCard frequency={report.keywordFrequency}/></Disclosure>}
      {!!report.checklist?.length&&<Disclosure title="기본 진단 체크리스트" note={`${report.checklist.length}개 항목의 통과·보완·미충족 근거`}><DiagnosisChecklist checklist={report.checklist}/></Disclosure>}
    </Chapter>
    <Chapter id="competition" number="04" title="비교 후보에서 찾는 차이" note="검색 결과의 후보입니다. 실제 경쟁 관계는 서비스 범위와 고객층을 확인해 판단하세요.">
      {(competitorLoading||report.competitorStatus?.status==='pending')&&<p className="report-empty" role="status">경쟁사 정보를 수집 중입니다. 완료된 다른 진단은 먼저 확인할 수 있습니다.</p>}
      <CompetitorStatusNotice report={report} onRetry={onRetry}/><CompetitorLandscape report={report}/><MessageMap data={data}/>
      {report.competitorAnalysis&&(data.competitorCount>0||report.competitorAnalysis.filtering)&&<Disclosure title="경쟁사 페이지 원문과 상세 분석" note={`${data.competitorCount}개 후보 · 상세 항목 확인 ${data.metadataCount}개 · 선정 근거·메시지·원문`}><CompetitorComparison competitorAnalysis={report.competitorAnalysis} ourUrl={report.url} ourTitle={report.meta?.siteName||report.meta?.ogTitle}/></Disclosure>}
      {report.industryBenchmark&&<Disclosure title="같은 업종의 수집 표본 비교" note="업계 전체를 대표하지 않는 참고 분포"><IndustryBenchmarkCard benchmark={report.industryBenchmark}/></Disclosure>}
    </Chapter>
    <Chapter id="actions" number="05" title="확인한 내용을 실행으로" note="목표 KPI와 확인 방법을 정하고, 보완 목록에서 작업 범위를 구체화하세요."><GrowthKpiPanel key={`kpi:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} targetUrl={report.url}/><ActionBacklog data={data}/><GeoFocusPanel key={report.llmCitationTest?.questionSetId||report.url} report={report}/>
      <Disclosure title="핵심 이슈와 개선 예시" note={`${report.criticalIssues.length}개 이슈 · 문제·원인·조치·예시 전체`}><div className="report-stack">{report.criticalIssues.map((issue,index)=><DiagnosisCard issue={issue} index={index} key={`${issue.title}-${index}`}/>)}</div></Disclosure>
      <Disclosure title="실행 일정과 빠른 개선" note="즉시·이번 주·이번 달의 제안 일정"><PriorityMatrix roadmap={report.priorityRoadmap}/>{report.quickWinsDetailed?.length?<QuickWinsFlow quickWins={report.quickWinsDetailed}/>:<ul>{report.quickWins?.map((w,i)=><li key={i}>{w}</li>)}</ul>}</Disclosure>
      <Disclosure title="카피 개선 제안" note="현재 문구와 제안 문구를 비교하고 사실 여부 확인"><CopyImprovement exampleCopy={report.exampleCopy} competitorAnalysis={report.competitorAnalysis}/></Disclosure>
      <Disclosure title="광고비·목표 CPA 시나리오" note="직접 입력한 실적과 목표로 계산 · 성과 예측 아님"><AdWasteCalculator/></Disclosure>
    </Chapter>
    <ExecutionBoard report={report} plan={execution}/><div className="report-ending"><FinalCTA report={report}/><Disclaimer/></div>
  </div></SiteGuideProvider>;
}
