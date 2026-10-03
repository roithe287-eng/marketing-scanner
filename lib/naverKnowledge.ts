import type {NaverCheck,NaverSource,NaverOptimization} from './naverSchema';
export const NAVER_REVIEWED_AT='2026-10-03';
export const NAVER_CATEGORIES={search:'SEO·서치어드바이저',ads:'ADVoost 검색·AI 광고',shopping:'ADVoost 쇼핑',developers:'디벨로퍼스·API'} as const;
export const NAVER_STATUS={observed:'확인됨',action:'보완 필요',manual:'직접 확인',not_applicable:'해당 없음'} as const;
export const NAVER_OWNERS={content:'콘텐츠 담당',developer:'개발 담당',marketer:'마케팅 담당'} as const;
export const NAVER_SCOPE='입력 URL의 정적 HTML·응답 헤더·robots.txt를 관측합니다. 계정 설정, 실제 색인·노출, 전환 수신은 별도로 확인해야 합니다. 확인됨은 해당 근거의 관측을 뜻하며 네이버 인증·성과 점수가 아닙니다.';
const source=(id:string,title:string,url:string,updatedAt?:string):NaverSource=>({id,title,url,reviewedAt:NAVER_REVIEWED_AT,...updatedAt?{updatedAt}:{}});
export const NAVER_SOURCES:NaverSource[]=[
  source('robots','검색로봇 robots.txt 가이드','https://searchadvisor.naver.com/guide/seo-basic-robots'),
  source('structure','선호 URL 및 로봇 메타 태그','https://searchadvisor.naver.com/guide/markup-structure'),
  source('missing','웹 검색 미노출 점검','https://searchadvisor.naver.com/guide/faq-serpmissing'),
  source('metadata','제목·설명·Open Graph','https://searchadvisor.naver.com/guide/markup-content'),
  source('structured','구조화된 데이터 소개','https://searchadvisor.naver.com/guide/structured-data-intro'),
  source('javascript','자바스크립트 검색 최적화','https://searchadvisor.naver.com/guide/seo-advanced-javascript'),
  source('ownership','검색 최적화 시작·사이트 소유확인','https://searchadvisor.naver.com/guide/seo-basic-intro'),
  source('feed','RSS 및 사이트맵 제출','https://searchadvisor.naver.com/guide/request-feed'),
  source('content','콘텐츠 작성 권장 사항','https://searchadvisor.naver.com/guide/content-basic'),
  source('briefing','AI 브리핑 소개','https://help.naver.com/service/5626/contents/24119'),
  source('ads-robot','광고용 검색로봇 Ads-Naver','https://ads.naver.com/help/faq/994','2026-08-12'),
  source('ads-exclusion','확장검색 웹 수집 제외 안내','https://ads.naver.com/notice/16973'),
  source('ads-diagnostic','URL 수집 상태 상세 유형','https://ads.naver.com/help/faq/1009','2026-09-23'),
  source('ads-status','URL 수집진단 이용 방법','https://ads.naver.com/help/faq/1452','2026-09-30'),
  source('ai-ad','AI 광고 출시·랜딩페이지 준비 안내','https://ads.naver.com/notice/31888'),
  source('shopping','ADVoost 쇼핑 주요 특징','https://ads.naver.com/help/faq/1374','2026-06-23'),
  source('search-api','웹문서 검색 API','https://developers.naver.com/docs/serviceapi/search/web/web.md'),
  source('crawl-api','웹페이지 수집 요청 API','https://searchadvisor.naver.com/guide/crawl-request-api'),
  source('alt','W3C 이미지 대체 텍스트 결정 가이드','https://www.w3.org/WAI/tutorials/images/decision-tree/'),
];
export function naverCounts(checks:NaverCheck[]) {
  return {observed:checks.filter(c=>c.status==='observed').length,action:checks.filter(c=>c.status==='action').length,manual:checks.filter(c=>c.status==='manual').length,not_applicable:checks.filter(c=>c.status==='not_applicable').length};
}
export function naverExecutionBrief(report:NaverOptimization,check:NaverCheck):string {
  return [`[${NAVER_CATEGORIES[check.category]}] ${check.title}`,`대상 URL: ${report.targetUrl||'재진단 후 확인'}`,`상태: ${NAVER_STATUS[check.status]} · ${NAVER_OWNERS[check.owner]}`,`확인 근거: ${check.evidence}`,`해석: ${check.interpretation}`,'',...check.steps.map((s,i)=>`${i+1}. ${s}`),'',`완료 확인: ${check.completion}`,`공식 문서 확인일: ${report.rulesReviewedAt}`,...report.sources.filter(s=>check.sourceIds.includes(s.id)).map(s=>`${s.title}: ${s.url}`),'',NAVER_SCOPE].join('\n');
}
