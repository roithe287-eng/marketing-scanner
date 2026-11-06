import type {MarketingReport} from './reportSchema';
import type {ReportInsights} from './reportInsights';
import {buildPageEdits} from './reportExecution';
import type {SourceLibrary} from './reportContent';
import {editingPlatform} from './siteGuidebook';
import {readinessItems} from './reportVisuals';

/** A section's opening line uses the same snapshot and denominators as its detailed view. */
export function buildSectionBriefs(report: MarketingReport, data: ReportInsights, sources: SourceLibrary): Record<string,string> {
  const {obs, reviewSummary, tasks} = data;
  const naver = report.naverOptimization;
  const official = report.officialSeoAudit;
  const audit = report.siteDiagnostics;
  const review = report.evidenceReview;
  const answers = report.answerContentPlan;
  const ready = readinessItems(report.discoverability);
  const edits = buildPageEdits(report).filter(item => item.after);
  const schedule = report.priorityRoadmap;
  const checks = report.checklist || [];
  const firstIssue = report.criticalIssues[0];
  const firstGap = data.gaps[0];
  return {
    'overview-questions': answers?.questions.length
      ? `${answers.mode==='ai-assisted'?'추천 질문':'질문 가이드'} ${answers.questions.length}개 · ${answers.questions[0].question}`
      : '페이지에서 고객 질문에 답할 원문과 작성 예시를 확인하세요.',
    'overview-observations': review
      ? `HTML 기본 항목 ${review.assessed}개 중 ${review.passed}개 충족 · 미확인 ${review.unknown}개`
      : '페이지 진단을 방문부터 문의·구매까지의 흐름에 맞춰 확인하세요.',
    'overview-comparison': '이전 진단과 현재 진단을 같은 항목끼리 대조해 수정 결과를 확인하세요.',
    'geo-observations': !obs
      ? (report.llmCitationTest ? '이전 형식의 AI 관측 기록입니다. 현재 기준의 인용률은 계산할 수 없습니다.' : '저장된 AI 답변 관측이 없습니다.')
      : [
          obs.mentionTotal ? `브랜드 언급 ${obs.mentionCount}/${obs.mentionTotal}건` : '브랜드 언급 판정 전',
          obs.sourceTotal ? `자사 출처 인용 ${obs.sourceCount}/${obs.sourceTotal}건` : '출처 판정 전',
        ].join(' · '),
    'geo-questions': data.questions.length
      ? `관측한 고객 질문 ${data.questions.length}개 · 각 질문에 답할 페이지를 확인하세요.`
      : '질문과 페이지를 연결할 관측 기록이 없습니다.',
    'geo-brand': reviewSummary.verified
      ? `출처를 확인한 답변 ${reviewSummary.verified}건 중 외부 출처만 연결한 브랜드 언급 답변 ${data.reviews.length}건`
      : '브랜드 표현을 대조할 수 있는 출처 확인 기록이 없습니다.',
    'geo-sources': reviewSummary.verified
      ? `참고할 외부 출처 ${data.eligibleSources.length}개 · 연결된 질문과 원문을 함께 확인하세요.`
      : '인용 출처를 분류할 수 있는 답변 기록이 없습니다.',
    'geo-readiness': ready.length
      ? `콘텐츠 준비도 ${ready.length}개 항목 · 실제 AI 인용 결과는 ‘실제 AI 답변’에서 확인하세요.`
      : 'AI가 읽을 콘텐츠와 실제 인용을 어떤 기준으로 구분하는지 확인하세요.',
    'geo-comparison': '이전과 현재의 같은 질문을 대조해 브랜드 언급과 자사 출처의 변화를 확인하세요.',
    'search-platforms': `${editingPlatform(report).label} · 사용 중인 제작 도구에서 실제 수정 위치를 확인하세요.`,
    'search-edits': edits.length ? `수정 제안 ${edits.length}개 · ${edits[0].label}부터 원문과 비교하세요.` : '저장된 수정 제안이 없습니다. 수집된 원문과 적용 위치를 확인하세요.',
    'search-sources': report.pageEvidence || sources.groups.length || sources.links.length
      ? `원문 ${sources.groups.length}개 · 연결 주소 ${sources.links.length}개`
      : '이 보고서에서 확인할 수 있는 원문·링크 기록이 없습니다.',
    'search-keywords': firstGap ? `제목·설명에서 먼저 검토할 표현 · ${firstGap.keyword}` : '본문의 단어 빈도와 제목·설명에 실제로 쓰인 표현을 대조하세요.',
    'search-naver': naver?.mode === 'diagnosis'
      ? `점검 ${naver.checks.length}개 · 조치 필요 ${naver.checks.filter(c=>c.status==='action').length}개`
      : '현재 기준으로 저장된 네이버 점검 기록이 없습니다.',
    'search-official': official?.mode === 'diagnosis'
      ? `점검 ${official.checks.length}개 · 조치 필요 ${official.checks.filter(c=>c.status==='action').length}개`
      : '현재 기준의 공통 검색 점검 기록이 없습니다.',
    'search-technical': audit
      ? `수집한 페이지 ${audit.pages.length}개 · 기술 점검 결과 ${audit.findings.length}개`
      : '수집된 페이지·기술 점검 기록이 없습니다.',
    'search-scope': report.analysisWarnings?.length
      ? `수집 제한 ${report.analysisWarnings.length}건 · ${report.analysisWarnings.map(w=>w.label).join(' · ')}`
      : '입력 URL에서 수집한 정보와 화면·계정에서 직접 확인할 범위를 구분합니다.',
    'search-checklist': `기본 점검 ${checks.length}개 · 보완·검토 ${checks.filter(c=>['fail','warning','review'].includes(c.status)).length}개`,
    'competition-messages': data.competitorCount
      ? `비교 후보 ${data.competitorCount}곳 · 자사와 후보의 제목·설명에 쓰인 표현을 대조하세요.` : '자사 메시지와 비교할 후보 페이지 기록이 없습니다.',
    'competition-pages': `비교 후보 ${data.competitorCount}곳 중 상세 단서가 수집된 곳 ${data.metadataCount}곳`,
    'competition-benchmark': '업종 표본의 수집 시점과 평가 기준을 확인한 뒤 자사와 비교하세요.',
    'actions-board': tasks.length
      ? `보완 과제 ${tasks.length}개 · 먼저 확인할 항목은 ‘${tasks[0].title}’입니다.` : '저장된 진단에서 분류된 보완 과제가 없습니다.',
    'actions-guide': '검색 수집, 고객 질문에 답할 페이지, 문의·구매 경로 순서로 적용 방법을 확인하세요.',
    'actions-issues': firstIssue ? `핵심 이슈 ${report.criticalIssues.length}개 · ${firstIssue.title}` : '저장된 핵심 이슈가 없습니다.',
    'actions-copy': report.exampleCopy.ctaText
      ? `버튼 문구 제안 · ${report.exampleCopy.ctaText}` : '첫 화면 제목과 버튼에 적용할 문구를 확인하세요.',
    'actions-schedule': `즉시 ${schedule.immediately.length}개 · 이번 주 ${schedule.thisWeek.length}개 · 이번 달 ${schedule.thisMonth.length}개`,
    'actions-kpi': '목표 완료 수와 현재 전환율로 필요한 유입을 계산하세요.',
    'actions-geo': data.questions.length
      ? `관측 질문 ${data.questions.length}개 · 자사 답변 근거를 보강할 과제를 확인하세요.`
      : '자사 페이지에 질문·답변·근거를 준비하고 같은 질문으로 다시 확인하세요.',
  };
}
