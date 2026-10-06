import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {buildCompetitorPositioning,POSITION_NOTE,POSITION_METHOD,POSITION_SIZE_NOTE,positioningActions} from './competitorPositioning';
import {COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE,COMPETITOR_SOURCES} from './competitorResearch';
import {safeHttpUrl} from './citationMeasurement';
export function buildCompetitorDocument(report:MarketingReport):ReportBlock[] {
  const model=buildCompetitorPositioning(report);if(!model)return [];
  const b:ReportBlock[]=[];const add=(kind:ReportBlock['kind'],text:string,href?:string)=>{b.push({kind,text,href});};
  const {analysis,rows,own}=model,r=analysis.research;
  add('subheading','검색 메시지 포지셔닝');add('body',POSITION_NOTE);add('body',POSITION_SIZE_NOTE);add('body',COMPETITOR_API_NOTE);add('body',COMPETITOR_VOLUME_NOTE);
  add('body',`대표 키워드: ${analysis.searchKeyword} · 산정 규칙: ${POSITION_METHOD}`);
  add('body',`업종: ${model.profile.label} · ${model.industryBasis}. 기준: ${model.profile.criteria.map(c=>c.label).join(' / ')}`);
  add('body','X 상품·서비스 설명 = 업종별 앞의 두 기준의 표현 수 ÷ 4 × 100. Y 선택·이용 근거 = 뒤의 두 기준의 표현 수 ÷ 4 × 100. 각 기준은 중복을 제외하고 최대 2개 표현을 반영합니다. 업종 평균이나 성과 점수가 아닙니다.');
  add('body','제목·설명이 모두 있어야 좌표를 표시합니다. 0·100도 내부 여백을 두어 배치하고, 같은 좌표는 묶으며 버블 크기는 해당 업체들의 평균 단서 수를 사용합니다. 50은 안내선이며 합격·평균 기준이 아닙니다. 오른쪽 위나 비어 있는 영역이 성과 우위·시장 수요를 뜻하지 않습니다. 구버전은 설명의 OG 대체 여부가 미기록되어 엄밀한 비교에는 재진단이 필요합니다.');
  if(r){add('subheading','키워드 선정 및 검색 기록');add('body',r.keywordReason);add('body',`검색 시각(UTC): ${r.capturedAt} · 요청 ${r.requestedCount}건 · 응답 ${r.returnedCount}건 · API 시작 위치 ${r.apiStart}`);
    add('body',`1차 통과 ${r.eligibleCount}개 · 수집 시도 ${analysis.filtering?.metadataCheckedCount??0}개 · HTTP 수집 성공 ${r.successfulPages}개 · 수집 한도 보류 ${r.budgetDeferredCount}개 · 최종 비교 ${r.selectedCount}개`);
    add('body',`조회한 키워드: ${r.attemptedKeywords.join(' → ')}. 마지막 키워드의 결과만 비교합니다. 검색 결과 총 문서 수는 검색량이 아니므로 비교 수요로 사용하지 않습니다.`);
    for(const e of r.keywordEvidence){add('body',`${e.field} · 확인 표현: ${e.matched.join(' · ')}`);add('body',e.text);}
    for(const a of r.alternatives)add('body',`미조회 대체 키워드 후보: ${a.keyword} · 근거 필드 ${a.fields.join(' / ')}`);
  }else add('body','이전 보고서에는 키워드 선정 근거와 검색 시각이 저장되지 않았습니다. 현재 보고서에 저장된 후보만 비교합니다.');
  if(analysis.filtering){add('subheading','후보 선정 기록');add('body',`검토한 검색 응답 ${analysis.filtering.reviewedCount}건 · 제외 ${analysis.filtering.excluded.length}건 · 상세 수집 시도 ${analysis.filtering.metadataCheckedCount}개`);for(const c of analysis.filtering.excluded)add('body',`제외: ${c.domain} · ${c.reason} · ${c.title}`);}
  add('body','대형몰·포털·SNS 등은 알려진 도메인과 페이지 역할 규칙으로 제외합니다. 모든 기업 규모·관계를 자동 판별하지는 않습니다. 후보 번호와 검색 응답 순서는 별개입니다. 실제 상품·서비스·지역·고객층·판매 방식을 대조하세요.');
  for(const [i,row] of rows.entries()){
    add('subheading',`${row.own?'자사':`후보 ${i}`} · ${row.name}`);if(row.url)add('body',row.url,row.url);
    add('body',row.x===null?`좌표 판정 보류: ${row.reason}`:`X 상품·서비스 설명 ${row.x}/100 · Y 선택·이용 근거 ${row.y}/100 · 크기 단서 ${row.signalCount}/8개`);
    add('body',`검색어 구성 단어: ${row.terms.join(' · ')} · 원문에서 확인: ${row.matched.join(' · ')||'미탐지'}`);
    add('body',row.termFields.map(f=>`${f.label}: 검색어 구성 단어 ${f.matched.length}/${row.terms.length}개`).join(' / '));
    add('body',row.checks.map(c=>`${c.label}: ${row.x===null?'판정 보류':c.found?`${c.signals.join(' · ')} (크기 반영 ${c.signalCount}/2개)`:'미탐지'}`).join(' / '));
    add('body',`페이지 제목: ${row.title||'미저장'}`);add('body',`페이지 설명: ${row.description||'미저장'}`);
    if(!row.own){const c=analysis.competitors[i-1];if(c.searchRank)add('body',`웹문서 검색 응답 순서: ${c.searchRank}번째`);if(c.selectionEvidence)add('body',`선정 근거: ${c.selectionEvidence}`);add('body',`검색 결과 제목: ${c.title}`);add('body',`검색 요약: ${c.description}`);
      for(const [label,value] of [['H1',c.h1],['CTA 문구',c.ctaTexts?.join(' / ')],['AI 핵심 메시지 해석',c.keyMessage],['AI 차별점 해석',c.differentiation],['수집 오류',c.fetchError]])if(value)add('body',`${label}: ${value}`);
    }
  }
  add('subheading','자사에서 바로 검토할 작업');for(const task of positioningActions(own)){add('subheading',task.title);add('body',`근거: ${task.evidence}`);add('body',`실행: ${task.action}`);add('body',`TO-BE 작성 틀: ${task.template}`);add('body',`확인할 KPI: ${task.metric}. 이 좌표로 상승률을 추정하지 않습니다.`);}
  if(analysis.overallComparison)add('body',`저장된 AI 전체 비교: ${analysis.overallComparison}`);if(analysis.ourPositioning)add('body',`저장된 AI 제안: ${analysis.ourPositioning}`);
  for(const s of COMPETITOR_SOURCES)add('body',s.title,safeHttpUrl(s.url)||undefined);return b;
}
