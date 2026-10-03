export const GROWTH_REVIEWED_AT='2026-10-03';
export const GROWTH_TITLE='검색에서 발견되고, 답변으로 선택되고, 문의로 이어지게';
export const GROWTH_SCOPE='입력 URL에서 관측한 사실과 담당자가 확인할 작업을 구분했습니다. 수정 후의 사이트 모습은 실행 목표이며 검색 순위·AI 인용·매출 상승 예측이 아닙니다.';
export const GROWTH_SOURCES={
  ai:{title:'Google 생성형 AI 검색 최적화',url:'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide'},
  control:{title:'Google Search 생성형 AI 참여 설정',url:'https://support.google.com/webmasters/answer/16908024'},
  aiReport:{title:'Google 생성형 AI 성과 리포트',url:'https://support.google.com/webmasters/answer/16984139'},
  robots:{title:'Google 로봇 메타·스니펫 지시',url:'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag'},
  title:{title:'Google 검색 제목 가이드',url:'https://developers.google.com/search/docs/appearance/title-link'},
  snippet:{title:'Google 추천 스니펫',url:'https://developers.google.com/search/docs/appearance/featured-snippets'},
  canonical:{title:'Google 대표 URL 정리',url:'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls'},
  schema:{title:'Google 구조화 데이터 정책',url:'https://developers.google.com/search/docs/appearance/structured-data/sd-policies'},
  updates:{title:'Google 공식 변경 기록 · FAQ 리치 결과 종료',url:'https://developers.google.com/search/updates'},
  cwv:{title:'Google Core Web Vitals',url:'https://developers.google.com/search/docs/appearance/core-web-vitals'},
  vitals:{title:'Web Vitals 실사용자 측정과 75번째 백분위',url:'https://web.dev/articles/vitals'},
  analytics:{title:'GA4 트래픽 획득·세션 핵심 이벤트 비율',url:'https://support.google.com/analytics/answer/12923437'},
  naverContent:{title:'네이버 제목·설명 마크업',url:'https://searchadvisor.naver.com/guide/markup-content'},
  naverJs:{title:'네이버 JavaScript 검색 최적화',url:'https://searchadvisor.naver.com/guide/seo-advanced-javascript'},
  naverPerformance:{title:'네이버 웹 검색 노출·클릭·CTR',url:'https://searchadvisor.naver.com/guide/report-expose-ctr'},
  naverApi:{title:'네이버 디벨로퍼스 웹문서 검색 API',url:'https://developers.naver.com/docs/serviceapi/search/web/web.md'},
  naverCrawl:{title:'네이버 수집 요청 API 연동 조건',url:'https://searchadvisor.naver.com/guide/crawl-request-api'},
  naverBriefing:{title:'네이버 공식형·멀티출처형 AI 브리핑',url:'https://help.naver.com/service/5626/contents/24120'},
  openai:{title:'OpenAI 검색 봇·학습 봇 구분',url:'https://developers.openai.com/api/docs/bots'},
  ads:{title:'네이버 광고 URL 수집진단',url:'https://ads.naver.com/help/faq/1452'},
  aiAds:{title:'네이버 AI 광고 · 랜딩 및 전환 안내',url:'https://ads.naver.com/notice/31888'},
} as const;
export type GrowthSourceId=keyof typeof GROWTH_SOURCES;
export const GROWTH_CONCEPTS=[
  {id:'SEO',title:'검색 결과에서 찾기 쉽게',text:'검색로봇이 페이지를 읽고 주제를 이해하도록 제목·본문·링크·색인 설정을 정돈합니다.',metric:'노출 · 클릭 · CTR'},
  {id:'GEO',title:'AI 답변의 근거가 되도록',text:'질문에 도움이 되는 고유한 경험·근거·출처를 갖춥니다. 실제 언급과 자사 링크 인용은 따로 측정합니다.',metric:'AI 노출 · 표본 인용 · 유입'},
  {id:'AEO',title:'고객의 질문에 바로 답하도록',text:'질문 아래에 직접 답변을 두고 조건·예외·절차까지 설명합니다. 답변형 검색에 선택되는지는 별도 관측합니다.',metric:'질문별 답변 관측 · 전환'},
] as const;
export const GROWTH_UPDATES=[
  {title:'FAQ 문답과 FAQ 리치 결과는 다릅니다',text:'Google FAQ 리치 결과는 2026-05-07 종료됐습니다. 고객에게 필요한 문답은 유지하되 FAQPage 추가를 검색 특수 노출 보장 수단으로 제안하지 않습니다.',source:'updates'},
  {title:'Google AI 참여 설정도 확인하세요',text:'Search Console의 설정 → Search generative AI에서 참여 상태와 상위 속성의 상속 여부를 확인합니다. 스캐너가 해당 계정 설정을 읽은 것은 아닙니다.',source:'control'},
  {title:'AI 성과는 별도의 관측 범위를 확인합니다',text:'새 Google 생성형 AI 성과 리포트는 AI Overviews·AI Mode 링크 노출을 제공합니다. 순차 제공·노출량 조건이 있어 메뉴가 없다는 이유만으로 실패로 판단하지 않습니다.',source:'aiReport'},
] satisfies {title:string;text:string;source:GrowthSourceId}[];
export const GROWTH_MEASUREMENT=[
  {title:'네이버 웹 검색',where:'서치어드바이저 → 콘텐츠 노출 및 클릭',metric:'노출수 · 클릭수 · CTR',note:'웹 검색 관련 영역 기준입니다. 블로그·VIEW·광고·플레이스 전체 실적과 합산하지 않습니다. 화면의 업데이트 기준일을 확인하고 동일 길이의 이전 기간과 비교하세요.',source:'naverPerformance'},
  {title:'Google 검색·AI',where:'Search Console → 검색 실적 / 생성형 AI 성과',metric:'검색 노출·클릭·CTR / AI 링크 노출',note:'일반 검색과 AI 보고서의 집계 범위가 다릅니다. AI 보고서는 제공 여부를 먼저 확인하고 URL·기기·국가·기간을 맞춥니다. API의 Gemini 답변은 Google 검색 AI 노출 실적이 아닙니다.',source:'aiReport'},
  {title:'사이트 문의·구매',where:'GA4 → 획득 → 트래픽 획득',metric:'세션 · 핵심 이벤트 발생 세션 · 세션 전환율',note:'동일한 유입 채널에서 문의 완료 등 하나의 핵심 이벤트 정의를 고정합니다. 버튼 클릭과 문의 완료, 이벤트 발생 횟수와 전환 세션 수를 구분하세요.',source:'analytics'},
  {title:'질문별 AI 답변',where:'이 보고서의 질문·출처 관측 / 재진단 비교',metric:'동일 질문의 자사 출처 인용 · 실패 수',note:'질문·모델·검색 설정을 맞추고 유효 응답만 비교합니다. 이 표본은 시장 전체 점유율이 아닙니다. 네이버 AI 브리핑과 Google AI 화면은 각각 별도로 기록해야 합니다.',source:'naverBriefing'},
] satisfies {title:string;where:string;metric:string;note:string;source:GrowthSourceId}[];
