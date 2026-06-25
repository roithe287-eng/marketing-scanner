"use client";

import React from "react";

interface Diagnosis {
  firstView: number;
  cta: number;
  copywriting: number;
  trust: number;
  conversionFlow: number;
  adLanding: number;
  mobileUx: number;
  seo: number;
}

interface Props {
  diagnosis: Diagnosis;
}

/**
 * v31 가독성 강화 + 반응형
 * 8개 영역 점수 그리드 (mobile: 2col / tablet: 4col / desktop: 4col)
 */
export default function ScoreRadar({ diagnosis }: Props) {
  const items = [
    { key: "firstView", label: "첫인상", icon: "👁️", score: diagnosis.firstView, color: "#e31b23" },
    { key: "cta", label: "CTA", icon: "🎯", score: diagnosis.cta, color: "#f59e0b" },
    { key: "copywriting", label: "카피라이팅", icon: "✍️", score: diagnosis.copywriting, color: "#8b5cf6" },
    { key: "trust", label: "신뢰 요소", icon: "🛡️", score: diagnosis.trust, color: "#10b981" },
    { key: "conversionFlow", label: "전환 흐름", icon: "🔄", score: diagnosis.conversionFlow, color: "#3b82f6" },
    { key: "adLanding", label: "광고 랜딩", icon: "📢", score: diagnosis.adLanding, color: "#ec4899" },
    { key: "mobileUx", label: "모바일 UX", icon: "📱", score: diagnosis.mobileUx, color: "#06b6d4" },
    { key: "seo", label: "SEO", icon: "🔍", score: diagnosis.seo, color: "#84cc16" },
  ];

  const getGrade = (score: number) => {
    if (score >= 80) return { label: "우수", color: "#10b981", bg: "#d1fae5" };
    if (score >= 60) return { label: "양호", color: "#3b82f6", bg: "#dbeafe" };
    if (score >= 40) return { label: "보통", color: "#f59e0b", bg: "#fef3c7" };
    return { label: "취약", color: "#e31b23", bg: "#fee2e2" };
  };

  return (
    <section className="mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl">📊</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            영역별 점수 분석
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            8개 핵심 영역 마케팅 진단
          </p>
        </div>
      </div>

      {/* 점수 카드 그리드: 모바일 2열 → 태블릿/데스크 4열 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        {items.map((item) => {
          const grade = getGrade(item.score);
          return (
            <div
              key={item.key}
              className="bg-white border-2 rounded-2xl p-4 md:p-5 shadow-md hover:shadow-xl transition-all"
              style={{ borderColor: `${item.color}33` }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-2 md:mb-3 shadow-sm"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <span className="text-2xl md:text-3xl">{item.icon}</span>
                </div>
                <div className="text-sm md:text-base font-bold text-[#111] mb-1.5 md:mb-2 leading-tight">
                  {item.label}
                </div>
                <div
                  className="text-3xl md:text-4xl font-black leading-none mb-1.5 md:mb-2"
                  style={{ color: item.color }}
                >
                  {item.score}
                </div>
                <div className="text-[10px] md:text-xs text-[#9ca3af] font-medium mb-2">/ 100점</div>
                <div
                  className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-bold"
                  style={{ color: grade.color, backgroundColor: grade.bg }}
                >
                  {grade.label}
                </div>
              </div>
              {/* 점수 바 */}
              <div className="mt-3 md:mt-4 h-1.5 md:h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.score}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
