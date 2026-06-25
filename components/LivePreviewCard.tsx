"use client";

import React from "react";

/**
 * v35 - LivePreviewCard (V3 Wide Analytics Panel)
 *
 * Hero 우측에 표시되는 제품 미리보기 카드
 * - [1] 헤더: 사이트 + 점수
 * - [2] 13개 진단 항목 진행률 리스트
 * - [3] 하단 액션 스트립 (미니 레이더 + 통계 + CTA + 공유)
 * - [4] 플로팅 도넛 (13/13 완료)
 *
 * 반응형:
 * - lg+: 풀 디테일 (7개 항목 + 미니 레이더 + 도넛)
 * - md:  중간 (5개 항목 + 도넛 유지)
 * - sm:  축약 (4개 항목 + 더보기, 미니 레이더 제거, 액션 세로 배치)
 */

interface DiagItem {
  icon: string;
  label: string;
  score: number;
  color: string;
}

// 13개 진단 항목 샘플 데이터 (메인 페이지 미리보기용)
const DIAG_ITEMS: DiagItem[] = [
  { icon: "👁️", label: "첫 화면 설득력", score: 60, color: "#e31b23" },
  { icon: "🎯", label: "CTA 명확도", score: 75, color: "#f59e0b" },
  { icon: "✍️", label: "카피라이팅 품질", score: 55, color: "#8b5cf6" },
  { icon: "🛡️", label: "신뢰 요소", score: 50, color: "#10b981" },
  { icon: "🔄", label: "전환 흐름", score: 70, color: "#3b82f6" },
  { icon: "📢", label: "광고 랜딩 적합도", score: 65, color: "#ec4899" },
  { icon: "📱", label: "모바일 UX", score: 85, color: "#06b6d4" },
];

function getGrade(score: number) {
  if (score >= 80) return { label: "우수", color: "#059669", bg: "#ecfdf5" };
  if (score >= 60) return { label: "양호", color: "#2563eb", bg: "#eff6ff" };
  if (score >= 40) return { label: "보통", color: "#d97706", bg: "#fffbeb" };
  return { label: "취약", color: "#dc2626", bg: "#fef2f2" };
}

