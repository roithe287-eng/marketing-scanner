import React from 'react';
import {COLLECTION_REASONS, type RestrictedWebsiteReport} from '@/lib/restrictedWebsite';

type Props = {
  loading: boolean;
  error: string | null;
  restrictedReport: RestrictedWebsiteReport | null;
  hasPreviousResult: boolean;
};

export default function ScanFeedback({loading, error, restrictedReport, hasPreviousResult}: Props) {
  if (loading) {
    return <div className="scanner-scan-feedback scanner-scan-feedback--loading" role="status">
      <span className="scanner-scan-spinner animate-spin" aria-hidden="true" />
      <div>
        <p className="scanner-scan-title">사이트 원문을 확인하고 있습니다</p>
        <p>페이지에서 읽을 수 있는 정보를 수집해 진단 결과를 준비합니다.</p>
      </div>
    </div>;
  }

  if (error) {
    return <div className="scanner-scan-feedback scanner-scan-feedback--notice" role="alert">
      <p className="scanner-scan-title">{hasPreviousResult ? '새 진단을 완료하지 못했습니다' : '분석을 완료하지 못했습니다'}</p>
      <p>{error}</p>
      {hasPreviousResult && <p>이전 진단 결과는 아래에서 확인할 수 있습니다.</p>}
    </div>;
  }

  if (!restrictedReport) return null;

  return <div className="scanner-scan-feedback scanner-scan-feedback--notice">
    <div role="status">
      <p className="scanner-scan-title">사이트 원문을 읽을 수 없습니다</p>
      <p>{COLLECTION_REASONS[restrictedReport.reason]}으로 원문 수집이 제한됐습니다.</p>
      {restrictedReport.sources.length > 0 && <p>참고할 공개 검색자료 {restrictedReport.sources.length}건을 찾았습니다.</p>}
    </div>
    <div className="scanner-scan-actions">
      <a href="#report-area">수집 결과 보기</a>
      <a href="#scanner-collection-guide">{restrictedReport.reason === 'rate_limited' ? '재진단 안내' : '수집 허용 안내'}</a>
    </div>
  </div>;
}
