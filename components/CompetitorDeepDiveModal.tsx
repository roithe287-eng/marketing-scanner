"use client";

/**
 * v45-W2: 경쟁사 딥다이브 모달
 * - CompetitorComparison 카드의 [딥다이브] 버튼 클릭 시 오픈
 * - /api/deepdive 호출 후 상세 결과 표시
 * - ESC 키 · 배경 클릭으로 닫기
 * - 반응형 (모바일: 풀스크린, 데스크탑: 중앙 모달)
 */

import { useEffect, useState } from "react";
import type { CompetitorDeepDive } from "../lib/reportSchema";

type Props = {
  open: boolean;
  onClose: () => void;
  targetUrl: string;
  targetDomain: string;
  ourDomain?: string;
  ourTitle?: string;
};

export default function CompetitorDeepDiveModal({
  open,
  onClose,
  targetUrl,
  targetDomain,
  ourDomain,
  ourTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompetitorDeepDive | null>(null);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 모달 열리면 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // 딥다이브 API 호출
  useEffect(() => {
    if (!open || !targetUrl) return;
    setLoading(true);
    setError(null);
    setData(null);

    fetch("/api/deepdive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl, ourDomain, ourTitle }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e?.message || "딥다이브 분석 실패"))
      .finally(() => setLoading(false));
  }, [open, targetUrl, ourDomain, ourTitle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full md:w-[min(920px,92vw)] max-h-[92vh] md:max-h-[88vh] bg-white rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-neutral-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[18px] md:text-[20px]">🔍</span>
              <h3 className="text-[18px] md:text-[22px] font-extrabold text-neutral-900 leading-tight break-words">
                경쟁사 딥다이브
              </h3>
            </div>
            <p className="text-[12px] md:text-[13px] text-neutral-500 break-all">
              {targetDomain}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 text-[16px] md:text-[18px] font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 md:py-20">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-neutral-200 border-t-neutral-900 animate-spin mb-4" />
              <p className="text-[14px] md:text-[15px] text-neutral-700 font-semibold">
                경쟁사 심층 분석 중...
              </p>
              <p className="text-[12px] md:text-[13px] text-neutral-500 mt-1">
                5~15초 소요 예정
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="text-[20px]">❌</span>
                <div className="min-w-0">
                  <h4 className="text-[15px] md:text-[16px] font-bold text-rose-800 mb-1">
                    딥다이브 실패
                  </h4>
                  <p className="text-[13px] md:text-[14px] text-rose-700 break-words">
                    {error}
                  </p>
                  <p className="text-[12px] md:text-[13px] text-rose-600/80 mt-2 leading-relaxed">
                    경쟁사 사이트가 접근을 차단했거나, 응답 시간이 초과되었을 수
                    있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data */}
          {data && !loading && (
            <div className="space-y-5 md:space-y-6">
              {/* 총평 */}
              {data.summary && (
                <div className="rounded-2xl border-2 border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[16px]">💬</span>
                    <h4 className="text-[14px] md:text-[15px] font-bold uppercase tracking-wide">
                      종합 총평
                    </h4>
                  </div>
                  <p className="text-[15px] md:text-[17px] font-semibold leading-relaxed break-words">
                    {data.summary}
                  </p>
                </div>
              )}

              {/* Section 1: 카피 전략 */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <span className="text-[18px]">✍️</span>
                  <h4 className="text-[16px] md:text-[18px] font-extrabold text-neutral-900">
                    카피 전략
                  </h4>
                </div>

                {data.copyStrategy.keyMessages.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[12px] md:text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                      핵심 메시지
                    </div>
                    <ul className="space-y-1">
                      {data.copyStrategy.keyMessages.map((m, i) => (
                        <li
                          key={i}
                          className="text-[14px] md:text-[15px] text-neutral-900 flex items-start gap-2 leading-snug"
                        >
                          <span className="text-neutral-400 shrink-0">•</span>
                          <span className="break-words">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.copyStrategy.repeatedPhrases.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[12px] md:text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                      반복 표현
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.copyStrategy.repeatedPhrases.map((p, i) => (
                        <span
                          key={i}
                          className="inline-block px-2.5 py-1 rounded-full bg-neutral-100 text-[12px] md:text-[13px] font-semibold text-neutral-700"
                        >
                          "{p}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.copyStrategy.toneStyle && (
                  <div className="mb-3">
                    <div className="text-[12px] md:text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                      톤 스타일
                    </div>
                    <p className="text-[14px] md:text-[15px] text-neutral-800 break-words">
                      {data.copyStrategy.toneStyle}
                    </p>
                  </div>
                )}

                {data.copyStrategy.weakness && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 md:p-4">
                    <div className="text-[11px] md:text-[12px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      ⚠️ 카피 약점
                    </div>
                    <p className="text-[13px] md:text-[14px] text-amber-800 leading-snug break-words">
                      {data.copyStrategy.weakness}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: CTA 스타일 */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
                <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[18px]">🎯</span>
                    <h4 className="text-[16px] md:text-[18px] font-extrabold text-neutral-900">
                      CTA 스타일
                    </h4>
                  </div>
                  <span className="shrink-0 text-[12px] md:text-[13px] font-bold text-neutral-500 bg-neutral-100 rounded-full px-2.5 py-0.5">
                    총 {data.ctaStyle.ctaCount}개
                  </span>
                </div>

                {data.ctaStyle.ctaTexts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[12px] md:text-[13px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                      CTA 문구
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.ctaStyle.ctaTexts.slice(0, 12).map((t, i) => (
                        <span
                          key={i}
                          className="inline-block px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-[12px] md:text-[13px] font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.ctaStyle.analysis && (
                  <p className="text-[14px] md:text-[15px] text-neutral-800 leading-relaxed break-words">
                    {data.ctaStyle.analysis}
                  </p>
                )}
              </div>

              {/* Section 3: 성능·SEO */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <span className="text-[18px]">⚡</span>
                  <h4 className="text-[16px] md:text-[18px] font-extrabold text-neutral-900">
                    성능·SEO
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                    <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase mb-1">
                      JSON-LD
                    </div>
                    <div
                      className={`text-[14px] md:text-[16px] font-bold ${
                        data.performance.hasJsonLd
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {data.performance.hasJsonLd ? "있음" : "없음"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                    <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase mb-1">
                      H1
                    </div>
                    <div className="text-[14px] md:text-[16px] font-bold text-neutral-900 tabular-nums">
                      {data.performance.h1Count ?? "-"}개
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                    <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase mb-1">
                      이미지
                    </div>
                    <div className="text-[14px] md:text-[16px] font-bold text-neutral-900 tabular-nums">
                      {data.performance.imageCount ?? "-"}개
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                    <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase mb-1">
                      스키마 타입
                    </div>
                    <div className="text-[12px] md:text-[13px] font-semibold text-neutral-700 truncate">
                      {data.performance.schemaTypes &&
                      data.performance.schemaTypes.length > 0
                        ? data.performance.schemaTypes.slice(0, 2).join(", ")
                        : "(없음)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: 신뢰 요소 */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <span className="text-[18px]">🛡️</span>
                  <h4 className="text-[16px] md:text-[18px] font-extrabold text-neutral-900">
                    신뢰 요소
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3">
                  <TrustBadge
                    label="리뷰/후기"
                    present={data.trustElements.hasReview}
                  />
                  <TrustBadge
                    label="연락처"
                    present={data.trustElements.hasContact}
                  />
                  <TrustBadge
                    label="수상/인증"
                    present={!!data.trustElements.hasAward}
                  />
                </div>
                {data.trustElements.trustSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.trustElements.trustSignals.map((s, i) => (
                      <span
                        key={i}
                        className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] md:text-[12px] font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: 우리가 이길 포인트 */}
              {data.winPoints && data.winPoints.length > 0 && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[18px]">🥊</span>
                    <h4 className="text-[16px] md:text-[18px] font-extrabold text-red-800">
                      우리가 이길 수 있는 포인트
                    </h4>
                  </div>
                  <ol className="space-y-2">
                    {data.winPoints.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-[14px] md:text-[15px] text-red-900 leading-relaxed"
                      >
                        <span className="shrink-0 w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[12px] tabular-nums">
                          {i + 1}
                        </span>
                        <span className="break-words">{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 p-4 md:p-5 flex items-center justify-between gap-3 bg-neutral-50">
          <p className="text-[11px] md:text-[12px] text-neutral-500 truncate">
            {data?.fetchedAt
              ? `분석 시각: ${new Date(data.fetchedAt).toLocaleString("ko-KR")}`
              : ""}
          </p>
          <button
            onClick={onClose}
            className="shrink-0 bg-neutral-900 text-white font-bold text-[13px] md:text-[14px] px-4 md:px-5 py-2 md:py-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div
      className={`rounded-xl border p-2 md:p-3 text-center ${
        present
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-neutral-50 border-neutral-200 text-neutral-400"
      }`}
    >
      <div className="text-[14px] md:text-[16px] font-bold mb-0.5">
        {present ? "✅" : "—"}
      </div>
      <div className="text-[11px] md:text-[12px] font-semibold">{label}</div>
    </div>
  );
}
