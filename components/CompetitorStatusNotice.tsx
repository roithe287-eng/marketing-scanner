import type { MarketingReport } from '@/lib/reportSchema';

export default function CompetitorStatusNotice({report,onRetry}:{report:MarketingReport;onRetry?:()=>void}) {
  const result=report.competitorStatus;
  if(!result || result.status==='pending' || result.status==='complete') return null;
  const failed=result.status==='error' || result.status==='timeout';
  return <div className="jm-card mt-8 border-dashed p-6 text-center" role="status">
    <h3 className="font-bold">{failed?'경쟁사 비교를 완료하지 못했습니다':result.status==='empty'?'비교할 경쟁사를 찾지 못했습니다':'경쟁사 비교 데이터가 없습니다'}</h3>
    <p className="mt-2 text-sm text-jm-gray">{result.message}</p>
    <p className="mt-2 text-sm text-jm-gray">완료된 진단 결과는 공유하고 PDF로 다운로드할 수 있습니다.</p>
    {failed && onRetry && <button type="button" className="jm-button mt-4" onClick={onRetry}>경쟁사 분석 다시 시도</button>}
  </div>;
}
