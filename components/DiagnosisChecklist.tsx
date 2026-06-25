"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 진단 체크리스트
 */
export default function DiagnosisChecklist({ report }: Props) {
  const checklist = report.checklist || [];
  if (!checklist.length) return null;

  const passed = checklist.filter((c: any) => c.status === "pass").length;
  const warned = checklist.filter((c: any) => c.status === "warn").length;
  const failed = checklist.filter((c: any) => c.status === "fail").length;
  const total = checklist.length;

  const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    pass: { color: "#10b981", bg: "#d1fae5", icon: "✅", label: "통과" },
    warn: { color: "#f59e0b", bg: "#fef3c7", icon: "⚠️", label: "주의" },
    fail: { color: "#e31b23", bg: "#fee2e2", icon: "❌", label: "실패" },
  };

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">📋</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            진단 체크리스트
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            {total}개 항목 점검 결과
          </p>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border-2 border-[#10b98133] rounded-2xl p-4 shadow-md text-center">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-3xl font-black text-[#10b981]">{passed}</div>
          <div className="text-sm font-bold text-[#111] mt-1">통과</div>
        </div>
        <div className="bg-white border-2 border-[#f59e0b33] rounded-2xl p-4 shadow-md text-center">
          <div className="text-3xl mb-1">⚠️</div>
          <div className="text-3xl font-black text-[#f59e0b]">{warned}</div>
          <div className="text-sm font-bold text-[#111] mt-1">주의</div>
        </div>
        <div className="bg-white border-2 border-[#e31b2333] rounded-2xl p-4 shadow-md text-center">
          <div className="text-3xl mb-1">❌</div>
          <div className="text-3xl font-black text-[#e31b23]">{failed}</div>
          <div className="text-sm font-bold text-[#111] mt-1">실패</div>
        </div>
      </div>

      {/* 체크리스트 항목 */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md overflow-hidden">
        {checklist.map((item: any, idx: number) => {
          const cfg = statusConfig[item.status] || statusConfig.warn;
          return (
            <div
              key={idx}
              className={`flex items-start gap-4 p-5 ${
                idx !== checklist.length - 1 ? "border-b-2 border-gray-100" : ""
              } hover:bg-gray-50 transition-colors`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: cfg.bg }}
              >
                <span className="text-2xl">{cfg.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h4 className="text-lg font-extrabold text-[#111]">
                    {item.title || item.name}
                  </h4>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                  {item.category && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-[#6b7280]">
                      {item.category}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-base text-[#374151] leading-relaxed font-medium">
                    {item.description}
                  </p>
                )}
                {item.recommendation && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 border-l-4 border-[#3b82f6]">
                    <span className="text-sm font-bold text-[#3b82f6] mr-2">
                      💡 권장 조치
                    </span>
                    <span className="text-sm text-[#111] font-medium">
                      {item.recommendation}
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
