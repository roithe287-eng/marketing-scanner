"use client";

import React from "react";

interface ExampleCopy {
  heroHeadline: string;
  subHeadline: string;
  ctaText: string;
  currentHeroHeadline?: string;
  currentCtaText?: string;
  competitorCopyInsight?: string;
}

interface CompetitorAnalysis {
  searchKeyword: string;
  competitors: Array<{
    rank: number;
    title: string;
    keyMessage?: string;
  }>;
}

interface Props {
  exampleCopy: ExampleCopy;
  competitorAnalysis?: CompetitorAnalysis | null;
}

/**
 * v31 가독성 강화 + 반응형
 * 카피 개선 비교 (현재 vs 제안)
 */
export default function CopyImprovement({ exampleCopy, competitorAnalysis }: Props) {
  if (!exampleCopy) return null;

  const items = [
    {
      label: "메인 헤드라인",
      icon: "🎯",
      current: exampleCopy.currentHeroHeadline,
      proposed: exampleCopy.heroHeadline,
    },
    {
      label: "서브 헤드라인",
      icon: "📝",
      current: undefined,
      proposed: exampleCopy.subHeadline,
    },
    {
      label: "CTA 버튼 문구",
      icon: "🔘",
      current: exampleCopy.currentCtaText,
      proposed: exampleCopy.ctaText,
    },
  ];

  return (
    <section className="mt-8 mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl">✍️</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            카피 개선 제안
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            현재 카피 → 개선 카피 비교
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-5">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="bg-white border-2 border-gray-200 rounded-2xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all"
          >
            {/* 라벨 */}
            <div className="flex items-center gap-2 mb-3 md:mb-4 flex-wrap">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                <span className="text-lg md:text-xl">{it.icon}</span>
              </div>
              <span className="text-base md:text-lg font-extrabold text-[#111]">
                {it.label}
              </span>
            </div>

            {/* Before / After 비교 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Before - 현재 카피 (있을 때만) */}
              <div className="rounded-xl border-2 border-[#e31b2333] bg-[#fef2f2] p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#e31b23] flex items-center justify-center">
                    <span className="text-base md:text-lg">❌</span>
                  </div>
                  <span className="text-sm md:text-base font-extrabold text-[#e31b23] uppercase tracking-wide">
                    Before · 현재
                  </span>
                </div>
                {it.current ? (
                  <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words line-through decoration-[#e31b23]/40 decoration-2">
                    {it.current}
                  </p>
                ) : (
                  <p className="text-sm md:text-base text-[#9ca3af] font-medium italic">
                    현재 카피 정보 없음
                  </p>
                )}
              </div>

              {/* After - 개선안 */}
              <div className="rounded-xl border-2 border-[#10b98155] bg-[#f0fdf4] p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#10b981] flex items-center justify-center">
                    <span className="text-base md:text-lg">✨</span>
                  </div>
                  <span className="text-sm md:text-base font-extrabold text-[#10b981] uppercase tracking-wide">
                    After · 제안
                  </span>
                </div>
                <p className="text-sm md:text-base text-[#111] leading-relaxed font-bold break-words">
                  {it.proposed}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* 경쟁사 카피 인사이트 */}
        {exampleCopy.competitorCopyInsight && (
          <div className="bg-gradient-to-r from-[#dbeafe] to-[#ede9fe] border-2 border-[#3b82f655] rounded-2xl p-4 md:p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-xl md:text-2xl">🔭</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-base font-extrabold text-[#3b82f6] uppercase tracking-wide mb-1.5">
                  경쟁사 카피 인사이트
                </div>
                <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words">
                  {exampleCopy.competitorCopyInsight}
                </p>
                {competitorAnalysis?.searchKeyword && (
                  <div className="mt-2 text-xs md:text-sm text-[#6b7280] font-medium">
                    🔍 검색 키워드:{" "}
                    <span className="font-bold text-[#374151]">
                      {competitorAnalysis.searchKeyword}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
