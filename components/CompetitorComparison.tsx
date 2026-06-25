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

function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(
    domain
  )}`;
}

// =====================================================================
// 메시지 카테고리 (6분류)
// =====================================================================
const MESSAGE_CATEGORIES: Record<
  string,
  { label: string; keywords: string[]; color: string; bgClass: string; emoji: string }
> = {
  price: {
    label: "가격·할인",
    keywords: ["최저가", "저렴", "할인", "특가", "세일", "원", "%", "쿠폰", "혜택", "이벤트", "프로모션", "무료배송", "1+1", "OFF", "SALE"],
    color: "#f43f5e",
    bgClass: "bg-rose-500",
    emoji: "💰",
  },
  quality: {
    label: "품질·전문성",
    keywords: ["프리미엄", "전문", "고급", "퀄리티", "명품", "최고", "최상", "1등", "장인", "수제", "원조", "정통", "오리지널"],
    color: "#8b5cf6",
    bgClass: "bg-violet-500",
    emoji: "👑",
  },
  speed: {
    label: "속도·당일",
    keywords: ["당일", "즉시", "빠른", "신속", "익일", "오늘", "24시간", "실시간", "바로", "신선", "갓"],
    color: "#f59e0b",
    bgClass: "bg-amber-500",
    emoji: "⚡",
  },
  emotion: {
    label: "감성·라이프",
    keywords: ["감성", "스타일", "감각", "트렌드", "lifestyle", "라이프", "예쁜", "센스", "특별한", "유니크"],
    color: "#ec4899",
    bgClass: "bg-pink-500",
    emoji: "🌸",
  },
  trust: {
    label: "신뢰·후기",
    keywords: ["후기", "리뷰", "인증", "보증", "공식", "검증", "수상", "특허", "추천", "TOP", "1위", "만족도", "재구매", "도입", "고객사"],
    color: "#10b981",
    bgClass: "bg-emerald-500",
    emoji: "✅",
  },
  benefit: {
    label: "혜택·증정",
    keywords: ["무료", "증정", "사은품", "선물", "체험", "샘플", "포인트", "적립", "회원가입", "신규"],
    color: "#0ea5e9",
    bgClass: "bg-sky-500",
    emoji: "🎁",
  },
};

function countKeywordsInText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    let idx = lower.indexOf(k);
    while (idx !== -1) {
      count++;
      idx = lower.indexOf(k, idx + k.length);
    }
  }
  return count;
}

function getCompetitorText(c: any): string {
  return [
    c.metaTitle || c.title || "",
    c.metaDescription || c.description || "",
    c.h1 || "",
    c.keyMessage || "",
    (c.ctaTexts || []).join(" "),
  ].join(" ");
}

// =====================================================================
// 포지셔닝 맵 좌표 계산
// X축: 가격강조(왼쪽) ~ 프리미엄강조(오른쪽)
// Y축: 이성·기능(아래) ~ 감성·라이프(위)
// =====================================================================
function calculatePosition(text: string): { x: number; y: number } {
  const priceCount = countKeywordsInText(text, MESSAGE_CATEGORIES.price.keywords);
  const qualityCount = countKeywordsInText(text, MESSAGE_CATEGORIES.quality.keywords);
  const emotionCount = countKeywordsInText(text, MESSAGE_CATEGORIES.emotion.keywords);
  const trustCount = countKeywordsInText(text, MESSAGE_CATEGORIES.trust.keywords);
  const speedCount = countKeywordsInText(text, MESSAGE_CATEGORIES.speed.keywords);

  // x = (quality - price) / (quality + price + 1) -> -1 ~ 1
  const xRaw = (qualityCount - priceCount) / (qualityCount + priceCount + 1);
  // y = (emotion - trust - speed) -> 감성:위쪽
  const yRaw = (emotionCount - trustCount - speedCount) / (emotionCount + trustCount + speedCount + 1);

  // -1~1 → 화면 % (10%~90% 범위로 매핑)
  const x = 50 + xRaw * 40;
  const y = 50 - yRaw * 40; // y는 화면상 반전 (위가 0%)
  return { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
}

// =====================================================================
// 강약점 비교 자동 분석
// =====================================================================
type EvalRow = {
  label: string;
  evaluator: (text: string, c: any) => "pass" | "warning" | "fail";
};

const EVAL_ROWS: EvalRow[] = [
  {
    label: "헤드라인 명확도",
    evaluator: (_, c) => {
      const h1 = (c.h1 || "").trim();
      const title = (c.metaTitle || c.title || "").trim();
      if (h1.length >= 8 && h1.length <= 50) return "pass";
      if (title.length >= 8) return "warning";
      return "fail";
    },
  },
  {
    label: "가격·혜택 노출",
    evaluator: (text) => {
      const n = countKeywordsInText(text, MESSAGE_CATEGORIES.price.keywords);
      if (n >= 3) return "pass";
      if (n >= 1) return "warning";
      return "fail";
    },
  },
  {
    label: "신뢰 요소 (후기·인증)",
    evaluator: (text) => {
      const n = countKeywordsInText(text, MESSAGE_CATEGORIES.trust.keywords);
      if (n >= 2) return "pass";
      if (n >= 1) return "warning";
      return "fail";
    },
  },
  {
    label: "CTA 다양성 (3개 이상)",
    evaluator: (_, c) => {
      const ctas = c.ctaTexts || [];
      if (ctas.length >= 3) return "pass";
      if (ctas.length >= 1) return "warning";
      return "fail";
    },
  },
  {
    label: "감성·차별화 키워드",
    evaluator: (text) => {
      const n =
        countKeywordsInText(text, MESSAGE_CATEGORIES.emotion.keywords) +
        countKeywordsInText(text, MESSAGE_CATEGORIES.quality.keywords);
      if (n >= 2) return "pass";
      if (n >= 1) return "warning";
      return "fail";
    },
  },
];

const STATUS_BADGE: Record<
  "pass" | "warning" | "fail",
  { bg: string; text: string; icon: string }
> = {
  pass: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "✓" },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "!" },
  fail: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", icon: "✕" },
};

// =====================================================================
// 빈출 키워드 추출 (v24 유지)
// =====================================================================
const KOREAN_STOPWORDS = new Set([
  "그리고", "그러나", "하지만", "따라서", "때문", "때문에", "위해", "위해서",
  "통해", "통해서", "대한", "이런", "이러한", "그런", "그러한", "보기", "경우",
  "다른", "같은", "모든", "모두", "많은", "많이", "더욱", "가장", "다양",
  "다양한", "올해", "완전", "완벽", "제공", "장소", "경험", "방법", "제품",
  "서비스", "안내", "설명", "소개", "관련", "임니다", "입니다", "합니다",
  "있습니다", "되어", "하는", "있는", "이는", "아닌", "주세요", "하세요",
  "됩니다", "그래서",
  "the", "and", "for", "with", "this", "that", "are", "was", "have", "has",
  "you", "your", "our", "from", "about", "more", "all", "can", "will", "new",
]);

function extractTopKeywords(
  competitors: any[],
  topN = 15
): Array<{ word: string; count: number }> {
  const allText = competitors.map(getCompetitorText).join(" ");
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
// 메인 컴포넌트
// =====================================================================
export default function CompetitorComparison({
  competitorAnalysis,
  ourUrl,
}: Props) {
  const ourDomain = getDomainFromUrl(ourUrl);
  const competitors = competitorAnalysis.competitors || [];

  // 메시지 톤 분포
  const toneCounts: Record<string, number> = {};
  for (const c of competitors) {
    const text = getCompetitorText(c);
    for (const [key, cat] of Object.entries(MESSAGE_CATEGORIES)) {
      if (countKeywordsInText(text, cat.keywords) > 0) {
        toneCounts[key] = (toneCounts[key] || 0) + 1;
      }
    }
  }
  const toneSorted = Object.entries(MESSAGE_CATEGORIES)
    .map(([key, cat]) => ({
      key,
      cat,
      count: toneCounts[key] || 0,
      pct: Math.round(((toneCounts[key] || 0) / (competitors.length || 1)) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const topKeywords = extractTopKeywords(competitors, 15);

  // 강약점 비교: 각 경쟁사 + 우리(추정) 평가
  // 우리 사이트 데이터는 직접 없으므로 "분석 대상 기준 평균"으로 표시
  const evalResults = competitors.map((c) => {
    const text = getCompetitorText(c);
    return {
      domain: c.domain,
      rank: c.rank,
      rows: EVAL_ROWS.map((r) => r.evaluator(text, c)),
    };
  });

  return (
    <div className="jm-card mt-8 overflow-hidden">
      {/* ===== ① 헤더 ===== */}
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
              · 대형몰·오픈마켓·SNS·틱톡 자동 제외
            </span>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-jm-red/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* ===== ② 포지셔닝 맵 (2D 산점도) ===== */}
        {competitors.length > 0 && (
          <div className="rounded-2xl border-2 border-jm-border p-5 md:p-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ② POSITIONING MAP
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  업종 포지셔닝 맵
                </p>
              </div>
              <span className="text-[10px] text-jm-gray">
                각 사이트의 메시지 키워드 빈도로 자동 산정
              </span>
            </div>

            <div className="relative aspect-[16/11] bg-gradient-to-br from-jm-light-gray/50 to-white border border-jm-border rounded-xl">
              {/* 4분면 라벨 */}
              <div className="absolute top-3 left-3 text-[10px] font-black text-jm-gray bg-white/80 px-2 py-1 rounded">
                감성 가성비형
              </div>
              <div className="absolute top-3 right-3 text-[10px] font-black text-jm-gray bg-white/80 px-2 py-1 rounded">
                프리미엄 감성형
              </div>
              <div className="absolute bottom-3 left-3 text-[10px] font-black text-jm-gray bg-white/80 px-2 py-1 rounded">
                저가 실용형
              </div>
              <div className="absolute bottom-3 right-3 text-[10px] font-black text-jm-gray bg-white/80 px-2 py-1 rounded">
                고급 실용형
              </div>

              {/* 십자축 */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-jm-border" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-jm-border" />

              {/* 축 라벨 */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-black text-jm-gray whitespace-nowrap origin-center" style={{ transformOrigin: "left center", left: "-30px" }}>
                감성·라이프 ↑
              </div>
              <div className="absolute bottom-[-22px] left-1/2 -translate-x-1/2 text-[10px] font-black text-jm-gray whitespace-nowrap">
                가격 강조 ←→ 프리미엄 강조
              </div>

              {/* 경쟁사 점 */}
              {competitors.map((c) => {
                const pos = calculatePosition(getCompetitorText(c));
                return (
                  <div
                    key={c.rank}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  >
                    <div className="flex items-center gap-1 bg-white border-2 border-jm-black rounded-full px-2 py-1 shadow-md hover:scale-110 transition-transform cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getFaviconUrl(c.domain)}
                        alt=""
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-[10px] font-black">{c.rank}</span>
                    </div>
                    {/* 호버 툴팁 */}
                    <div className="opacity-0 group-hover:opacity-100 absolute left-1/2 -translate-x-1/2 -bottom-7 bg-jm-black text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap transition-opacity pointer-events-none">
                      {c.domain}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-jm-gray">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-jm-black" />
                경쟁사 위치
              </span>
              <span>·</span>
              <span>점 호버 시 도메인 표시</span>
            </div>
          </div>
        )}

        {/* ===== ③ 메시지 클러스터 (6색 막대) ===== */}
        {toneSorted.some((t) => t.count > 0) && (
          <div className="rounded-2xl border-2 border-jm-border p-5 md:p-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ③ MESSAGE CLUSTER
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  경쟁사 메시지 클러스터
                </p>
              </div>
              <span className="text-[10px] text-jm-gray">
                6개 카테고리 자동 분류
              </span>
            </div>

            {/* 버블 표시 (큰 영역) */}
            <div className="mt-5 grid grid-cols-3 md:grid-cols-6 gap-3">
              {toneSorted.map((t) => {
                const size = Math.max(48, 48 + t.count * 14);
                return (
                  <div
                    key={t.key}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`${t.cat.bgClass} rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-105`}
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        opacity: t.count === 0 ? 0.25 : 1,
                      }}
                    >
                      <span className="text-2xl">{t.cat.emoji}</span>
                    </div>
                    <p className="mt-2 text-xs font-black">{t.cat.label}</p>
                    <p className="text-[10px] text-jm-gray">
                      {t.count}개사 · {t.pct}%
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 인사이트 */}
            {toneSorted[0] && toneSorted[0].count > 0 && (
              <div className="mt-5 rounded-xl bg-jm-red/[0.06] border-l-4 border-jm-red p-3">
                <p className="text-xs leading-6">
                  <span className="font-black text-jm-red">💡 인사이트</span>
                  {" — "}
                  업종 상위 사이트는{" "}
                  <span className="font-black">{toneSorted[0].cat.label}</span>{" "}
                  메시지를 가장 많이 사용합니다.
                  {toneSorted[1] && toneSorted[1].count > 0 && (
                    <>
                      {" "}
                      그 다음은{" "}
                      <span className="font-black">
                        {toneSorted[1].cat.label}
                      </span>{" "}
                      입니다.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== ④ 강약점 비교표 ===== */}
        {evalResults.length > 0 && (
          <div className="rounded-2xl border-2 border-jm-border p-5 md:p-6 overflow-hidden">
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ④ STRENGTH × WEAKNESS
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  강약점 비교표
                </p>
              </div>
              <span className="text-[10px] text-jm-gray">
                ✓ 통과 · ! 보완 · ✕ 미흡
              </span>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 md:p-3 font-black text-jm-gray bg-jm-light-gray rounded-l-lg whitespace-nowrap">
                      평가 항목
                    </th>
                    {evalResults.map((r) => (
                      <th
                        key={r.domain}
                        className="text-center p-2 md:p-3 font-black bg-jm-light-gray whitespace-nowrap"
                      >
                        <div className="flex flex-col items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getFaviconUrl(r.domain)}
                            alt=""
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-[10px] text-jm-charcoal truncate max-w-[80px]">
                            {r.domain}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-2 md:p-3 font-black text-jm-gray bg-jm-light-gray rounded-r-lg whitespace-nowrap">
                      평균
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVAL_ROWS.map((row, i) => {
                    // 평균: pass=2, warning=1, fail=0
                    const scores: number[] = evalResults.map((r) => {
                      const s = r.rows[i];
                      return s === "pass" ? 2 : s === "warning" ? 1 : 0;
                    });
                    const avg =
                      scores.reduce((a: number, b: number) => a + b, 0) /
                      (scores.length || 1);
                    const avgStatus: "pass" | "warning" | "fail" =
                      avg >= 1.5 ? "pass" : avg >= 0.8 ? "warning" : "fail";
                    const avgBadge = STATUS_BADGE[avgStatus];
                    return (
                      <tr key={row.label} className="border-b border-jm-border last:border-b-0">
                        <td className="p-2 md:p-3 font-bold text-jm-black">
                          {row.label}
                        </td>
                        {evalResults.map((r) => {
                          const status = r.rows[i];
                          const badge = STATUS_BADGE[status];
                          return (
                            <td key={r.domain} className="p-2 md:p-3 text-center">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${badge.bg} ${badge.text} font-black text-sm`}
                              >
                                {badge.icon}
                              </span>
                            </td>
                          );
                        })}
                        <td className="p-2 md:p-3 text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${avgBadge.bg} ${avgBadge.text} font-black text-sm`}
                          >
                            {avgBadge.icon}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[10px] text-jm-gray leading-5">
              ※ 강약점 평가는 각 사이트의 H1·CTA·메시지 키워드 빈도 기반 자동
              산정이며, 상세 개선안은 우측 진단 카드(또는 PDF)에서 확인하세요.
            </p>
          </div>
        )}

        {/* ===== ⑤ 경쟁사 상세 카드 ===== */}
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red mb-3">
            ⑤ COMPETITOR CARDS
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {competitors.map((comp) => (
              <div
                key={comp.rank}
                className="group rounded-2xl border-2 border-jm-border bg-white p-5 flex flex-col hover:border-jm-red transition-colors"
              >
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
                <h4 className="mt-3 font-black text-base leading-snug line-clamp-2">
                  {comp.metaTitle || comp.title}
                </h4>
                {comp.metaDescription && (
                  <p className="mt-2 text-xs text-jm-gray leading-6 line-clamp-3">
                    {comp.metaDescription}
                  </p>
                )}
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

        {/* ===== ⑥ 빈출 키워드 ===== */}
        {topKeywords.length > 0 && (
          <div className="rounded-2xl border-2 border-jm-red p-5 md:p-6 bg-gradient-to-br from-jm-red/[0.06] to-jm-red/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black tracking-wider text-jm-red">
                  ⑥ TOP KEYWORDS
                </p>
                <p className="mt-1 text-base md:text-lg font-black">
                  경쟁사 빈출 키워드 TOP {topKeywords.length}
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

        {/* ===== ⑦ 포지셔닝 제안 ===== */}
        {competitorAnalysis.ourPositioning && (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-jm-black via-jm-charcoal to-jm-black p-6 md:p-7 text-white">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-red text-white text-xs font-black">
                JM
              </span>
              <p className="text-xs font-black tracking-wider text-jm-red">
                ⑦ JINJJA MARKETING 포지셔닝 제안
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
