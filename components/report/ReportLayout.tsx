"use client";
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {buildReportInsights} from '@/lib/reportInsights';
import {safeHttpUrl} from '@/lib/citationMeasurement';
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
import NaverAiReadiness from '@/components/NaverAiReadiness';
import NaverBriefingReadiness from '@/components/NaverBriefingReadiness';
import NaverEcosystemReadiness from '@/components/NaverEcosystemReadiness';
import TechnicalSeoCard from '@/components/TechnicalSeoCard';
import KeywordFrequencyCard from '@/components/KeywordFrequencyCard';
import DiscoverabilityPanel from '@/components/DiscoverabilityPanel';
import LlmCitationCard from '@/components/LlmCitationCard';
import GeoIntroduction from '@/components/GeoIntroduction';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import GeoFocusPanel from '@/components/GeoFocusPanel';
import AdWasteCalculator from '@/components/AdWasteCalculator';
import KeywordRankCard from '@/components/KeywordRankCard';
import IndustryBenchmarkCard from '@/components/IndustryBenchmarkCard';
import Disclaimer from '@/components/Disclaimer';
const chapters=[['overview','핵심 요약'],['geo','AI·GEO'],['search','검색·페이지'],['competition','경쟁사'],['actions','실행 과제']] as const;
function Chapter({id,number,title,note,children}:{id:string;number:string;title:string;note:string;children:React.ReactNode}) {return <section id={`report-${id}`} className="report-chapter" aria-labelledby={`report-title-${id}`}><div className="report-chapter-heading"><span>{number}</span><div><h2 id={`report-title-${id}`}>{title}</h2><p>{note}</p></div><a href="#report-top" aria-label={`${title}에서 보고서 처음으로`}>↑</a></div><div className="report-stack">{children}</div></section>;}
function Disclosure({title,note,children}:{title:string;note:string;children:React.ReactNode}) {return <details className="report-disclosure"><summary><span><strong>{title}</strong><small>{note}</small></span><b aria-hidden="true">+</b></summary><div className="report-legacy">{children}</div></details>;}
export default function ReportLayout({report,actions,competitorLoading=false,onRetry}:{report:MarketingReport;actions?:React.ReactNode;competitorLoading?:boolean;onRetry?:()=>void}) {
  const readingProgress=useRef<HTMLDivElement>(null);
  const data=useMemo(()=>buildReportInsights(report),[report]);const [active,setActive]=useState('overview');
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const nav=document.querySelector('.report-nav');
      const threshold=(nav?.getBoundingClientRect().bottom??150)+80;
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
  const site=report.meta?.siteName||report.meta?.domain||report.url.replace(/^https?:\/\//,'').replace(/\/$/,'');const url=safeHttpUrl(report.url);
  return <div className="report-v2" id="report-area">
    <header className="report-hero" id="report-top"><div className="report-hero-main"><p className="report-eyebrow">JINJJA MARKETING · DIAGNOSIS</p><h1>{site}<span>마케팅 진단 리포트</span></h1>{url&&<a className="report-domain" href={url} target="_blank" rel="noopener noreferrer">{report.url} ↗</a>}<p className="report-hero-summary">{report.oneLineSummary}</p><p className="report-note">공개 페이지 기반 자동 진단 · 실행 전 담당자 검토</p></div><div className="report-hero-score"><span>마케팅 종합 점수</span><div><strong>{report.overallScore}</strong><b>/ 100</b></div><p>페이지 구조·콘텐츠 진단</p><small>AI 인용률과는 다른 지표입니다.</small></div><div className="report-hero-bottom"><div className="report-hero-facts"><span><b>{data.tasks.length}</b> 보완 항목</span><span><b>{data.obs?data.questions.length:"—"}</b> 고객 질문</span><span><b>{data.competitorCount}</b> 비교 후보</span></div><div className="report-toolbar" data-hide-on-export>{actions}</div></div></header>
    <nav className="report-nav" aria-label="보고서 목차">{chapters.map(([id,label],i)=><a key={id} href={`#report-${id}`} aria-current={active===id?'location':undefined} onClick={()=>setActive(id)}><span>0{i+1}</span>{label}</a>)}<div className="report-reading-track" aria-hidden="true"><div ref={readingProgress}/></div></nav>
    <Chapter id="overview" number="01" title="먼저 파악할 핵심" note="전체 상태를 확인하고, 점수가 낮은 단계부터 상세 근거를 살펴보세요."><ScoreRadar diagnosis={report.diagnosis}/><ConversionPath data={data}/><CollectionCoverage data={data}/></Chapter>
    <Chapter id="geo" number="02" title="AI가 브랜드를 읽는 방식" note="페이지 준비도, 실제 답변, 출처를 각각 확인합니다.">
      {(report.discoverability||report.llmCitationTest)&&<GeoIntroduction/>}
      {report.discoverability&&<DiscoverabilityPanel discoverability={report.discoverability}/>}
      {report.llmCitationTest&&<LlmCitationCard citation={report.llmCitationTest}/>}
      <AnswerPageMap data={data}/><BrandReview data={data}/><SourceDirectory data={data}/><GeoComparisonPanel report={report}/>
    </Chapter>
    <Chapter id="search" number="03" title="검색과 페이지의 연결" note="저장된 페이지 표현과 기술 점검 결과를 함께 검토하세요."><KeywordRewritePanel report={report}/><KeywordOpportunities data={data}/>
      {report.keywordRankTracking&&<KeywordRankCard tracking={report.keywordRankTracking}/>}
      {report.technicalSeo&&<Disclosure title="페이지 기술 상태" note={`${report.technicalSeo.checks.length}개 점검의 실제 근거와 개선 가이드`}><TechnicalSeoCard technicalSeo={report.technicalSeo}/></Disclosure>}
      {report.naverBriefingReadiness&&<Disclosure title="네이버 AI 브리핑 준비도" note={`${report.naverBriefingReadiness.checks.length}개 기술·콘텐츠 항목`}><NaverBriefingReadiness readiness={report.naverBriefingReadiness}/></Disclosure>}
      {report.naverEcosystemReadiness&&<Disclosure title="네이버 생태계 연결" note="플레이스·서치어드바이저 관련 공개 신호"><NaverEcosystemReadiness readiness={report.naverEcosystemReadiness}/></Disclosure>}
      {report.naverAiReadiness&&<Disclosure title="네이버 AI 광고 준비도" note="구조화 데이터·추적·모바일 점검"><NaverAiReadiness readiness={report.naverAiReadiness}/></Disclosure>}
      {report.keywordFrequency&&<Disclosure title="전체 키워드 빈도" note="단어·연속어구의 원래 집계"><KeywordFrequencyCard frequency={report.keywordFrequency}/></Disclosure>}
      {!!report.checklist?.length&&<Disclosure title="기본 진단 체크리스트" note={`${report.checklist.length}개 항목의 통과·보완·미충족 근거`}><DiagnosisChecklist checklist={report.checklist}/></Disclosure>}
    </Chapter>
    <Chapter id="competition" number="04" title="비교 후보에서 찾는 차이" note="검색 결과의 후보입니다. 실제 경쟁 관계는 서비스 범위와 고객층을 확인해 판단하세요.">
      {(competitorLoading||report.competitorStatus?.status==='pending')&&<p className="report-empty" role="status">경쟁사 정보를 수집 중입니다. 완료된 다른 진단은 먼저 확인할 수 있습니다.</p>}
      <CompetitorStatusNotice report={report} onRetry={onRetry}/><MessageMap data={data}/>
      {report.competitorAnalysis&&(data.competitorCount>0||report.competitorAnalysis.filtering)&&<Disclosure title="경쟁사 수집 기록과 상세 비교" note={`${data.competitorCount}개 후보 · 상세 항목 확인 ${data.metadataCount}개 · 포지셔닝·메시지·원문`}><CompetitorComparison competitorAnalysis={report.competitorAnalysis} ourUrl={report.url} ourTitle={report.meta?.siteName||report.meta?.ogTitle}/></Disclosure>}
      {report.industryBenchmark&&<Disclosure title="업종별 벤치마크" note="표본 규모와 비교 가능한 지표 확인"><IndustryBenchmarkCard benchmark={report.industryBenchmark}/></Disclosure>}
    </Chapter>
    <Chapter id="actions" number="05" title="확인한 내용을 실행으로" note="보완 목록을 검색하고, 원인과 실행안을 펼쳐 작업 범위를 정하세요."><ActionBacklog data={data}/><GeoFocusPanel key={report.llmCitationTest?.questionSetId||report.url} report={report}/>
      <Disclosure title="핵심 이슈와 개선 예시" note={`${report.criticalIssues.length}개 이슈 · 문제·원인·조치·예시 전체`}><div className="report-stack">{report.criticalIssues.map((issue,index)=><DiagnosisCard issue={issue} index={index} key={`${issue.title}-${index}`}/>)}</div></Disclosure>
      <Disclosure title="실행 일정과 빠른 개선" note="즉시·이번 주·이번 달의 제안 일정"><PriorityMatrix roadmap={report.priorityRoadmap}/>{report.quickWinsDetailed?.length?<QuickWinsFlow quickWins={report.quickWinsDetailed}/>:<ul>{report.quickWins?.map((w,i)=><li key={i}>{w}</li>)}</ul>}</Disclosure>
      <Disclosure title="카피 개선 제안" note="현재 문구와 제안 문구를 비교하고 사실 여부 확인"><CopyImprovement exampleCopy={report.exampleCopy} competitorAnalysis={report.competitorAnalysis}/></Disclosure>
      <Disclosure title="광고비 시뮬레이션 · 추정" note="진단 점수 기반의 가정이며 실제 광고비 손실을 측정하지 않습니다"><AdWasteCalculator diagnosis={report.diagnosis} defaultSimulation={report.adWasteSimulation}/></Disclosure>
    </Chapter>
    <div className="report-ending"><FinalCTA report={report}/><Disclaimer/></div>
  </div>;
}
