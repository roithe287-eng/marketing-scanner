"use client";
import {SiteGuideProvider,SiteGuidebookOverview} from './SiteGuidebook';
import PlatformApplicationPanel from './PlatformApplicationPanel';
import CompetitorLandscape,{ProductCollection} from './CompetitorLandscape';
import {ReportWorkspace,ReportNavigation,ReportSections} from './ReportWorkspace';
import SiteContentOverview from './SiteContentOverview';
import ReportHeader from './ReportHeader';
import ReportRetentionNotice from './ReportRetentionNotice';
import ReportEvidenceGuide from './ReportEvidenceGuide';
import WebsitePurposePanel from './WebsitePurposePanel';
import NonCommerceSectorPanel from './NonCommerceSectorPanel';
import {showProductCollection} from '@/lib/websitePurpose';
import {nonCommerceOpening} from '@/lib/reportOpening';
import AnswerContentPanel from './AnswerContentPanel';
import {TodayWork,PageEditPreview,PageWorkMap,ExecutionBoard} from './ExecutionWorkflow';
import DiagnosisComparisonPanel from './DiagnosisComparisonPanel';
import {buildExecutionPlan} from '@/lib/reportExecution';
import React,{useEffect,useMemo,useState} from 'react';
import type {MarketingReport,DiagnosisBaseline} from '@/lib/reportSchema';
import {reportForPresentation} from '@/lib/reportPresentation';
import {buildReportInsights} from '@/lib/reportInsights';
import {CollectionCoverage,ConversionPath,AnswerPageMap,BrandReview,SourceDirectory,MessageMap} from './InsightPanels';
import ScoreRadar from '@/components/ScoreRadar';
import KeywordWorkspace from './KeywordWorkspace';
import DiagnosisCard from '@/components/DiagnosisCard';
import PriorityMatrix from '@/components/PriorityMatrix';
import FinalCTA from '@/components/FinalCTA';
import CompetitorComparison from '@/components/CompetitorComparison';
import CompetitorStatusNotice from '@/components/CompetitorStatusNotice';
import DiagnosisChecklist from '@/components/DiagnosisChecklist';
import QuickWinsFlow from '@/components/QuickWinsFlow';
import CopyImprovement from '@/components/CopyImprovement';
import DiscoverabilityPanel from '@/components/DiscoverabilityPanel';
import LlmCitationCard from '@/components/LlmCitationCard';
import GeoIntroduction from '@/components/GeoIntroduction';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import GeoFocusPanel from '@/components/GeoFocusPanel';
import AdWasteCalculator from '@/components/AdWasteCalculator';
import NaverOptimizationPanel from './NaverOptimizationPanel';
import OfficialSeoPanel from './OfficialSeoPanel';
import KeywordRankCard from '@/components/KeywordRankCard';
import IndustryBenchmarkCard from '@/components/IndustryBenchmarkCard';
import Disclaimer from '@/components/Disclaimer';
import GrowthPlanPanel from './GrowthPlanPanel';
import GrowthKpiPanel from './GrowthKpiPanel';
import {REPORT_CHAPTERS as chapters,ReportChapter as Chapter} from './ReportChapter';
function Disclosure({title,note,children}:{title:string;note:string;children:React.ReactNode}) {return <details open className="report-disclosure"><summary><span><strong>{title}</strong><small>{note}</small></span><b aria-hidden="true">+</b></summary><div className="report-legacy">{children}</div></details>;}
export default function ReportLayout({report:storedReport,actions,competitorLoading=false,onRetry,onComparisonChange}:{report:MarketingReport;actions?:React.ReactNode;competitorLoading?:boolean;onRetry?:()=>void;onComparisonChange?:(baseline?:DiagnosisBaseline)=>void}) {
  const report=useMemo(()=>reportForPresentation(storedReport),[storedReport]);
  const opening=nonCommerceOpening(report);
  const expiry=Math.min(...[report.sharedRetention?.expiresAt,report.diagnosisBaseline?.expiresAt,report.geoBaseline?.expiresAt].filter((v):v is number=>typeof v==='number'));
  const [expired,setExpired]=useState(false);
  useEffect(()=>{
    const check=()=>setExpired(Number.isFinite(expiry)&&Date.now()>=expiry);
    check();if(!Number.isFinite(expiry))return;
    const timer=setTimeout(check,Math.max(0,expiry-Date.now()));
    window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);
    return()=>{clearTimeout(timer);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);};
  },[expiry]);
  const data=useMemo(()=>buildReportInsights(report),[report]);
  const execution=useMemo(()=>buildExecutionPlan(report,data),[report,data]);
  if(expired)return <section className="report-card" role="status"><h2 className="text-xl font-bold">보고서 보관 기간이 만료되었습니다</h2><p className="mt-3">이 결과에 포함된 보관·비교 자료는 더 이상 열람할 수 없습니다. 새 진단으로 현재 상태를 확인해 주세요.</p><a className="jm-button mt-4" href="/">새로 진단하기</a></section>;
  const scope=<>
    {report.sitePurpose&&<Disclosure title="페이지 목적별 상세 점검" note="대상·제공 범위·다음 행동의 근거"><WebsitePurposePanel purpose={report.sitePurpose}/></Disclosure>}
    <Disclosure title="수집 근거와 측정 범위" note="관측값과 실제 화면 확인 항목"><ReportEvidenceGuide report={report}/><CollectionCoverage data={data}/></Disclosure>
    {report.productContext&&showProductCollection(report.sitePurpose)&&<section className="report-card" aria-label="상품 정보 보완"><h3>공개 경로에서 확인한 상품 정보</h3><ProductCollection context={report.productContext}/></section>}
    {!!report.analysisWarnings?.length&&<aside className="report-empty" role="status">{report.analysisWarnings.map(w=><p key={w.key}>{w.label} · {w.status==='timeout'?'응답 시간 초과':w.status==='unavailable'?'수집되지 않음':'일시적 오류'}</p>)}</aside>}
  </>;
  return <SiteGuideProvider report={report}><ReportWorkspace key={`${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`}><div className="report-v2 report-focused report-continuous" id="report-area">
    <ReportHeader report={report} data={data} actions={actions}/>
    <ReportNavigation chapters={chapters}/>
    <Chapter id="overview" number="01" title={opening?'홈페이지의 강점과 보강할 내용을 함께 보세요':'먼저 파악할 핵심'} note="핵심 요약부터 실행 과제까지 아래로 이어집니다. 목차를 누르면 해당 내용으로 바로 이동합니다.">
      <ReportSections chapter="overview" items={[
        {id:'overview-main',label:opening?'홈페이지 근거':'핵심 진단',children:opening?<>{report.sitePurpose?.sector&&<NonCommerceSectorPanel purpose={report.sitePurpose}/>}<SiteContentOverview report={report}/></>:<><TodayWork plan={execution}/><ScoreRadar diagnosis={report.diagnosis} plan={execution} review={report.evidenceReview}/></>},
        ...(!opening?[{id:'overview-content',label:'홈페이지 근거',children:<SiteContentOverview report={report}/>}]:[]),
        {id:'overview-questions',label:'고객 질문·답변',children:<AnswerContentPanel plan={report.answerContentPlan} opportunityFirst={!!opening}/>},
        {id:'overview-priority',label:opening?'우선 할 일':'고객 행동 흐름',children:opening?<TodayWork plan={execution}/>:<ConversionPath data={data}/>},
        ...(opening?[{id:'overview-observations',label:'영역별 진단',children:<><ScoreRadar diagnosis={report.diagnosis} plan={execution} review={report.evidenceReview}/><ConversionPath data={data}/></>}]:[]),
        ...(report.diagnosisBaseline?[{id:'overview-comparison',label:'이전 결과 비교',children:<DiagnosisComparisonPanel report={report}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="geo" number="02" title="AI가 브랜드를 읽는 방식" note="실제 답변·출처·페이지 준비도를 나누어 확인하세요.">
      <ReportSections chapter="geo" items={[
        {id:'geo-observations',label:'실제 AI 답변',children:report.llmCitationTest?<LlmCitationCard citation={report.llmCitationTest}/>:<p className="report-empty">저장된 AI 답변 관측이 없습니다.</p>},
        {id:'geo-questions',label:'질문별 페이지',children:<AnswerPageMap data={data}/>},
        {id:'geo-brand',label:'브랜드 표현 검토',children:<BrandReview data={data}/>},
        {id:'geo-sources',label:'AI 인용 출처',children:<SourceDirectory data={data}/>},
        {id:'geo-readiness',label:'페이지 준비도',children:<><GeoIntroduction/>{report.discoverability&&<DiscoverabilityPanel discoverability={report.discoverability} observedOnly={!!report.evidenceReview}/>}</>},
        ...(report.geoBaseline?[{id:'geo-comparison',label:'이전 관측 비교',children:<GeoComparisonPanel report={report}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="search" number="03" title="페이지를 확인하고 바로 다듬기" note="문구 개선, 원문·링크, 검색 점검을 순서대로 확인하세요.">
      <ReportSections chapter="search" items={[
        {id:'search-platforms',label:'플랫폼별 적용',children:<PlatformApplicationPanel report={report}/>},
        {id:'search-edits',label:'문구 개선',children:<PageEditPreview key={`edits:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/>},
        {id:'search-sources',label:'원문·링크',children:<SiteGuidebookOverview report={report}/>},
        {id:'search-keywords',label:'키워드',children:<><KeywordWorkspace key={`${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report} data={data}/>{report.keywordRankTracking&&<KeywordRankCard tracking={report.keywordRankTracking}/>}</>},
        {id:'search-naver',label:'네이버 점검',children:<NaverOptimizationPanel optimization={report.naverOptimization} targetUrl={report.url}/>},
        {id:'search-official',label:'공통 검색 점검',children:<OfficialSeoPanel audit={report.officialSeoAudit} targetUrl={report.url}/>},
        {id:'search-scope',label:'수집·분석 범위',children:scope},
        ...(report.checklist?.length?[{id:'search-checklist',label:'기본 체크리스트',children:<DiagnosisChecklist checklist={report.checklist}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="competition" number="04" title="비교 후보에서 찾는 차이" note="비교 지도, 표현, 실제 페이지를 나누어 살펴보세요.">
      <ReportSections chapter="competition" items={[
        {id:'competition-map',label:'비교 지도',children:<>{(competitorLoading||report.competitorStatus?.status==='pending')&&<p className="report-empty" role="status">경쟁사 정보를 수집 중입니다.</p>}<CompetitorStatusNotice report={report} onRetry={onRetry}/><CompetitorLandscape report={report}/></>},
        {id:'competition-messages',label:'메시지 비교',children:<MessageMap data={data}/>},
        ...(report.competitorAnalysis&&(data.competitorCount>0||report.competitorAnalysis.filtering)?[{id:'competition-pages',label:'후보 페이지 원문',children:<CompetitorComparison competitorAnalysis={report.competitorAnalysis} ourUrl={report.url} ourTitle={report.meta?.siteName||report.meta?.ogTitle}/>}]:[]),
        ...(!report.evidenceReview&&report.industryBenchmark?[{id:'competition-benchmark',label:'업종 표본',children:<IndustryBenchmarkCard benchmark={report.industryBenchmark}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="actions" number="05" title="확인한 내용을 실행으로" note="담당 업무와 수정안, 일정, 목표 지표를 각각 확인하세요.">
      <ReportSections chapter="actions" items={[
        {id:'actions-board',label:'담당자별 작업',children:<><ExecutionBoard report={report} plan={execution}/><PageWorkMap plan={execution}/></>},
        {id:'actions-guide',label:'실행 가이드',children:<GrowthPlanPanel key={`growth:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/>},
        {id:'actions-issues',label:'핵심 이슈',children:<div className="report-stack">{report.criticalIssues.map((issue,index)=><DiagnosisCard issue={issue} index={index} key={`${issue.title}-${index}`}/>)}</div>},
        {id:'actions-copy',label:'카피 제안',children:<CopyImprovement exampleCopy={report.exampleCopy} competitorAnalysis={report.competitorAnalysis}/>},
        {id:'actions-schedule',label:'실행 일정',children:<><PriorityMatrix roadmap={report.priorityRoadmap}/>{report.quickWinsDetailed?.length?<QuickWinsFlow quickWins={report.quickWinsDetailed}/>:<ul>{report.quickWins?.map((w,i)=><li key={i}>{w}</li>)}</ul>}</>},
        {id:'actions-kpi',label:'목표·예산 계산',children:<><GrowthKpiPanel key={`kpi:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} targetUrl={report.url}/><AdWasteCalculator/></>},
        {id:'actions-geo',label:'AI 답변 보강',children:<GeoFocusPanel key={report.llmCitationTest?.questionSetId||report.url} report={report}/>},
      ]}/>
    </Chapter>
    <ReportRetentionNotice report={report}/><div className="report-ending"><FinalCTA report={report}/><Disclaimer/></div>
  </div></ReportWorkspace></SiteGuideProvider>;
}
