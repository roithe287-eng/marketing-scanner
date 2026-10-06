import type {MarketingReport} from '@/lib/reportSchema';
import {REPORT_RETENTION_NOTE,retentionTime} from '@/lib/reportRetention';
export default function ReportRetentionNotice({report}:{report:MarketingReport}) {
 const expiry=report.sharedRetention?.expiresAt;
 return <aside className="report-retention-note" aria-label="보고서 보관 기간">
  <strong>{expiry?`열람 종료 · ${retentionTime(expiry)}`:'결과 보관은 최대 7일'}</strong>
  <p>{REPORT_RETENTION_NOTE}</p>
  <p>필요한 PDF는 만료 전에 내려받아 주세요. 내려받은 파일·복사본은 자동 회수되지 않습니다.</p>
 </aside>;
}
