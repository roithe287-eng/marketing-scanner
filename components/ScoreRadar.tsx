"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  diagnosis: MarketingReport["diagnosis"];
}

/**
 * v33 - 풀폭 독립 섹션 전용 ScoreRadar
 * - 좌: 큰 팔각형 SVG 레이더 차트
 * - 우: 8개 영역 점수 리스트 (아이콘+라벨+점수바+등급)
 * - 모바일: 1단(차트 → 리스트 세로)
 * - 데스크탑: 2단(차트 좌, 리스트 우)
 */
export default function ScoreRadar({ diagnosis }: Props) {
  if (!diagnosis) return null;

  // 8개 축 (12시 방향부터 시계방향)
  const axes = [
    { key: "firstView", label: "첫인상", short: "첫인상", icon: "👁️", color: "#e31b23" },
    { key: "cta", label: "CTA 명확도", short: "CTA", icon: "🎯", color: "#f59e0b" },
    { key: "copywriting", label: "카피라이팅", short: "카피", icon: "✍️", color: "#8b5cf6" },
    { key: "trust", label: "신뢰 요소", short: "신뢰", icon: "🛡️", color: "#10b981" },
    { key: "conversionFlow", label: "전환 흐름", short: "전환", icon: "🔄", color: "#3b82f6" },
    { key: "adLanding", label: "광고 랜딩", short: "광고", icon: "📢", color: "#ec4899" },
    { key: "mobileUx", label: "모바일 UX", short: "모바일", icon: "📱", color: "#06b6d4" },
    { key: "seo", label: "SEO", short: "SEO", icon: "🔍", color: "#84cc16" },
  ] as const;

  const scores = axes.map((a) => ({
    ...a,
    score: (diagnosis as any)[a.key] ?? 0,
  }));

  // SVG 설정 — 라벨 공간을 충분히 확보하기 위해 viewBox 여유 ↑
  const cx = 250;
  const cy = 250;
  const maxR = 160;
  const VB = 500; // viewBox 500x500 (라벨 공간 90px 여유)

  const getAngle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const getPoint = (score: number, i: number, ratio: number = score / 100) => {
    const angle = getAngle(i);
    const r = maxR * ratio;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const polygonPoints = scores
    .map((s, i) => {
      const p = getPoint(s.score, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  // 라벨 위치 (외곽 + 추가 여백)
  const getLabelPos = (i: number) => {
    const angle = getAngle(i);
    const r = maxR + 50;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const getGrade = (score: number) => {
    if (score >= 80) return { label: "우수", color: "#10b981", bg: "#d1fae5" };
    if (score >= 60) return { label: "양호", color: "#3b82f6", bg: "#dbeafe" };
    if (score >= 40) return { label: "보통", color: "#f59e0b", bg: "#fef3c7" };
    return { label: "취약", color: "#e31b23", bg: "#fee2e2" };
  };

  // 평균 점수
  const avg = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length
  );

  // 점수 정렬용 (리스트는 원래 순서 그대로)
  const highest = [...scores].sort((a, b) => b.score - a.score)[0];
  const lowest = [...scores].sort((a, b) => a.score - b.score)[0];

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

      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md p-4 md:p-6 lg:p-8">
        {/* 요약 인사이트 (최고/최저) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 md:mb-6">
          <div className="rounded-xl bg-gradient-to-br from-[#fef2f2] to-white border-2 border-[#e31b2333] p-3 md:p-4 flex items-center gap-3">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white border-2 border-[#e31b23] flex items-center justify-center flex-shrink-0 shadow-sm">
              <div className="text-center leading-none">
                <div className="text-lg md:text-xl font-black text-[#e31b23]">{avg}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] md:text-xs font-bold text-[#e31b23] uppercase tracking-wide">
                평균 점수
              </div>
              <div className="text-sm md:text-base font-extrabold text-[#111] mt-0.5">
                8개 영역 평균
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-[#f0fdf4] to-white border-2 border-[#10b98133] p-3 md:p-4 flex items-center gap-3">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#d1fae5] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl md:text-2xl">{highest.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] md:text-xs font-bold text-[#10b981] uppercase tracking-wide">
                최고 점수 · {highest.score}점
              </div>
              <div className="text-sm md:text-base font-extrabold text-[#111] mt-0.5 truncate">
                {highest.label}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-[#fef2f2] to-white border-2 border-[#e31b2333] p-3 md:p-4 flex items-center gap-3">
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#fee2e2] flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl md:text-2xl">{lowest.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] md:text-xs font-bold text-[#e31b23] uppercase tracking-wide">
                최저 점수 · {lowest.score}점
              </div>
              <div className="text-sm md:text-base font-extrabold text-[#111] mt-0.5 truncate">
                {lowest.label}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-10 items-center">
          {/* ① 팔각형 레이더 차트 */}
          <div className="relative">
            <div className="aspect-square max-w-lg mx-auto">
              <svg
                viewBox={`0 0 ${VB} ${VB}`}
                className="w-full h-full"
              >
                {/* 가이드 그리드 (동심 팔각형) */}
                {gridLevels.map((level) => {
                  const ratio = level / 100;
                  const points = axes
                    .map((_, i) => {
                      const p = getPoint(level, i, ratio);
                      return `${p.x},${p.y}`;
                    })
                    .join(" ");
                  return (
                    <polygon
                      key={level}
                      points={points}
                      fill="none"
                      stroke={level === 100 ? "#cbd5e1" : "#e5e7eb"}
                      strokeWidth={level === 100 ? "1.5" : "1"}
                      strokeDasharray={level === 100 ? "0" : "4,3"}
                    />
                  );
                })}

                {/* 축선 (중심에서 각 꼭짓점) */}
                {axes.map((_, i) => {
                  const p = getPoint(100, i, 1);
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={p.x}
                      y2={p.y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* 점수 영역 (반투명 빨강) */}
                <polygon
                  points={polygonPoints}
                  fill="#e31b23"
                  fillOpacity="0.2"
                  stroke="#e31b23"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* 각 꼭짓점 포인트 */}
                {scores.map((s, i) => {
                  const p = getPoint(s.score, i);
                  return (
                    <circle
                      key={s.key}
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill="#fff"
                      stroke={s.color}
                      strokeWidth="3.5"
                    />
                  );
                })}

                {/* 축 라벨 (아이콘 + 이름 + 점수) */}
                {axes.map((a, i) => {
                  const pos = getLabelPos(i);
                  const score = scores[i].score;
                  return (
                    <g key={a.key}>
                      {/* 라벨 배경 (가독성용 흰 박스) */}
                      <rect
                        x={pos.x - 42}
                        y={pos.y - 22}
                        width="84"
                        height="44"
                        rx="10"
                        fill="#fff"
                        stroke={a.color}
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                      <text
                        x={pos.x}
                        y={pos.y - 4}
                        textAnchor="middle"
                        fontSize="15"
                        fontWeight="800"
                        fill="#111"
                      >
                        {a.icon} {a.short}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 14}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="900"
                        fill={a.color}
                      >
                        {score}
                        <tspan
                          fontSize="10"
                          fill="#9ca3af"
                          dx="2"
                        >
                          /100
                        </tspan>
                      </text>
                    </g>
                  );
                })}

                {/* 중앙 평균 원형 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="38"
                  fill="#fff"
                  stroke="#e31b23"
                  strokeWidth="3"
                />
                <text
                  x={cx}
                  y={cy + 2}
                  textAnchor="middle"
                  fontSize="26"
                  fontWeight="900"
                  fill="#e31b23"
                >
                  {avg}
                </text>
                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#6b7280"
                >
                  평균
                </text>
              </svg>
            </div>
          </div>

          {/* ② 점수 리스트 */}
          <div className="space-y-2.5 md:space-y-3">
            {scores.map((s) => {
              const grade = getGrade(s.score);
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-3 p-3 md:p-3.5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 transition-all"
                >
                  {/* 아이콘 */}
                  <div
                    className="w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18` }}
                  >
                    <span className="text-lg md:text-xl">{s.icon}</span>
                  </div>

                  {/* 라벨 + 점수바 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm md:text-base font-extrabold text-[#111] truncate">
                        {s.label}
                      </span>
                      <span
                        className="text-base md:text-lg font-black flex-shrink-0 leading-none"
                        style={{ color: s.color }}
                      >
                        {s.score}
                        <span className="text-[10px] md:text-xs text-[#9ca3af] font-bold ml-0.5">
                          /100
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${s.score}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* 등급 배지 */}
                  <span
                    className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0"
                    style={{ color: grade.color, backgroundColor: grade.bg }}
                  >
                    {grade.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
