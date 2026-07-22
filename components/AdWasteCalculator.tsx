"use client";

/**
 * v45-W1: 광고비 낭비 시뮬레이터 (인터랙티브 슬라이더)
 * - 사용자가 월 광고비 조절 시 실시간 계산
 * - 3개 시나리오 (CTA만 / +카피 / 종합)별 절감액
 * - 컨설팅 CTA 연결
 */

import { useMemo, useState } from "react";
import type { AdWasteSimulation } from "../lib/reportSchema";

type DiagnosisScores = {
  firstView: number;
  cta: number;
  copywriting: number;
  trust: number;
  conversionFlow: number;
  adLanding: number;
  mobileUx: number;
  seo: number;
};

type Props = {
  diagnosis: DiagnosisScores;
  defaultSimulation?: AdWasteSimulation | null;
};

const BUDGET_MIN = 1_000_000;   // 100만
const BUDGET_MAX = 30_000_000;  // 3000만
const BUDGET_STEP = 500_000;    // 50만 단위

function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

/**
 * 클라이언트에서도 동일하게 계산 (실시간 슬라이더용)
 */
function calcWaste(d: DiagnosisScores) {
  const ctaFactor = (100 - d.cta) * 0.35;
  const firstViewFactor = (100 - d.firstView) * 0.28;
  const trustFactor = (100 - d.trust) * 0.2;
  const mobileUxFactor = (100 - d.mobileUx) * 0.17;
  const rawSum = ctaFactor + firstViewFactor + trustFactor + mobileUxFactor;
  return Math.min(40, Math.round(rawSum * 0.4));
}

function calcScenarios(budget: number, d: DiagnosisScores) {
  const currentRate = calcWaste(d);
  const currentWaste = Math.round((budget * currentRate) / 100);

  const dA = { ...d, cta: Math.max(d.cta, 90) };
  const wasteA = Math.round((budget * calcWaste(dA)) / 100);

  const dB = {
    ...d,
    cta: Math.max(d.cta, 90),
    firstView: Math.max(d.firstView, 85),
    copywriting: Math.max(d.copywriting, 85),
  };
  const wasteB = Math.round((budget * calcWaste(dB)) / 100);

  const dC = {
    firstView: Math.max(d.firstView, 88),
    cta: Math.max(d.cta, 92),
    copywriting: Math.max(d.copywriting, 88),
    trust: Math.max(d.trust, 88),
    conversionFlow: Math.max(d.conversionFlow, 85),
    adLanding: Math.max(d.adLanding, 85),
    mobileUx: Math.max(d.mobileUx, 90),
    seo: Math.max(d.seo, 85),
  };
  const wasteC = Math.round((budget * calcWaste(dC)) / 100);

  return {
    currentRate,
    currentWaste,
    savingA: Math.max(0, currentWaste - wasteA),
    savingB: Math.max(0, currentWaste - wasteB),
    savingC: Math.max(0, currentWaste - wasteC),
  };
}

const SCENARIO_META = [
  {
    id: "A",
    label: "CTA 최적화만",
    duration: "즉시 ~ 3일",
    actions: [
      "CTA 버튼 색상·크기 강화",
      "CTA 문구 명확화",
      "CTA 위치 재배치 (첫화면·중간·하단)",
    ],
    tag: "즉시 실행",
    tone: "sky",
  },
  {
    id: "B",
    label: "CTA + 카피 개선",
    duration: "1주",
    actions: [
      "히어로 헤드라인·서브카피 재작성",
      "첫 화면 3초 임팩트 강화",
      "CTA 문구 A/B 테스트",
    ],
    tag: "단기 실행",
    tone: "violet",
  },
  {
    id: "C",
    label: "종합 최적화",
    duration: "1개월",
    actions: [
      "전환 퍼널 전 구간 재설계",
      "신뢰 요소 (후기·인증) 강화",
      "모바일 UX 리디자인",
      "SEO·GEO 통합 최적화",
    ],
    tag: "컨설팅 권장",
    tone: "red",
  },
];

