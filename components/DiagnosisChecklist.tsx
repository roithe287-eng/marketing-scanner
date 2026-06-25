"use client";

import React from "react";
import type { ChecklistItem } from "@/lib/reportSchema";

// v31-2: page.tsx에서 checklist={report.checklist} 로 넘김.
interface Props {
  checklist: ChecklistItem[];
}

/**
 * v31-2 가독성 강화 + 반응형 + 100% 타입 동기화
 * 12가지 진단 체크리스트
 */
export default function DiagnosisChecklist({ checklist }: Props) {
  if (!checklist || !checklist.length) return null;

  const passed = checklist.filter((c) => c.status === "pass").length;
  const warned = checklist.filter((c) => c.status === "warning").length;
  const failed = checklist.filter((c) => c.status === "fail").length;
  const total = checklist.length;

  const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    pass: { color: "#10b981", bg: "#d1fae5", icon: "✅", label: "통과" },
    warning: { color: "#f59e0b", bg: "#fef3c7", icon: "⚠️", label: "주의" },
    fail: { color: "#e31b23", bg: "#fee2e2", icon: "❌", label: "실패" },
  };

  const categoryLabels: Record<string, string> = {
    seo: "SEO",
    content: "콘텐츠",
    trust: "신뢰",
    conversion: "전환",
  };

  return (
    <section className="mt-8 mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl">📋</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            진단 체크리스트
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            {total}개 항목 점검 결과
          </p>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5 md:mb-6">
        <div className="bg-white border-2 border-[#10b98133] rounded-2xl p-3 md:p-4 shadow-md text-center">
          <div className="text-2xl md:text-3xl mb-0.5 md:mb-1">✅</div>
          <div className="text-2xl md:text-3xl font-black text-[#10b981]">{passed}</div>
          <div className="text-xs md:text-sm font-bold text-[#111] mt-0.5 md:mt-1">통과</div>
        </div>
        <div className="bg-white border-2 border-[#f59e0b33] rounded-2xl p-3 md:p-4 shadow-md text-center">
          <div className="text-2xl md:text-3xl mb-0.5 md:mb-1">⚠️</div>
          <div className="text-2xl md:text-3xl font-black text-[#f59e0b]">{warned}</div>
          <div className="text-xs md:text-sm font-bold text-[#111] mt-0.5 md:mt-1">주의</div>
        </div>
        <div className="bg-white border-2 border-[#e31b2333] rounded-2xl p-3 md:p-4 shadow-md text-center">
          <div className="text-2xl md:text-3xl mb-0.5 md:mb-1">❌</div>
          <div className="text-2xl md:text-3xl font-black text-[#e31b23]">{failed}</div>
          <div className="text-xs md:text-sm font-bold text-[#111] mt-0.5 md:mt-1">실패</div>
        </div>
      </div>

      {/* 체크리스트 항목 */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md overflow-hidden">
        {checklist.map((item, idx) => {
          const cfg = statusConfig[item.status] || statusConfig.warning;
          return (
            <div
              key={item.id || idx}
              className={`flex items-start gap-3 md:gap-4 p-4 md:p-5 ${
                idx !== checklist.length - 1 ? "border-b-2 border-gray-100" : ""
              } hover:bg-gray-50 transition-colors`}
            >
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: cfg.bg }}
              >
                <span className="text-xl md:text-2xl">{cfg.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 flex-wrap">
                  <h4 className="text-base md:text-lg font-extrabold text-[#111] break-words">
                    {item.label}
                  </h4>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                  {item.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-gray-100 text-[#6b7280]">
                      {categoryLabels[item.category] || item.category}
                    </span>
                  )}
                </div>
                {item.currentValue && (
                  <div className="text-xs md:text-sm text-[#6b7280] font-medium mb-1.5 break-all">
                    <span className="font-bold mr-1">현재 값:</span>
                    {item.currentValue}
                  </div>
                )}
                {item.diagnosis && (
                  <p className="text-sm md:text-base text-[#374151] leading-relaxed font-medium break-words">
                    {item.diagnosis}
                  </p>
                )}
                {item.guide && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 border-l-4 border-[#3b82f6]">
                    <span className="text-xs md:text-sm font-bold text-[#3b82f6] mr-1.5">
                      💡 가이드
                    </span>
                    <span className="text-xs md:text-sm text-[#111] font-medium break-words">
                      {item.guide}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
