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
      ? `${answers.mode==='ai-assisted'?'추천 질문':'질문 가이드'} ${answers.questions.length}개입니다. 원문으로 답할 수 있는 질문과 추가 확인이 필요한 질문을 살펴보세요.`
      : '고객이 묻는 내용과 페이지에서 바로 확인할 수 있는 답을 살펴보세요.',
    'overview-observations': review
      ? review.assessed?`판정한 HTML 항목 ${review.assessed}개 중 ${review.passed}개가 기준을 충족했습니다. 미확인 ${review.unknown}개는 별도입니다.`
        : `판정 가능한 HTML 항목이 없습니다. 직접 확인할 항목은 ${review.unknown}개입니다.`
      : '페이지 진단을 방문부터 문의·구매까지의 흐름에 맞춰 확인하세요.',
    'overview-comparison': '같은 주소와 기준으로 확인한 항목에서 개선·악화·유지를 살펴보세요.',
    'geo-observations': !obs
      ? (report.llmCitationTest ? '이전 형식의 AI 관측 기록입니다. 현재 기준의 인용률은 계산할 수 없습니다.' : '저장된 AI 답변 관측이 없습니다.')
      : [
          obs.mentionTotal ? `언급 판정 ${obs.mentionTotal}건 중 브랜드 언급 ${obs.mentionCount}건` : '브랜드 언급 판정 전',
          obs.sourceTotal ? `출처 판정 ${obs.sourceTotal}건 중 자사 인용 ${obs.sourceCount}건` : '출처 판정 전',
        ].join(' · '),
    'geo-questions': data.questions.length
      ? `관측 질문 ${data.questions.length}개입니다. 어떤 페이지에 답을 보강할지 질문마다 확인하세요.`
      : '질문과 페이지를 연결할 관측 기록이 없습니다.',
    'geo-brand': reviewSummary.verified
      ? data.reviews.length?`우리 이름을 언급하고 외부 출처만 연결한 답변 ${data.reviews.length}건을 먼저 대조하세요. 업체명과 서비스 조건을 확인할 수 있습니다.`:'출처 확인을 마쳤습니다. 외부 출처만 연결한 브랜드 언급 답변을 우선 확인하는 기준을 볼 수 있습니다.'
      : '브랜드 표현을 대조할 수 있는 출처 확인 기록이 없습니다.',
    'geo-sources': reviewSummary.verified
      ? `목록에 남은 출처 주소 ${data.eligibleSources.length}개입니다. 어떤 질문에 쓰였는지 보고 참고할 페이지를 고르세요.`
      : '인용 출처를 분류할 수 있는 답변 기록이 없습니다.',
    'geo-readiness': ready.length
      ? `준비도 점검 ${ready.length}개입니다. 질문에 답할 본문, 사실을 뒷받침할 출처, 찾기 쉬운 위치를 확인하세요.`
      : '우리 페이지가 질문에 답할 내용과 근거를 갖추었는지 확인하세요.',
    'geo-comparison': '같은 질문을 다시 물었을 때 언급과 출처가 어떻게 달라졌는지 확인하세요.',
    'search-platforms': `${editingPlatform(report).label} 기준의 수정 안내입니다. 공통 설정과 해당 페이지의 개별 설정을 확인하세요.`,
    'search-edits': edits.length ? `문구 적용안 ${edits.length}개입니다. 현재 문구를 유지할지, 바꿀지, 새로 작성할지 비교하세요.` : '저장된 수정 제안이 없습니다. 수집된 원문과 적용 위치를 확인하세요.',
    'search-sources': report.pageEvidence || sources.groups.length || sources.links.length
      ? `원문 ${sources.groups.length}개 · 연결 주소 ${sources.links.length}개`
      : '이 보고서에서 확인할 수 있는 원문·링크 기록이 없습니다.',
    'search-keywords': firstGap ? `제목·설명에서 먼저 검토할 표현 · ${firstGap.keyword}` : '본문의 단어 빈도와 제목·설명에 실제로 쓰인 표현을 대조하세요.',
    'search-naver': naver?.mode === 'diagnosis'
      ? `네이버 검색·광고·상품·API 점검 ${naver.checks.length}개입니다. 조치할 항목이 ${naver.checks.filter(c=>c.status==='action').length}개 있습니다.`
      : '현재 기준으로 저장된 네이버 점검 기록이 없습니다.',
    'search-official': official?.mode === 'diagnosis'
      ? `공식 검색 기준 ${official.checks.length}개 중 보완할 항목은 ${official.checks.filter(c=>c.status==='action').length}개입니다. 엔진별 적용 조건을 비교하세요.`
      : '현재 기준의 공통 검색 점검 기록이 없습니다.',
    'search-technical': audit
      ? `수집한 페이지 ${audit.pages.length}개 · 기술 점검 결과 ${audit.findings.length}개`
      : '수집된 페이지·기술 점검 기록이 없습니다.',
    'search-scope': report.analysisWarnings?.length
      ? `확인이 제한된 항목 ${report.analysisWarnings.length}건입니다. 결과에 미치는 영향과 이어서 확인할 항목을 보세요.`
      : '페이지에서 읽은 정보, 실제 화면과 광고 계정에서 확인할 정보를 살펴보세요.',
    'search-checklist': `기본 점검 ${checks.length}개 · 보완·검토 ${checks.filter(c=>['fail','warning','review'].includes(c.status)).length}개`,
    'competition-map': data.competitorCount?`후보 ${data.competitorCount}곳입니다. 우리와 비슷한 고객을 대상으로 하는지 선정 근거부터 확인하세요.`:'후보 검색과 페이지 수집이 어디까지 진행됐는지 확인하세요.',
    'competition-messages': data.competitorCount
      ? '가격·혜택, 상담 안내처럼 고객이 비교하는 표현을 봅니다. 제목과 설명을 모두 확보한 후보만 비교합니다.' : '자사 메시지와 비교할 후보 페이지 기록이 없습니다.',
    'competition-pages': `후보 ${data.competitorCount}곳 중 ${data.metadataCount}곳에서 제목, 설명, 대표 제목, 버튼 중 하나 이상을 확인했습니다.`,
    'competition-benchmark': '업종 표본의 수집 시점과 평가 기준을 확인한 뒤 자사와 비교하세요.',
    'actions-board': tasks.length
      ? '직접 수정할 작업과 담당자에게 전달할 작업을 찾으세요. 먼저 확인이 필요한 작업도 모았습니다.' : '저장된 진단에서 분류된 보완 과제가 없습니다.',
    'actions-guide': '검색 수집, 고객 질문에 답할 페이지, 문의·구매 경로 순서로 적용 방법을 확인하세요.',
    'actions-issues': firstIssue ? `핵심 이슈 ${report.criticalIssues.length}개입니다. 확인한 내용과 고객에게 줄 수 있는 영향을 살펴보세요.` : '저장된 핵심 이슈가 없습니다.',
    'actions-copy': '제목이 약속한 내용부터 버튼을 누른 뒤의 행동까지 자연스럽게 이어지는지 확인하세요.',
    'actions-schedule': schedule.immediately.length+schedule.thisWeek.length+schedule.thisMonth.length
      ? '작업을 시작할 시점과 먼저 끝낼 항목을 확인하세요. 연결된 개선 작업에는 적용 순서가 있습니다.'
      : '시점별로 배정된 작업이 없습니다. 빠른 개선 작업이 저장된 경우 이 섹션에서 확인할 수 있습니다.',
    'actions-kpi': '방문 수와 문의·구매 완료 수를 입력해 목표에 필요한 유입을 계산하세요. 광고 예산은 별도로 비교할 수 있습니다.',
    'actions-geo': data.questions.length
      ? `관측 질문 ${data.questions.length}개를 바탕으로 수정할 페이지와 다시 확인할 질문을 정하세요.`
      : '자사 페이지에 질문·답변·근거를 준비하고 같은 질문으로 다시 확인하세요.',
  };
}
