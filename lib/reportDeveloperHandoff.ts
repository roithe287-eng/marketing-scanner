import {safeHttpUrl} from './citationMeasurement';
import {describeCoverageWarning} from './reportCoverage';
import {buildExecutionPlan,buildPageEdits} from './reportExecution';
import {GUIDE_EFFECTS} from './guideKnowledge';
import {reportGoal} from './reportGoal';
import {buildReportInsights} from './reportInsights';
import type {MarketingReport} from './reportSchema';
import {buildSiteGuide,editingEvidence,guideTopic,type SiteGuide} from './siteGuidebook';

export const PDF_READING_GROUPS=[
  '01  진단 결과·확인 근거',
  '02  수정안·실행 계획',
  '03  원문 위치·편집 안내',
  '04  참고·측정 기준',
] as const;

type Request={
  title:string; basis:string; location:string; steps:string[];
  expected:string; metric:string; done:string; relatedEdit?:string;
};
type Handoff={group:typeof PDF_READING_GROUPS[number]; topic:string; requests:Request[]; details:string[]};

function guideLocation(guide:SiteGuide, fallback:string){
  const selectors=[...new Set([...guide.settings.map(item=>item.selector),guide.matchMode==='candidate'?undefined:guide.focus?.selector].filter(Boolean))];
  const candidate=guide.matchMode==='candidate'&&guide.focus?`위치 후보 · ${guide.focus.selector} (원문 대조 필요)`:'';
  return [fallback,selectors.length?`수집 HTML 선택자 · ${selectors.join(' / ')}`:'',candidate,
    `편집 경로 · ${guide.route.path.join(' → ')}`, guide.route.scope].filter(Boolean).join('\n');
}

