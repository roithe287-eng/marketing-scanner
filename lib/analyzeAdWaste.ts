import { AdWasteSimulation, AdWasteScenario } from "./reportSchema";

/**
 * v45-W1: 광고비 낭비 시뮬레이션
 * - 진단 점수(CTA/firstView/trust/mobileUx)로 낭비율 산출
 * - 3개 시나리오 (CTA만 / +카피 / 종합)별 절감액 계산
 * - 서버에서 기본값 계산, 클라이언트 슬라이더로 실시간 재계산
 * - 순수 함수 · 실패 없음
 */

const DEFAULT_MONTHLY_BUDGET = 5_000_000; // 500만원 기본

interface DiagnosisScores {
  firstView: number;
  cta: number;
  copywriting: number;
  trust: number;
  conversionFlow: number;
  adLanding: number;
  mobileUx: number;
  seo: number;
}

/**
 * 낭비율 계산 (0~40% 캡)
 * 가중치: CTA 35% / 첫화면 28% / 신뢰 20% / 모바일UX 17% = 100%
 */
export function calcWasteRate(d: DiagnosisScores): {
  wasteRate: number;
  factors: { cta: number; firstView: number; trust: number; mobileUx: number };
} {
  const ctaFactor = (100 - d.cta) * 0.35;
  const firstViewFactor = (100 - d.firstView) * 0.28;
  const trustFactor = (100 - d.trust) * 0.2;
  const mobileUxFactor = (100 - d.mobileUx) * 0.17;

  // 원점수 → 백분율 변환 (최대 100점*가중치 = 100)
  // 실제 낭비율은 이 값의 40% cap 적용 (완전 취약해도 최대 40% 낭비)
  const rawSum = ctaFactor + firstViewFactor + trustFactor + mobileUxFactor;
  const wasteRate = Math.min(40, Math.round(rawSum * 0.4));

  return {
    wasteRate,
    factors: {
      cta: Math.round(ctaFactor),
      firstView: Math.round(firstViewFactor),
      trust: Math.round(trustFactor),
      mobileUx: Math.round(mobileUxFactor),
    },
  };
}

/**
 * 시나리오별 절감액 계산
 */
export function buildScenarios(
  budget: number,
  d: DiagnosisScores
): AdWasteScenario[] {
  const { wasteRate } = calcWasteRate(d);
  const currentWaste = Math.round((budget * wasteRate) / 100);

  // 시나리오 A: CTA만 최적화 → CTA 점수 90 가정
  const dA = { ...d, cta: Math.max(d.cta, 90) };
  const wasteA = Math.round((budget * calcWasteRate(dA).wasteRate) / 100);
  const savingA = Math.max(0, currentWaste - wasteA);

  // 시나리오 B: CTA + 첫화면 + 카피
  const dB = {
    ...d,
    cta: Math.max(d.cta, 90),
    firstView: Math.max(d.firstView, 85),
    copywriting: Math.max(d.copywriting, 85),
  };
  const wasteB = Math.round((budget * calcWasteRate(dB).wasteRate) / 100);
  const savingB = Math.max(0, currentWaste - wasteB);

  // 시나리오 C: 종합 최적화 (모든 취약 지표 상향)
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
  const wasteC = Math.round((budget * calcWasteRate(dC).wasteRate) / 100);
  const savingC = Math.max(0, currentWaste - wasteC);

  return [
    {
      id: "scenario-a",
      label: "CTA 최적화만",
      savingAmount: savingA,
      savingRate: budget > 0 ? Math.round((savingA / budget) * 100) : 0,
      duration: "즉시 ~ 3일",
      actions: [
        "CTA 버튼 색상·크기 강화",
        "CTA 문구 명확화 ('무료 상담' 등)",
        "CTA 배치 위치 최적화 (첫화면 · 중간 · 하단)",
      ],
    },
    {
      id: "scenario-b",
      label: "CTA + 카피 개선",
      savingAmount: savingB,
      savingRate: budget > 0 ? Math.round((savingB / budget) * 100) : 0,
      duration: "1주",
      actions: [
        "히어로 헤드라인·서브카피 전면 재작성",
        "첫 화면 3초 임팩트 강화",
        "CTA 문구 A/B 테스트 대응 카피 도입",
      ],
    },
    {
      id: "scenario-c",
      label: "종합 최적화 (컨설팅 권장)",
      savingAmount: savingC,
      savingRate: budget > 0 ? Math.round((savingC / budget) * 100) : 0,
      duration: "1개월",
      actions: [
        "전환 퍼널 전 구간 재설계",
        "신뢰 요소 (후기·인증) 강화",
        "모바일 UX 리디자인",
        "SEO·GEO 통합 최적화",
      ],
    },
  ];
}

/**
 * 광고비 낭비 시뮬레이션 실행 (동기 · 순수 함수)
 */
export function analyzeAdWaste(
  diagnosis: DiagnosisScores,
  monthlyBudget: number = DEFAULT_MONTHLY_BUDGET
): AdWasteSimulation {
  const { wasteRate, factors } = calcWasteRate(diagnosis);
  const scenarios = buildScenarios(monthlyBudget, diagnosis);

  const bestSaving = Math.max(...scenarios.map((s) => s.savingAmount));
  const annualSaving = bestSaving * 12;

  const summary =
    wasteRate >= 30
      ? `현재 사이트 상태로 광고 집행 시 예상 낭비율 ${wasteRate}%. 종합 최적화 시 연 최대 ${Math.round(
          annualSaving / 10000
        )}만원 절감 가능.`
      : wasteRate >= 15
      ? `현재 사이트는 광고 효율 보통 수준(낭비율 ${wasteRate}%). 부분 개선으로 연 ${Math.round(
          annualSaving / 10000
        )}만원 추가 절감 여지.`
      : `현재 사이트 상태 양호(낭비율 ${wasteRate}%). 미세 최적화로 연 ${Math.round(
          annualSaving / 10000
        )}만원 절감 가능.`;

  return {
    baseWasteRate: wasteRate,
    contributionFactors: factors,
    scenarios,
    summary,
  };
}
