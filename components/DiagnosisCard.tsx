"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  report: MarketingReport;
}

/**
 * v31 - 가독성 강화 리디자인
 * 5개 영역(첫인상/CTA/카피/신뢰/전환) 진단 결과
 */
export default function DiagnosisCard({ report }: Props) {
  const diagnosis = report.diagnosis || {};

  const sections = [
    {
      key: "firstView",
      label: "첫인상",
      icon: "👁️",
      color: "#e31b23",
      bgColor: "#fee2e2",
      data: diagnosis.firstView,
    },
    {
      key: "cta",
      label: "행동 유도 (CTA)",
      icon: "🎯",
      color: "#f59e0b",
      bgColor: "#fef3c7",
      data: diagnosis.cta,
    },
    {
      key: "copywriting",
      label: "카피라이팅",
      icon: "✍️",
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      data: diagnosis.copywriting,
    },
    {
      key: "trust",
      label: "신뢰 요소",
      icon: "🛡️",
      color: "#10b981",
      bgColor: "#d1fae5",
      data: diagnosis.trust,
    },
    {
      key: "conversionFlow",
      label: "전환 흐름",
      icon: "🔄",
      color: "#3b82f6",
      bgColor: "#dbeafe",
      data: diagnosis.conversionFlow,
    },
  ];

  return (
    <section className="mb-10">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#e31b23] flex items-center justify-center shadow-lg">
          <span className="text-2xl">🔍</span>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#111] tracking-tight">
            영역별 상세 진단
          </h2>
          <p className="text-base text-[#6b7280] mt-1 font-medium">
            각 항목별 강점과 개선점을 확인하세요
          </p>
        </div>
      </div>

      {/* 진단 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sections.map((sec) => {
          const data: any = sec.data || {};
          const score = data.score ?? 0;
          const summary = data.summary || data.diagnosis || "분석 데이터가 없습니다.";
          const strengths: string[] = data.strengths || [];
          const weaknesses: string[] = data.weaknesses || data.issues || [];

          return (
            <div
              key={sec.key}
              className="bg-white border-2 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all"
              style={{ borderColor: `${sec.color}33` }}
            >
              {/* 카드 헤더 */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: sec.bgColor }}
                  >
                    <span className="text-2xl">{sec.icon}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-[#111]">
                    {sec.label}
                  </h3>
                </div>
                <div className="text-right">
                  <div
                    className="text-3xl font-black leading-none"
                    style={{ color: sec.color }}
                  >
                    {score}
                  </div>
                  <div className="text-xs text-[#9ca3af] font-medium mt-1">/ 100</div>
                </div>
              </div>

              {/* 요약 */}
              <div
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: sec.bgColor }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">💬</span>
                  <span
                    className="text-sm font-bold uppercase tracking-wide"
                    style={{ color: sec.color }}
                  >
                    진단 요약
                  </span>
                </div>
                <p className="text-base text-[#111] leading-relaxed font-medium">
                  {summary}
                </p>
              </div>

              {/* 강점 */}
              {strengths.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">✅</span>
                    <span className="text-sm font-bold text-[#10b981] uppercase tracking-wide">
                      강점
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-base text-[#111] leading-relaxed"
                      >
                        <span className="text-[#10b981] font-bold mt-0.5">▸</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 약점 */}
              {weaknesses.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm font-bold text-[#e31b23] uppercase tracking-wide">
                      개선 필요
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-base text-[#111] leading-relaxed"
                      >
                        <span className="text-[#e31b23] font-bold mt-0.5">▸</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
