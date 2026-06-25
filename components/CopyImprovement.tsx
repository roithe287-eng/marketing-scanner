"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * Before / After 카피 개선 비교
 */
export default function CopyImprovement({ report }: Props) {
  const examples = report.exampleCopy || [];
  if (!examples.length) return null;

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">✍️</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            카피 개선 제안
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            Before / After 비교로 보는 개선안
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {examples.map((ex: any, idx: number) => (
          <div
            key={idx}
            className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all"
          >
            {/* 카피 타입 라벨 */}
            {ex.type && (
              <div className="mb-4">
                <span className="inline-block px-3 py-1.5 rounded-full text-sm font-bold bg-[#fee2e2] text-[#e31b23] uppercase tracking-wide">
                  📝 {ex.type}
                </span>
                {ex.location && (
                  <span className="ml-2 inline-block px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-[#6b7280]">
                    📍 {ex.location}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before */}
              <div className="rounded-xl border-2 border-[#e31b2333] bg-[#fef2f2] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#e31b23] flex items-center justify-center">
                    <span className="text-lg">❌</span>
                  </div>
                  <span className="text-base font-extrabold text-[#e31b23] uppercase tracking-wide">
                    Before · 현재
                  </span>
                </div>
                <p className="text-base text-[#111] leading-relaxed font-medium line-through decoration-[#e31b23]/40 decoration-2">
                  {ex.before || ex.current || "—"}
                </p>
                {ex.beforeIssue && (
                  <div className="mt-3 pt-3 border-t-2 border-[#e31b2322]">
                    <span className="text-sm font-bold text-[#e31b23] mr-1">문제:</span>
                    <span className="text-sm text-[#374151] font-medium">
                      {ex.beforeIssue}
                    </span>
                  </div>
                )}
              </div>

              {/* After */}
              <div className="rounded-xl border-2 border-[#10b98155] bg-[#f0fdf4] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10b981] flex items-center justify-center">
                    <span className="text-lg">✨</span>
                  </div>
                  <span className="text-base font-extrabold text-[#10b981] uppercase tracking-wide">
                    After · 개선안
                  </span>
                </div>
                <p className="text-base text-[#111] leading-relaxed font-bold">
                  {ex.after || ex.improved || "—"}
                </p>
                {ex.reason && (
                  <div className="mt-3 pt-3 border-t-2 border-[#10b98122]">
                    <span className="text-sm font-bold text-[#10b981] mr-1">이유:</span>
                    <span className="text-sm text-[#374151] font-medium">
                      {ex.reason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