export default function LivePreviewCard() {
  // 반응형 노출 개수는 CSS로 처리 (lg=7, md=5, sm=4)
  // 단일 데이터 배열에서 클래스로 hidden 처리
  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      {/* 플로팅 도넛 (우상단 - 모바일에서는 작아짐) */}
      <div className="absolute -top-3 -right-2 sm:-top-4 sm:-right-4 z-20">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-lg border border-[#e2e8f0] flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="100 100"
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="relative text-center leading-none">
            <div className="text-[10px] sm:text-[11px] font-black text-[#059669]">
              13/13
            </div>
            <div className="text-[8px] sm:text-[9px] font-bold text-[#64748b] mt-0.5">
              완료
            </div>
          </div>
        </div>
        {/* 30초 라벨 */}
        <div className="mt-1 sm:mt-1.5 text-center">
          <span className="inline-block px-1.5 py-0.5 rounded-md bg-[#0f172a] text-white text-[8px] sm:text-[9px] font-bold whitespace-nowrap">
            30초 전후
          </span>
        </div>
      </div>

      {/* 메인 카드 */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl overflow-hidden">
        {/* 브라우저 크롬 바 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-[#e2e8f0] text-[10px] sm:text-[11px] font-medium text-[#64748b]">
              <span className="text-[10px]">🔒</span>
              PROREALMKT.COM
            </div>
          </div>
          <div className="w-10" />
        </div>

        {/* [1] 헤더 - 사이트 + 점수 */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#fef2f2] border border-[#e31b23]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm sm:text-base">🏢</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-[#0f172a] truncate">
                PROREALMKT.COM
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#64748b] font-medium truncate">
                진짜마케팅 · 분석 완료
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1 flex-shrink-0">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-[#e31b23] leading-none">
              72
            </span>
            <span className="text-[10px] sm:text-xs text-[#94a3b8] font-bold">
              /100
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#2563eb]/20">
              양호
            </span>
          </div>
        </div>

        {/* PROGRESS 인디케이터 */}
        <div className="px-4 sm:px-5 py-1.5 bg-[#f0fdf4] border-b border-[#10b981]/15">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-[#059669] uppercase">
              ✓ Progress · 13/13 항목 완료
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#059669]">
              100%
            </span>
          </div>
        </div>

        {/* [2] 13개 진단 항목 진행률 리스트 */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2 sm:space-y-2.5">
          {DIAG_ITEMS.map((item, idx) => {
            const grade = getGrade(item.score);
            // 반응형으로 노출 개수 제한
            // mobile (sm 이하): 4개 (idx 0-3)
            // tablet (md):       5개 (idx 0-4)
            // desktop (lg+):     7개 전부
            const hiddenClass =
              idx >= 5
                ? "hidden lg:flex"
                : idx >= 4
                ? "hidden md:flex"
                : "flex";

            return (
              <div
                key={item.label}
                className={`${hiddenClass} items-center gap-2 sm:gap-2.5`}
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}14` }}
                >
                  <span className="text-xs sm:text-sm">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className="text-[11px] sm:text-xs font-bold text-[#0f172a] truncate"
                      title={item.label}
                    >
                      {item.label}
                    </span>
                    <span className="flex items-baseline gap-0.5 flex-shrink-0">
                      <span
                        className="text-xs sm:text-sm font-black leading-none"
                        style={{ color: item.color }}
                      >
                        {item.score}
                      </span>
                    </span>
                  </div>
                  <div className="h-1 sm:h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.score}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
                <span
                  className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold flex-shrink-0 border"
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

          {/* 더보기 안내 - 반응형 노출 개수 (mobile=4 / md=5 / lg=7 -> 잔여 9/8/6) */}
          <div className="pt-1 sm:pt-1.5 text-[10px] sm:text-[11px] text-[#64748b] font-semibold flex items-center justify-center gap-1 border-t border-dashed border-[#e2e8f0] mt-1">
            <span className="md:hidden">+ 9개 항목 더보기 ↓</span>
            <span className="hidden md:inline lg:hidden">+ 8개 항목 더보기 ↓</span>
            <span className="hidden lg:inline">+ 6개 항목 더보기 ↓</span>
          </div>
        </div>

        {/* [3] 하단 액션 스트립 */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-[#f8fafc] border-t border-[#e2e8f0]">
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
            <div className="bg-white rounded-lg border border-[#e2e8f0] px-2 sm:px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="text-sm sm:text-base">🔥</span>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[9px] text-[#64748b] font-bold uppercase tracking-wide">
                  긴급
                </div>
                <div className="text-[11px] sm:text-xs font-black text-[#0f172a]">
                  3건
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-[#e2e8f0] px-2 sm:px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="text-sm sm:text-base">⚡</span>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[9px] text-[#64748b] font-bold uppercase tracking-wide">
                  퀵윈
                </div>
                <div className="text-[11px] sm:text-xs font-black text-[#0f172a]">
                  5건
                </div>
              </div>
            </div>
          </div>

          {/* CTA + 공유 (모바일 세로, sm 이상 가로) */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#e31b23] hover:bg-[#c41019] text-white text-xs sm:text-sm font-black py-2 sm:py-2.5 rounded-lg shadow-sm transition pointer-events-none"
            >
              전체 리포트 보기
              <span className="text-sm">→</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] text-[#0f172a] text-[11px] sm:text-xs font-bold px-3 py-2 sm:py-2.5 rounded-lg transition pointer-events-none"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">카톡 URL 공유</span>
              <span className="sm:hidden">공유</span>
            </button>
          </div>
        </div>
      </div>

      {/* 카드 외곽 플로팅 작은 요소 - 데스크탑만 */}
      <div className="hidden lg:block absolute -bottom-3 -left-3 bg-white border border-[#e2e8f0] rounded-lg shadow-md px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] font-bold text-[#0f172a]">
            Real-time
          </span>
        </div>
      </div>
    </div>
  );
}
