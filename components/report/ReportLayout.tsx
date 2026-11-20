"use client";
import {SiteGuideProvider,SiteGuidebookOverview} from './SiteGuidebook';
import PlatformApplicationPanel from './PlatformApplicationPanel';
import CompetitorLandscape,{ProductCollection} from './CompetitorLandscape';
import {ReportWorkspace,ReportNavigation,ReportSections} from './ReportWorkspace';
import ReportJumpLink from './ReportJumpLink';
import SiteContentOverview from './SiteContentOverview';
import ReportHeader from './ReportHeader';
import ReportRetentionNotice from './ReportRetentionNotice';
import ReportEvidenceGuide from './ReportEvidenceGuide';
import ReportCoverageWarnings from './ReportCoverageWarnings';
import WebsitePurposePanel from './WebsitePurposePanel';
import NonCommerceSectorPanel from './NonCommerceSectorPanel';
import {showProductCollection} from '@/lib/websitePurpose';
import AnswerContentPanel from './AnswerContentPanel';
import ServiceStrategyPanel from './ServiceStrategyPanel';
import NonCommerceBriefingPanel from './NonCommerceBriefingPanel';
import LogisticsBriefingPanel from './LogisticsBriefingPanel';
import {buildHospitalPlaceReview} from '@/lib/hospitalPlace';
import {buildLocalPlaceReview} from '@/lib/localPlaceReview';
import LocalPlacePanel from './LocalPlacePanel';
import {TodayWork,PageEditPreview,PageWorkMap,ExecutionBoard} from './ExecutionWorkflow';
import DiagnosisComparisonPanel from './DiagnosisComparisonPanel';
import {buildExecutionPlan,buildPageEdits} from '@/lib/reportExecution';
import {buildSourceLibrary} from '@/lib/reportContent';
import {buildSectionBriefs} from '@/lib/reportSectionBriefs';
import {buildReportDiagrams} from '@/lib/reportDiagrams';
import {reportGoal} from '@/lib/reportGoal';
import {ReportReadingKey} from './ReportSectionDiagram';
import React,{useEffect,useMemo,useState} from 'react';
import type {MarketingReport,DiagnosisBaseline} from '@/lib/reportSchema';
import {reportForPresentation} from '@/lib/reportPresentation';
import {buildReportInsights} from '@/lib/reportInsights';
import {CollectionCoverage,ConversionPath,AnswerPageMap,BrandReview,SourceDirectory,MessageMap} from './InsightPanels';
import ScoreRadar from '@/components/ScoreRadar';
import EvidenceReviewPanel from './EvidenceReviewPanel';
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
import LlmCitationCard,{CitationActionPlan} from '@/components/LlmCitationCard';
import GeoIntroduction from '@/components/GeoIntroduction';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import GeoFocusPanel from '@/components/GeoFocusPanel';
import AdWasteCalculator from '@/components/AdWasteCalculator';
import NaverOptimizationPanel from './NaverOptimizationPanel';
import OfficialSeoPanel from './OfficialSeoPanel';
import SiteDiagnosticsPanel from './SiteDiagnosticsPanel';
import {ProductOfferAuditCard} from './SearchAuditCards';
import BacklinkEvidencePanel from './BacklinkEvidencePanel';
import SearchConsoleEvidencePanel from './SearchConsoleEvidencePanel';
import MedicalAuditPanel from './MedicalAuditPanel';
import KeywordRankCard from '@/components/KeywordRankCard';
import IndustryBenchmarkCard from '@/components/IndustryBenchmarkCard';
import Disclaimer from '@/components/Disclaimer';
import GrowthPlanPanel from './GrowthPlanPanel';
import GrowthKpiPanel from './GrowthKpiPanel';
import {REPORT_CHAPTERS as chapters,ReportChapter as Chapter} from './ReportChapter';
function Disclosure({title,note,children}:{title:string;note:string;children:React.ReactNode}) {return <details open className="report-disclosure"><summary><span><strong>{title}</strong><small>{note}</small></span><b aria-hidden="true">+</b></summary><div className="report-legacy">{children}</div></details>;}
export default function ReportLayout({report:storedReport,actions,clinicWebAllowed=true,searchEvidenceAllowed=false,competitorLoading=false,onRetry,onComparisonChange}:{report:MarketingReport;actions?:React.ReactNode;clinicWebAllowed?:boolean;searchEvidenceAllowed?:boolean;competitorLoading?:boolean;onRetry?:()=>void;onComparisonChange?:(baseline?:DiagnosisBaseline)=>void}) {
  const report=useMemo(()=>reportForPresentation(storedReport),[storedReport]);
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
  const placeReview=useMemo(()=>buildHospitalPlaceReview(report.siteDiagnostics),[report.siteDiagnostics]);
  const localPlaceReview=useMemo(()=>buildLocalPlaceReview(report.siteDiagnostics),[report.siteDiagnostics]);
  const sources=useMemo(()=>buildSourceLibrary(report),[report]);
  const execution=useMemo(()=>buildExecutionPlan(report,data),[report,data]);
  const diagrams=useMemo(()=>buildReportDiagrams(report,data,sources,execution),[report,data,sources,execution]);
  const briefs=useMemo(()=>buildSectionBriefs(report,data,sources),[report,data,sources]);
  const pageEdits=useMemo(()=>buildPageEdits(report),[report]);
  const issueTasks=new Map(execution.tasks.filter(task=>task.group==='핵심 개선').map(task=>[task.id,task.anchor]));
  const searchTarget=report.pageEvidence?.finalUrl||report.url;
  const productPages=report.siteDiagnostics?.pages.filter(page=>page.productOffer).slice(0,3)||[];
  if(expired)return <section className="report-card" role="status"><h2 className="text-xl font-bold">보고서 보관 기간이 만료되었습니다</h2><p className="mt-3">이 결과에 포함된 보관·비교 자료는 더 이상 열람할 수 없습니다. 새 진단으로 현재 상태를 확인해 주세요.</p><a className="jm-button mt-4" href="/">새로 진단하기</a></section>;
  const productContextInScope=showProductCollection(report.sitePurpose)?report.productContext||undefined:undefined;
  const scope=<>
    <ReportCoverageWarnings warnings={report.analysisWarnings}/>
    {report.sitePurpose&&<Disclosure title="페이지 목적별 상세 점검" note="대상·제공 범위·다음 행동의 근거"><WebsitePurposePanel purpose={report.sitePurpose}/></Disclosure>}
    <Disclosure title="수집 근거와 측정 범위" note="관측값과 실제 화면 확인 항목"><ReportEvidenceGuide report={report}/><CollectionCoverage data={data}/></Disclosure>
    {productContextInScope&&<section id="report-scope-product-originals" className="report-card" aria-label="상품 정보 보완"><h3>공개 경로에서 확인한 상품 정보</h3><ProductCollection context={productContextInScope}/></section>}
  </>;
  return <SiteGuideProvider report={report}><ReportWorkspace key={`${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`}><div className="report-v2 report-focused report-continuous" id="report-area">
    <div className="report-opening-radar" id="report-top">
      <nav className="report-opening-links" aria-label="보고서 빠른 이동" data-hide-on-export><ReportJumpLink id="report-toc">보고서 목차로 이동</ReportJumpLink>{execution.first.length>0&&<ReportJumpLink id="report-view-overview-priority">우선 할 일 바로 보기</ReportJumpLink>}</nav>
      <ScoreRadar diagnosis={report.diagnosis} plan={execution} review={report.evidenceReview} featured siteName={report.meta?.siteName||report.meta?.domain||report.url}/>
    </div>
    <ReportHeader report={report} data={data} firstTaskCount={execution.first.length} actions={actions} topAnchor={false}/>
    <ReportNavigation chapters={chapters}/><ReportReadingKey/>
    <Chapter id="overview" number="01" title="홈페이지에서 무엇부터 확인할까요?" note="고객이 홈페이지에서 읽을 수 있는 내용을 살펴보세요. 답이 부족한 질문과 먼저 확인할 작업도 정리했습니다.">
      <ReportSections chapter="overview" diagrams={diagrams} briefs={briefs} items={[
        {id:'overview-main',label:'홈페이지 내용',children:<SiteContentOverview report={report}/>},
        ...(report.serviceStrategy?[{id:'overview-services',label:report.serviceStrategy.industry==='noncommerce'?'고객·목적별 전략':'서비스·고객별 전략',children:<ServiceStrategyPanel plan={report.serviceStrategy} view="segments"/>}]:[]),
        {id:'overview-questions',label:placeReview||localPlaceReview?'플레이스·고객 질문':'고객 질문·답변',children:<>{localPlaceReview&&<LocalPlacePanel key={localPlaceReview.page.url} review={localPlaceReview}/>}<AnswerContentPanel plan={report.answerContentPlan} opportunityFirst placeReview={placeReview} clinicWebAllowed={clinicWebAllowed}/></>},
        {id:'overview-priority',label:'우선 할 일',children:<TodayWork plan={execution}/>},
        ...(report.sitePurpose?.sector||report.siteDiagnostics?.medicalAudit?[{id:'overview-sector',label:'업종별 확인',children:<>{report.sitePurpose&&<NonCommerceSectorPanel purpose={report.sitePurpose}/>}<MedicalAuditPanel audit={report.siteDiagnostics?.medicalAudit}/></>}]:[]),
        {id:'overview-observations',label:'영역별 근거',children:<>{report.evidenceReview&&<EvidenceReviewPanel review={report.evidenceReview}/>}<ConversionPath data={data}/></>},
        ...(report.diagnosisBaseline?[{id:'overview-comparison',label:'이전 결과 비교',children:<DiagnosisComparisonPanel report={report}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="geo" number="02" title="AI가 답한 내용과 연결한 출처" note="질문별 답변과 실제 출처를 볼 수 있습니다. 답변 속 업체명과 서비스 안내가 우리 정보와 일치하는지도 확인하세요.">
      <ReportSections chapter="geo" diagrams={diagrams} briefs={briefs} items={[
        ...(report.serviceStrategy?.briefing?[{id:'geo-logistics-briefing',label:'네이버 AI 브리핑 대응',children:<LogisticsBriefingPanel plan={report.serviceStrategy.briefing}/>}]:[]),
        ...(report.serviceStrategy?.briefingPlan?[{id:'geo-noncommerce-briefing',label:'업종별 AI 브리핑 대응',children:<NonCommerceBriefingPanel plan={report.serviceStrategy.briefingPlan}/>}]:[]),
        {id:'geo-observations',label:'실제 AI 답변',children:report.llmCitationTest?<LlmCitationCard citation={report.llmCitationTest} showActionPlan={false}/>:<p className="report-empty">저장된 AI 답변 관측이 없습니다.</p>},
        {id:'geo-questions',label:'답변을 올릴 페이지',children:<AnswerPageMap data={data} linkToObservations/>},
        {id:'geo-brand',label:'우리 정보와 대조',children:<BrandReview data={data} linkToObservations/>},
        {id:'geo-sources',label:'AI 인용 출처',children:<SourceDirectory data={data} linkToObservations/>},
        {id:'geo-readiness',label:'페이지 정보 준비도',children:<>{report.discoverability?<DiscoverabilityPanel discoverability={report.discoverability} observedOnly={!!report.evidenceReview}/>:<p className="report-empty">저장된 콘텐츠 준비도 점검이 없습니다.</p>}<GeoIntroduction/></>},
        ...(report.geoBaseline?[{id:'geo-comparison',label:'이전 관측 비교',children:<GeoComparisonPanel report={report}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="search" number="03" title="검색 결과와 홈페이지 바로 다듬기" note="바꾸려는 문구를 원문과 비교하세요. 검색엔진 기준, 제작 도구의 수정 위치, 직접 점검할 항목도 확인할 수 있습니다.">
      <ReportSections chapter="search" diagrams={diagrams} briefs={briefs} items={[
        {id:'search-platforms',label:'플랫폼별 적용',children:<PlatformApplicationPanel report={report}/>},
        {id:'search-edits',label:'페이지 문구 수정',children:<PageEditPreview key={`edits:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/>},
        {id:'search-sources',label:'원문·링크',children:<><SiteGuidebookOverview report={report}/>{searchEvidenceAllowed&&<BacklinkEvidencePanel target={searchTarget} brand={report.meta?.siteName||''}/>}</>},
        {id:'search-keywords',label:'키워드',children:<><KeywordWorkspace key={`${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report} data={data}/>{report.keywordRankTracking&&<KeywordRankCard tracking={report.keywordRankTracking}/>}<SearchConsoleEvidencePanel target={searchTarget}/></>},
        ...(report.serviceStrategy?[{id:'search-intents',label:'검색 의도·랜딩',children:<ServiceStrategyPanel plan={report.serviceStrategy} view="search"/>}]:[]),
        {id:'search-naver',label:'네이버 운영 점검',children:<NaverOptimizationPanel optimization={report.naverOptimization} targetUrl={report.url}/>},
        {id:'search-official',label:'검색엔진별 기준',children:<><OfficialSeoPanel audit={report.officialSeoAudit} targetUrl={report.url}/>{productPages.map(page=><ProductOfferAuditCard key={page.url} audit={page.productOffer} url={page.url}/>)}</>},
        {id:'search-technical',label:'페이지·기술 점검',children:<SiteDiagnosticsPanel audit={report.siteDiagnostics}/>},
        {id:'search-scope',label:'수집·분석 범위',children:scope},
        ...(report.checklist?.length?[{id:'search-checklist',label:'기본 체크리스트',children:<DiagnosisChecklist checklist={report.checklist} issues={report.criticalIssues}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="competition" number="04" title="비교 후보와 우리 페이지의 차이" note="먼저 같은 고객을 대상으로 하는지 확인하세요. 그다음 제목·설명·첫 화면을 비교하세요.">
      <ReportSections chapter="competition" diagrams={diagrams} briefs={briefs} items={[
        {id:'competition-map',label:'후보 선정과 비교 지도',children:<>{(competitorLoading||report.competitorStatus?.status==='pending')&&<p className="report-empty" role="status">경쟁사 정보를 수집 중입니다.</p>}<CompetitorStatusNotice report={report} onRetry={onRetry} candidateDetailsAvailable={!!report.competitorAnalysis}/><CompetitorLandscape report={report} productContextInScope={productContextInScope} linkToCandidateCards/></>},
        {id:'competition-messages',label:'제목·설명 표현 비교',children:<MessageMap data={data}/>},
        ...(report.competitorAnalysis&&(data.competitorCount>0||report.competitorAnalysis.filtering)?[{id:'competition-pages',label:'후보별 페이지 자료',children:<CompetitorComparison competitorAnalysis={report.competitorAnalysis} ourUrl={report.url} ourTitle={report.meta?.siteName||report.meta?.ogTitle}/>}]:[]),
        ...(!report.evidenceReview&&report.industryBenchmark?[{id:'competition-benchmark',label:'업종 표본',children:<IndustryBenchmarkCard benchmark={report.industryBenchmark}/>}]:[]),
      ]}/>
    </Chapter>
    <Chapter id="actions" number="05" title="진단에서 실행으로 옮기기" note="담당자를 정하고 작업을 시작하세요. 일정과 완료 기준을 함께 확인할 수 있습니다.">
      <ReportSections chapter="actions" diagrams={diagrams} briefs={briefs} items={[
        {id:'actions-board',label:'담당자별 작업',children:<><ExecutionBoard report={report} plan={execution} linkIssueDetails/><PageWorkMap plan={execution}/></>},
        ...(report.serviceStrategy?[{id:'actions-acquisition',label:'광고·콘텐츠 실행',children:<ServiceStrategyPanel plan={report.serviceStrategy} view="acquisition"/>},{id:'actions-conversion',label:report.serviceStrategy.industry==='noncommerce'?'목적별 전환·검증':'상담 전환·검증',children:<ServiceStrategyPanel plan={report.serviceStrategy} view="conversion"/>}]:[]),
        {id:'actions-guide',label:'검색·AI 작업 가이드',children:<GrowthPlanPanel key={`growth:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} report={report}/>},
        {id:'actions-issues',label:'핵심 이슈',children:report.criticalIssues.length?<div className="report-stack">{report.criticalIssues.map((issue,index)=><DiagnosisCard issue={issue} index={index} taskAnchor={issueTasks.get(`critical-${index}`)} key={`${issue.title}-${index}`}/>)}</div>:<p className="report-empty">저장된 핵심 이슈가 없습니다. ‘영역별 근거’에서 실제 수집 범위를 확인할 수 있습니다.</p>},
        {id:'actions-copy',label:'첫 화면 문구 조합',children:<CopyImprovement exampleCopy={report.exampleCopy} competitorAnalysis={report.competitorAnalysis} pageEdits={pageEdits}/>},
        {id:'actions-schedule',label:'실행 일정',children:<><PriorityMatrix roadmap={report.priorityRoadmap} quickWins={report.quickWinsDetailed} legacyQuickWins={report.quickWins}/>{report.quickWinsDetailed?.length?<QuickWinsFlow quickWins={report.quickWinsDetailed}/>:report.quickWins?.length?<section className="report-card"><h3>저장된 빠른 개선 작업</h3><ol className="report-legacy-wins">{report.quickWins.map((w,i)=><li key={i} id={`report-quick-win-${i}`}>{w}</li>)}</ol></section>:null}</>},
        {id:'actions-kpi',label:'목표·예산 계산',children:<><GrowthKpiPanel key={`kpi:${report.url}:${report.pageEvidence?.capturedAt||'legacy'}`} targetUrl={report.url} goal={reportGoal(report.sitePurpose)}/><AdWasteCalculator/></>},
        {id:'actions-geo',label:'AI 답변 보강',children:<><GeoFocusPanel key={report.llmCitationTest?.questionSetId||report.url} report={report} linkToDetails/><CitationActionPlan citation={report.llmCitationTest}/></>},
      ]}/>
    </Chapter>
    <ReportRetentionNotice report={report}/><div className="report-ending"><FinalCTA report={report}/><Disclaimer/></div>
  </div></ReportWorkspace></SiteGuideProvider>;
}
