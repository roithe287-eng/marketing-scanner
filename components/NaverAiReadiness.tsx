"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

// v31-2: page.tsx에서 readiness={report.naverAiReadiness} 로 넘김.
// naverAiReadiness는 .nullable().optional()이므로 null/undefined 안전 처리.
interface Props {
  readiness: MarketingReport["naverAiReadiness"];
}

/**
 * v31-2 가독성 강화 + 반응형 + 100% 타입 동기화
 * 네이버 AI 광고 준비도 점검
 */
export default function NaverAiReadiness({ readiness }: Props) {
  if (!readiness) return null;

  const score = readiness.overallScore ?? 0;
  const checks = readiness.checks || [];

  const getGrade = (s: number) => {
    if (s >= 80) return { label: "준비 완료", color: "#10b981", bg: "#d1fae5" };
    if (s >= 60) return { label: "부분 충족", color: "#3b82f6", bg: "#dbeafe" };
    if (s >= 40) return { label: "보완 필요", color: "#f59e0b", bg: "#fef3c7" };
    return { label: "미흡", color: "#e31b23", bg: "#fee2e2" };
  };
  const grade = getGrade(score);

  const statusIcons: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    pass: { icon: "✅", color: "#10b981", bg: "#d1fae5", label: "충족" },
    warning: { icon: "⚠️", color: "#f59e0b", bg: "#fef3c7", label: "주의" },
    fail: { icon: "❌", color: "#e31b23", bg: "#fee2e2", label: "미충족" },
  };

  const categoryLabels: Record<string, string> = {
    schema: "구조화 데이터",
    site_name: "사이트명",
    tracking: "전환 추적",
    content: "콘텐츠",
    mobile: "모바일",
  };

  return (
    <section className="mt-8 mb-8 md:mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#03c75a] flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl font-black text-white">N</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-[#111] tracking-tight">
            네이버 AI 광고 적합도
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] mt-0.5 md:mt-1 font-medium">
            2026.7 정식 오픈 대비 점검
          </p>
        </div>
      </div>

      {/* 점수 요약 카드 */}
      <div className="bg-gradient-to-br from-white to-[#f0fdf4] border-2 border-[#03c75a55] rounded-2xl p-4 md:p-6 shadow-md mb-4 md:mb-5">
        <div className="flex items-start gap-4 flex-col sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-2 border-[#03c75a] flex items-center justify-center shadow-md flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-black text-[#03c75a] leading-none">
                  {score}
                </div>
                <div className="text-[10px] md:text-xs text-[#6b7280] font-bold mt-0.5">
                  / 100
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-extrabold text-[#111] mb-1">
                AI 광고 준비 점수
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-bold"
                  style={{ color: grade.color, backgroundColor: grade.bg }}
                >
                  {grade.label}
                </span>
                {readiness.grade && (
                  <span className="inline-block px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-bold bg-[#03c75a] text-white">
                    Grade {readiness.grade}
                  </span>
                )}
              </div>
            </div>
          </div>
          {readiness.summary && (
            <div className="flex-1 text-sm md:text-base text-[#374151] font-medium leading-relaxed break-words">
              💡 {readiness.summary}
            </div>
          )}
        </div>
      </div>

      {/* 점검 항목 리스트 */}
      {checks.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md overflow-hidden">
          {checks.map((c, idx) => {
            const cfg = statusIcons[c.status] || statusIcons.warning;
            return (
              <div
                key={c.id || idx}
                className={`flex items-start gap-3 md:gap-4 p-4 md:p-5 ${
                  idx !== checks.length - 1 ? "border-b-2 border-gray-100" : ""
                } hover:bg-gray-50 transition-colors`}
              >
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <span className="text-xl md:text-2xl">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <h4 className="text-base md:text-lg font-extrabold text-[#111] break-words">
                      {c.label}
                    </h4>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-gray-100 text-[#6b7280]">
                      {categoryLabels[c.category] || c.category}
                    </span>
                  </div>
                  {c.currentValue && (
                    <div className="text-xs md:text-sm text-[#6b7280] font-medium mb-1.5 break-all">
                      <span className="font-bold mr-1">현재 값:</span>
                      {c.currentValue}
                    </div>
                  )}
                  {c.diagnosis && (
                    <p className="text-sm md:text-base text-[#374151] leading-relaxed font-medium break-words">
                      {c.diagnosis}
                    </p>
                  )}
                  {c.guide && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-[#f0fdf4] border-l-4 border-[#03c75a]">
                      <span className="text-xs md:text-sm font-bold text-[#03c75a] mr-1.5">
                        🔧 가이드
                      </span>
                      <span className="text-xs md:text-sm text-[#111] font-medium break-words">
                        {c.guide}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 추가 메모 */}
      {readiness.notes && readiness.notes.length > 0 && (
        <div className="mt-4 bg-[#fef3c7] border-2 border-[#f59e0b55] rounded-2xl p-4 md:p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg md:text-xl">⚠️</span>
            <span className="text-sm md:text-base font-extrabold text-[#f59e0b] uppercase tracking-wide">
              유의 사항
            </span>
          </div>
          <ul className="space-y-1.5">
            {readiness.notes.map((note: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm md:text-base text-[#111] leading-relaxed"
              >
                <span className="text-[#f59e0b] font-bold mt-0.5">▸</span>
                <span className="font-medium break-words">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
