import {safeHttpUrl} from './citationMeasurement';
import {describeCoverageWarning} from './reportCoverage';
import {buildExecutionPlan,buildPageEdits} from './reportExecution';
import {reportGoal} from './reportGoal';
import {buildReportInsights} from './reportInsights';
import type {MarketingReport} from './reportSchema';
import {buildSiteGuide} from './siteGuidebook';

export const PDF_READING_GROUPS=[
  '01  진단 결과·확인 근거',
  '02  수정안·실행 계획',
  '03  원문 위치·편집 안내',
  '04  참고·측정 기준',
] as const;

type Request={title:string;basis:string;location:string;request:string;done:string};
export type DeveloperHandoff={group:typeof PDF_READING_GROUPS[number];topic:string;requests:Request[];details:string[];targetUrl:string|null};

export function buildDeveloperHandoffs(report:MarketingReport):DeveloperHandoff[]{
  const insights=buildReportInsights(report);
  const url=safeHttpUrl(report.pageEvidence?.finalUrl)||safeHttpUrl(report.url);
  const goal=reportGoal(report.sitePurpose);
  const purpose=report.sitePurpose;
  const target=goal?.label||purpose?.goal.label||'주요 행동 완료';
  const concern=report.evidenceReview?.criteria.find(item=>item.status==='fail'||item.status==='warning')
    ||report.evidenceReview?.criteria.find(item=>item.status==='review');
  const diagnosis:Request[]=[{
    title:concern?concern.label+'의 실제 상태 확인':'공개 페이지의 수집 범위 확인',
    basis:concern?.evidence||'저장된 자료로는 수정할 HTML 항목을 특정하기 어렵습니다.',
    location:concern?.locator||'진단 URL의 공개 HTML과 브라우저 화면',
    request:'원본 HTML과 화면에 표시되는 값을 대조해 주세요. 실제 차이가 확인되면 해당 템플릿이나 설정에서 보완해 주세요.',
    done:'같은 URL에서 변경 전·후의 HTML과 화면을 대조하고, 확인한 위치를 회신해 주세요.',
  },{
    title:`고객 동선 확인 · ${target}`,
    basis:purpose?.goal.observed?'공개 페이지에서 행동 단서를 확인했습니다. 완료 동작은 별도 확인이 필요합니다.':'완료 동작은 저장된 자료로 확인하지 못했습니다.',
    location:'진단 URL에서 주요 행동으로 연결되는 화면과 완료 안내',
    request:(goal?.start||'다음 화면이 열리고 주요 행동을 완료할 수 있는지 확인해 주세요.')+' 실제 이용자에게 영향을 주지 않는 테스트 환경에서 확인해 주세요.',
    done:(goal?.check||'버튼 클릭, 화면 이동, 실제 완료를 구분해 주세요.')+' 오류가 있으면 재현 경로를 남겨 주세요.',
  }];
  if(report.llmCitationTest||report.answerContentPlan||report.discoverability){
    const {obs}=insights;
    diagnosis.push({
      title:'AI 답변과 자사 근거 연결',
      basis:obs?.sourceTotal?`출처를 판정할 수 있었던 답변 ${obs.sourceTotal}건 중 자사 출처 ${obs.sourceCount}건을 확인했습니다.`:'AI 답변에서 자사 출처의 연결 여부를 판정할 자료가 부족합니다.',
      location:'관련 서비스·상세 페이지의 질문, 본문 답변, 출처 링크',
      request:'고객 질문에 답할 공개 주소를 운영 담당자와 정해 주세요. 승인된 답변과 원문 근거가 본문에 표시되도록 하고 링크를 연결해 주세요.',
      done:'로그인 없이 해당 본문과 근거 링크를 열 수 있는지 확인해 주세요. AI 답변 인용 여부는 같은 질문으로 다시 확인해 주세요.',
    });
  }
  if(insights.competitorCount){
    diagnosis.push({
      title:'비교 자료에서 자사 페이지의 검토 위치 찾기',
      basis:`비교 후보 ${insights.competitorCount}곳의 공개 원문을 수집 가능한 범위에서 검토했습니다.`,
      location:'자사 상세 페이지의 가격·조건·신뢰 근거 중 운영 담당자가 선택한 위치',
      request:'자사에 적용하기로 합의한 정보만 반영해 주세요. 경쟁사의 조건·문구는 자사 정책과 원문으로 대조해 주세요.',
      done:'반영한 자사 문구와 출처가 실제 제공 내용과 일치하는지 확인해 주세요.',
    });
  }

  const tasks=buildExecutionPlan(report,insights).tasks;
  const ranked=[...tasks.filter(t=>t.owner==='developer'),...tasks.filter(t=>t.owner!=='developer')];
  const seen=new Set<string>();
  const implementation=ranked.filter(task=>{
    const key=JSON.stringify([task.location,task.action]);
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,3).map((task):Request=>{
    const account=task.guideScope==='account';
    const confirm=task.status==='review'||account;
    return {
      title:`${confirm?'먼저 확인':'보완 검토'} · ${task.title}`,
      basis:task.evidence||`${task.source}에 세부 근거가 저장되지 않았습니다.`,
      location:account?'해당 운영 계정 · 운영 담당자와 확인':task.location,
      request:(confirm?'실제 상태와 담당 권한을 먼저 확인해 주세요. ':'확인한 범위에서 적용안을 검토해 주세요. ')+(task.instructions?.join('\n')||task.action||'상세 실행 보드의 원문을 확인해 주세요.'),
      done:task.completion,
    };
  });
  if(!implementation.length)implementation.push({
    title:'수정 전 작업 범위 확정',basis:'저장된 보완 과제로 수정 범위를 특정하기 어렵습니다.',location:'진단 URL의 첫 화면과 주요 다음 행동',
    request:'운영 담당자와 현재 화면을 확인하고 수정할 항목과 담당을 정해 주세요.',done:'확인한 화면, 변경 항목, 담당자와 테스트 방법을 공유해 주세요.',
  });

  const locations=buildPageEdits(report).filter(edit=>edit.id==='title'||edit.id==='description').map((edit):Request=>{
    const guide=buildSiteGuide(report,{title:edit.label,current:edit.before,topic:edit.id==='title'?'title':'description'});
    const selectors=[...new Set(guide.settings.map(item=>item.selector).filter(Boolean))];
    const changed=!!edit.after&&edit.before!==edit.after;
    return {
      title:edit.label+' 편집 위치 전달',
      basis:edit.before||edit.missing,
      location:edit.location+(selectors.length?` · 수집 위치 ${selectors.join(' / ')}`:''),
      request:changed?'승인된 문구를 해당 페이지의 설정에 반영해 주세요. 수정안은 ‘내 페이지 개선 전·후’에서 확인할 수 있습니다.':'관리 화면의 현재 값과 배포된 HTML 값을 대조해 주세요. 문구 변경 여부는 담당자와 확인해 주세요.',
      done:'해당 주소의 최종 HTML에서 의도한 값이 한 번 출력되는지 확인하고 반영 결과를 공유해 주세요.',
    };
  });
  const limits=(report.analysisWarnings||[]).map(describeCoverageWarning);
  const verification:Request[]=[{
    title:'배포 후 같은 조건으로 다시 점검',
    basis:limits.length?limits.map(limit=>`${limit.title} · ${limit.status}`).join(' / '):'이 보고서의 수집 범위와 완료 기준을 재검증 출발점으로 삼습니다.',
    location:'같은 공개 URL의 HTML·모바일 화면과 영향을 받는 페이지',
    request:'배포 시각과 변경한 주소를 공유해 주세요. 같은 주소로 다시 진단하고, 미확인으로 남은 항목은 확인 가능한 화면이나 로그에서 대조해 주세요.',
    done:'확인 항목마다 재현 순서, 기대 결과, 실제 결과를 남겨 주세요. 조건이 다른 결과는 따로 표시해 주세요.',
  },{
    title:`측정 기준 확인 · ${target}`,
    basis:'사이트 운영 계정의 실제 완료 건수는 이 PDF에서 확인할 수 없습니다.',
    location:'선택한 완료 화면과 분석 도구의 테스트 기록',
    request:(goal?.check||'클릭과 완료는 각각 확인해 주세요.')+' 테스트 기록에서 완료 신호가 조건에 맞게 한 번 수집되는지 확인해 주세요.',
    done:'같은 기간·같은 분모로 비교할 수 있도록 완료 조건과 집계 이름을 남겨 주세요. 해당 동작을 운영 중인 경우에만 확인해 주세요.',
  }];
  const handoffs:Omit<DeveloperHandoff,'targetUrl'>[]=[
    {group:PDF_READING_GROUPS[0],topic:'무엇을 먼저 확인할지',requests:diagnosis,details:['핵심 개선 이슈','진단 체크리스트','GEO 질문·답변·출처·실행 과제']},
    {group:PDF_READING_GROUPS[1],topic:'무엇을 바꿀지',requests:implementation,details:['담당별 실행 보드','내 페이지 개선 전·후']},
    {group:PDF_READING_GROUPS[2],topic:'어디에서 작업할지',requests:locations,details:['URL 맞춤 편집 가이드북 · 위치·기대효과·검증','내 페이지 개선 전·후']},
    {group:PDF_READING_GROUPS[3],topic:'어떻게 완료를 검증할지',requests:verification,details:['재진단 이전·현재 비교','이번 진단에서 확인이 제한된 항목']},
  ];
  return handoffs.map(handoff=>({...handoff,targetUrl:url}));
}
