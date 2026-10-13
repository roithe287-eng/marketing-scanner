export const inquiryServiceIds = ['naver-ads', 'meta-ads'] as const;
export type InquiryService = (typeof inquiryServiceIds)[number];

export const inquiryServices: ReadonlyArray<{ id: InquiryService; label: string }> = [
  { id: 'naver-ads', label: '네이버 광고대행 문의' },
  { id: 'meta-ads', label: '메타 광고대행 문의' },
];

export function inquiryServiceLabels(services?: readonly InquiryService[]) {
  return inquiryServices.filter(service => services?.includes(service.id)).map(service => service.label);
}
