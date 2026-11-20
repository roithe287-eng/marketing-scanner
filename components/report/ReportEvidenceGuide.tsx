import ReportJumpLink from './ReportJumpLink';
import type {MarketingReport} from '@/lib/reportSchema';

function warningReference(report:MarketingReport,field:string) {
  const match=field.match(/^(criticalIssues|quickWinsDetailed)\.(\d+)/);
  if(!match)return {label:'원문 대조'};
  const index=Number(match[2]);
  const issue=match[1]==='criticalIssues';
  const row=issue?report.criticalIssues[index]:report.quickWinsDetailed?.[index];
  return {
    label:row?.title||`${issue?'핵심 이슈':'빠른 개선'} ${index+1}`,
    target:row?`${issue?'report-issue':'report-quick-win'}-${index}`:undefined,
  };
}
export default function ReportEvidenceGuide({report}:{report:MarketingReport}) {
  const warnings=report.integrity?.warnings||[];
  if(report.integrity&&!warnings.length)return null;
  return <aside className="report-evidence-guide" aria-label="원문 재확인 항목">
    <details open className="report-evidence-details">
      <summary>{warnings.length?`원문 재확인 · ${warnings.length}개`:'원문 대조 기록 없음'}<span aria-hidden="true">＋</span></summary>
      {!report.integrity&&<p>이 저장 결과에는 원문 대조 기록이 없습니다. 현재 페이지를 다시 진단해 근거를 확인하세요.</p>}
      {!!warnings.length&&<ul>{warnings.map((warning,i)=>{
        const reference=warningReference(report,warning.field);
        return <li key={`${warning.field}-${i}`}>
          <strong>{reference.label}</strong><p>{warning.message}</p>
          {reference.target&&<ReportJumpLink id={reference.target}>원문을 확인할 항목 보기</ReportJumpLink>}
        </li>;
      })}</ul>}
    </details>
  </aside>;
}
