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
      : '고객이 묻는 내용과 페이지에서 바로 확인할 수 있는 답을 살펴보세요.',
    'overview-observations': review
      ? `기준을 판정한 HTML 항목 ${review.assessed}개 중 ${review.passed}개를 충족했습니다. 미확인 ${review.unknown}개는 별도입니다.`
      : '페이지 진단을 방문부터 문의·구매까지의 흐름에 맞춰 확인하세요.',
    'overview-comparison': '이전 진단과 현재 진단을 같은 항목끼리 대조해 수정 결과를 확인하세요.',
    'geo-observations': !obs
      ? (report.llmCitationTest ? '이전 형식의 AI 관측 기록입니다. 현재 기준의 인용률은 계산할 수 없습니다.' : '저장된 AI 답변 관측이 없습니다.')
      : [
          obs.mentionTotal ? `언급 판정 ${obs.mentionTotal}건 중 브랜드 언급 ${obs.mentionCount}건` : '브랜드 언급 판정 전',
          obs.sourceTotal ? `출처 판정 ${obs.sourceTotal}건 중 자사 인용 ${obs.sourceCount}건` : '출처 판정 전',
        ].join(' · '),
    'geo-questions': data.questions.length
      ? `관측한 고객 질문 ${data.questions.length}개 · 각 질문에 답할 페이지를 확인하세요.`
      : '질문과 페이지를 연결할 관측 기록이 없습니다.',
    'geo-brand': reviewSummary.verified
      ? `출처 확인을 마친 답변은 ${reviewSummary.verified}건입니다. 이 중 우리 이름을 언급하고 외부 출처만 연결한 답변은 ${data.reviews.length}건입니다.`
      : '브랜드 표현을 대조할 수 있는 출처 확인 기록이 없습니다.',
    'geo-sources': reviewSummary.verified
      ? `참고할 외부 출처 ${data.eligibleSources.length}개 · 연결된 질문과 원문을 함께 확인하세요.`
      : '인용 출처를 분류할 수 있는 답변 기록이 없습니다.',
    'geo-readiness': ready.length
      ? `콘텐츠 준비도 ${ready.length}개 항목 · 실제 AI 인용 결과는 ‘실제 AI 답변’에서 확인하세요.`
      : '우리 페이지가 질문에 답할 내용과 근거를 갖추었는지 확인하세요.',
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
      ? `수집이 제한된 항목이 ${report.analysisWarnings.length}건 있습니다. 항목별 상태와 이유를 확인하세요.`
      : '페이지에서 읽은 정보, 실제 화면과 광고 계정에서 확인할 정보를 살펴보세요.',
    'search-checklist': `기본 점검 ${checks.length}개 · 보완·검토 ${checks.filter(c=>['fail','warning','review'].includes(c.status)).length}개`,
    'competition-messages': data.competitorCount
      ? `후보 ${data.competitorCount}곳의 제목과 설명을 비교합니다. 실제 제공 범위와 맞는 표현을 골라 보세요.` : '자사 메시지와 비교할 후보 페이지 기록이 없습니다.',
    'competition-pages': `후보 ${data.competitorCount}곳 중 ${data.metadataCount}곳에서 제목, 설명, 대표 제목, 버튼 중 하나 이상을 확인했습니다.`,
    'competition-benchmark': '업종 표본의 수집 시점과 평가 기준을 확인한 뒤 자사와 비교하세요.',
    'actions-board': tasks.length
      ? `보완 과제 ${tasks.length}개입니다. 담당자별로 수정할 위치와 완료 기준을 확인하세요.` : '저장된 진단에서 분류된 보완 과제가 없습니다.',
    'actions-guide': '검색 수집, 고객 질문에 답할 페이지, 문의·구매 경로 순서로 적용 방법을 확인하세요.',
    'actions-issues': firstIssue ? `핵심 이슈 ${report.criticalIssues.length}개입니다. 확인한 내용과 고객에게 줄 수 있는 영향을 살펴보세요.` : '저장된 핵심 이슈가 없습니다.',
    'actions-copy': '제목이 약속한 내용부터 버튼을 누른 뒤의 행동까지 자연스럽게 이어지는지 확인하세요.',
    'actions-schedule': `즉시 ${schedule.immediately.length}개 · 이번 주 ${schedule.thisWeek.length}개 · 이번 달 ${schedule.thisMonth.length}개`,
    'actions-kpi': '현재 완료율을 기준으로 목표에 필요한 방문 수를 계산하세요.',
    'actions-geo': data.questions.length
      ? `관측 질문 ${data.questions.length}개 · 자사 답변 근거를 보강할 과제를 확인하세요.`
      : '자사 페이지에 질문·답변·근거를 준비하고 같은 질문으로 다시 확인하세요.',
  };
}
