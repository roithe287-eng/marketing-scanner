import type {MarketingReport} from './reportSchema';
import type {ReportBlock} from './reportDocument';
import {OFFICIAL_SEO_GUIDES,OFFICIAL_SEO_SCOPE,OFFICIAL_SEO_COVERAGE,officialSeoCheckSources} from './officialSeoCatalog';
import {OFFICIAL_SEO_STATUS,OFFICIAL_SEO_VERSION,OFFICIAL_SEO_TOPICS,type OfficialSeoTopic} from './officialSeoKnowledge';
export function buildOfficialSeoDocument(report:MarketingReport):ReportBlock[]{
 const audit=report.officialSeoAudit;
 if(!audit)return [{kind:'heading',text:'공식 검색 기준 재검증'},{kind:'body',text:'이전 보고서입니다. 새 기준의 URL 관측은 재진단 후 확인할 수 있습니다.'}];
 const blocks:ReportBlock[]=[{kind:'heading',text:'네이버·Google 공식 검색 기준 재검증'},{kind:'body',text:`기준 ${audit.catalogVersion} · 네이버 ${OFFICIAL_SEO_COVERAGE.naver}개 / Google ${OFFICIAL_SEO_COVERAGE.google}개 문서 · 반영 ${OFFICIAL_SEO_COVERAGE.reviewed}개 · 교육 PDF 2종 대조`},{kind:'body',text:OFFICIAL_SEO_SCOPE}];
 if(audit.observedAt)blocks.push({kind:'body',text:`URL: ${audit.targetUrl} · 관측 ${audit.observedAt}`});
 for(const check of audit.checks){blocks.push({kind:'subheading',text:`[${OFFICIAL_SEO_STATUS[check.status]}] ${check.title}`},{kind:'body',text:`${check.engines.map(e=>e==='naver'?'네이버':'Google').join(' · ')} · 근거: ${check.evidence}`},{kind:'body',text:check.interpretation});check.steps.forEach((s,i)=>blocks.push({kind:'body',text:`${i+1}. ${s}`}));blocks.push({kind:'body',text:`완료 확인: ${check.completion}`});if(!check.id.startsWith('review-'))for(const source of officialSeoCheckSources(check))blocks.push({kind:'body',text:source.title,href:source.url});}
 // The report stores the catalog version. Never attach a newer catalog to an older snapshot.
 if(audit.catalogVersion===OFFICIAL_SEO_VERSION){
  blocks.push({kind:'heading',text:'공식 문서별 적용 기준'},{kind:'body',text:'각 페이지의 실제 콘텐츠 유형·지역·제휴·운영 상황에 해당할 때 적용합니다. 세부 속성의 형식·허용값·대안·중첩 조건은 링크의 공식 명세에서 검증합니다.'});
  for(const guide of OFFICIAL_SEO_GUIDES){
   blocks.push({kind:'subheading',text:`${guide.engine==='naver'?'네이버':'Google'} · ${guide.title}${guide.status==='unavailable'?' [원문 재확인 필요]':''}`},{kind:'body',text:`${OFFICIAL_SEO_TOPICS[guide.topic as OfficialSeoTopic]} · 적용: ${guide.applicability}`});
   guide.guidance.forEach(text=>blocks.push({kind:'body',text}));
   for(const group of guide.properties||[]){blocks.push({kind:'body',text:`${group.scope} · 해당 유형/기능 사용 시`});for(const key of ['required','recommended','conditional'] as const)if(group[key].length)blocks.push({kind:'body',text:`${{required:'필수',recommended:'권장·선택',conditional:'조건·대안'}[key]}: ${group[key].join(' · ')}`});}
   if(guide.reviewNote)blocks.push({kind:'body',text:guide.reviewNote});blocks.push({kind:'body',text:guide.reviewedUrl||guide.url,href:guide.reviewedUrl||guide.url});
  }
 }
 return blocks;
}
