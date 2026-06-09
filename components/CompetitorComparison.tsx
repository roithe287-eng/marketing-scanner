import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  competitorAnalysis: NonNullable<MarketingReport["competitorAnalysis"]>;
  ourUrl: string;
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * v24: 경쟁사 텍스트 합친 후 빈출 키워드 추출
 * - 한글 2자 이상 + 영문 3자 이상
 * - 한국어 불용어 제거
 * - 빈도 내림차순 정렬 TOP N
 */
const KOREAN_STOPWORDS = new Set([
  "그리고", "그러나", "하지만", "따라서", "때문", "때문에", "위해", "위해서",
  "통해", "통해서", "대한", "대한에", "이런", "이러한", "그런", "그러한",
  "및이", "보기", "경우", "다른", "같은", "모든", "모두", "많은", "많이",
  "더욱", "가장", "좀더", "다양", "다양한", "올해", "완전", "완벽", "제공",
  "장소", "경험", "방법", "제품", "서비스", "안내", "설명", "소개", "관련",
  "임니다", "입니다", "합니다", "있습니다", "되어", "하는", "있는", "이는",
  "아닌", "니다", "니까", "주세요", "하세요", "됩니다", "그래서",
  "등의", "등을", "등을", "테이블", "레이아웃",
  "the", "and", "for", "with", "this", "that", "are", "was", "have", "has", "you",
  "your", "our", "from", "about", "more", "all", "can", "will", "new", "any",
]);

