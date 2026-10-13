/** Public price information. Account access is granted through the inquiry flow. */
export const scannerPlans = [
  { id: 'single', name: '1회 진단권', label: 'PDF 미포함', price: 4900, count: 1, monthly: false, pdf: false, description: '진단 결과를 화면에서 바로 확인하고 싶을 때.' },
  { id: 'single-pdf', name: '1회 진단권', label: 'PDF 포함', price: 9900, count: 1, monthly: false, pdf: true, description: '진단 결과를 보고서로 저장하고 싶을 때.' },
  { id: 'monthly-15', name: '월 15회 이용권', label: '추천', price: 49000, count: 15, monthly: true, pdf: true, description: '주요 페이지를 점검하고, 수정 후 다시 확인할 때.' },
  { id: 'monthly-30', name: '월 30회 이용권', label: 'PDF 포함', price: 79000, count: 30, monthly: true, pdf: true, description: '여러 사이트와 랜딩페이지를 꾸준히 관리할 때.' },
  { id: 'monthly-100', name: '월 100회 이용권', label: 'PDF 포함', price: 199000, count: 100, monthly: true, pdf: true, description: '다양한 브랜드와 고객사의 페이지를 진단할 때.' },
  { id: 'volume', name: '대량 이용권', label: '맞춤 상담', price: null, count: null, monthly: false, pdf: null, description: '더 많은 진단이 필요하다면 이용량에 맞춰 안내합니다.' },
] as const;

export const agencyBenefit = '네이버/메타 광고 대행 시 무료 제공';
export const agencyPlanId = 'agency';
export const formatWon = (amount: number) => amount.toLocaleString('ko-KR');
export const planInquiryHref = (id: string) => `/inquiry?plan=${encodeURIComponent(id)}`;

export function inquiryPlanLabel(id?: string): string | undefined {
  if (id === agencyPlanId) return agencyBenefit;
  const plan = scannerPlans.find(candidate => candidate.id === id);
  if (!plan) return undefined;
  return `${plan.name}${plan.id.startsWith('single') ? ` (${plan.label})` : ''} · ${plan.price === null ? '별도 협의' : `${formatWon(plan.price)}원${plan.monthly ? '/월' : ''}`}`;
}
