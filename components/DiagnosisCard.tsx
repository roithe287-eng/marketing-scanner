"use client";

import React from "react";

interface Issue {
  title: string;
  problem: string;
  reason: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
  badExample?: string;
  goodExample?: string;
  exampleNote?: string;
}

interface Props {
  issue: Issue;
  index: number;
}

/**
 * v31 가독성 강화 + 반응형
 * Critical Issue 개별 카드
 */
export default function DiagnosisCard({ issue, index }: Props) {
  const priorityConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    high: { color: "#e31b23", bg: "#fee2e2", icon: "🔥", label: "긴급" },
    medium: { color: "#f59e0b", bg: "#fef3c7", icon: "⚡", label: "중요" },
    low: { color: "#10b981", bg: "#d1fae5", icon: "🌱", label: "보강" },
  };
  const cfg = priorityConfig[issue.priority] || priorityConfig.medium;

  return (
    <div
      className="bg-white border-2 rounded-2xl p-5 md:p-6 shadow-md hover:shadow-xl transition-all"
      style={{ borderColor: `${cfg.color}55` }}
    >
      {/* 헤더: 번호 + 아이콘 + 우선순위 */}
      <div className="flex items-start gap-3 md:gap-4 mb-4 pb-4 border-b-2 border-gray-100">
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: cfg.bg }}
          >
            <span className="text-xl md:text-2xl">{cfg.icon}</span>
          </div>
          <div
            className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black shadow-sm"
            style={{ backgroundColor: cfg.color, color: "#fff" }}
          >
            {index + 1}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wide"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}
            >
              {cfg.label}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-extrabold text-[#111] leading-tight break-words">
            {issue.title}
          </h3>
        </div>
      </div>

      {/* 문제 */}
      <div className="mb-3 md:mb-4 rounded-xl bg-[#fef2f2] border-l-4 border-[#e31b23] p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base md:text-lg">❌</span>
          <span className="text-xs md:text-sm font-extrabold text-[#e31b23] uppercase tracking-wide">
            문제점
          </span>
        </div>
        <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words">
          {issue.problem}
        </p>
      </div>

      {/* 원인 */}
      <div className="mb-3 md:mb-4 rounded-xl bg-[#fef3c7] border-l-4 border-[#f59e0b] p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base md:text-lg">🔎</span>
          <span className="text-xs md:text-sm font-extrabold text-[#f59e0b] uppercase tracking-wide">
            원인 분석
          </span>
        </div>
        <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words">
          {issue.reason}
        </p>
      </div>

      {/* 권장 조치 */}
      <div className="rounded-xl bg-[#dbeafe] border-l-4 border-[#3b82f6] p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base md:text-lg">💡</span>
          <span className="text-xs md:text-sm font-extrabold text-[#3b82f6] uppercase tracking-wide">
            권장 조치
          </span>
        </div>
        <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words">
          {issue.recommendation}
        </p>
      </div>

      {/* Before / After 예시 */}
      {(issue.badExample || issue.goodExample) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {issue.badExample && (
            <div className="rounded-xl border-2 border-[#e31b2333] bg-[#fef2f2] p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">❌</span>
                <span className="text-xs md:text-sm font-extrabold text-[#e31b23] uppercase tracking-wide">
                  현재 (안된 예시)
                </span>
              </div>
              <p className="text-sm md:text-base text-[#111] leading-relaxed font-medium break-words line-through decoration-[#e31b23]/40">
                {issue.badExample}
              </p>
            </div>
          )}
          {issue.goodExample && (
            <div className="rounded-xl border-2 border-[#10b98155] bg-[#f0fdf4] p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">✨</span>
                <span className="text-xs md:text-sm font-extrabold text-[#10b981] uppercase tracking-wide">
                  개선안 (잘된 예시)
                </span>
              </div>
              <p className="text-sm md:text-base text-[#111] leading-relaxed font-bold break-words">
                {issue.goodExample}
              </p>
            </div>
          )}
        </div>
      )}

      {issue.exampleNote && (
        <p className="mt-3 text-xs md:text-sm text-[#6b7280] font-medium leading-relaxed break-words">
          💬 {issue.exampleNote}
        </p>
      )}
    </div>
  );
}
