"use client";

/**
 * v45-W2: 키워드 순위 트래킹 결과 카드
 * - 네이버 웹문서 검색 순위 조회 결과 표시
 * - AI 자동 추출한 3~5개 키워드 각각 표시
 * - 데이터 없으면 자동 숨김
 */

import type { KeywordRankTracking, KeywordRankItem } from "../lib/reportSchema";

type Props = {
  tracking?: KeywordRankTracking | null;
};

function statusColor(status: KeywordRankItem["status"]) {
  switch (status) {
    case "top":
      return {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        label: "1~5위",
        icon: "🏆",
      };
    case "mid":
      return {
        bg: "bg-sky-50 border-sky-200",
        text: "text-sky-700",
        badge: "bg-sky-100 text-sky-700 border-sky-200",
        label: "6~10위",
        icon: "✅",
      };
    case "low":
      return {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        label: "11~15위",
        icon: "⚠️",
      };
    case "none":
    default:
      return {
        bg: "bg-rose-50 border-rose-200",
        text: "text-rose-700",
        badge: "bg-rose-100 text-rose-700 border-rose-200",
        label: "미노출",
        icon: "❌",
      };
  }
}

function KeywordRow({ item }: { item: KeywordRankItem }) {
  const c = statusColor(item.status);

  return (
    <div
      className={`rounded-xl border-2 ${c.bg} p-3 md:p-4 flex items-center justify-between gap-3`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[14px] md:text-[15px]">{c.icon}</span>
          <p className="text-[15px] md:text-[16px] font-bold text-neutral-900 break-words leading-tight">
            "{item.keyword}"
          </p>
        </div>
        {item.competitorAtTop && item.status !== "top" && (
          <p className="text-[11px] md:text-[12px] text-neutral-500 break-words">
            1위: {item.competitorAtTop}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {item.naverWebRank !== null ? (
          <>
            <div className={`text-[22px] md:text-[26px] font-extrabold ${c.text} leading-none tabular-nums`}>
              {item.naverWebRank}위
            </div>
            <span
              className={`mt-1 inline-block text-[10px] md:text-[11px] font-semibold border rounded-full px-2 py-0.5 ${c.badge}`}
            >
              {c.label}
            </span>
          </>
        ) : (
          <>
            <div className={`text-[16px] md:text-[18px] font-extrabold ${c.text} leading-none whitespace-nowrap`}>
              미노출
            </div>
            <span
              className={`mt-1 inline-block text-[10px] md:text-[11px] font-semibold border rounded-full px-2 py-0.5 ${c.badge}`}
            >
              15위 밖
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function KeywordRankCard({ tracking }: Props) {
  if (!tracking) return null;

  const {
    totalKeywords,
    averageRank,
    visibleCount,
    topFiveCount,
    hiddenCount,
    summary,
    keywords,
    priorityActions,
  } = tracking;

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">🎯</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            네이버 검색 노출 현황
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          AI가 자동 감지한 {totalKeywords}개 핵심 키워드로 네이버 웹문서 검색
          순위를 실시간 조회했습니다. (상위 15위 내 노출 여부)
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 md:p-5">
          <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-emerald-700 opacity-80 mb-1">
            5위 내
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] md:text-[36px] font-extrabold text-emerald-700 leading-none tabular-nums">
              {topFiveCount}
            </span>
            <span className="text-[12px] md:text-[14px] text-emerald-700/70">
              / {totalKeywords}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 md:p-5">
          <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-sky-700 opacity-80 mb-1">
            15위 내
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] md:text-[36px] font-extrabold text-sky-700 leading-none tabular-nums">
              {visibleCount}
            </span>
            <span className="text-[12px] md:text-[14px] text-sky-700/70">
              / {totalKeywords}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 md:p-5">
          <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-rose-700 opacity-80 mb-1">
            미노출
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] md:text-[36px] font-extrabold text-rose-700 leading-none tabular-nums">
              {hiddenCount}
            </span>
            <span className="text-[12px] md:text-[14px] text-rose-700/70">
              / {totalKeywords}
            </span>
          </div>
        </div>
      </div>

      {/* AI 총평 + 평균 순위 */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5 mb-5 md:mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
              AI 총평
            </div>
            <p className="text-[14px] md:text-[15px] text-neutral-900 font-semibold leading-snug break-words">
              {summary}
            </p>
          </div>
          {averageRank !== null && (
            <div className="text-right shrink-0">
              <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                노출 평균
              </div>
              <div className="text-[24px] md:text-[30px] font-extrabold text-neutral-900 leading-none tabular-nums">
                {averageRank}위
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 키워드별 순위 리스트 */}
      <div className="space-y-2 md:space-y-3 mb-5 md:mb-6">
        {keywords.map((item, idx) => (
          <KeywordRow key={idx} item={item} />
        ))}
      </div>

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">💡</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              검색 노출 개선 액션
            </h4>
          </div>
          <ol className="space-y-2">
            {priorityActions.slice(0, 5).map((action, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-[14px] md:text-[15px] leading-relaxed"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-white text-neutral-900 font-bold flex items-center justify-center text-[13px] tabular-nums">
                  {idx + 1}
                </span>
                <span className="break-words">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-4 text-[11px] md:text-[12px] text-neutral-400 leading-relaxed">
        * 네이버 웹문서 검색 API 기준 · 실제 검색 결과는 개인화/시간에 따라 다를 수 있음.
      </p>
    </section>
  );
}
