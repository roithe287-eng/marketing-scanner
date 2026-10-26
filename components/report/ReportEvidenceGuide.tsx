import type {MarketingReport} from '@/lib/reportSchema';

function warningLabel(report:MarketingReport,field:string) {
  const match=field.match(/^(criticalIssues|quickWinsDetailed)\.(\d+)/);
  if(!match)return '원문 대조';
  const index=Number(match[2]);
  return match[1]==='criticalIssues'?`핵심 이슈 ${index+1} · ${report.criticalIssues[index]?.title||'문구 확인'}`:`빠른 개선 ${index+1}`;
}
export default function ReportEvidenceGuide({report}:{report:MarketingReport}) {
  const warnings=report.integrity?.warnings||[];
  if(report.integrity&&!warnings.length)return null;
  return <aside className="report-evidence-guide" aria-label="원문 재확인 항목">
    <details open className="report-evidence-details">
      <summary>{warnings.length?`원문 재확인 · ${warnings.length}개`:'원문 대조 기록 없음'}<span aria-hidden="true">＋</span></summary>
      {!report.integrity&&<p>이 저장 결과에는 원문 대조 기록이 없습니다. 현재 페이지를 다시 진단해 근거를 확인하세요.</p>}
      {!!warnings.length&&<ul>{warnings.map((warning,i)=><li key={`${warning.field}-${i}`}><strong>{warningLabel(report,warning.field)}</strong><p>{warning.message}</p></li>)}</ul>}
    </details>
  </aside>;
}
