"use client";

/**
 * v46-W1: 네이버 생태계 연동 진단 카드
 *  A) 플레이스 AI 브리핑 준비도 (로컬 업종 대상)
 *  B) 서치어드바이저 연동 체크
 * - 규칙 기반 결과 표시 (naverEcosystemReadiness 필드)
 * - 데이터 없으면 자동 숨김
 */

import type { NaverEcosystemReadiness } from "../lib/reportSchema";

type Props = {
  readiness?: NaverEcosystemReadiness | null;
};

function statusStyle(status: "pass" | "warning" | "fail") {
  switch (status) {
    case "pass":
      return {
        icon: "✅",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "양호",
      };
    case "warning":
      return {
        icon: "⚠️",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "보통",
      };
    default:
      return {
        icon: "❌",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        label: "취약",
      };
  }
}

function gradeStyle(grade: string) {
  switch (grade) {
    case "A":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "B":
      return "text-sky-700 bg-sky-50 border-sky-200";
    case "C":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "D":
      return "text-orange-700 bg-orange-50 border-orange-200";
    default:
      return "text-rose-700 bg-rose-50 border-rose-200";
  }
}

function CheckRow({ check }: { check: any }) {
  const s = statusStyle(check.status);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 md:p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] md:text-[15px]">{s.icon}</span>
            <h5 className="text-[15px] md:text-[16px] font-bold text-neutral-900 leading-tight">
              {check.label}
            </h5>
          </div>
          <p className="text-[12px] md:text-[13px] text-neutral-500 break-words">
            {check.currentValue}
          </p>
        </div>
        <span
          className={`shrink-0 inline-block text-[10px] md:text-[11px] font-semibold border rounded-full px-2 py-0.5 ${s.badge}`}
        >
          {s.label}
        </span>
      </div>
      <p className="text-[13px] md:text-[14px] text-neutral-800 leading-relaxed break-words mb-1.5">
        <span className="font-semibold text-neutral-900">진단:</span>{" "}
        {check.diagnosis}
      </p>
      <p className="text-[12px] md:text-[13px] text-neutral-600 leading-relaxed break-words">
        <span className="font-semibold text-neutral-700">개선:</span>{" "}
        {check.guide}
      </p>
    </div>
  );
}

export default function NaverEcosystemReadinessCard({ readiness }: Props) {
  if (!readiness) return null;

  const {
    overallScore,
    grade,
    isLocalBusiness,
    placeScore,
    advisorScore,
    summary,
    checks,
    priorityActions,
  } = readiness;
  const g = gradeStyle(grade);

  const placeChecks = checks.filter((c: any) => c.group === "place");
  const advisorChecks = checks.filter((c: any) => c.group === "advisor");

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">🏪</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            네이버 생태계 연동 진단
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          플레이스 AI 브리핑 준비도와 서치어드바이저 연동 상태를 점검합니다.
          네이버 검색·지도·플레이스 지면 노출의 기본기를 확인하세요.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        <div
          className={`rounded-2xl border p-4 md:p-5 ${g} flex items-center justify-between`}
        >
          <div>
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide opacity-80">
              종합 점수
            </div>
            <div className="text-[13px] md:text-[14px] mt-0.5 opacity-80">
              12개 체크 가중 평균
            </div>
          </div>
          <div className="text-right">
            <div className="text-[34px] md:text-[40px] font-extrabold leading-none tabular-nums">
              {overallScore}
            </div>
            <div className="text-[12px] md:text-[13px] font-semibold mt-1">
              등급 {grade}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5">
          <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            사이트 유형
          </div>
          <div className="text-[16px] md:text-[18px] font-extrabold text-neutral-900 leading-tight">
            {isLocalBusiness ? "🏪 로컬 업종" : "🌐 일반 사이트"}
          </div>
          <div className="text-[11px] md:text-[12px] text-neutral-500 mt-1">
            {isLocalBusiness
              ? "플레이스 항목 가중치 70%"
              : "서치어드바이저 가중치 70%"}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
          <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            AI 총평
          </div>
          <p className="text-[13px] md:text-[14px] text-neutral-900 font-semibold leading-snug break-words">
            {summary}
          </p>
        </div>
      </div>

      {/* 소점수 스트립 */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">🏪</span>
            <span className="text-[13px] md:text-[14px] font-bold text-neutral-900">
              플레이스 AI 브리핑
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[24px] md:text-[28px] font-extrabold text-neutral-900 tabular-nums">
              {placeScore}
            </span>
            <span className="text-[12px] md:text-[13px] text-neutral-500 pb-1">
              /100
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, placeScore))}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px]">🔍</span>
            <span className="text-[13px] md:text-[14px] font-bold text-neutral-900">
              서치어드바이저
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[24px] md:text-[28px] font-extrabold text-neutral-900 tabular-nums">
              {advisorScore}
            </span>
            <span className="text-[12px] md:text-[13px] text-neutral-500 pb-1">
              /100
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, advisorScore))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 플레이스 그룹 */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[14px] md:text-[16px]">🏪</span>
          <h4 className="text-[15px] md:text-[17px] font-extrabold text-neutral-900">
            플레이스 AI 브리핑 준비도 (8개)
          </h4>
          {isLocalBusiness && (
            <span className="text-[10px] md:text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
              로컬 업종 감지
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
          {placeChecks.map((c: any) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </div>
      </div>

      {/* 서치어드바이저 그룹 */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[14px] md:text-[16px]">🔍</span>
          <h4 className="text-[15px] md:text-[17px] font-extrabold text-neutral-900">
            서치어드바이저 연동 (4개)
          </h4>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
          {advisorChecks.map((c: any) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </div>
      </div>

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">💡</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              우선 액션
            </h4>
          </div>
          <ol className="space-y-2">
            {priorityActions.slice(0, 5).map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[14px] md:text-[15px] leading-relaxed"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-white text-neutral-900 font-bold flex items-center justify-center text-[13px] tabular-nums">
                  {i + 1}
                </span>
                <span className="break-words">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-4 text-[11px] md:text-[12px] text-neutral-400 leading-relaxed">
        * 본 진단은 네이버 공식 서비스가 아닌 진짜마케팅의 독립 분석 도구이며,
        네이버 공개 가이드라인을 참고한 참고용 결과입니다. 스마트플레이스·
        서치어드바이저의 실제 설정은 각 관리 페이지에서 직접 확인하세요.
      </p>
    </section>
  );
}
