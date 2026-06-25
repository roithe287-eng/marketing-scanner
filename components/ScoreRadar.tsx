"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 9개 영역 점수를 시각적으로 강조한 그리드 레이아웃
 */
export default function ScoreRadar({ report }: Props) {
  const items = [
    { key: "firstView", label: "첫인상", icon: "👁️", score: report.diagnosis?.firstView?.score ?? 0, color: "#e31b23" },
    { key: "cta", label: "CTA", icon: "🎯", score: report.diagnosis?.cta?.score ?? 0, color: "#f59e0b" },
    { key: "copywriting", label: "카피라이팅", icon: "✍️", score: report.diagnosis?.copywriting?.score ?? 0, color: "#8b5cf6" },
    { key: "trust", label: "신뢰 요소", icon: "🛡️", score: report.diagnosis?.trust?.score ?? 0, color: "#10b981" },
    { key: "conversionFlow", label: "전환 흐름", icon: "🔄", score: report.diagnosis?.conversionFlow?.score ?? 0, color: "#3b82f6" },
  ];

  const getGrade = (score: number) => {
    if (score >= 80) return { label: "우수", color: "#10b981", bg: "#d1fae5" };
    if (score >= 60) return { label: "양호", color: "#3b82f6", bg: "#dbeafe" };
    if (score >= 40) return { label: "보통", color: "#f59e0b", bg: "#fef3c7" };
    return { label: "취약", color: "#e31b23", bg: "#fee2e2" };
  };

  return (
    <section className="mb-10">
      {/* 섹션 헤더 - 강조 톤 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">📊</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            영역별 점수 분석
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            5개 핵심 영역의 마케팅 진단 점수
          </p>
        </div>
      </div>

      {/* 5개 영역 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map((item) => {
          const grade = getGrade(item.score);
          return (
            <div
              key={item.key}
              className="bg-white border-2 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all"
              style={{ borderColor: `${item.color}33` }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <div className="text-base font-bold text-[#111] mb-2">
                  {item.label}
                </div>
                <div
                  className="text-4xl font-black mb-2"
                  style={{ color: item.color }}
                >
                  {item.score}
                </div>
                <div className="text-xs text-[#9ca3af] font-medium mb-2">/ 100점</div>
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{ color: grade.color, backgroundColor: grade.bg }}
                >
                  {grade.label}
                </div>
              </div>
              {/* 점수 바 */}
              <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.score}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