function toneClasses(tone: string) {
  switch (tone) {
    case "sky":
      return {
        border: "border-sky-200",
        bg: "bg-sky-50",
        text: "text-sky-700",
        tag: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "violet":
      return {
        border: "border-violet-200",
        bg: "bg-violet-50",
        text: "text-violet-700",
        tag: "bg-violet-100 text-violet-700 border-violet-200",
      };
    case "red":
    default:
      return {
        border: "border-rose-200",
        bg: "bg-rose-50",
        text: "text-rose-700",
        tag: "bg-rose-100 text-rose-700 border-rose-200",
      };
  }
}

export default function AdWasteCalculator({
  diagnosis,
  defaultSimulation,
}: Props) {
  const [budget, setBudget] = useState<number>(5_000_000);

  const calc = useMemo(() => calcScenarios(budget, diagnosis), [budget, diagnosis]);

  const savings = [
    { meta: SCENARIO_META[0], amount: calc.savingA },
    { meta: SCENARIO_META[1], amount: calc.savingB },
    { meta: SCENARIO_META[2], amount: calc.savingC },
  ];

  const bestSaving = Math.max(...savings.map((s) => s.amount));
  const annualBestSaving = bestSaving * 12;

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">💰</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            광고비 낭비 시뮬레이터
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          현재 사이트 상태로 광고 집행 시 예상 낭비 금액과 개선 시나리오별 절감액을
          실시간 계산합니다. (지표 기반 추정치)
        </p>
      </div>

      {/* Budget Slider */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-6 mb-5 md:mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[13px] md:text-[14px] font-bold text-neutral-700">
            월 광고비 조정
          </label>
          <div className="text-[22px] md:text-[26px] font-extrabold text-neutral-900 tabular-nums">
            {formatKRW(budget)}
          </div>
        </div>
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-[#e31b23] cursor-pointer h-2"
          aria-label="월 광고비"
        />
        <div className="flex justify-between mt-2 text-[11px] md:text-[12px] text-neutral-500 tabular-nums">
          <span>100만</span>
          <span>500만</span>
          <span>1,000만</span>
          <span>2,000만</span>
          <span>3,000만</span>
        </div>
      </div>

      {/* Current Waste 표시 */}
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 md:p-6 mb-5 md:mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[18px]">⚠️</span>
              <div className="text-[13px] md:text-[14px] font-bold uppercase tracking-wide text-rose-700">
                현재 예상 낭비액
              </div>
            </div>
            <p className="text-[12px] md:text-[13px] text-rose-600/80 leading-relaxed">
              CTA · 첫화면 · 신뢰 · 모바일UX 지표 기반 낭비율 산출
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[28px] md:text-[36px] font-extrabold text-rose-700 leading-none tabular-nums">
              {formatKRW(calc.currentWaste)}
            </div>
            <div className="text-[12px] md:text-[13px] font-semibold text-rose-600 mt-1">
              월 · 낭비율 {calc.currentRate}%
            </div>
          </div>
        </div>
      </div>

      {/* 3개 시나리오 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        {savings.map(({ meta, amount }) => {
          const c = toneClasses(meta.tone);
          const isBest = amount === bestSaving && bestSaving > 0;
          return (
            <div
              key={meta.id}
              className={`rounded-2xl border-2 ${c.border} bg-white p-4 md:p-5 ${
                isBest ? "ring-2 ring-neutral-900 ring-offset-2" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] md:text-[12px] font-semibold ${c.tag}`}
                >
                  시나리오 {meta.id}
                </span>
                {isBest && (
                  <span className="text-[10px] md:text-[11px] font-bold text-neutral-900 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5">
                    최대 절감
                  </span>
                )}
              </div>
              <h4 className="text-[16px] md:text-[18px] font-extrabold text-neutral-900 mb-1 leading-tight">
                {meta.label}
              </h4>
              <p className="text-[11px] md:text-[12px] text-neutral-500 mb-3">
                예상 기간: {meta.duration}
              </p>
              <div className="mb-3">
                <div className="text-[11px] md:text-[12px] font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">
                  월 절감액
                </div>
                <div className={`text-[24px] md:text-[28px] font-extrabold ${c.text} tabular-nums leading-none`}>
                  △{formatKRW(amount)}
                </div>
                <div className="text-[11px] md:text-[12px] text-neutral-500 mt-1">
                  연 {formatKRW(amount * 12)}
                </div>
              </div>
              <ul className="space-y-1">
                {meta.actions.map((a, i) => (
                  <li
                    key={i}
                    className="text-[12px] md:text-[13px] text-neutral-700 flex items-start gap-1.5 leading-snug"
                  >
                    <span className="text-neutral-400 shrink-0">•</span>
                    <span className="break-words">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 총평 + CTA */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[18px]">🎯</span>
              <h4 className="text-[16px] md:text-[18px] font-extrabold">
                최대 절감 가능액
              </h4>
            </div>
            <p className="text-[14px] md:text-[15px] text-neutral-300 leading-relaxed break-words">
              종합 최적화 시 <span className="text-white font-bold">월 {formatKRW(bestSaving)}</span>,
              연간 <span className="text-white font-bold">{formatKRW(annualBestSaving)}</span> 절감
            </p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-neutral-900 font-bold text-[14px] md:text-[15px] px-5 py-3 rounded-xl hover:bg-neutral-100 transition-colors whitespace-nowrap"
          >
            진짜마케팅 컨설팅 상담 →
          </a>
        </div>
        <p className="text-[11px] md:text-[12px] text-neutral-400 mt-3 leading-relaxed">
          * 낭비율 추정치는 진단 점수 가중치 산식(CTA 35% · 첫화면 28% · 신뢰 20% · 모바일UX 17%)
          기반이며, 실제 광고 성과는 업종·채널·소재 등에 따라 달라질 수 있습니다.
        </p>
      </div>
    </section>
  );
}
