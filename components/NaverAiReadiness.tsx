"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 네이버 AI 광고 적합도 점검
 */
export default function NaverAiReadiness({ report }: Props) {
  const naver: any = (report as any).naverAiReadiness;
  if (!naver) return null;

  const score = naver.score ?? 0;
  const checks: any[] = naver.checks || [];

  const getGrade = (s: number) => {
    if (s >= 80) return { label: "준비 완료", color: "#10b981", bg: "#d1fae5" };
    if (s >= 60) return { label: "부분 충족", color: "#3b82f6", bg: "#dbeafe" };
    if (s >= 40) return { label: "보완 필요", color: "#f59e0b", bg: "#fef3c7" };
    return { label: "미흡", color: "#e31b23", bg: "#fee2e2" };
  };
  const grade = getGrade(score);

  const statusIcons: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    pass: { icon: "✅", color: "#10b981", bg: "#d1fae5", label: "충족" },
    warn: { icon: "⚠️", color: "#f59e0b", bg: "#fef3c7", label: "주의" },
    fail: { icon: "❌", color: "#e31b23", bg: "#fee2e2", label: "미충족" },
  };

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#03c75a] flex items-center justify-center shadow-lg">
          <span className="text-2xl font-black text-white">N</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            네이버 AI 광고 적합도
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            구조화 데이터·전환 추적·콘텐츠 신호 점검
          </p>
        </div>
      </div>

      {/* 점수 요약 카드 */}
      <div className="bg-gradient-to-br from-white to-[#f0fdf4] border-2 border-[#03c75a55] rounded-2xl p-6 shadow-md mb-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-[#03c75a] flex items-center justify-center shadow-md">
              <div className="text-center">
                <div className="text-3xl font-black text-[#03c75a] leading-none">
                  {score}
                </div>
                <div className="text-xs text-[#6b7280] font-bold mt-0.5">/ 100</div>
              </div>
            </div>
            <div>
              <div className="text-lg font-extrabold text-[#111] mb-1">
                AI 광고 준비 점수
              </div>
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                style={{ color: grade.color, backgroundColor: grade.bg }}
              >
                {grade.label}
              </span>
            </div>
          </div>
          {naver.summary && (
            <div className="flex-1 min-w-[200px] max-w-md text-base text-[#374151] font-medium leading-relaxed">
              💡 {naver.summary}
            </div>
          )}
        </div>
      </div>

      {/* 점검 항목 리스트 */}
      {checks.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md overflow-hidden">
          {checks.map((c: any, idx: number) => {
            const cfg = statusIcons[c.status] || statusIcons.warn;
            return (
              <div
                key={idx}
                className={`flex items-start gap-4 p-5 ${
                  idx !== checks.length - 1 ? "border-b-2 border-gray-100" : ""
                } hover:bg-gray-50 transition-colors`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <span className="text-2xl">{cfg.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h4 className="text-lg font-extrabold text-[#111]">
                      {c.title || c.name}
                    </h4>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ color: cfg.color, backgroundColor: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-base text-[#374151] leading-relaxed font-medium">
                      {c.description}
                    </p>
                  )}
                  {c.recommendation && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-[#f0fdf4] border-l-4 border-[#03c75a]">
                      <span className="text-sm font-bold text-[#03c75a] mr-2">
                        🔧 권장 조치
                      </span>
                      <span className="text-sm text-[#111] font-medium">
                        {c.recommendation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
