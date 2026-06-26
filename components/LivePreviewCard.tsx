"use client";

import React from "react";

/**
 * v37 - LivePreviewCard
 * Hero 우측에 표시되는 제품 미리보기 카드
 *
 * 디자인: 결과 페이지 ScoreRadar 와 동일 톤
 * - 상단: 평균/최고/최저 3카드 (좁은 폭에서도 1px 분할선으로 깔끔)
 * - 본문: 팔각형 SVG 레이더 차트 (위) + 8개 영역 점수 리스트 (아래) 세로 1단
 * - 하단: 미니 액션 스트립 (CTA + 공유)
 *
 * 반응형:
 * - lg+: 풀 디테일 (8개 항목)
 * - md:  5개 항목 + 더보기
 * - sm:  4개 항목 + 더보기, 상단 카드 1열로 변경 옵션
 */

interface ScoreItem {
  key: string;
  label: string;
  short: string;
  icon: string;
  score: number;
  color: string;
}

const SCORES: ScoreItem[] = [
  { key: "firstView", label: "첫 화면 설득력", short: "첫인상", icon: "👁️", score: 60, color: "#e31b23" },
  { key: "cta", label: "CTA 명확도", short: "CTA", icon: "🎯", score: 70, color: "#f59e0b" },
  { key: "copywriting", label: "카피라이팅", short: "카피", icon: "✍️", score: 60, color: "#8b5cf6" },
  { key: "trust", label: "신뢰 요소", short: "신뢰", icon: "🛡️", score: 50, color: "#10b981" },
  { key: "conversionFlow", label: "전환 흐름", short: "전환", icon: "🔄", score: 65, color: "#3b82f6" },
  { key: "adLanding", label: "광고 랜딩", short: "광고", icon: "📢", score: 60, color: "#ec4899" },
  { key: "mobileUx", label: "모바일 UX", short: "모바일", icon: "📱", score: 80, color: "#06b6d4" },
  { key: "seo", label: "SEO 기본", short: "SEO", icon: "🔍", score: 65, color: "#84cc16" },
];

function getGrade(score: number) {
  if (score >= 80) return { label: "우수", color: "#059669", bg: "#ecfdf5" };
  if (score >= 60) return { label: "양호", color: "#2563eb", bg: "#eff6ff" };
  if (score >= 40) return { label: "보통", color: "#d97706", bg: "#fffbeb" };
  return { label: "취약", color: "#dc2626", bg: "#fef2f2" };
}

