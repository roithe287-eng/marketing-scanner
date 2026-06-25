"use client";

import React from "react";

interface Roadmap {
  immediately: string[];
  thisWeek: string[];
  thisMonth: string[];
}

interface Props {
  roadmap: Roadmap;
}

/**
 * v31 가독성 강화 + 반응형
 * 우선순위 로드맵 (즉시/이번주/이번달)
 */
export default function PriorityMatrix({ roadmap }: Props) {
  if (!roadmap) return null;

  const phases = [
    {
      key: "immediately",
      label: "즉시 실행",
      sublabel: "오늘 바로",
      icon: "🔥",
      color: "#e31b23",
      bg: "#fee2e2",
      items: roadmap.immediately || [],
    },
    {
      key: "thisWeek",
      label: "이번 주",
      sublabel: "7일 내",
      icon: "⚡",
      color: "#f59e0b",
      bg: "#fef3c7",
      items: roadmap.thisWeek || [],
    },
    {
      key: "thisMonth",
      label: "이번 달",
      sublabel: "30일 내",
      icon: "🌱",
      color: "#10b981",
      bg: "#d1fae5",
      items: roadmap.thisMonth || [],
    },
  ];

  return (
    <section className="mt-8 mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl">🗺️</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            우선순위 로드맵
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            긴급도 기준 실행 일정
          </p>
        </div>
      </div>

      {/* 3단계 그리드: 모바일 1열 / 태블릿 이상 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {phases.map((phase, idx) => (
          <div
            key={phase.key}
            className="bg-white border-2 rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col"
            style={{ borderColor: `${phase.color}55` }}
          >
            {/* 카드 헤더 */}
            <div
              className="p-4 md:p-5 border-b-2"
              style={{ backgroundColor: phase.bg, borderColor: `${phase.color}33` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0"
                >
                  <span className="text-2xl md:text-3xl">{phase.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3
                      className="text-lg md:text-xl font-extrabold leading-tight"
                      style={{ color: phase.color }}
                    >
                      {phase.label}
                    </h3>
                    <span className="text-xs md:text-sm font-bold text-[#6b7280]">
                      {phase.sublabel}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-black"
                      style={{ backgroundColor: phase.color, color: "#fff" }}
                    >
                      STEP {idx + 1}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-[#374151]">
                      {phase.items.length}개 항목
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 항목 리스트 */}
            <div className="p-4 md:p-5 flex-1">
              {phase.items.length === 0 ? (
                <p className="text-sm md:text-base text-[#9ca3af] font-medium text-center py-4">
                  해당 항목이 없습니다
                </p>
              ) : (
                <ul className="space-y-2.5 md:space-y-3">
                  {phase.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 md:gap-2.5 text-sm md:text-base text-[#111] leading-relaxed"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: phase.bg, color: phase.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
