"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 즉시 실행 가능한 퀵윈 액션
 */
export default function QuickWinsFlow({ report }: Props) {
  const wins = report.quickWinsDetailed || [];
  if (!wins.length) return null;

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">⚡</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            퀵윈 액션 플랜
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            바로 적용 가능한 즉시 개선 항목
          </p>
        </div>
      </div>

      {/* 퀵윈 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {wins.map((win: any, idx: number) => (
          <div
            key={idx}
            className="bg-white border-2 border-[#f59e0b55] rounded-2xl p-6 shadow-md hover:shadow-xl transition-all relative overflow-hidden"
          >
            {/* 좌측 그라데이션 바 */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#f59e0b] to-[#e31b23]" />

            {/* 헤더 */}
            <div className="flex items-start gap-3 mb-4 pl-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fef3c7] to-[#fee2e2] flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-2xl font-black text-[#e31b23]">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef3c7] text-[#f59e0b] uppercase tracking-wide">
                    ⚡ 퀵윈
                  </span>
                  {win.timeRequired && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#3b82f6]">
                      ⏱️ {win.timeRequired}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-[#111] leading-tight">
                  {win.title || win.action}
                </h3>
              </div>
            </div>

            {/* 상세 설명 */}
            {win.description && (
              <p className="text-base text-[#374151] leading-relaxed font-medium mb-3 pl-2">
                {win.description}
              </p>
            )}

            {/* 실행 단계 */}
            {win.steps && Array.isArray(win.steps) && win.steps.length > 0 && (
              <div className="mb-3 pl-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🔧</span>
                  <span className="text-sm font-bold text-[#111] uppercase tracking-wide">
                    실행 단계
                  </span>
                </div>
                <ol className="space-y-2">
                  {win.steps.map((step: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-base text-[#111] leading-relaxed"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#e31b23] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 기대 효과 */}
            {win.expectedResult && (
              <div className="rounded-xl bg-gradient-to-r from-[#d1fae5] to-[#dbeafe] p-3 border-l-4 border-[#10b981] ml-2">
                <span className="text-sm font-bold text-[#10b981] uppercase tracking-wide mr-2">
                  📈 기대 효과
                </span>
                <span className="text-base text-[#111] font-medium">
                  {win.expectedResult}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