export default function LivePreviewCard() {
  // SVG 설정
  const cx = 250;
  const cy = 250;
  const maxR = 155;
  const VB = 500;
  const axes = SCORES;

  const getAngle = (i: number) =>
    (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const getPoint = (score: number, i: number, ratio: number = score / 100) => {
    const angle = getAngle(i);
    const r = maxR * ratio;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygonPoints = SCORES.map((s, i) => {
    const p = getPoint(s.score, i);
    return `${p.x},${p.y}`;
  }).join(" ");

  const gridLevels = [20, 40, 60, 80, 100];

  const getLabelPos = (i: number) => {
    const angle = getAngle(i);
    const r = maxR + 55;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const avg = Math.round(SCORES.reduce((s, x) => s + x.score, 0) / SCORES.length);
  const highest = [...SCORES].sort((a, b) => b.score - a.score)[0];
  const lowest = [...SCORES].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      {/* ━━━ 메인 카드 ━━━ */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-xl overflow-hidden">
        {/* ① 상단 3카드 (평균/최고/최저) */}
        <div className="grid grid-cols-3 gap-px bg-[#e2e8f0]">
          {/* 평균 */}
          <div className="bg-white px-2.5 sm:px-3 py-2.5 sm:py-3 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#fef2f2] border border-[#e31b23]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm sm:text-base font-black text-[#e31b23] leading-none">
                {avg}
              </span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[9px] sm:text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
                평균 점수
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-[#0f172a] mt-0.5 truncate">
                전체 영역 평균
              </div>
            </div>
          </div>

          {/* 최고 */}
          <div className="bg-white px-2.5 sm:px-3 py-2.5 sm:py-3 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#ecfdf5] border border-[#10b981]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base sm:text-lg">{highest.icon}</span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[9px] sm:text-[10px] font-semibold text-[#059669] uppercase tracking-wider truncate">
                최고 · {highest.score}점
              </div>
              <div
                className="text-[11px] sm:text-xs font-bold text-[#0f172a] mt-0.5 truncate"
                title={highest.label}
              >
                {highest.short}
              </div>
            </div>
          </div>

          {/* 최저 */}
          <div className="bg-white px-2.5 sm:px-3 py-2.5 sm:py-3 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#fef2f2] border border-[#dc2626]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base sm:text-lg">{lowest.icon}</span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[9px] sm:text-[10px] font-semibold text-[#dc2626] uppercase tracking-wider truncate">
                최저 · {lowest.score}점
              </div>
              <div
                className="text-[11px] sm:text-xs font-bold text-[#0f172a] mt-0.5 truncate"
                title={lowest.label}
              >
                {lowest.short}
              </div>
            </div>
          </div>
        </div>

        {/* 구분 라인 */}
        <div className="border-t border-[#e2e8f0]" />

        {/* ② 본문 - 차트 (위) + 리스트 (아래) 세로 1단 */}
        <div className="p-4 sm:p-5">
          {/* 팔각형 레이더 차트 */}
          <div className="relative">
            <div className="aspect-square max-w-[420px] mx-auto">
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

                {/* 그리드 점수 표기 */}
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
                {SCORES.map((s, i) => {
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

                {/* 축 라벨 박스 */}
                {axes.map((a, i) => {
                  const pos = getLabelPos(i);
                  const score = SCORES[i].score;
                  return (
                    <g key={a.key}>
                      <rect
                        x={pos.x - 36}
                        y={pos.y - 20}
                        width="72"
                        height="40"
                        rx="8"
                        fill="#fff"
                        stroke="#e2e8f0"
                        strokeWidth="1.5"
                      />
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

          {/* 점수 리스트 */}
          <div className="mt-4 sm:mt-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3 px-0.5">
              <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                Score Breakdown
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-[#94a3b8]">
                8 영역
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {SCORES.map((s, idx) => {
                const grade = getGrade(s.score);
                // 반응형 노출 (mobile=4, md=5, lg=8)
                const hiddenClass =
                  idx >= 5
                    ? "hidden lg:flex"
                    : idx >= 4
                    ? "hidden md:flex"
                    : "flex";

                return (
                  <div
                    key={s.key}
                    className={`${hiddenClass} items-center gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg border border-[#e2e8f0] bg-white hover:border-[#cbd5e1] transition-colors`}
                  >
                    {/* 아이콘 */}
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.color}14` }}
                    >
                      <span className="text-sm sm:text-base">{s.icon}</span>
                    </div>

                    {/* 라벨 + 점수바 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className="text-[11px] sm:text-xs font-bold text-[#0f172a] truncate"
                          title={s.label}
                        >
                          {s.label}
                        </span>
                        <span className="flex items-baseline gap-0.5 flex-shrink-0 leading-none">
                          <span
                            className="text-xs sm:text-sm font-black"
                            style={{ color: s.color }}
                          >
                            {s.score}
                          </span>
                          <span className="text-[9px] text-[#94a3b8] font-bold">
                            /100
                          </span>
                        </span>
                      </div>
                      <div className="h-1 sm:h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.score}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* 등급 배지 */}
                    <span
                      className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold flex-shrink-0 border leading-none"
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

              {/* 더보기 안내 - 반응형 */}
              <div className="pt-1.5 text-[10px] sm:text-[11px] text-[#64748b] font-semibold flex items-center justify-center gap-1 border-t border-dashed border-[#e2e8f0] mt-1.5">
                <span className="md:hidden">+ 4개 영역 더보기 ↓</span>
                <span className="hidden md:inline lg:hidden">
                  + 3개 영역 더보기 ↓
                </span>
                <span className="hidden lg:inline">전체 13개 진단 항목 보기 ↓</span>
              </div>
            </div>
          </div>
        </div>

        {/* ③ 하단 액션 스트립 (CTA + 공유) */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-[#f8fafc] border-t border-[#e2e8f0]">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#e31b23] hover:bg-[#c41019] text-white text-xs sm:text-sm font-black py-2.5 rounded-lg shadow-sm transition pointer-events-none"
            >
              전체 리포트 보기
              <span className="text-sm">→</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 bg-white border border-[#e2e8f0] text-[#0f172a] text-[11px] sm:text-xs font-bold px-3 py-2.5 rounded-lg pointer-events-none"
            >
              <span>🔗</span>
              <span>카톡 URL 공유</span>
            </button>
          </div>
        </div>
      </div>

      {/* 카드 외곽 플로팅 — 우상단 13/13 완료 도넛 */}
      <div className="absolute -top-4 -right-3 sm:-top-5 sm:-right-5 z-20 flex flex-col items-center gap-1.5">
        <div className="relative w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] bg-white rounded-full shadow-xl border-2 border-white flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="94 94"
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="relative w-[42px] h-[42px] sm:w-[54px] sm:h-[54px] bg-white rounded-full flex flex-col items-center justify-center leading-none">
            <div className="text-[11px] sm:text-xs font-black text-[#059669] leading-none">
              13/13
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold text-[#64748b] mt-0.5 tracking-tight">
              완료
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#0f172a] text-white text-[9px] sm:text-[10px] font-bold whitespace-nowrap shadow-sm">
          ⏱ 30초 전후
        </span>
      </div>

      {/* 카드 외곽 플로팅 — 좌하단 Real-time (데스크탑만) */}
      <div className="hidden lg:block absolute -bottom-3 -left-3 bg-white border border-[#e2e8f0] rounded-lg shadow-md px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] font-bold text-[#0f172a]">Real-time</span>
        </div>
      </div>
    </div>
  );
}
