/** Service policy for saved diagnostic reports; not a statutory retention period. */
export const REPORT_RETENTION_DAYS = 7;
export const REPORT_RETENTION_SECONDS = REPORT_RETENTION_DAYS * 86400;
export const REPORT_RETENTION_NOTE = '공유 보고서는 최초 보관 후 최대 7일간 열람·비교할 수 있습니다. 만료 시 공유 페이지 접근이 차단되고 서비스 저장소의 보고서가 자동 삭제됩니다. 비교 내용을 함께 보관하면 기준 보고서의 더 이른 만료일을 따르며, 열람·재저장으로 기간이 연장되지 않습니다.';
export function retentionTime(value:number) {
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' (한국시간)';
}
