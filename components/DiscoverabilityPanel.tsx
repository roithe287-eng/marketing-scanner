"use client";

/**
 * v44: 비판매/정보성 사이트용 발견성·GEO 지표 패널
 * - 커머스 여부와 무관하게 항상 표시
 * - discoverability 필드가 없으면 자동 숨김 (구 리포트 호환)
 * - ScoreRadar 바로 아래 배치 (상단 강조)
 */

import type { Discoverability, DiscoverabilityItem } from "../lib/reportSchema";

type Props = {
  discoverability?: Discoverability | null;
};

function statusColor(status: DiscoverabilityItem["status"]) {
  switch (status) {
    case "pass":
      return {
        bar: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        icon: "✅",
      };
    case "warning":
      return {
        bar: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        icon: "⚠️",
      };
    case "fail":
    default:
      return {
        bar: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        icon: "❌",
      };
  }
}

function gradeColor(grade?: string) {
  switch (grade) {
    case "A":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "B":
      return "text-sky-600 bg-sky-50 border-sky-200";
    case "C":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "D":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "F":
    default:
      return "text-rose-600 bg-rose-50 border-rose-200";
  }
}

function siteTypeLabel(t?: string) {
  switch (t) {
    case "commerce":
      return "커머스 성향";
    case "content":
      return "정보/콘텐츠";
    case "brand":
      return "브랜드/기업";
    case "service":
      return "서비스형";
    case "mixed":
      return "복합형";
    default:
      return "자동 감지";
  }
}

function MetricCard({ item }: { item: DiscoverabilityItem }) {
  const c = statusColor(item.status);
  const pct = Math.max(0, Math.min(100, item.score));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5 hover:border-neutral-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
            <h4 className="text-[18px] md:text-[20px] font-bold text-neutral-900 leading-tight">
              {item.label}
            </h4>
          </div>
          <p className="text-[13px] md:text-[14px] text-neutral-500 break-words">
            현재: <span className="text-neutral-700">{item.currentValue}</span>
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <div className="text-[26px] md:text-[30px] font-extrabold text-neutral-900 leading-none tabular-nums">
            {item.score}
          </div>
          <span
            className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] md:text-[12px] font-semibold ${c.badge}`}
          >
            <span>{c.icon}</span>
            <span>
              {item.status === "pass"
                ? "양호"
                : item.status === "warning"
                ? "보통"
                : "취약"}
            </span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${c.bar} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Diagnosis */}
      <div className="space-y-2">
        <div className="text-[14px] md:text-[15px] text-neutral-800 leading-relaxed break-words">
          <span className="font-semibold text-neutral-900">진단:</span>{" "}
          {item.diagnosis}
        </div>
        <div className="text-[13px] md:text-[14px] text-neutral-600 leading-relaxed break-words">
          <span className="font-semibold text-neutral-700">개선:</span>{" "}
          {item.guide}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverabilityPanel({ discoverability }: Props) {
  // guard: 구 리포트/실패 시 자동 숨김
  if (!discoverability) return null;

  const {
    overallScore,
    grade,
    siteType,
    summary,
    seoFoundation,
    contentStructure,
    redundancy,
    geo,
    structuredData,
    eeat,
    localBrand,
    aiAnswerability,
    priorityActions,
  } = discoverability;

  const items: DiscoverabilityItem[] = [
    seoFoundation,
    contentStructure,
    redundancy,
    geo,
    structuredData,
    eeat,
    localBrand,
    aiAnswerability,
  ];

  const gColor = gradeColor(grade);

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">🔍</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            콘텐츠 발견성 & AI 답변 대응력
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          네이버·구글 검색 + ChatGPT·Claude·Gemini·Perplexity 등 생성형 AI가 이
          사이트를 얼마나 잘 발견·인용하는지 진단합니다.
        </p>
      </div>

      {/* Summary strip: 종합점수 / 사이트유형 / 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        {/* 종합점수 */}
        <div
          className={`rounded-2xl border p-4 md:p-5 ${gColor} flex items-center justify-between`}
        >
          <div>
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide opacity-80">
              종합 점수
            </div>
            <div className="text-[13px] md:text-[14px] mt-0.5 opacity-80">
              8개 지표 평균
            </div>
          </div>
          <div className="text-right">
            <div className="text-[34px] md:text-[40px] font-extrabold leading-none tabular-nums">
              {overallScore}
            </div>
            <div className="text-[12px] md:text-[13px] font-semibold mt-1">
              등급 {grade || "-"}
            </div>
          </div>
        </div>

        {/* 사이트 유형 */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              사이트 유형
            </div>
            <div className="text-[13px] md:text-[14px] mt-0.5 text-neutral-500">
              AI 자동 감지
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[18px] md:text-[20px] font-extrabold text-neutral-900 leading-tight whitespace-nowrap">
              {siteTypeLabel(siteType)}
            </div>
          </div>
        </div>

        {/* 요약 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
          <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            AI 총평
          </div>
          <p className="text-[14px] md:text-[15px] text-neutral-900 font-semibold leading-snug break-words">
            {summary}
          </p>
        </div>
      </div>

      {/* 8개 지표 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        {items.map((item) => (
          <MetricCard key={item.id} item={item} />
        ))}
      </div>

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">💡</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              우선 실행 액션
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
    </section>
  );
}
