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
 * v27: Google favicon 서비스로 도메인 아이콘 가져오기
 */
function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(
    domain
  )}`;
}

// =====================================================================
// v24 유지: 경쟁사 빈출 키워드 추출
// =====================================================================
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

  const rawTokens = allText
    .toLowerCase()
    .split(/[^가-힣a-zA-Z0-9]+/)
    .filter((t) => t.length > 0);

  const filtered = rawTokens.filter((t) => {
    if (KOREAN_STOPWORDS.has(t)) return false;
    if (/^[0-9]+$/.test(t)) return false;
    if (/^[가-힣]+$/.test(t)) return t.length >= 2;
    if (/^[a-zA-Z]+$/.test(t)) return t.length >= 3;
    return t.length >= 2;
  });

  const counts = new Map<string, number>();
  for (const t of filtered) counts.set(t, (counts.get(t) || 0) + 1);

  return Array.from(counts.entries())
    .filter(([_, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

function getTagSizeClass(count: number, max: number): string {
  const ratio = count / Math.max(max, 1);
  if (ratio >= 0.8) return "text-xl md:text-2xl font-black text-jm-red";
  if (ratio >= 0.6) return "text-lg md:text-xl font-black text-jm-black";
  if (ratio >= 0.4) return "text-base md:text-lg font-bold text-jm-charcoal";
  if (ratio >= 0.25) return "text-sm md:text-base font-bold text-jm-gray";
  return "text-xs md:text-sm font-bold text-jm-gray";
}

// =====================================================================
// v27: 메시지 카테고리 자동 분류 (6가지 톤)
// =====================================================================
const MESSAGE_CATEGORIES: Record<
  string,
  { label: string; keywords: string[]; color: string; emoji: string }
> = {
  price: {
    label: "가격·할인",
    keywords: [
      "최저가", "저렴", "할인", "특가", "세일", "가격", "원", "%", "쿠폰", "혜택",
      "이벤트", "프로모션", "무료배송", "1+1", "OFF", "SALE",
    ],
    color: "bg-rose-500",
    emoji: "💰",
  },
  quality: {
    label: "품질·전문성",
    keywords: [
      "프리미엄", "전문", "고급", "퀄리티", "퀄리", "명품", "최고", "최상", "1등",
      "장인", "수제", "원조", "정통", "오리지널", "본격",
    ],
    color: "bg-violet-500",
    emoji: "👑",
  },
  speed: {
    label: "속도·당일",
    keywords: [
      "당일", "즉시", "빠른", "신속", "익일", "오늘", "24시간", "실시간", "원터치",
      "바로", "신선", "갓",
    ],
    color: "bg-amber-500",
    emoji: "⚡",
  },
  emotion: {
    label: "감성·라이프",
    keywords: [
      "감성", "스타일", "감각", "트렌드", "lifestyle", "라이프", "예쁜", "센스",
      "특별한", "유니크", "감각적",
    ],
    color: "bg-pink-500",
    emoji: "🌸",
  },
  trust: {
    label: "신뢰·후기",
    keywords: [
      "후기", "리뷰", "인증", "보증", "공식", "검증", "수상", "특허", "추천",
      "TOP", "1위", "만족도", "재구매", "도입", "고객사", "파트너",
    ],
    color: "bg-emerald-500",
    emoji: "✅",
  },
  benefit: {
    label: "혜택·증정",
    keywords: [
      "무료", "증정", "사은품", "혜택", "선물", "체험", "샘플", "포인트", "적립",
      "회원", "가입", "신규",
    ],
    color: "bg-sky-500",
    emoji: "🎁",
  },
};

function classifyMessageTone(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [key, cat] of Object.entries(MESSAGE_CATEGORIES)) {
    if (cat.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push(key);
    }
  }
  return matched;
}

function buildToneSummary(
  competitors: Array<{
    metaTitle?: string;
    metaDescription?: string;
    title?: string;
    description?: string;
    h1?: string;
    keyMessage?: string;
    ctaTexts?: string[];
  }>
): Array<{ category: string; count: number; pct: number }> {
  const counts: Record<string, number> = {};
  for (const c of competitors) {
    const text = [
      c.metaTitle || c.title || "",
      c.metaDescription || c.description || "",
      c.h1 || "",
      c.keyMessage || "",
      (c.ctaTexts || []).join(" "),
    ].join(" ");
    const tones = classifyMessageTone(text);
    for (const t of tones) counts[t] = (counts[t] || 0) + 1;
  }
  const total = competitors.length || 1;
  return Object.entries(MESSAGE_CATEGORIES)
    .map(([key]) => ({
      category: key,
      count: counts[key] || 0,
      pct: Math.round(((counts[key] || 0) / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// =====================================================================
// 메인 컴포넌트
// =====================================================================
export default function CompetitorComparison({
  competitorAnalysis,
  ourUrl,
}: Props) {
  const ourDomain = getDomainFromUrl(ourUrl);
  const competitors = competitorAnalysis.competitors || [];
  const toneSummary = buildToneSummary(competitors);
  const topKeywords = extractTopKeywords(competitors, 15);

  return (
    <div className="jm-card mt-8 overflow-hidden">
      {/* ===== 헤더 영역 (그라데이션) ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-jm-black via-jm-charcoal to-jm-black p-6 md:p-8 text-white">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black tracking-wider text-jm-red">
              COMPETITIVE LANDSCAPE
            </p>
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider">
              TOP {competitors.length}
            </span>
          </div>
          <h3 className="mt-2 text-2xl md:text-3xl font-black leading-tight">
            동종업종 검색 상단 경쟁사 비교
          </h3>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-xs text-gray-400">검색 키워드</span>
            <span className="inline-flex items-center rounded-full bg-jm-red px-3 py-1 text-sm font-black text-white">
              # {competitorAnalysis.searchKeyword}
            </span>
            <span className="text-xs text-gray-400">
              · 네이버 검색 상위 노출 사이트 기준 (대형몰·오픈마켓 제외)
            </span>
          </div>
        </div>
        {/* 배경 데코 */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-jm-red/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="p-6 md:p-8">
        {/* ===== 경쟁 환경 요약 ===== */}
        {competitorAnalysis.overallComparison && (
          <div className="rounded-2xl bg-jm-light-gray p-5 md:p-6 mb-6">
            <p className="text-xs font-black tracking-wider text-jm-gray">
              ① 경쟁 환경 요약
            </p>
            <p className="mt-2 text-sm md:text-base leading-7 font-medium">
              {competitorAnalysis.overallComparison}
            </p>
          </div>
        )}

        {/* ===== 메시지 카테고리 분포 도식 ===== */}
        {toneSummary.some((t) => t.count > 0) && (
          <div className="rounded-2xl border-2 border-jm-border p-5 md:p-6 mb-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ② 경쟁사 메시지 톤 분포
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  상위 {competitors.length}개사가 강조하는 메시지 유형
                </p>
              </div>
              <span className="text-[10px] text-jm-gray">
                각 사이트의 title·H1·CTA·핵심메시지 분석
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {toneSummary.map((t) => {
                const cat = MESSAGE_CATEGORIES[t.category];
                if (!cat) return null;
                return (
                  <div key={t.category} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-sm font-bold">{cat.label}</span>
                    </div>
                    <div className="flex-1 h-7 rounded-full bg-jm-light-gray overflow-hidden relative">
                      <div
                        className={`h-full ${cat.color} transition-all`}
                        style={{ width: `${Math.max(t.pct, 3)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-bold text-jm-black">
                          {t.count}개사 ({t.pct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 인사이트 */}
            {toneSummary[0] && toneSummary[0].count > 0 && (
              <div className="mt-5 rounded-xl bg-jm-red/[0.06] border-l-4 border-jm-red p-3">
                <p className="text-xs leading-6">
                  <span className="font-black text-jm-red">💡 인사이트</span>
                  {" — "}
                  업종 상위 사이트는{" "}
                  <span className="font-black">
                    {MESSAGE_CATEGORIES[toneSummary[0].category]?.label}
                  </span>{" "}
                  메시지를 가장 많이 사용합니다.
                  {toneSummary[1] && toneSummary[1].count > 0 && (
                    <>
                      {" "}
                      그 다음은{" "}
                      <span className="font-black">
                        {MESSAGE_CATEGORIES[toneSummary[1].category]?.label}
                      </span>{" "}
                      입니다.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== 경쟁사 카드 그리드 (디자인 개선) ===== */}
        <div className="mb-6">
          <p className="text-xs font-black tracking-wider text-jm-red mb-3">
            ③ 경쟁사 상세 분석
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((comp) => (
              <div
                key={comp.rank}
                className="group rounded-2xl border-2 border-jm-border bg-white p-5 flex flex-col hover:border-jm-red transition-colors"
              >
                {/* 헤더: 순위 + favicon + 도메인 */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black shrink-0">
                    {comp.rank}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFaviconUrl(comp.domain)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded shrink-0 bg-jm-light-gray"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                  <a
                    href={comp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-jm-gray hover:text-jm-red truncate flex-1 min-w-0"
                    title={comp.domain}
                  >
                    {comp.domain} ↗
                  </a>
                </div>

                {/* title */}
                <h4 className="mt-3 font-black text-base leading-snug line-clamp-2">
                  {comp.metaTitle || comp.title}
                </h4>

                {/* meta description */}
                {comp.metaDescription && (
                  <p className="mt-2 text-xs text-jm-gray leading-6 line-clamp-3">
                    {comp.metaDescription}
                  </p>
                )}

                {/* H1 (있을 때만) */}
                {comp.h1 && (
                  <div className="mt-3 rounded-lg bg-jm-light-gray px-3 py-2">
                    <p className="text-[10px] font-black tracking-wider text-jm-gray">
                      H1
                    </p>
                    <p className="mt-0.5 text-xs leading-5 font-medium line-clamp-2">
                      {comp.h1}
                    </p>
                  </div>
                )}

                {/* 강조 메시지 (AI 분석) */}
                {comp.keyMessage && (
                  <div className="mt-3 rounded-xl bg-gradient-to-br from-jm-red/[0.08] to-jm-red/[0.04] p-3 border-l-4 border-jm-red">
                    <p className="text-[10px] font-black tracking-wider text-jm-red">
                      💬 강조 메시지
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
                      ⚖️ 우리와의 차이
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
                      🎯 CTA 버튼
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {comp.ctaTexts.slice(0, 6).map((cta, i) => (
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
        </div>

        {/* ===== v24: 경쟁사 빈출 키워드 ===== */}
        {topKeywords.length > 0 && (
          <div className="rounded-2xl border-2 border-jm-red p-5 md:p-6 bg-gradient-to-br from-jm-red/[0.06] to-jm-red/[0.02] mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ④ 경쟁사 빈출 키워드 TOP {topKeywords.length}
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  동종업종 상위 사이트들이 공통적으로 자주 쓰는 단어
                </p>
              </div>
              <span className="text-[10px] text-jm-gray text-right">
                title · description · H1 · CTA 종합
              </span>
            </div>
            <p className="mt-2 text-xs text-jm-gray leading-6">
              글자가 클수록 더 많이 사용된 단어이며, 옆 숫자는 등장 횟수입니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              {topKeywords.map(({ word, count }) => (
                <span
                  key={word}
                  className={`inline-flex items-baseline gap-1 ${getTagSizeClass(
                    count,
                    topKeywords[0].count
                  )}`}
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
        )}

        {/* ===== AI 포지셔닝 제안 ===== */}
        {competitorAnalysis.ourPositioning && (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-jm-black via-jm-charcoal to-jm-black p-6 md:p-7 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-red text-white text-xs font-black">
                JM
              </span>
              <p className="text-xs font-black tracking-wider text-jm-red">
                ⑤ JINJJA MARKETING 포지셔닝 제안
              </p>
            </div>
            <p className="mt-3 text-base md:text-lg leading-7 md:leading-8 font-medium">
              {competitorAnalysis.ourPositioning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
