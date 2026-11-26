import type {MarketingReport} from './reportSchema';

type CoverageWarning=NonNullable<MarketingReport['analysisWarnings']>[number];

const stages:Record<string,{impact:string;guide:string;target?:string}>={
  source:{impact:'일부 화면이나 자료를 읽을 수 없어 확인 범위가 좁아졌습니다.',guide:'입력한 주소를 직접 열고, 공개된 상세 페이지가 있으면 그 주소로 다시 확인하세요.'},
  discoverability:{impact:'AI 검색에 필요한 페이지 구조와 정보 준비도 점검이 비어 있을 수 있습니다.',guide:'저장된 페이지 원문을 먼저 확인하고 필요하면 같은 주소를 다시 진단하세요.',target:'report-view-geo-readiness'},
  citation:{impact:'우리 브랜드가 답변에 나오거나 우리 페이지가 출처로 연결됐는지 판단하기 어렵습니다.',guide:'답변의 개별 상태를 열어 보고, 결과가 필요하면 같은 질문으로 다시 확인하세요.',target:'report-view-geo-observations'},
  citationTarget:{impact:'저장된 AI 답변의 관측 주소가 이 보고서의 페이지와 달라 인용·언급 비율과 전후 비교에서 제외했습니다.',guide:'지금 확인하려는 페이지 주소로 다시 진단해 관측을 수집하세요.',target:'report-view-geo-observations'},
  keywords:{impact:'네이버에 조회한 키워드의 관측 자료가 제한됩니다.',guide:'키워드 화면에서 본문 빈도와 네이버 관측 자료를 따로 확인하세요.',target:'report-view-search-keywords'},
  category:{impact:'업종 분류 단계의 결과가 제한됩니다. 화면에 표시한 유형은 확보한 페이지 근거를 바탕으로 합니다.',guide:'제목, 설명, 본문에서 확인한 주제를 실제 제공 범위와 대조하세요.'},
  benchmark:{impact:'저장된 업종 표본 데이터가 제한됩니다.',guide:'비교 지도에서 확인 가능한 후보의 원문 범위를 보세요.',target:'report-view-competition-map'},
  answerContent:{impact:'고객 질문별 답변과 콘텐츠 작성안이 일부 비어 있을 수 있습니다.',guide:'확인한 상품·서비스 원문을 토대로 질문별 답변을 점검하세요.',target:'report-view-overview-questions'},
};

const statuses={
  timeout:'응답 대기 시간 초과',
  unavailable:'확인 가능한 자료 미수집',
  error:'분석 단계에서 오류 발생',
} as const;

export function describeCoverageWarning(warning:CoverageWarning) {
  const stage=Object.hasOwn(stages,warning.key)?stages[warning.key]:undefined;
  return {
    title:warning.key==='source'?'페이지 원문 수집':warning.label,
    status:statuses[warning.status],
    observation:warning.key==='source'?warning.label:undefined,
    impact:stage?.impact||'이 분석 항목의 확인 범위가 제한됩니다.',
    guide:stage?.guide||'현재 결과의 원문과 수집 범위를 확인하고 필요한 항목만 다시 점검하세요.',
    target:stage?.target,
  };
}
