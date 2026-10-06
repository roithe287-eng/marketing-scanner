export const ACTIVITY_LABELS = {
  login: '로그인 성공', login_failed: '로그인 실패', logout: '로그아웃',
  activated: '계정 활성화', owner_created: '관리자 등록',
  analyze_started: '사이트 진단 요청', analyze_success: '사이트 진단 완료', analyze_failed: '사이트 진단 실패',
  competitor_started: '경쟁사 비교 요청', competitor_success: '경쟁사 비교 완료', competitor_failed: '경쟁사 비교 실패',
  deepdive_started: '상세 분석 요청', deepdive_success: '상세 분석 완료', deepdive_failed: '상세 분석 실패',
  pdf_requested: 'PDF 생성 요청', pdf_ready: 'PDF 생성 완료', pdf_failed: 'PDF 생성 실패',
  pdf_save: 'PDF 파일 저장 클릭', pdf_open: 'PDF 열어보기 클릭',
  share_created: '공유 링크 생성', report_view: '공유 보고서 열람', comparison_loaded: '비교 보고서 연결',
  share_updated: '공유 보고서 갱신', account_created: '고객 계정 생성',
  account_approved: '계정 승인', account_updated: '이용 조건 변경', invite_reissued: '활성화 링크 재발급',
  inquiry_closed: '문의 종료', account_deleted: '고객 계정 삭제', admin_view: '관리자 기록 조회',
} as const;
export type ActivityAction = keyof typeof ACTIVITY_LABELS;
export type ActivityEvent = {
  id: string; accountId: string; action: ActivityAction; at: number;
  ip: string | null; device: string; source: 'server' | 'browser';
  target?: string; reportId?: string; expiresAt?: number;
  scope?: 'full' | 'summary'; subjectId?: string;
};
export type ActivityStats = Partial<Record<ActivityAction, number>> & { firstTrackedAt?: number; lastSeenAt?: number };
export const ACTIVITY_DAYS = 30;
export const ACTIVITY_POLICY = '이용 승인·보안·사용량 관리를 위해 계정 ID, 접속 IP, 브라우저·운영체제 종류, 로그인·분석·PDF·공유 링크 이용 시각을 기록합니다. 상세 접속 기록은 최대 30일, IP를 제외한 누적 이용 횟수는 계정 삭제 시까지 보관하며 관리자만 조회할 수 있습니다. 보고서 내용은 최대 7일 후 삭제됩니다.';
