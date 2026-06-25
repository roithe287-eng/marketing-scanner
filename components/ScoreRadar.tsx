"use client";

import React from "react";
import type { MarketingReport } from "@/lib/reportSchema";

interface Props {
  diagnosis: MarketingReport["diagnosis"];
}

/**
 * v32 - 팔각형 레이더 차트 + 하단 점수 리스트
 * - 8개 영역을 한 도형에 시각화 (가독성 ↑)
 * - 모바일에서도 깨지지 않는 반응형 SVG
 * - 하단에 항목별 점수 막대 리스트 (수치 명확)
 */
export default function ScoreRadar({ diagnosis }: Props) {
  if (!diagnosis) return null;

  // 8개 축 정의 (시계방향으로 12시부터)
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

  // SVG viewBox 기준 좌표 계산 (중심 200, 최대 반지름 150)
  const cx = 200;
  const cy = 200;
  const maxR = 150;

  // 각 축의 각도 (12시 방향부터 시계방향)
  const getAngle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  // 점수 → 좌표
  const getPoint = (score: number, i: number, ratio: number = score / 100) => {
    const angle = getAngle(i);
    const r = maxR * ratio;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // 폴리곤 path (점수 영역)
  const polygonPoints = scores
    .map((s, i) => {
      const p = getPoint(s.score, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  // 가이드 그리드 (20, 40, 60, 80, 100점)
  const gridLevels = [20, 40, 60, 80, 100];

  // 라벨 위치 (외곽에서 약간 떨어지게)
  const getLabelPos = (i: number) => {
    const angle = getAngle(i);
    const r = maxR + 32;
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

      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* ① 팔각형 레이더 차트 */}
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto">
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
                style={{ overflow: "visible" }}
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
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray={level === 100 ? "0" : "3,3"}
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
                  fillOpacity="0.18"
                  stroke="#e31b23"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* 점수 포인트 */}
                {scores.map((s, i) => {
                  const p = getPoint(s.score, i);
                  return (
                    <g key={s.key}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="6"
                        fill="#fff"
                        stroke={s.color}
                        strokeWidth="3"
                      />
                    </g>
                  );
                })}

                {/* 축 라벨 (아이콘 + 이름 + 점수) */}
                {axes.map((a, i) => {
                  const pos = getLabelPos(i);
                  const score = scores[i].score;
                  return (
                    <g key={a.key}>
                      <text
                        x={pos.x}
                        y={pos.y - 6}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="800"
                        fill="#111"
                      >
                        {a.icon} {a.short}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 14}
                        textAnchor="middle"
                        fontSize="18"
                        fontWeight="900"
                        fill={a.color}
                      >
                        {score}
                      </text>
                    </g>
                  );
                })}

                {/* 중앙 평균 점수 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="32"
                  fill="#fff"
                  stroke="#e31b23"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  fontSize="22"
                  fontWeight="900"
                  fill="#e31b23"
                >
                  {avg}
                </text>
                <text
                  x={cx}
                  y={cy + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="#6b7280"
                >
                  평균
                </text>
              </svg>
            </div>
          </div>

          {/* ② 하단 점수 리스트 */}
          <div className="space-y-2.5 md:space-y-3">
            {scores.map((s) => {
              const grade = getGrade(s.score);
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all"
                >
                  {/* 아이콘 */}
                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18` }}
                  >
                    <span className="text-base md:text-lg">{s.icon}</span>
                  </div>

                  {/* 라벨 + 점수바 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm md:text-base font-extrabold text-[#111] truncate">
                        {s.label}
                      </span>
                      <span
                        className="text-base md:text-lg font-black flex-shrink-0"
                        style={{ color: s.color }}
                      >
                        {s.score}
                        <span className="text-[10px] md:text-xs text-[#9ca3af] font-bold ml-0.5">
                          /100
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 md:h-2 rounded-full bg-gray-100 overflow-hidden">
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
                    className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0"
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
