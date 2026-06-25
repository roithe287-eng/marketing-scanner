"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 우선순위 로드맵 매트릭스
 */
export default function PriorityMatrix({ report }: Props) {
  const roadmap = report.priorityRoadmap || [];
  if (!roadmap.length) return null;

  const priorityConfig: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
    high: { color: "#e31b23", bg: "#fee2e2", border: "#e31b23", icon: "🔥", label: "긴급" },
    medium: { color: "#f59e0b", bg: "#fef3c7", border: "#f59e0b", icon: "⚡", label: "중요" },
    low: { color: "#10b981", bg: "#d1fae5", border: "#10b981", icon: "🌱", label: "보강" },
  };

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">🗺️</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            우선순위 로드맵
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            긴급도와 영향력 기준 실행 순서
          </p>
        </div>
      </div>

      {/* 로드맵 카드 */}
      <div className="space-y-4">
        {roadmap.map((item: any, idx: number) => {
          const cfg = priorityConfig[item.priority] || priorityConfig.medium;
          return (
            <div
              key={idx}
              className="bg-white border-2 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all"
              style={{ borderColor: `${cfg.color}55` }}
            >
              <div className="flex items-start gap-4">
                {/* 순번 + 우선순위 아이콘 */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    <span className="text-3xl">{cfg.icon}</span>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-sm"
                    style={{ backgroundColor: cfg.color, color: "#fff" }}
                  >
                    {idx + 1}
                  </div>
                </div>

                {/* 본문 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    {item.timeframe && (
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-100 text-[#374151]">
                        ⏱️ {item.timeframe}
                      </span>
                    )}
                    {item.effort && (
                      <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-[#3b82f6]">
                        💪 {item.effort}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-[#111] mb-2 leading-tight">
                    {item.title || item.task}
                  </h3>
                  {item.description && (
                    <p className="text-base text-[#374151] leading-relaxed font-medium mb-3">
                      {item.description}
                    </p>
                  )}
                  {item.expectedImpact && (
                    <div
                      className="rounded-xl p-3 border-l-4"
                      style={{ backgroundColor: cfg.bg, borderColor: cfg.color }}
                    >
                      <span
                        className="text-sm font-bold uppercase tracking-wide mr-2"
                        style={{ color: cfg.color }}
                      >
                        📈 기대 효과
                      </span>
                      <span className="text-base text-[#111] font-medium">
                        {item.expectedImpact}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
