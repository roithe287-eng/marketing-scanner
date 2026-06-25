"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

// v31-2: page.tsx에서 quickWins={report.quickWinsDetailed} 로 넘김.
// quickWinsDetailed는 optional이므로 undefined 안전 처리.
type QuickWin = NonNullable<MarketingReport["quickWinsDetailed"]>[number];

interface Props {
  quickWins: QuickWin[] | undefined;
}

/**
 * v31-2 가독성 강화 + 반응형 + 100% 타입 동기화
 * 단계별 플로우 Quick Wins
 */
export default function QuickWinsFlow({ quickWins }: Props) {
  if (!quickWins || !quickWins.length) return null;

  return (
    <section className="mt-8 mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl">⚡</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            퀵윈 액션 플랜
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            오늘 바로 적용 가능한 단계별 개선
          </p>
        </div>
      </div>

      {/* 퀵윈 카드 (모바일 1열 / 데스크 2열) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {quickWins.map((win, idx) => (
          <div
            key={idx}
            className="bg-white border-2 border-[#f59e0b55] rounded-2xl p-5 md:p-6 shadow-md hover:shadow-xl transition-all relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-gradient-to-b from-[#f59e0b] to-[#e31b23]" />

            <div className="flex items-start gap-3 mb-3 md:mb-4 pl-1.5 md:pl-2">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-[#fef3c7] to-[#fee2e2] flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-xl md:text-2xl font-black text-[#e31b23]">
                  {idx + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className="px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-[#fef3c7] text-[#f59e0b] uppercase tracking-wide">
                    ⚡ 퀵윈
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-[#111] leading-tight break-words">
                  {win.title}
                </h3>
              </div>
            </div>

            {win.steps && win.steps.length > 0 && (
              <div className="mb-3 md:mb-4 pl-1.5 md:pl-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🔧</span>
                  <span className="text-xs md:text-sm font-extrabold text-[#111] uppercase tracking-wide">
                    실행 단계
                  </span>
                </div>
                <ol className="space-y-2">
                  {win.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 md:gap-2.5 text-sm md:text-base text-[#111] leading-relaxed"
                    >
                      <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#e31b23] text-white flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="font-medium break-words">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(win.beforeExample || win.afterExample) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 pl-1.5 md:pl-2">
                {win.beforeExample && (
                  <div className="rounded-xl border-2 border-[#e31b2333] bg-[#fef2f2] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm md:text-base">❌</span>
                      <span className="text-[10px] md:text-xs font-extrabold text-[#e31b23] uppercase tracking-wide">
                        Before
                      </span>
                    </div>
                    <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words">
                      {win.beforeExample}
                    </p>
                  </div>
                )}
                {win.afterExample && (
                  <div className="rounded-xl border-2 border-[#10b98155] bg-[#f0fdf4] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm md:text-base">✨</span>
                      <span className="text-[10px] md:text-xs font-extrabold text-[#10b981] uppercase tracking-wide">
                        After
                      </span>
                    </div>
                    <p className="text-sm md:text-base text-[#111] leading-relaxed font-bold break-words">
                      {win.afterExample}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
