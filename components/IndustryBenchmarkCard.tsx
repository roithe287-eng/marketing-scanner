"use client";

/**
 * v45-W3: 업종별 벤치마크 리더보드 카드
 * - 자동 감지된 업종에 대한 익명 집계 비교
 * - 표본 10개 미만이면 안내 메시지 표시
 * - 지표별 3열 비교 (업계 평균 · 상위 10% · 우리)
 * - 데이터 없으면 자동 숨김
 */

import type {
  IndustryBenchmark,
  IndustryMetric,
} from "../lib/reportSchema";

type Props = {
  benchmark?: IndustryBenchmark | null;
};

function statusColor(status: IndustryMetric["status"]) {
  switch (status) {
    case "above_top":
      return {
        row: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: "🏆",
        label: "상위권",
      };
    case "above_avg":
      return {
        row: "bg-sky-50 border-sky-200",
        text: "text-sky-700",
        badge: "bg-sky-100 text-sky-700 border-sky-200",
        icon: "✅",
        label: "평균 이상",
      };
    case "below_avg":
      return {
        row: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        icon: "⚠️",
        label: "평균 미달",
      };
    case "critical":
    default:
      return {
        row: "bg-rose-50 border-rose-200",
        text: "text-rose-700",
        badge: "bg-rose-100 text-rose-700 border-rose-200",
        icon: "❌",
        label: "심각 격차",
      };
  }
}

function MetricRow({ metric }: { metric: IndustryMetric }) {
  const c = statusColor(metric.status);
  const gapSign = metric.gapVsAverage >= 0 ? "+" : "";

  return (
    <div className={`rounded-xl border-2 ${c.row} p-3 md:p-4`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-2 md:mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[14px] md:text-[15px]">{c.icon}</span>
          <h4 className="text-[15px] md:text-[16px] font-bold text-neutral-900 break-words leading-tight">
            {metric.label}
          </h4>
        </div>
        <span
          className={`shrink-0 inline-block text-[10px] md:text-[11px] font-semibold border rounded-full px-2 py-0.5 ${c.badge}`}
        >
          {c.label}
        </span>
      </div>

      {/* Score comparison */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <div className="text-center">
          <div className="text-[10px] md:text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            업계 평균
          </div>
          <div className="text-[18px] md:text-[22px] font-extrabold text-neutral-700 tabular-nums leading-none">
            {metric.average}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] md:text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            상위 10%
          </div>
          <div className="text-[18px] md:text-[22px] font-extrabold text-neutral-700 tabular-nums leading-none">
            {metric.topTen}
          </div>
        </div>
        <div className="text-center">
          <div className={`text-[10px] md:text-[11px] font-semibold uppercase tracking-wide mb-1 ${c.text}`}>
            우리
          </div>
          <div className={`text-[20px] md:text-[26px] font-extrabold ${c.text} tabular-nums leading-none`}>
            {metric.ours}
          </div>
          <div className={`text-[10px] md:text-[11px] font-semibold ${c.text} mt-1 tabular-nums`}>
            평균 {gapSign}{metric.gapVsAverage}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndustryBenchmarkCard({ benchmark }: Props) {
  if (!benchmark) return null;

  const {
    categoryLabel,
    sampleSize,
    hasSufficientSample,
    summary,
    metrics,
    strongestArea,
    weakestArea,
    priorityActions,
  } = benchmark;

  // 표본 부족 시 안내 카드
  if (!hasSufficientSample) {
    return (
      <section className="jm-card p-5 md:p-7 lg:p-8">
        <div className="mb-3 md:mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[20px] md:text-[22px]">🏆</span>
            <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
              업종별 벤치마크
            </h3>
          </div>
          <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
            같은 업종 사이트들과 익명으로 비교합니다. (URL·회사명 저장 X)
          </p>
        </div>

        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="text-[20px] md:text-[22px]">📊</span>
            <div className="min-w-0">
              <h4 className="text-[15px] md:text-[16px] font-bold text-amber-900 mb-1">
                {categoryLabel} 업종 데이터 축적 중
              </h4>
              <p className="text-[13px] md:text-[14px] text-amber-800 leading-relaxed break-words">
                {summary}
              </p>
              <p className="text-[12px] md:text-[13px] text-amber-700/80 mt-2 leading-relaxed">
                * 진짜마케팅 스캐너 사용자가 늘어날수록 정확한 벤치마크가
                제공됩니다. 지금 이 진단도 익명 통계에 반영되었습니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">🏆</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            업종별 벤치마크
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          <span className="font-bold text-neutral-900">{categoryLabel}</span> 업종
          사이트 <span className="font-bold text-neutral-900">{sampleSize}개</span>와
          익명 비교. 우리 사이트는 업계에서 어디쯤 있을까요?
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5">
          <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            업종 감지
          </div>
          <div className="text-[18px] md:text-[22px] font-extrabold text-neutral-900 leading-tight break-words">
            {categoryLabel}
          </div>
          <div className="text-[11px] md:text-[12px] text-neutral-500 mt-1">
            표본 N={sampleSize} · AI 자동 분류
          </div>
        </div>
        {strongestArea && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:p-5">
            <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
              강점 영역
            </div>
            <div className="text-[14px] md:text-[15px] font-bold text-emerald-800 leading-tight break-words">
              {strongestArea}
            </div>
          </div>
        )}
        {weakestArea && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 md:p-5">
            <div className="text-[11px] md:text-[13px] font-semibold uppercase tracking-wide text-rose-700 mb-1">
              최약 영역
            </div>
            <div className="text-[14px] md:text-[15px] font-bold text-rose-800 leading-tight break-words">
              {weakestArea}
            </div>
          </div>
        )}
      </div>

      {/* AI 총평 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5 mb-5 md:mb-6">
        <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
          AI 총평
        </div>
        <p className="text-[14px] md:text-[15px] text-neutral-900 font-semibold leading-snug break-words">
          {summary}
        </p>
      </div>

      {/* 지표별 비교 리스트 */}
      {metrics && metrics.length > 0 && (
        <div className="space-y-2 md:space-y-3 mb-5 md:mb-6">
          {metrics.map((m) => (
            <MetricRow key={m.key} metric={m} />
          ))}
        </div>
      )}

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">💡</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              벤치마크 기반 우선 액션
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
        * 익명 집계 데이터 기준 · URL·회사명 저장 안 함 · 개인정보 보호 완벽 준수.
      </p>
    </section>
  );
}
