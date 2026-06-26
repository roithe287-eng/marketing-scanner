"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  diagnosis: MarketingReport["diagnosis"];
}

/**
 * v39 - 영역별 점수 분석 (PC 깨짐 완전 해결)
 * 이전 v34 - 정교한 가독성 위계
 *
 * 디자인 원칙:
 * - 메인 텍스트(섹션 제목/점수 숫자): 굵게(900) + 진한 검정(#0f172a)
 * - 보조 텍스트(라벨/설명): Medium(500) + 회색(#64748b)
 * - 컬러는 점수/등급/포인트 강조에만 제한 사용
 * - 카드 간격: 일관된 gap 토큰 사용
 * - 라벨 잘림 방지: truncate + title 속성 + SVG short 라벨
 */
export default function ScoreRadar({ diagnosis }: Props) {
  if (!diagnosis) return null;

  const axes = [
    { key: "firstView", label: "첫 화면 설득력", short: "첫인상", icon: "👁️", color: "#e31b23" },
    { key: "cta", label: "CTA 명확도", short: "CTA", icon: "🎯", color: "#f59e0b" },
    { key: "copywriting", label: "카피라이팅", short: "카피", icon: "✍️", color: "#8b5cf6" },
    { key: "trust", label: "신뢰 요소", short: "신뢰", icon: "🛡️", color: "#10b981" },
    { key: "conversionFlow", label: "전환 흐름", short: "전환", icon: "🔄", color: "#3b82f6" },
    { key: "adLanding", label: "광고 랜딩", short: "광고", icon: "📢", color: "#ec4899" },
    { key: "mobileUx", label: "모바일 UX", short: "모바일", icon: "📱", color: "#06b6d4" },
    { key: "seo", label: "SEO 기본", short: "SEO", icon: "🔍", color: "#84cc16" },
  ] as const;

  const scores = axes.map((a) => ({
    ...a,
    score: (diagnosis as any)[a.key] ?? 0,
  }));

  // SVG 설정
  const cx = 250;
  const cy = 250;
  const maxR = 155;
  const VB = 500;

  const getAngle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const getPoint = (score: number, i: number, ratio: number = score / 100) => {
    const angle = getAngle(i);
    const r = maxR * ratio;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygonPoints = scores
    .map((s, i) => {
      const p = getPoint(s.score, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  // 라벨 위치 (외곽에서 추가 여백)
  const getLabelPos = (i: number) => {
    const angle = getAngle(i);
    const r = maxR + 55;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const getGrade = (score: number) => {
    if (score >= 80) return { label: "우수", color: "#059669", bg: "#ecfdf5" };
    if (score >= 60) return { label: "양호", color: "#2563eb", bg: "#eff6ff" };
    if (score >= 40) return { label: "보통", color: "#d97706", bg: "#fffbeb" };
    return { label: "취약", color: "#dc2626", bg: "#fef2f2" };
  };

  const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
  const highest = [...scores].sort((a, b) => b.score - a.score)[0];
  const lowest = [...scores].sort((a, b) => a.score - b.score)[0];

  return (
    <section className="mb-8 md:mb-10">
      {/* ━━━ 섹션 헤더 (v41: 🎯 정조준 아이콘) ━━━ */}
      <div className="flex items-center gap-3 mb-5 md:mb-6">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#0f172a] flex items-center justify-center flex-shrink-0">
          <span className="text-lg md:text-xl">🎯</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tight leading-tight">
            영역별 점수 분석
          </h2>
          <p className="text-xs md:text-sm text-[#64748b] mt-0.5 font-medium">
            8개 핵심 영역의 마케팅 진단 점수
          </p>
        </div>
      </div>

      {/* ━━━ 메인 카드 ━━━ */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm">
        {/* ① 요약 인사이트 (3카드 - 상단 헤더 영역) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#e2e8f0] rounded-t-2xl overflow-hidden min-w-0">
          {/* 평균 */}
          <div className="bg-white px-3 md:px-4 lg:px-5 py-3 md:py-4 lg:py-5 flex items-center gap-2.5 md:gap-3 lg:gap-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-[#fef2f2] border border-[#e31b23]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base md:text-xl lg:text-2xl font-black text-[#e31b23] leading-none">
                {avg}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] md:text-[11px] lg:text-xs font-semibold text-[#64748b] uppercase tracking-wider truncate">
                평균 점수
              </div>
              <div className="text-xs md:text-sm lg:text-base font-bold text-[#0f172a] mt-0.5 truncate">
                전체 영역 평균
              </div>
            </div>
          </div>

          {/* 최고 */}
          <div className="bg-white px-3 md:px-4 lg:px-5 py-3 md:py-4 lg:py-5 flex items-center gap-2.5 md:gap-3 lg:gap-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-[#ecfdf5] border border-[#10b981]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-xl lg:text-2xl">{highest.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] md:text-[11px] lg:text-xs font-semibold text-[#059669] uppercase tracking-wider truncate whitespace-nowrap">
                최고 · {highest.score}점
              </div>
              <div
                className="text-xs md:text-sm lg:text-base font-bold text-[#0f172a] mt-0.5 truncate"
                title={highest.label}
              >
                {highest.label}
              </div>
            </div>
          </div>

          {/* 최저 */}
          <div className="bg-white px-3 md:px-4 lg:px-5 py-3 md:py-4 lg:py-5 flex items-center gap-2.5 md:gap-3 lg:gap-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-[#fef2f2] border border-[#dc2626]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-lg md:text-xl lg:text-2xl">{lowest.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] md:text-[11px] lg:text-xs font-semibold text-[#dc2626] uppercase tracking-wider truncate whitespace-nowrap">
                최저 · {lowest.score}점
              </div>
              <div
                className="text-xs md:text-sm lg:text-base font-bold text-[#0f172a] mt-0.5 truncate"
                title={lowest.label}
              >
                {lowest.label}
              </div>
            </div>
          </div>
        </div>

        {/* 구분 라인 */}
        <div className="border-t border-[#e2e8f0]" />

        {/* ② 본문 - 차트 + 리스트 */}
        {/* v39: 어떤 폭에서도 깨지지 않도록 완전 1단 세로 고정 */}
        <div className="flex flex-col gap-6 md:gap-8 p-5 md:p-6 lg:p-8">
          {/* 차트 영역 (위) */}
          <div className="w-full min-w-0">
            <div className="text-center mb-3">
              <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                Radar Chart
              </div>
            </div>
            <div className="aspect-square w-full max-w-[440px] mx-auto">
              <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
                {/* 가이드 그리드 */}
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
                      stroke={level === 100 ? "#cbd5e1" : "#e2e8f0"}
                      strokeWidth={level === 100 ? "1.5" : "1"}
                      strokeDasharray={level === 100 ? "0" : "3,3"}
                    />
                  );
                })}

                {/* 그리드 점수 표기 (20/40/60/80) */}
                {gridLevels.slice(0, -1).map((level) => {
                  const p = getPoint(level, 0, level / 100);
                  return (
                    <text
                      key={`g-${level}`}
                      x={p.x + 4}
                      y={p.y - 4}
                      fontSize="10"
                      fontWeight="600"
                      fill="#94a3b8"
                    >
                      {level}
                    </text>
                  );
                })}

                {/* 축선 */}
                {axes.map((_, i) => {
                  const p = getPoint(100, i, 1);
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={p.x}
                      y2={p.y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* 점수 영역 */}
                <polygon
                  points={polygonPoints}
                  fill="#e31b23"
                  fillOpacity="0.15"
                  stroke="#e31b23"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* 점수 포인트 */}
                {scores.map((s, i) => {
                  const p = getPoint(s.score, i);
                  return (
                    <circle
                      key={s.key}
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill="#fff"
                      stroke={s.color}
                      strokeWidth="3"
                    />
                  );
                })}

                {/* 축 라벨 박스 (가독성 우선 - 간결하게) */}
                {axes.map((a, i) => {
                  const pos = getLabelPos(i);
                  const score = scores[i].score;
                  return (
                    <g key={a.key}>
                      <rect
                        x={pos.x - 38}
                        y={pos.y - 20}
                        width="76"
                        height="40"
                        rx="8"
                        fill="#fff"
                        stroke="#e2e8f0"
                        strokeWidth="1.5"
                      />
                      {/* 영역명 (작고 회색) */}
                      <text
                        x={pos.x}
                        y={pos.y - 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#64748b"
                      >
                        {a.icon} {a.short}
                      </text>
                      {/* 점수 (크고 컬러) */}
                      <text
                        x={pos.x}
                        y={pos.y + 13}
                        textAnchor="middle"
                        fontSize="15"
                        fontWeight="900"
                        fill={a.color}
                      >
                        {score}
                      </text>
                    </g>
                  );
                })}

                {/* 중앙 평균 배지 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="40"
                  fill="#fff"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy + 2}
                  textAnchor="middle"
                  fontSize="26"
                  fontWeight="900"
                  fill="#0f172a"
                >
                  {avg}
                </text>
                <text
                  x={cx}
                  y={cy + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#64748b"
                  letterSpacing="1"
                >
                  AVG
                </text>
              </svg>
            </div>
          </div>

          {/* 점수 리스트 (아래) */}
          <div className="w-full flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                Score Breakdown
              </div>
              <div className="text-xs font-semibold text-[#94a3b8]">
                8 영역
              </div>
            </div>
            {/* v39: PC에서도 리스트를 2열로 펼쳐서 세로길이 절약 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-2.5">
              {scores.map((s) => {
                const grade = getGrade(s.score);
                return (
                  <div
                    key={s.key}
                    className="flex items-center gap-3 px-3 md:px-3.5 py-2.5 md:py-3 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-sm transition-all"
                  >
                    {/* 아이콘 */}
                    <div
                      className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.color}14` }}
                    >
                      <span className="text-base md:text-lg">{s.icon}</span>
                    </div>

                    {/* 라벨 + 점수바 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className="text-sm md:text-[15px] font-bold text-[#0f172a] truncate"
                          title={s.label}
                        >
                          {s.label}
                        </span>
                        <span className="flex items-baseline gap-0.5 flex-shrink-0">
                          <span
                            className="text-base md:text-lg font-black leading-none"
                            style={{ color: s.color }}
                          >
                            {s.score}
                          </span>
                          <span className="text-[10px] text-[#94a3b8] font-semibold">
                            /100
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
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
                      className="px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold flex-shrink-0 border"
                      style={{
                        color: grade.color,
                        backgroundColor: grade.bg,
                        borderColor: `${grade.color}33`,
                      }}
                    >
                      {grade.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
