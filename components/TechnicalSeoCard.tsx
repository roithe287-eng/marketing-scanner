"use client";

/**
 * v46-W2-1: 페이지 기술 상태 점검 카드 (독자 디자인 — 저작권 리스크 제거)
 * - 판정 표기: 양호/보통/취약 (기존 앱 컴포넌트 언어와 통일)
 * - 등급 문자(A~F) 표시 없음 · 100점제 스코어만 노출
 * - 그룹 분류: 화면 구성 / 검색엔진 인식 / 주소 연결 (독자 분류)
 * - 데이터 없으면 자동 숨김
 */

import { useState } from "react";
import type { TechnicalSeo } from "../lib/reportSchema";

type Props = {
  technicalSeo?: TechnicalSeo | null;
};

function statusStyle(status: "pass" | "warning" | "fail") {
  switch (status) {
    case "pass":
      return {
        icon: "🟢",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "양호",
        bar: "bg-emerald-400",
      };
    case "warning":
      return {
        icon: "🟡",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "보통",
        bar: "bg-amber-400",
      };
    default:
      return {
        icon: "🔴",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        label: "취약",
        bar: "bg-rose-400",
      };
  }
}

function scoreTone(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-sky-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function CheckRow({ check }: { check: any }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(check.status);
  const hasEvidence =
    Array.isArray(check.evidence) && check.evidence.length > 0;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 md:p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] md:text-[13px]">{s.icon}</span>
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
        {check.diagnosis}
      </p>
      {check.status !== "pass" && (
        <p className="text-[12px] md:text-[13px] text-neutral-600 leading-relaxed break-words border-l-2 border-neutral-300 pl-2.5">
          <span className="font-semibold text-neutral-700">💡 이렇게 해보세요:</span>{" "}
          {check.guide}
        </p>
      )}
      {hasEvidence && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] md:text-[12px] font-semibold text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
          >
            {open
              ? "목록 접기 ▲"
              : `실제 발견된 항목 ${check.evidence.length}개 ▼`}
          </button>
          {open && (
            <ul className="mt-1.5 space-y-1 max-h-36 overflow-y-auto rounded-lg bg-neutral-50 p-2.5">
              {check.evidence.map((ev: string, i: number) => (
                <li
                  key={i}
                  className="text-[11px] md:text-[12px] text-neutral-600 break-all font-mono"
                >
                  {ev}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  title,
  desc,
  checks,
}: {
  icon: string;
  title: string;
  desc: string;
  checks: any[];
}) {
  if (checks.length === 0) return null;
  const ok = checks.filter((c) => c.status === "pass").length;
  return (
    <div className="mb-5 md:mb-6">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[14px] md:text-[16px]">{icon}</span>
        <h4 className="text-[15px] md:text-[17px] font-extrabold text-neutral-900">
          {title}
        </h4>
        <span className="text-[12px] md:text-[13px] text-neutral-400 font-semibold">
          {ok}/{checks.length} 양호
        </span>
      </div>
      <p className="text-[12px] md:text-[13px] text-neutral-500 mb-3 ml-6">
        {desc}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </div>
    </div>
  );
}

export default function TechnicalSeoCard({ technicalSeo }: Props) {
  if (!technicalSeo) return null;

  const { overallScore, summary, counts, checks, priorityActions } =
    technicalSeo;
  const total = counts.pass + counts.warning + counts.fail;

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">⚙️</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            페이지 기술 상태 점검
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          검색엔진이 이 페이지를 제대로 읽고 저장할 수 있는 상태인지, 11가지
          기술 요소를 기계적으로 점검했습니다. AI 분석이 아닌 실제 코드·서버
          응답 측정 결과입니다.
        </p>
      </div>

      {/* Summary Strip — 점수 게이지 + 상태 분포 바 */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-6 mb-5 md:mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              기술 상태 종합
            </div>
            <p className="text-[13px] md:text-[14px] text-neutral-700 mt-1 leading-snug break-words">
              {summary}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div
              className={`text-[38px] md:text-[46px] font-extrabold leading-none tabular-nums ${scoreTone(overallScore)}`}
            >
              {overallScore}
            </div>
            <div className="text-[11px] md:text-[12px] text-neutral-400 font-semibold mt-1">
              / 100점
            </div>
          </div>
        </div>
        {/* 상태 분포 바 */}
        <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden flex">
          {counts.pass > 0 && (
            <div
              className="bg-emerald-400"
              style={{ width: `${(counts.pass / total) * 100}%` }}
            />
          )}
          {counts.warning > 0 && (
            <div
              className="bg-amber-400"
              style={{ width: `${(counts.warning / total) * 100}%` }}
            />
          )}
          {counts.fail > 0 && (
            <div
              className="bg-rose-400"
              style={{ width: `${(counts.fail / total) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[11px] md:text-[12px] text-neutral-500">
            🟢 양호 {counts.pass}
          </span>
          <span className="text-[11px] md:text-[12px] text-neutral-500">
            🟡 보통 {counts.warning}
          </span>
          <span className="text-[11px] md:text-[12px] text-neutral-500">
            🔴 취약 {counts.fail}
          </span>
        </div>
      </div>

      <Group
        icon="🖥"
        title="화면 구성"
        desc="방문자와 검색엔진이 첫 화면을 만났을 때의 속도·구조 요소"
        checks={checks.filter((c: any) => c.group === "aeo")}
      />
      <Group
        icon="🔍"
        title="검색엔진 인식"
        desc="검색엔진이 이 페이지의 내용을 올바로 이해하기 위한 요소"
        checks={checks.filter((c: any) => c.group === "index")}
      />
      <Group
        icon="🔗"
        title="주소 연결"
        desc="입력한 주소가 실제 페이지까지 안전하게 연결되는지"
        checks={checks.filter((c: any) => c.group === "crawl")}
      />

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">🧰</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              지금 손볼 것, 순서대로
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
        * 본 점검은 진짜마케팅이 자체 기준으로 개발한 독립 분석이며, 특정 포털의
        진단 서비스와 무관합니다. 권장 수치(응답 3초·용량 4MB·제목 15~45자 등)는
        업계에서 널리 쓰이는 일반 기준을 참고했고, 응답 속도는 측정 시점의 네트워크
        상태에 따라 달라질 수 있습니다.
      </p>
    </section>
  );
}