function extractTopKeywords(
  competitors: Array<{
    metaTitle?: string;
    metaDescription?: string;
    title?: string;
    description?: string;
    h1?: string;
    ctaTexts?: string[];
  }>,
  topN = 15
): Array<{ word: string; count: number }> {
  // 모든 경쟁사 텍스트 합치기
  const allText = competitors
    .map((c) =>
      [
        c.metaTitle || c.title || "",
        c.metaDescription || c.description || "",
        c.h1 || "",
        (c.ctaTexts || []).join(" "),
      ].join(" ")
    )
    .join(" ");

  // 단어 분리 (한글, 영문, 숫자)
  const rawTokens = allText
    .toLowerCase()
    .split(/[^가-힣a-zA-Z0-9]+/)
    .filter((t) => t.length > 0);

  // 한글은 2자 이상, 영문은 3자 이상, 숫자만은 제외
  const filtered = rawTokens.filter((t) => {
    if (KOREAN_STOPWORDS.has(t)) return false;
    if (/^[0-9]+$/.test(t)) return false; // 숫자만
    if (/^[가-힣]+$/.test(t)) return t.length >= 2; // 한글
    if (/^[a-zA-Z]+$/.test(t)) return t.length >= 3; // 영문
    return t.length >= 2; // 혼합
  });

  // 빈도 계산
  const counts = new Map<string, number>();
  for (const t of filtered) {
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  // 내림차순 정렬, TOP N 추출 (2회 이상 등장한 단어만)
  return Array.from(counts.entries())
    .filter(([_, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

/**
 * 빈도에 따라 태그 크기 결정 (워드클라우드 느낌)
 */
function getTagSizeClass(count: number, max: number): string {
  const ratio = count / Math.max(max, 1);
  if (ratio >= 0.8) return "text-xl md:text-2xl font-black text-jm-red";
  if (ratio >= 0.6) return "text-lg md:text-xl font-black text-jm-black";
  if (ratio >= 0.4) return "text-base md:text-lg font-bold text-jm-charcoal";
  if (ratio >= 0.25) return "text-sm md:text-base font-bold text-jm-gray";
  return "text-xs md:text-sm font-bold text-jm-gray";
}

export default function CompetitorComparison({
  competitorAnalysis,
  ourUrl,
}: Props) {
  const ourDomain = getDomainFromUrl(ourUrl);

  return (
    <div className="jm-card mt-8 p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        COMPETITIVE LANDSCAPE
      </p>
      <h3 className="mt-2 text-2xl font-black">동종업종 검색 상단 경쟁사 비교</h3>
      <p className="mt-2 text-sm text-jm-gray leading-6">
        <span className="font-bold text-jm-black">"{competitorAnalysis.searchKeyword}"</span> 키워드 기준 네이버 검색
        상위 사이트들이 강조하는 메시지와 우리 사이트를 비교했습니다.
      </p>

      {/* 전체 경쟁 환경 요약 */}
      {competitorAnalysis.overallComparison && (
        <div className="mt-6 rounded-2xl bg-jm-light-gray p-5">
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            경쟁 환경 요약
          </p>
          <p className="mt-2 text-sm leading-7">
            {competitorAnalysis.overallComparison}
          </p>
        </div>
      )}

      {/* 경쟁사 카드 그리드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {competitorAnalysis.competitors.map((comp) => (
          <div
            key={comp.rank}
            className="rounded-2xl border-2 border-jm-border p-5 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black">
                {comp.rank}
              </span>
              <a
                href={comp.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-jm-gray hover:text-jm-red truncate ml-2 max-w-[180px]"
                title={comp.domain}
              >
                {comp.domain} ↗
              </a>
            </div>

            <h4 className="mt-3 font-black text-base leading-snug line-clamp-2">
              {comp.metaTitle || comp.title}
            </h4>

            {comp.metaDescription && (
              <p className="mt-2 text-xs text-jm-gray leading-6 line-clamp-3">
                {comp.metaDescription}
              </p>
            )}

            {/* 핵심 메시지 (AI 분석) */}
            {comp.keyMessage && (
              <div className="mt-4 rounded-xl bg-jm-red/[0.08] p-3 border-l-4 border-jm-red">
                <p className="text-[10px] font-black tracking-wider text-jm-red">
                  강조 메시지
                </p>
                <p className="mt-1 text-xs leading-6 font-medium">
                  {comp.keyMessage}
                </p>
              </div>
            )}

            {/* 우리와의 차이 */}
            {comp.differentiation && (
              <div className="mt-3 rounded-xl bg-jm-light-gray p-3">
                <p className="text-[10px] font-black tracking-wider text-jm-gray">
                  우리와의 차이
                </p>
                <p className="mt-1 text-xs leading-6">
                  {comp.differentiation}
                </p>
              </div>
            )}

            {/* CTA 버튼 */}
            {comp.ctaTexts && comp.ctaTexts.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-black tracking-wider text-jm-gray">
                  CTA 버튼
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {comp.ctaTexts.map((cta, i) => (
                    <span
                      key={i}
                      className="inline-block rounded-full bg-jm-black px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      {cta}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {comp.fetchError && (
              <p className="mt-3 text-[10px] text-jm-gray italic">
                * 사이트 접근 제한 (검색 결과 기반 분석)
              </p>
            )}
          </div>
        ))}
      </div>

      {/* v24: 경쟁사 빈출 키워드 분석 (워드클라우드 스타일) */}
      {(() => {
        const topKeywords = extractTopKeywords(
          competitorAnalysis.competitors,
          15
        );
        if (topKeywords.length === 0) return null;
        const maxCount = topKeywords[0].count;
        return (
          <div className="mt-6 rounded-2xl border-2 border-jm-red p-5 md:p-6 bg-jm-red/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center rounded-full bg-jm-red px-3 py-1 text-xs font-black text-white">
                경쟁사 빈출 키워드
              </span>
              <span className="text-xs text-jm-gray">
                상위 경쟁사 {competitorAnalysis.competitors.length}곳의 title · description · H1 · CTA 종합
              </span>
            </div>
            <p className="mt-3 text-xs text-jm-gray leading-6">
              동종업종 상위 사이트들이 공통으로 자주 쓰는 키워드입니다.
              글자가 클 수록 더 많이 사용된 단어이며, 하단 숫자는 등장 횟수입니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              {topKeywords.map(({ word, count }) => (
                <span
                  key={word}
                  className={`inline-flex items-baseline gap-1 ${getTagSizeClass(count, maxCount)}`}
                  title={`${count}회 등장`}
                >
                  <span>{word}</span>
                  <span className="text-[10px] font-bold text-jm-gray">
                    ×{count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* AI 포지셔닝 제안 */}
      {competitorAnalysis.ourPositioning && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-jm-black p-6 text-white">
          <p className="text-xs font-black tracking-wider text-jm-red">
            JINJJA MARKETING 포지셔닝 제안
          </p>
          <p className="mt-3 text-base leading-7 font-medium">
            {competitorAnalysis.ourPositioning}
          </p>
        </div>
      )}
    </div>
  );
}
