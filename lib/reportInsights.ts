import {NAVER_CATEGORIES,naverCounts} from './naverKnowledge';
import {isGenericKeyword} from './keywordRewrite';
import type {MarketingReport} from './reportSchema';
import {safeHttpUrl,ownHost} from './citationMeasurement';
import {buildObservationVisual,engineNames,engines,observationState,readinessItems} from './reportVisuals';

export type FollowupTask={id:string;group:string;title:string;status:'fail'|'warning'|'review';evidence:string;action:string;source:string};
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
  sources:'검색·출처 판정이 완료된 단일 관측의 URL만 모았습니다. 링크의 현재 접속 상태와 내용의 사실 여부는 별도 확인이 필요합니다.',
  reviews:'브랜드 언급이 있고 자사 출처 없이 외부 출처가 연결된 답변입니다. 오답 확정이 아닌 내용 대조 대상이며, 자사 출처가 있어도 정확성을 보장하지 않습니다.',
  messages:'저장된 페이지 제목·메타 설명의 표현만 비교합니다. 미탐지는 서비스 부재를 뜻하지 않으며 수집하지 못한 항목은 미확인입니다.',
  questions:'사이트 전체를 탐색한 결과가 아닙니다. 자사 인용 URL이 없으면 입력 페이지를 검토 후보로 연결합니다.',
  tasks:'기존 진단에서 보완이 필요한 항목을 모았습니다. 같은 문제가 여러 진단에서 발견되면 각각의 근거가 남을 수 있습니다.',
};
export function buildReportInsights(report:MarketingReport) {
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
  const reviews=verified.filter(r=>r.brandMentioned===true && (r.sources||[]).some(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&!ownHost(s.url,report.url)) && !(r.sources||[]).some(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&ownHost(s.url,report.url))).map(r=>({question:r.question,engine:engineNames[r.engine],answer:r.responseText||r.responseSnippet||'답변 원문이 저장되지 않았습니다.',sources:(r.sources||[]).filter(s=>safeHttpUrl(s.url)),measuredAt:r.measuredAt}));
  const questions=obs?.questions.map(q=>{
    const rows=verified.filter(r=>r.question.trim()===q.question);
    const owned=rows.flatMap(r=>r.sources||[]).find(s=>s.ownership!=='unresolved'&&!!safeHttpUrl(s.url)&&ownHost(s.url,report.url));
    const target=owned?safeHttpUrl(owned.url):rows.length?safeHttpUrl(report.url):null;
    return {question:q.question,id:q.id,target,kind:owned?'인용 페이지':rows.length?'입력 페이지 검토':'재측정 후 연결',evidence:owned?`출처에서 확인: ${owned.title}`:rows.length?'이번 정상 관측에서 자사 URL을 확인하지 못했습니다. 페이지의 답변 적합성을 검토하세요.':'판정 가능한 관측이 없습니다. 콘텐츠 부족으로 단정하지 마세요.',observations:rows.length};
  })||[];
  const competitors=report.competitorAnalysis?.competitors||[];
  const messageRows=[{name:'자사',url:safeHttpUrl(report.url),title:report.meta?.ogTitle,description:report.meta?.ogDescription,available:!!(report.meta?.ogTitle||report.meta?.ogDescription),isOwn:true},...competitors.map(c=>({name:c.domain,url:safeHttpUrl(c.link),title:c.metaTitle,description:c.metaDescription,available:!c.fetchError&&!!(c.metaTitle||c.metaDescription),isOwn:false}))].map(r=>{
    const fields=[r.title,r.description].filter((v):v is string=>typeof v==='string');const content=fields.join(' ');
    return {...r,fieldCount:fields.length,cells:messageThemes.map(theme=>({label:theme.label,match:r.available?content.match(theme.pattern)?.[0]||null:undefined})),evidence:content};
  });
  const ownMessage=messageRows[0];
  const messageOpportunities=messageThemes.flatMap((theme,i)=>{
    const known=messageRows.slice(1).filter(r=>r.available);const present=known.filter(r=>r.cells[i].match);
    return ownMessage.available && !ownMessage.cells[i].match && present.length?[{label:theme.label,count:present.length,total:known.length}]:[];
  });
  const stages=[{label:'첫인상',key:'firstView' as const,action:'제안의 핵심과 첫 화면 문구 확인'},{label:'신뢰 형성',key:'trust' as const,action:'검증 가능한 사례·후기·근거 확인'},{label:'행동 유도',key:'cta' as const,action:'버튼 문구·위치·다음 행동 확인'},{label:'전환 흐름',key:'conversionFlow' as const,action:'문의·신청 과정의 마찰 확인'}].map(s=>({...s,score:report.diagnosis[s.key]}));
  const gaps=(report.keywordFrequency?.singles||[]).slice(0,20).filter(k=>!isGenericKeyword(k.keyword)&&(!k.inTitle||!k.inMetaDescription)).slice(0,8);
  const tasks:FollowupTask[]=[];
  const push=(group:string,source:string,rows:{label:string;status:'pass'|'warning'|'fail';currentValue:string;guide:string}[])=>rows.filter(r=>r.status!=='pass').forEach((r,i)=>tasks.push({id:`${source}-${i}`,group,title:r.label,status:r.status as 'warning'|'fail',evidence:r.currentValue,action:r.guide,source}));
  report.criticalIssues.forEach((r,i)=>tasks.push({id:`critical-${i}`,group:'핵심 개선',title:r.title,status:r.priority==='high'?'fail':r.priority==='medium'?'warning':'review',evidence:r.problem,action:r.recommendation,source:'AI 진단'}));
  push('기본 진단','기본 체크리스트',report.checklist||[]);
  push('GEO 준비도','GEO 준비도',readinessItems(report.discoverability));
  for(const check of report.naverOptimization?.mode==='diagnosis'?report.naverOptimization.checks:[]) {
    if(check.status==='action'||(check.status==='manual'&&check.priority==='high'))tasks.push({id:`naver-${check.id}`,group:'네이버',title:check.title,status:check.status==='manual'?'review':check.priority==='high'?'fail':'warning',evidence:check.evidence,action:`${check.steps.join(' → ')} / 완료 확인: ${check.completion}`,source:NAVER_CATEGORIES[check.category]});
  }
  reviews.forEach((r,i)=>tasks.push({id:`brand-review-${i}`,group:'AI 답변',title:`${r.engine} 브랜드 답변 대조`,status:'review',evidence:r.question,action:'답변의 서비스 설명·업체명과 연결된 출처를 대조하세요. 오인식 여부는 확인 후 판단하세요.',source:'AI 답변 관측'}));
  const rank={fail:0,warning:1,review:2};tasks.sort((a,b)=>rank[a.status]-rank[b.status]);
  const metadataCount=competitors.filter(c=>!c.fetchError&&!!(c.metaTitle||c.metaDescription||c.h1||c.ctaTexts?.length)).length;
  const coverage=[
    {label:'페이지 진단',value:`${(report.checklist||[]).length}개 체크`,state:'저장됨',detail:'입력 페이지 기반 진단'},
    {label:'네이버 최적화',value:report.naverOptimization?.mode==='diagnosis'?`${report.naverOptimization.checks.length}개 점검`:'재진단 필요',state:report.naverOptimization?.mode==='diagnosis'?'관측·수동 분리':'기준 업데이트',detail:report.naverOptimization?.mode==='diagnosis'?`관측 확인 ${naverCounts(report.naverOptimization.checks).observed}개 · 계정·적용 범위 별도 확인`:'구버전 점수는 표시하지 않음'},
    {label:'AI 출처 판정',value:obs?`${obs.sourceTotal} / ${obs.total}건`:'—',state:!obs?'미확인':obs.sourceTotal===obs.total&&obs.total?'판정 완료':obs.sourceTotal?'일부 판정':'판정 불가',detail:'분모는 저장된 전체 관측'},
    {label:'경쟁사 수집',value:`${metadataCount} / ${competitors.length}개`,state:report.competitorStatus?.status==='pending'?'진행 중':competitors.length?(metadataCount===competitors.length?'저장됨':'일부 미확인'):'미확인',detail:'후보 중 상세 항목이 있는 사이트'},
  ];
  return {obs,sources,reviews,questions,messageRows,messageOpportunities,stages,gaps,tasks,coverage,metadataCount,competitorCount:competitors.length};
}
export type ReportInsights=ReturnType<typeof buildReportInsights>;
export function contentBrief(question:string,target:string|null) {
  return `질문: ${question}\n검토 페이지: ${target||'관측 복구 후 관련 페이지 확인'}\n\n1. 직접 답변: [확인한 사실로 작성]\n2. 적용 조건·서비스 범위: [담당자 확인 필요]\n3. 근거 링크·사례: [검증 가능한 자료 입력]\n4. 최종 확인 날짜: [실제 확인일 입력]\n\n가격·성과·후기는 확인된 사실만 기재하세요. 이 문서는 콘텐츠 작성 틀이며 작성 완료나 인용을 보장하지 않습니다.`;
}
