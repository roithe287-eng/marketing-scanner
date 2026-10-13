import {reportForPresentation} from './reportPresentation';
import {OFFICIAL_SEO_COVERAGE} from './officialSeoCatalog';
import {buildCompetitorPositioning} from './competitorPositioning';
import {NAVER_CATEGORIES,naverCounts} from './naverKnowledge';
import {isKeywordPlacementCandidate,keywordReviewReason} from './keywordRewrite';
import {excludedPlatformReason} from './competitorSelection';
import type {MarketingReport} from './reportSchema';
import {safeHttpUrl,ownHost} from './citationMeasurement';
import {buildObservationVisual,engineNames,engines,observationState,readinessItems} from './reportVisuals';

export type FollowupTask={id:string;group:string;title:string;status:'fail'|'warning'|'review';evidence:string;action:string;source:string;current?:string;guideScope?:'page'|'account';instructions?:string[];completion?:string};
export type SourceEntry={url:string;title:string;domain:string;ownership:'own'|'external'|'unresolved';questions:string[];observations:string[]};
export const messageThemes=[
  {label:'가격·혜택',pattern:/가격|비용|할인|무료|견적|수수료/},
  {label:'신뢰·사례',pattern:/후기|리뷰|인증|사례|공식|파트너/},
  {label:'전문성',pattern:/전문|경력|노하우|기술|컨설팅|전략/},
  {label:'속도·지원',pattern:/당일|빠른|신속|24시간|지원|응대/},
  {label:'상담·문의',pattern:/상담|문의|예약|신청/},
  {label:'맞춤·범위',pattern:/맞춤|통합|종합|원스톱|맞춤형/},
] as const;
export const insightNotes={
  stages:'각 단계에 연결한 기존 진단 점수입니다. 실제 방문·구매 전환율이나 이탈률을 측정한 퍼널이 아닙니다.',
  sources:'AI 답변이 인용한 외부 링크 중 자사몰·대형몰·포털·SNS를 제외한 목록입니다. AI가 질문에 답하는 과정에서 다른 업종을 연결할 수도 있어, 아래 업체가 곧 경쟁사라는 뜻은 아닙니다.',
  reviews:'브랜드를 언급하면서 외부 출처만 연결한 답변을 우선 검토합니다. 업체명·서비스 범위·가격과 조건을 대조하세요. 자사 출처가 연결된 답변도 해당 페이지의 최신 정보와 함께 확인하세요.',
  messages:'저장된 페이지 제목·메타 설명의 표현만 비교합니다. 미탐지는 서비스 부재를 뜻하지 않으며 수집하지 못한 항목은 미확인입니다.',
  questions:'사이트 전체를 탐색한 결과가 아닙니다. 자사 인용 URL이 없으면 입력 페이지를 검토 후보로 연결합니다.',
  tasks:'기존 진단에서 보완이 필요한 항목을 모았습니다. 같은 문제가 여러 진단에서 발견되면 각각의 근거가 남을 수 있습니다.',
};
export const sourceReferenceGuide={
  title:'다른 업종의 출처는 어떻게 참고하나요?',
  purpose:'진단한 업체와 업종이 다르면 해당 업체의 상품·가격을 비교하는 용도로 사용하지 않습니다. 다만 다른 업종이라도 페이지 안에서 정보를 보여주는 형식과 구성을 참고할 수 있습니다.',
  examples:'가격·추가 비용을 구분하는 방식, 자주 묻는 질문과 답변의 배치, 사례·증빙을 보여주는 위치, 문의 버튼까지 이어지는 흐름을 살펴보세요.',
  check:'먼저 연결된 질문과 실제 페이지를 열어 관련성을 확인하세요. 이 목록은 추천 사례로 검증한 결과가 아니므로, 참고할 구성이 없거나 답변과 무관한 출처는 활용하지 않아도 됩니다.',
};
export function buildReportInsights(report:MarketingReport) {
  report=reportForPresentation(report);
  const obs=buildObservationVisual(report.llmCitationTest);
  const uniqueRows=obs?.questions.flatMap(q=>engines.flatMap(e=>q.cells[e].rows.length===1?q.cells[e].rows:[]))||[];
  const verified=uniqueRows.filter(r=>['cited','uncited'].includes(observationState(r)));
  const sourceMap=new Map<string,SourceEntry>();
  for(const r of verified)for(const source of r.sources||[]) {
    const url=safeHttpUrl(source.url);if(!url)continue;
    const u=new URL(url);u.hash='';const key=u.href;
    const ownership=source.ownership==='unresolved'?'unresolved':ownHost(url,report.url)?'own':'external';
    const entry=sourceMap.get(key)||{url:key,title:source.title||u.hostname,domain:u.hostname.replace(/^www\./,''),ownership,questions:[],observations:[]};
    if(!entry.questions.includes(r.question.trim()))entry.questions.push(r.question.trim());
    const pair=JSON.stringify([r.engine,r.question.trim()]);if(!entry.observations.includes(pair))entry.observations.push(pair);
    sourceMap.set(key,entry);
  }
  const sources=[...sourceMap.values()].sort((a,b)=>b.observations.length-a.observations.length||a.url.localeCompare(b.url));
  const sourceExclusion=(s:SourceEntry)=>ownHost(s.url,report.url)?'자사 도메인':excludedPlatformReason(s.domain);
  const eligibleSources=sources.filter(s=>!sourceExclusion(s));
  const excludedSources=sources.flatMap(s=>{const reason=sourceExclusion(s);return reason?[{...s,reason}]:[];});
  const reviews=verified.filter(r=>r.brandMentioned===true && (r.sources||[]).some(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&!ownHost(s.url,report.url)) && !(r.sources||[]).some(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&ownHost(s.url,report.url))).map(r=>({question:r.question,engine:engineNames.chatgpt,answer:r.responseText||r.responseSnippet||'답변 원문이 저장되지 않았습니다.',sources:(r.sources||[]).filter(s=>safeHttpUrl(s.url)),measuredAt:r.measuredAt}));
  const brandRows=verified.filter(r=>r.brandMentioned===true);
  const ownSource=brandRows.filter(r=>(r.sources||[]).some(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&ownHost(s.url,report.url))).length;
  const reviewSummary={total:obs?.total||0,verified:verified.length,unavailable:(obs?.total||0)-verified.length,brandMentioned:brandRows.length,noBrand:verified.filter(r=>r.brandMentioned===false).length,unknownMention:verified.filter(r=>typeof r.brandMentioned!=='boolean').length,ownSource,missingSource:brandRows.length-ownSource-reviews.length};
  const reviewExplanation=!obs?'이전 형식의 보고서에는 답변별 브랜드 언급·출처 확인 기록이 없어 대조 대상을 판정하지 않았습니다. 새 진단으로 해당 기록을 수집하세요.':!obs.total?'저장된 AI 답변이 없어 대조할 원문이 없습니다. AI 관측을 다시 실행해 주세요.':!verified.length?'검색 실행·출처 확인이 완료된 답변이 없어 대조 대상을 계산하지 않았습니다. 위의 AI 답변 관측에서 오류·중복·검색 및 출처 확인 상태를 확인한 뒤 재진단하세요.':reviews.length?`출처 확인이 완료된 ${verified.length}건 중 외부 출처만 연결한 브랜드 언급 답변 ${reviews.length}건을 우선 대조합니다.`:!brandRows.length?`출처 확인이 완료된 ${verified.length}건 중 브랜드 언급이 확인된 답변이 없어 우선 대조 대상은 0건입니다. 브랜드 언급 여부 미확인 ${reviewSummary.unknownMention}건은 별도 확인이 필요합니다.`:`브랜드 언급 답변 ${brandRows.length}건 중 자사 출처 연결 ${ownSource}건, 대조 가능한 외부 출처 미확인 ${reviewSummary.missingSource}건입니다. 외부 출처만 연결한 답변이 없어 우선 대조 대상은 0건입니다.`;
  const questions=obs?.questions.map(q=>{
    const rows=verified.filter(r=>r.question.trim()===q.question);
    const owned=rows.flatMap(r=>r.sources||[]).find(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&ownHost(s.url,report.url));
    const target=owned?safeHttpUrl(owned.url):rows.length?safeHttpUrl(report.url):null;
    return {question:q.question,id:q.id,target,kind:owned?'인용 페이지':rows.length?'입력 페이지 검토':'재측정 후 연결',evidence:owned?`출처에서 확인: ${owned.title}`:rows.length?'이번 정상 관측에서 자사 URL을 확인하지 못했습니다. 페이지의 답변 적합성을 검토하세요.':'판정 가능한 관측이 없습니다. 콘텐츠 부족으로 단정하지 마세요.',observations:rows.length};
  })||[];
  const competitors=report.competitorAnalysis?.competitors||[];
  const messageRows=(buildCompetitorPositioning(report)?.rows||[]).map(r=>({name:r.own?'자사':r.name,url:r.url,title:r.title,description:r.description,available:r.fieldsPresent===2&&!r.fetchError,isOwn:r.own})).map(r=>{
    const fields=[r.title,r.description].filter((v):v is string=>typeof v==='string');const content=fields.join(' ');
    return {...r,fieldCount:fields.length,cells:messageThemes.map(theme=>({label:theme.label,match:r.available?content.match(theme.pattern)?.[0]||null:undefined})),evidence:content};
  });
  const ownMessage=messageRows[0];
  const messageOpportunities=messageThemes.flatMap((theme,i)=>{
    const known=messageRows.slice(1).filter(r=>r.available);const present=known.filter(r=>r.cells[i].match);
    return ownMessage?.available && !ownMessage.cells[i].match && present.length?[{label:theme.label,count:present.length,total:known.length}]:[];
  });
  const stages=[{label:'첫인상',key:'firstView' as const,action:'제안의 핵심과 첫 화면 문구 확인'},{label:'신뢰 형성',key:'trust' as const,action:'검증 가능한 사례·후기·근거 확인'},{label:'행동 유도',key:'cta' as const,action:'버튼 문구·위치·다음 행동 확인'},{label:'전환 흐름',key:'conversionFlow' as const,action:'문의·신청 과정의 마찰 확인'}].map(s=>({...s,score:report.diagnosis[s.key]}));
  const gaps=(report.keywordFrequency?.singles||[]).filter(k=>isKeywordPlacementCandidate(k,report.meta)).slice(0,8);
  const heldKeywords=(report.keywordFrequency?.singles||[]).flatMap(k=>{const reason=keywordReviewReason(k.keyword,report.meta);return reason?[{...k,reason}]:[];});
  const tasks:FollowupTask[]=[];
  const push=(group:string,source:string,rows:{label:string;status:'pass'|'warning'|'fail';currentValue:string;guide:string}[])=>rows.filter(r=>r.status!=='pass').forEach((r,i)=>tasks.push({id:`${source}-${i}`,group,title:r.label,status:r.status as 'warning'|'fail',evidence:r.currentValue,current:r.currentValue,action:r.guide,source}));
  report.criticalIssues.forEach((r,i)=>tasks.push({id:`critical-${i}`,group:'핵심 개선',title:r.title,status:r.evidenceStatus==='review'?'review':r.priority==='high'?'fail':r.priority==='medium'?'warning':'review',evidence:r.problem,current:r.badExample,action:r.recommendation,source:'AI 진단'}));
  push('기본 진단','기본 체크리스트',report.checklist||[]);
  push('GEO 준비도','GEO 준비도',readinessItems(report.discoverability));
  for(const check of report.naverOptimization?.mode==='diagnosis'?report.naverOptimization.checks:[]) {
    if(check.status==='action'||(check.status==='manual'&&check.priority==='high'))tasks.push({id:`naver-${check.id}`,group:'네이버',title:check.title,status:check.status==='manual'?'review':check.priority==='high'?'fail':'warning',evidence:check.evidence,guideScope:check.category!=='search'||check.owner==='marketer'?'account':'page',instructions:check.steps,completion:check.completion,action:`${check.steps.join(' → ')} / 완료 확인: ${check.completion}`,source:NAVER_CATEGORIES[check.category]});
  }
  for(const check of report.officialSeoAudit?.mode==='diagnosis'?report.officialSeoAudit.checks:[])if(check.status==='action')tasks.push({id:`official-${check.id}`,group:'공식 SEO',title:check.title,status:'warning',evidence:check.evidence,guideScope:'page',instructions:check.steps,completion:check.completion,action:`${check.steps.join(' → ')} / 완료 확인: ${check.completion}`,source:check.engines.map(e=>e==='naver'?'네이버':'Google').join(' · ')});
  reviews.forEach((r,i)=>tasks.push({id:`brand-review-${i}`,group:'AI 답변',title:`${r.engine} 브랜드 답변 대조`,status:'review',evidence:r.question,action:'답변의 서비스 설명·업체명과 연결된 출처를 대조하세요. 오인식 여부는 확인 후 판단하세요.',source:'AI 답변 관측'}));
  const rank={fail:0,warning:1,review:2};tasks.sort((a,b)=>rank[a.status]-rank[b.status]);
  const metadataCount=competitors.filter(c=>!c.fetchError&&!!(c.metaTitle||c.metaDescription||c.h1||c.ctaTexts?.length)).length;
  const coverage=[
    {label:'페이지 진단',value:`${(report.checklist||[]).length}개 체크`,state:'저장됨',detail:'입력 페이지 기반 진단'},
    report.officialSeoAudit?.mode==='diagnosis'
      ? {label:'공식 검색 기준',value:`${report.officialSeoAudit.checks.length}개 점검`,state:'관측·직접 확인 분리',detail:`네이버 ${OFFICIAL_SEO_COVERAGE.naver}개·Google ${OFFICIAL_SEO_COVERAGE.google}개 문서 기준`}
      : {label:'네이버 최적화',value:report.naverOptimization?.mode==='diagnosis'?`${report.naverOptimization.checks.length}개 점검`:'재진단 필요',state:report.naverOptimization?.mode==='diagnosis'?'관측·수동 분리':'기준 업데이트',detail:report.naverOptimization?.mode==='diagnosis'?`관측 확인 ${naverCounts(report.naverOptimization.checks).observed}개 · 계정·적용 범위 별도 확인`:'구버전 점수는 표시하지 않음'},
    {label:'AI 출처 판정',value:obs?`${obs.sourceTotal} / ${obs.total}건`:'—',state:!obs?'미확인':obs.sourceTotal===obs.total&&obs.total?'판정 완료':obs.sourceTotal?'일부 판정':'판정 불가',detail:'분모는 OpenAI 관측'},
    {label:'경쟁사 수집',value:`${metadataCount} / ${competitors.length}개`,state:report.competitorStatus?.status==='pending'?'진행 중':competitors.length?(metadataCount===competitors.length?'저장됨':'일부 미확인'):'미확인',detail:'후보 중 상세 항목이 있는 사이트'},
  ];
  return {obs,sources,eligibleSources,excludedSources,reviews,reviewSummary,reviewExplanation,questions,messageRows,messageOpportunities,stages,gaps,heldKeywords,tasks,coverage,metadataCount,competitorCount:competitors.length};
}
export type ReportInsights=ReturnType<typeof buildReportInsights>;
export function contentBrief(question:string,target:string|null) {
  return `질문: ${question}\n검토 페이지: ${target||'관측 복구 후 관련 페이지 확인'}\n\n1. 직접 답변: [확인한 사실로 작성]\n2. 적용 조건·서비스 범위: [담당자 확인 필요]\n3. 근거 링크·사례: [검증 가능한 자료 입력]\n4. 최종 확인 날짜: [실제 확인일 입력]\n\n가격·성과·후기는 확인된 사실만 기재하세요. 이 문서는 콘텐츠 작성 틀이며 작성 완료나 인용을 보장하지 않습니다.`;
}