export function buildDeveloperHandoffs(report:MarketingReport){
  const insights=buildReportInsights(report);
  const url=safeHttpUrl(editingEvidence(report)?.finalUrl)||safeHttpUrl(report.url);
  const purpose=report.sitePurpose;
  const goal=reportGoal(purpose);
  const target=goal?.label||(purpose?.goal.key==='unknown'?undefined:purpose?.goal.label)||'주요 행동 완료';
  const purchase=purpose?.goal.key==='purchase';
  const completion=goal?.check||(purchase?'상품 선택, 결제 시도, 주문 확정을 각각 기록하세요.':'시작과 완료를 별도로 확인하고 완료 상태를 먼저 정의하세요.');
  const concern=report.evidenceReview?.criteria.find(item=>item.status==='fail'||item.status==='warning')
    ||report.evidenceReview?.criteria.find(item=>item.status==='review');
  const diagnosis:Request[]=[{
    title:concern?concern.label+'의 재현과 수정 범위 확인':'공개 페이지의 수집 범위 확인',
    basis:concern?.evidence||'저장된 자료로는 수정할 HTML 항목을 특정하기 어렵습니다.',
    location:concern?.locator||'진단 URL의 HTTP 응답 원문과 브라우저 렌더링 화면',
    steps:[
      '동일 URL의 최종 응답 주소와 상태 코드를 기록하고 공개 HTML을 저장합니다.',
      '진단이 가리킨 원문을 응답 HTML과 브라우저의 Elements 탭에서 각각 찾아 비교합니다.',
      '불일치가 재현되면 해당 출력을 만드는 템플릿이나 CMS 설정을 찾고, 수정 대상과 영향받는 URL을 작업에 남깁니다.',
    ],
    expected:'수집 시점·렌더링 차이와 실제 수정이 필요한 출력 문제를 구분할 수 있습니다.',
    metric:'최종 주소·상태 코드, 대상 선택자와 원문, 응답 HTML·렌더링 화면 일치 여부',
    done:'재현한 URL과 기기, 기대 출력과 실제 출력을 남깁니다. 위치를 찾지 못했다면 미확인 사유를 기록합니다.',
  },{
    title:`고객 동선 재현 · ${target}`,
    basis:purpose?.goal.observed?`공개 페이지에서 행동 단서를 확인했습니다. ${purpose.goal.evidence.map(item=>item.text).join(' / ')}`.trim():'완료 동작은 저장된 자료로 확인하지 못했습니다.',
    location:'진단 URL의 주요 행동 버튼·링크, 연결된 화면, 확인 가능한 완료 상태',
    steps:[
      goal?.start||(purchase?'상품 상세에서 구매 버튼과 장바구니·결제 화면의 연결을 확인합니다.':'핵심 버튼의 문구, 클릭 동작, 목적지 주소를 확인합니다.'),
      `테스트 환경에서 정상 경로와 입력 오류·취소 경로를 재현합니다. ${completion}`,
      '모바일과 PC에서 끊기는 지점을 확인하고 해당 단계, 화면 캡처, 기대 동작을 기록합니다.',
    ],
    expected:`사용자가 어느 단계에서 멈추는지 확인하고 ${target}까지의 경로에서 수정할 위치를 찾을 수 있습니다.`,
    metric:'기기별 정상 완료 여부, 실패 단계, 오류 안내와 다시 진행할 수 있는지 여부',
    done:'정상 경로는 의도한 완료 상태로 이어지고 오류·취소 경로에서는 완료가 표시되지 않습니다. 외부 서비스의 내부 상태는 담당자가 확인합니다.',
  }];
  if(report.llmCitationTest||report.answerContentPlan||report.discoverability){
    const {obs}=insights;
    diagnosis.push({
      title:'고객 질문에 연결할 자사 답변과 출처 확인',
      basis:obs?.sourceTotal?`출처를 판정할 수 있었던 답변 ${obs.sourceTotal}건 중 자사 출처 ${obs.sourceCount}건을 확인했습니다.`:'자사 출처 연결 여부를 판정할 답변 자료가 부족합니다.',
      location:'관련 서비스 페이지의 고객 질문, 본문 답변, 출처 링크',
      steps:['보고서의 질문을 기준으로 답변이 실릴 공개 URL을 운영 담당자와 정합니다.','승인된 답변과 조건을 본문에 배치하고 원문 근거를 실제 링크로 연결합니다.','로그아웃한 상태의 렌더링 화면에서 답변과 출처가 함께 열리는지 확인합니다.'],
      expected:GUIDE_EFFECTS.ai.expected, metric:GUIDE_EFFECTS.ai.metric,
      done:'본문과 출처 링크의 접근을 확인합니다. 재관측 시 같은 질문·모델을 기록하고 실제 자사 출처를 별도로 확인합니다.',
    });
  }
  if(insights.competitorCount)diagnosis.push({
    title:'비교 자료에서 자사 상세 페이지의 보완 항목 찾기',
    basis:`비교 후보 ${insights.competitorCount}곳 중 상세 원문을 수집한 후보는 ${insights.metadataCount}곳입니다.`,
    location:'자사 상세 페이지의 서비스 범위·가격 조건·신뢰 근거',
    steps:['상세 원문을 확보한 비교 자료에서 자사 페이지에 보완할 정보 항목을 고릅니다.','공개할 조건과 출처를 운영 담당자와 확인한 뒤 선정된 자사 페이지에 반영합니다.','자사 원문과 공개 화면을 맞춰 보고 출처 링크를 열어 봅니다.'],
    expected:'방문자가 자사 서비스의 범위와 조건을 상세 페이지에서 확인하기 쉬워집니다.',
    metric:'승인 항목의 화면 반영 여부, 출처 링크의 정상 동작, 관련 반복 문의',
    done:'최종 페이지의 조건과 원문 출처가 자사에서 실제 제공하는 정보와 일치합니다.',
  });

  const pageEdits=buildPageEdits(report);
  const tasks=buildExecutionPlan(report,insights).tasks;
  const seen=new Set<string>();
  const implementation:Request[]=[];
  for(const task of tasks){
    const topic=guideTopic(task.title);
    const inferred=topic==='content'?guideTopic(task.instructions?.[0]||task.action):topic;
    const scope=task.guideScope;
    const technical=task.owner==='developer'||!!scope||!['ai','trust','content'].includes(inferred);
    if(!technical)continue;
    const key=JSON.stringify([task.location,task.action]);
    if(seen.has(key))continue;
    seen.add(key);
    const account=scope==='account';
    const sourceUrl=safeHttpUrl(task.location);
    const differentPage=sourceUrl&&sourceUrl!==url;
    const taskGuide=buildSiteGuide(differentPage?{...report,url:sourceUrl}:report,{
      title:task.title,scope,topic:inferred,current:task.current,evidence:task.evidence,
      proposal:task.action,instructions:task.instructions,completion:task.completion,
    });
    const edit=account||differentPage?undefined:pageEdits.find(item=>item.id===inferred&&(inferred==='title'||inferred==='description'));
    const review=task.status==='review'||account;
    const effect=review?undefined:taskGuide.effect;
    const fields=taskGuide.fields;
    const genericReadiness=task.group==='GEO 준비도'&&inferred!=='content';
    const exactSteps=task.instructions?.length?task.instructions:genericReadiness?fields.map(field=>field.action):[task.action].filter(Boolean);
    const technicalFields=!account&&!differentPage&&!genericReadiness&&['cta','form','image','heading'].includes(inferred)?fields.map(field=>field.action):[];
    const actionLocation=task.group==='페이지 목적'?`진단 항목과 일치하는 실제 화면 · ${task.title}`:
      inferred==='cta'?`주요 행동 버튼 · 목적지 화면 · ${target} 상태`:task.location;
    const steps=[
      account?'담당 운영 계정에서 대상 URL, 권한과 현재 설정을 확인합니다.':review?'공개 URL에서 원문과 실제 상태를 먼저 확인하고 재현된 범위만 작업에 포함합니다.':'대상 URL과 현재 값 또는 응답을 저장하고 변경 범위를 정합니다.',
      ...exactSteps,
      ...technicalFields,
      account?'계정 화면에서 처리 결과와 확인 시각을 기록합니다.':'미리보기에서 변경 범위를 확인한 뒤 배포하고 같은 URL을 다시 점검합니다.',
    ];
    implementation.push({
      title:`${review?'확인 후 결정':task.status==='fail'?'우선 보완':'보완'} · ${task.title}`,
      basis:[task.source,task.evidence||'저장된 세부 근거가 없습니다.'].join(' · '),
      location:guideLocation(taskGuide,account?'담당 운영 계정':edit?.location||actionLocation),
      steps,
      expected:effect?.expected||(account?GUIDE_EFFECTS.account.expected:'수정이 필요한지와 실제 적용 범위를 근거를 바탕으로 판단할 수 있습니다.'),
      metric:effect?.metric||(account?GUIDE_EFFECTS.account.metric:'재현 여부, 수정 대상으로 확정한 URL·항목, 확인 결과'),
      done:genericReadiness?fields.map(field=>field.done).join('\n'):inferred==='cta'&&!account&&!task.instructions?.length
        ?`모바일과 PC에서 버튼 이름과 실제 목적지가 일치합니다. ${completion}`:task.completion,
      relatedEdit:edit?.id,
    });
  }
  if(!implementation.length)implementation.push({
    title:'수정 전 작업 범위 확정',basis:'저장된 보완 과제에서 직접 적용할 기술 조치를 특정하기 어렵습니다.',
    location:'진단 URL의 첫 화면과 주요 행동이 이어지는 화면',
    steps:['운영 담당자와 실제 화면을 열고 진단 항목을 재현합니다.','재현한 항목의 현재 값과 기준을 기록합니다.','변경할 URL·속성·담당자와 배포 후 확인 방법을 작업에 적습니다.'],
    expected:'수정 필요 여부와 개발 범위를 먼저 합의할 수 있습니다.', metric:'재현과 수정 범위 합의 여부',
    done:'현재 화면, 확정한 변경 항목과 검증 방법을 작업 기록에 남깁니다.',
  });

  const editTopics={hero:'heading',title:'title',description:'description',cta:'cta'} as const;
  const locations=pageEdits.map((edit):Request=>{
    const topic=editTopics[edit.id as keyof typeof editTopics];
    const guide=buildSiteGuide(report,{title:edit.label,current:edit.before,topic});
    const changed=!!edit.after&&edit.before!==edit.after;
    const implementation=topic==='title'?'이 URL의 <head>에서 <title>을 출력하는 페이지별 필드나 템플릿을 수정합니다.':
      topic==='description'?'이 URL의 <head>에서 meta[name="description"]의 content를 출력하는 페이지별 필드나 템플릿을 수정합니다.':
      topic==='heading'?'첫 화면의 대표 제목을 출력하는 기존 H1 또는 제목 컴포넌트를 확인하고 하위 제목 계층을 유지합니다.':
      '원문과 일치하는 버튼 하나를 선택하고 표시 문구, 접근 가능한 이름, href 또는 클릭 동작, 목적지를 함께 대조합니다.';
    return {
      title:edit.label+' · 수정 위치와 반영 방법',basis:edit.before?`${edit.source}\n${edit.before}`:edit.missing,
      location:guideLocation(guide,edit.location),
      steps:[guide.route.instruction,implementation,
        changed?`담당자가 승인하면 이 위치의 기존 값에 적용합니다.\n적용안 · ${edit.after}`:'현재 값과 공개 화면을 대조한 뒤 변경 여부를 결정합니다.',
        '미리보기로 다른 페이지에 미치는 영향을 확인하고 배포합니다. 배포한 URL의 공개 출력과 화면을 다시 대조합니다.'],
      expected:changed?guide.effect.expected:'현재 설정값과 공개 출력의 일치 여부를 확인하고 불필요한 편집을 줄일 수 있습니다.',
      metric:guide.effect.metric,
      done:topic==='title'||topic==='description'?'최종 HTML의 해당 태그가 한 번 출력되고 그 값이 승인한 문구와 일치합니다. 검색 화면 반영은 재수집 후 별도로 기록합니다.':edit.check,
      relatedEdit:edit.id,
    };
  });
  const limits=(report.analysisWarnings||[]).map(describeCoverageWarning);
  const verification:Request[]=[{
    title:'배포 검증과 이전·이후 증빙 남기기',
    basis:limits.length?limits.map(limit=>`${limit.title} · ${limit.status}`).join(' / '):'이 보고서에서 확인한 원문, 화면과 실행 항목을 배포 전 비교 기준으로 사용합니다.',
    location:'배포 기록, 동일한 공개 URL의 최종 응답·렌더링 화면, 영향을 받는 관련 페이지',
    steps:['배포 전 URL과 출력, 원래 값, 비교할 기기 조건을 보관합니다.','배포 시각과 변경 URL을 기록하고 같은 조건에서 화면, HTML 또는 관련 로그를 재점검합니다.','원하지 않은 변경이 발견되면 보관한 값으로 복원한 후 해당 작업의 완료 기준을 다시 실행합니다.'],
    expected:'배포가 실제 페이지에 반영됐는지 확인하고 회귀가 생긴 위치를 빠르게 찾을 수 있습니다.',
    metric:'작업별 검증 통과 여부, 배포 전·후 출력, 발견한 회귀와 복구 확인 여부',
    done:'각 작업의 재현 순서, 기대 결과, 실제 결과와 증빙을 남깁니다. 조건이 다른 결과는 별도 표기합니다.',
  },{
    title:`완료 이벤트 검증 · ${target}`,
    basis:'사이트 운영 계정의 실제 완료 건수와 이벤트 수신 상태는 이 PDF에서 확인할 수 없습니다.',
    location:'실제 완료가 확정되는 화면 또는 서버 응답, 사이트와 연결된 분석 도구의 테스트 기록',
    steps:[completion,
      `담당자와 ${target}을 판정하는 화면·상태, 운영 중인 이벤트 이름과 집계 단위를 확인합니다.`,
      '테스트에서 정상 완료, 입력 오류 또는 취소, 완료 화면 새로고침을 각각 실행합니다. 분석 도구에서 완료 신호가 한 건씩 올바르게 수신되는지 확인합니다.',
    ],
    expected:GUIDE_EFFECTS.measurement.expected, metric:'완료 조건, 테스트 이벤트 수신·중복 여부, 같은 기간의 시작 세션과 완료 세션',
    done:'정상 완료에서 한 번 수신되고 실패·취소에서 완료가 집계되지 않습니다. 외부 서비스가 완료 신호를 제공하지 않으면 집계 범위를 기록합니다.',
  }];
  const handoffs:Handoff[]=[
    {group:PDF_READING_GROUPS[0],topic:'진단 재현과 수정 범위',requests:diagnosis,details:['핵심 개선 이슈','진단 체크리스트','GEO 질문·답변·출처·실행 과제']},
    {group:PDF_READING_GROUPS[1],topic:'우선순위별 구현 명세',requests:implementation,details:['담당별 실행 보드','내 페이지 개선 전·후']},
    {group:PDF_READING_GROUPS[2],topic:'편집 위치와 적용안',requests:locations,details:['URL 맞춤 편집 가이드북 · 위치·기대효과·검증','내 페이지 개선 전·후']},
    {group:PDF_READING_GROUPS[3],topic:'배포와 완료 검증',requests:verification,details:['재진단 이전·현재 비교','이번 진단에서 확인이 제한된 항목']},
  ];
  return handoffs.map(handoff=>({...handoff,targetUrl:url}));
}
