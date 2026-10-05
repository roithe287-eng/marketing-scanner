import {buildNaverReportDocument} from './naverReportDocument';
import {buildExecutionDocument} from './executionDocument';
import {buildSiteGuidebookDocument} from './siteGuidebookDocument';
import {REPORT_NOTICE_TITLE,REPORT_NOTICE_LEAD,REPORT_NOTICE_ITEMS,REPORT_NOTICE_END} from './reportNotice';
import {buildInsightsDocument} from './reportInsightsDocument';
import {buildGeoComparison,changeLabels,comparisonRate,comparisonReasons,comparisonTime,GEO_COMPARISON_NOTE,GEO_COMPARISON_TITLE,observationLabel} from './geoComparison';
import type { MarketingReport } from './reportSchema';
import { safeHttpUrl } from './citationMeasurement';
import {GEO_TITLE,GEO_DESCRIPTION,GEO_METRICS} from './geoPresentation';
import {buildGeoFocus} from './geoFocus';
import {buildGrowthDocument} from './growthDocument';
import {buildCompetitorDocument} from './competitorDocument';
export type ReportBlock = {text:string;kind:'title'|'heading'|'subheading'|'body';href?:string};
const labels:Record<string,string> = {
  engine:'AI 엔진',overallScore:'종합 점수',grade:'등급',summary:'요약',score:'점수',status:'상태',message:'안내',currentValue:'현재 상태',diagnosis:'진단',guide:'개선 가이드',evidence:'확인 근거',priorityActions:'우선 실행 과제',
  firstView:'첫 화면',cta:'행동 유도',copywriting:'카피라이팅',trust:'신뢰',conversionFlow:'전환 흐름',adLanding:'광고 랜딩',mobileUx:'모바일 UX',seo:'SEO',
  problem:'문제',reason:'이유',recommendation:'개선안',priority:'우선순위',badExample:'현재 예시',goodExample:'개선 예시',exampleNote:'예시 참고',steps:'실행 순서',beforeExample:'개선 전',afterExample:'개선 후',
  immediately:'즉시',thisWeek:'이번 주',thisMonth:'이번 달',heroHeadline:'추천 헤드라인',subHeadline:'서브 헤드라인',ctaText:'추천 CTA',currentHeroHeadline:'현재 헤드라인',currentCtaText:'현재 CTA',competitorCopyInsight:'경쟁사 카피 인사이트',
  checks:'점검 결과',notes:'참고',seoFoundation:'SEO 기반',contentStructure:'콘텐츠 구조',redundancy:'콘텐츠 중복',geo:'GEO',structuredData:'구조화 데이터',eeat:'경험·전문성·신뢰',localBrand:'지역·브랜드',aiAnswerability:'AI 답변 대응',siteType:'사이트 유형',
  citationRate:'구버전 인용률(언급 기반)',totalTests:'총 측정 수',totalCited:'자사 출처 확인 수',engineScores:'엔진별 인용 지표',chatgpt:'OpenAI',gemini:'Gemini',results:'질문별 답변·출처',questionType:'질문 유형',cited:'자사 출처 확인',citationRank:'구버전 답변 목록 위치',responseSnippet:'답변 발췌',reasoning:'판정 설명',
  statusLabel:'측정 상태',brandMentioned:'브랜드 언급',branded:'브랜드 포함 질문',journey:'고객 여정',model:'측정 모델',measuredAt:'측정 시각(UTC)',durationMs:'소요 시간(ms)',searchUsed:'검색 수행 확인',citationVerified:'출처 판정 가능',sources:'출처 링크',ownership:'출처 구분',responseText:'답변 원문',errorMessage:'측정 오류',questionSetId:'질문 세트 ID',cacheHit:'저장된 측정 재사용',validTests:'정상 답변 수',citationValidTests:'출처 판정 분모',failedTests:'실패·미설정 수',mentionRate:'브랜드 언급률(%)',ownedCitationRate:'자사 출처 인용률(%)',brandedCitationRate:'브랜드 포함 질문 인용률(%)',unbrandedCitationRate:'브랜드 미포함 질문 인용률(%)',actionPlan:'질문별 실행 과제',targetUrl:'검토 페이지',action:'권장 조치',nextStep:'다음 실행',accuracy:'사실 정확도',
  baseWasteRate:'추정 낭비율(%)',contributionFactors:'기여 요인',scenarios:'개선 시나리오',savingAmount:'예상 절감액(원)',savingRate:'예상 절감률(%)',duration:'기간',actions:'실행 과제',
  totalKeywords:'키워드 수',averageRank:'평균 순위',visibleCount:'노출 수',topFiveCount:'상위 5위 수',hiddenCount:'미노출 수',keywords:'키워드별 결과',keyword:'키워드',naverWebRank:'네이버 웹 순위',naverBlogRank:'네이버 블로그 순위',totalResults:'검색 결과 수',competitorAtTop:'상위 경쟁사',
  category:'분류',categoryLabel:'업종',sampleSize:'표본 수',hasSufficientSample:'표본 충분 여부',metrics:'영역별 비교',ours:'우리 점수',average:'평균',topTen:'상위 10%',gapVsAverage:'평균과 차이',gapVsTopTen:'상위와 차이',strongestArea:'강점',weakestArea:'보완점',naverRef:'참고',group:'점검 그룹',isLocalBusiness:'지역 사업 여부',placeScore:'플레이스 점수',advisorScore:'서치어드바이저 점수',counts:'항목 수',pass:'통과',warning:'주의',fail:'미충족',
  totalTokens:'전체 토큰 수',uniqueSingles:'단일 키워드 수',uniquePhrases:'구문 수',singles:'단일 키워드',phrases:'키워드 구문',count:'횟수',density:'빈도(%)',inTitle:'제목 포함',inMetaDescription:'설명 포함',searchKeyword:'검색 키워드',keywordSource:'키워드 생성 방식',competitors:'경쟁사',rank:'순위',link:'페이지 링크',description:'설명',domain:'도메인',metaTitle:'페이지 제목',metaDescription:'메타 설명',h1:'H1',ctaTexts:'CTA 문구',fetchError:'수집 오류',keyMessage:'핵심 메시지',differentiation:'차별점',overallComparison:'전체 비교',ourPositioning:'우리 포지셔닝',buttonText:'버튼 문구',url:'URL',
};
const values:Record<string,string> = {chatgpt:'OpenAI',gemini:'Gemini',true:'예',false:'아니오',ok:'정상',pending:'분석 중',complete:'완료',empty:'비교 대상 없음',error:'실패',timeout:'시간 초과',unavailable:'미설정',unverified:'검색·출처 확인 불가',own:'자사',external:'외부',unresolved:'대상 도메인 미확인',needs_review:'검토 필요',review_cited:'인용 페이지 검토',improve_candidate:'입력 페이지 개선 검토',research_page:'관련 페이지 탐색·신규 검토',retry:'재측정 필요',pass:'통과',warning:'주의',fail:'미충족',high:'높음',medium:'보통',low:'낮음',brand:'브랜드 확인',industry:'업종 비교',service:'서비스',local:'지역·특성'};
Object.assign(labels, {measurementProtocol:'비교 측정 규칙',brandName:'브랜드 판정 기준',requestFingerprint:'요청 설정 식별자',filtering:'후보 선정 기록',policyVersion:'선정 규칙 버전',reviewedCount:'검토한 검색 응답 수',metadataCheckedCount:'상세 수집 시도 수',excluded:'제외한 페이지와 이유',searchRank:'웹문서 검색 응답 순서',relevance:'검색어 관련성',selectionEvidence:'선정 근거'});
Object.assign(values, {keyword_match:'검색어 관련 신호 확인',needs_review:'서비스 일치 검토 필요'});
export function buildReportDocument(report:MarketingReport):ReportBlock[] {
  const blocks:ReportBlock[] = [
    {kind:'title',text:`${report.meta?.siteName || report.meta?.domain || '웹사이트'} 마케팅 진단 리포트`},
    {kind:'body',text:report.url,href:safeHttpUrl(report.url)||undefined},
    {kind:'body',text:`종합 점수 ${report.overallScore} / 100`},
    {kind:'body',text:report.oneLineSummary},
    {kind:'body',text:'전체 상세 내용이 포함된 결과 스냅샷입니다. AI 진단과 시뮬레이션은 검토를 위한 참고 자료이며 성과를 보장하지 않습니다.'},
  ];
  blocks.push(...buildInsightsDocument(report));
  blocks.push(...buildGrowthDocument(report));
  blocks.push(...buildExecutionDocument(report));
  blocks.push(...buildSiteGuidebookDocument(report));
  function walk(value:unknown,key='',depth=0) {
    if (value === undefined) return;
    if (value === null) {blocks.push({kind:'body',text:`${labels[key] || key}: 측정 불가 / 데이터 없음`});return;}
    if (Array.isArray(value)) {
      if (key && value.length) blocks.push({kind:'subheading',text:labels[key] || key});
      if (key === 'singles' || key === 'phrases') {
        value.forEach(v => blocks.push({kind:'body',text:`${v.keyword} · ${v.count}회 · 빈도 ${v.density}% · 제목 ${v.inTitle?'포함':'미포함'} · 설명 ${v.inMetaDescription?'포함':'미포함'}`}));
        return;
      }
      value.forEach((v,i) => {
      if (typeof v === 'object' && v !== null) { if (key !== 'results' && key !== 'actionPlan' && !('title' in v) && !('label' in v) && !('question' in v)) blocks.push({kind:'subheading',text:`${labels[key] || key} ${i+1}`}); walk(v,'',depth+1); }
      else walk(v,key,depth+1);
    });return;}
    if (typeof value === 'object') {
      const record=value as Record<string,unknown>;
      const title=record.question || record.label || record.title;
      if (title) blocks.push({kind:'subheading',text:String(title)});
      else if (key) blocks.push({kind:'subheading',text:labels[key] || key});
      for (const [k,v] of Object.entries(record)) {
        if (['id','key','title','label','question','measurementVersion'].includes(k)) continue;
        if (k === 'responseSnippet' && record.responseText) continue;
        if (record.measurementVersion === 2 && ['overallScore','citationRate','engineScores','grade'].includes(k)) continue;
        walk(v,k,depth+1);
      }
      return;
    }
    const raw=String(value);
    const href=safeHttpUrl(raw)||undefined;
    const text=href && raw.length>180 ? `${new URL(raw).hostname}${new URL(raw).pathname.slice(0,90)} (클릭하여 출처 열기)` : values[raw] || raw;
    if (text.trim()) {
      const paragraphs=href ? [text] : text.split(/\n+/).filter(Boolean);
      paragraphs.forEach((paragraph,i) => blocks.push({kind:'body',text:key && i===0 ? `${labels[key] || key}: ${paragraph}` : paragraph,href}));
    }
  }
  const comparison=buildGeoComparison(report);
  if (comparison) {
    blocks.push({kind:'heading',text:GEO_COMPARISON_TITLE},{kind:'body',text:GEO_COMPARISON_NOTE},
      {kind:'body',text:`기준 보고서 ID: ${comparison.baseline.reportId}`},
      {kind:'body',text:`이전 ${comparisonTime(comparison.baseline.citation.measuredAt)} / 현재 ${comparisonTime(comparison.current?.measuredAt)}`},
      {kind:'body',text:`자사 출처 인용률: ${comparisonRate(comparison.beforeRate)} → ${comparisonRate(comparison.afterRate)} · 같은 ${comparison.matched}쌍`},
      {kind:'body',text:`브랜드 언급률: ${comparisonRate(comparison.beforeMention)} → ${comparisonRate(comparison.afterMention)} · 같은 ${comparison.mentionCount}쌍`},
      {kind:'body',text:`${comparison.matched}쌍 비교 · ${comparison.excluded}쌍 제외`});
    if (comparison.matched) blocks.push({kind:'body',text:`새로 인용 ${comparison.gained}건 · 이번에 미확인 ${comparison.lost}건 · 인용 유지 ${comparison.kept}건`});
    for (const pair of comparison.pairs) {
      blocks.push({kind:'subheading',text:`${pair.engine==='chatgpt'?'OpenAI':'Gemini'} · ${pair.question}`},
        {kind:'body',text:pair.reason?`비교 제외 · ${comparisonReasons[pair.reason]}`:changeLabels[pair.change!]},
        {kind:'body',text:`이전: ${observationLabel(pair.before)} / 현재: ${observationLabel(pair.after)}`});
    }
    blocks.push({kind:'heading',text:'비교 기준의 이전 답변·출처 원본'},{kind:'body',text:'기준 링크가 만료되어도 이 보고서에 저장된 이전 관측은 유지됩니다. 현재 답변은 다음 GEO 상세에 포함됩니다.'});
    walk(comparison.baseline.citation);
  }
  const sections:[string,unknown][] = [
    ['영역별 점수',report.diagnosis],['GEO 질문·답변·출처·실행 과제',report.llmCitationTest],
    ['콘텐츠 발견성 및 AI 답변 대응',report.discoverability],['핵심 개선 이슈',report.criticalIssues],
    ['진단 체크리스트',report.checklist],['빠른 개선 과제',report.quickWinsDetailed || report.quickWins],
    ['우선순위 로드맵',report.priorityRoadmap],['카피 개선',report.exampleCopy],
    ['키워드 빈도',report.keywordFrequency],
    ['업종 벤치마크',report.industryBenchmark],['광고비 낭비 시뮬레이션 (추정)',report.adWasteSimulation],
    ['경쟁사 분석 상태',report.competitorStatus],['경쟁사 분석',report.competitorAnalysis],['다음 단계',report.finalCta],
  ];
  for (const [title,data] of sections) {
    if (data == null || (Array.isArray(data) && data.length===0)) continue;
    blocks.push({kind:'heading',text:title});
    if(data===report.llmCitationTest || (!report.llmCitationTest && data===report.discoverability)) {
      blocks.push({kind:'subheading',text:GEO_TITLE},{kind:'body',text:GEO_DESCRIPTION});
      for(const metric of GEO_METRICS) blocks.push({kind:'body',text:`${metric.title}: ${metric.description}`});
    }
    if (data === report.llmCitationTest) blocks.push({kind:'body',text:report.llmCitationTest?.measurementVersion === 2
      ? '정상 응답 기준 브랜드 언급과 검색 출처 기준 자사 인용을 분리했습니다. 실패·미설정·검색 또는 출처 미확인은 인용률 분모에서 제외합니다. API 관측은 일반 AI 화면이나 시장 전체 노출률과 다릅니다.'
      : '구버전의 브랜드 언급 기반 측정입니다. 실제 URL 인용률로 해석하지 마세요.'});
    if (data === report.llmCitationTest) {
      const focus = buildGeoFocus(report);
      if (focus) {
        blocks.push({kind:'subheading',text:'먼저 실행할 GEO 과제'},{kind:'body',text:'현재 관측 근거로 고른 최대 3가지입니다. 완료 기준은 수정·확인 작업이며 인용률 상승을 보장하는 조건은 아닙니다.'});
        for (const [i,task] of focus.tasks.entries()) {
          blocks.push({kind:'subheading',text:`우선 과제 ${i+1}. ${task.title}`},
            {kind:'body',text:`근거: ${task.evidence}`},{kind:'body',text:`실행: ${task.nextStep}`},
            {kind:'body',text:`완료 기준: ${task.completion}`});
          if (task.targetUrl) blocks.push({kind:'body',text:`검토 페이지: ${task.targetUrl}`,href:task.targetUrl});
        }
        blocks.push({kind:'subheading',text:'재사용할 고객 질문'});
        focus.questions.forEach(question => blocks.push({kind:'body',text:question}));
      }
    }
    if (data === report.competitorAnalysis) {blocks.push(...buildCompetitorDocument(report));continue;}
    walk(data);
  }
  blocks.push(...buildNaverReportDocument(report));
  blocks.push({kind:'heading',text:REPORT_NOTICE_TITLE},{kind:'body',text:REPORT_NOTICE_LEAD});
  for(const item of REPORT_NOTICE_ITEMS) blocks.push({kind:'subheading',text:item.title},{kind:'body',text:item.text});
  blocks.push({kind:'body',text:REPORT_NOTICE_END});
  return blocks;
}
