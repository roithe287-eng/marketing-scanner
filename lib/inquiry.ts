export const inquiryServiceIds = ['no-agency', 'naver-ads', 'meta-ads'] as const;
export type InquiryService = (typeof inquiryServiceIds)[number];

export const inquiryServices: ReadonlyArray<{ id: InquiryService; label: string; description: string }> = [
  { id: 'no-agency', label: '대행문의 필요없음', description: '마케팅스캐너 이용만 안내받을게요' },
  { id: 'naver-ads', label: '네이버 광고대행 문의', description: '네이버 광고 상담도 함께' },
  { id: 'meta-ads', label: '메타 광고대행 문의', description: '메타 광고 상담도 함께' },
];

/** Explicit opt-out and advertising interest are mutually exclusive. */
export function toggleInquiryService(current: readonly InquiryService[], service: InquiryService, checked: boolean): InquiryService[] {
  if (!checked) return current.filter(item => item !== service);
  if (service === 'no-agency') return ['no-agency'];
  return [...new Set([...current.filter(item => item !== 'no-agency'), service])];
}

export function inquiryServiceLabels(services?: readonly InquiryService[]) {
  return inquiryServices.filter(service => services?.includes(service.id)).map(service => service.label);
}
