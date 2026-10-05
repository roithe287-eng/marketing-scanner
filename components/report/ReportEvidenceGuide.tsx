import type {MarketingReport} from '@/lib/reportSchema';
import {INTEGRITY_NOTE} from '@/lib/reportIntegrity';

function warningLabel(report:MarketingReport,field:string) {
  const match=field.match(/^(criticalIssues|quickWinsDetailed)\.(\d+)/);
  if(!match)return '원문 대조';
  const index=Number(match[2]);
  return match[1]==='criticalIssues'?`핵심 이슈 ${index+1} · ${report.criticalIssues[index]?.title||'문구 확인'}`:`빠른 개선 ${index+1}`;
}
export default function ReportEvidenceGuide({report}:{report:MarketingReport}) {
  const warnings=report.integrity?.warnings||[];
  return <aside className="report-evidence-guide" aria-label="결과의 근거와 검증 범위">
    <header><div><p className="report-eyebrow">HOW TO READ YOUR REPORT</p><h2>결과의 근거와 검증 범위</h2></div><span className="report-pill">확인 → 해석 → 실행</span></header>
    <div className="report-evidence-types">
      <section><span aria-hidden="true">01</span><h3>수집 관측</h3><p>페이지 문구·태그, 검색 응답과 AI 답변에서 확인한 내용입니다. 각 항목의 수집 범위와 시점을 함께 보세요.</p><strong>{report.pageEvidence?'입력 페이지 원문 저장됨':'입력 페이지 원문 스냅샷 없음'}</strong></section>
      <section><span aria-hidden="true">02</span><h3>AI 해석</h3><p>점수와 개선 우선순위는 수집 자료를 바탕으로 한 평가입니다. 실제 순위·매출·사용자 경험을 측정한 값과 구분하세요.</p><strong>평가 점수 ≠ 실제 성과</strong></section>
      <section><span aria-hidden="true">03</span><h3>실행 제안</h3><p>위치·수정 예시·기대효과를 검토하고 적용하세요. 실제 제공 범위와 관리자 메뉴를 확인한 뒤, 적용 전후 KPI를 비교하세요.</p><strong>사실 확인 후 적용 · 효과는 별도 측정</strong></section>
    </div>
    <details className="report-evidence-details"><summary>검증 범위{warnings.length?` · 재확인 ${warnings.length}개`:'와 해석 시 유의점'}<span aria-hidden="true">＋</span></summary>
      <p>{report.integrity?.note||INTEGRITY_NOTE}</p>
      {!report.integrity&&<p>이 저장 결과에는 원문 대조 기록이 없습니다. 현재 페이지를 다시 진단해 근거를 확인하세요.</p>}
      {!!warnings.length&&<ul>{warnings.map((warning,i)=><li key={`${warning.field}-${i}`}><strong>{warningLabel(report,warning.field)}</strong><p>{warning.message}</p></li>)}</ul>}
    </details>
  </aside>;
}
