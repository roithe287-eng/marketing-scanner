import {z} from 'zod';
import type {ExtractedWebsiteData} from './extractWebsite';
import type {MarketingReport,ChecklistItem} from './reportSchema';

export const EVIDENCE_SCORE_NOTE='수집한 HTML의 제목·설명·공유 정보·H1·ALT 속성·viewport 6개 항목을 같은 비중으로 집계합니다. 충족 항목 ÷ 판정 가능한 항목 × 100을 반올림합니다. 미확인은 분모에서 제외합니다. 자체 점검 기준이며 검색엔진 점수·전환율·AI 인용 가능성이나 실제 화면의 품질을 뜻하지 않습니다.';
export const EvidenceReviewSchema=z.object({
  version:z.literal(1),sourceUrl:z.string().max(4000).url().refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}}),capturedAt:z.string().datetime(),
  score:z.number().min(0).max(100).nullable(),passed:z.number().int().nonnegative(),assessed:z.number().int().nonnegative(),unknown:z.number().int().nonnegative(),note:z.string(),
  criteria:z.array(z.object({id:z.string().max(80),label:z.string().max(120),status:z.enum(['pass','warning','fail','review']),rule:z.string().max(1000),evidence:z.string().max(20000),locator:z.string().max(500)})).max(6),
  axes:z.array(z.object({key:z.string().max(80),label:z.string().max(120),status:z.enum(['observed','review','unmeasured']),evidence:z.string().max(30000),nextStep:z.string().max(10000)})).max(8),
});
export type EvidenceReview=z.infer<typeof EvidenceReviewSchema>;
const labels={firstView:'첫 화면',cta:'CTA 문구',copywriting:'본문 문구',trust:'신뢰 정보',conversionFlow:'전환 흐름',adLanding:'광고 랜딩',mobileUx:'모바일 UX',seo:'SEO 기본 정보'};
const rules:Record<string,string>={title:'비어 있지 않은 title 1개',meta_description:'비어 있지 않은 meta description 1개',og_tags:'og:title과 og:description 존재',h1:'비어 있지 않은 H1 존재. 복수 H1만으로 감점하지 않음',image_alt:'수집한 img의 alt 속성 누락 없음. 빈 alt는 장식 용도로 허용',viewport:'viewport 메타 존재. 모바일 동작 확인과 구분'};
const locations:Record<string,string>={title:'head > title',meta_description:'head > meta[name="description"]',og_tags:'meta[property^="og:"]',h1:'h1',image_alt:'img:not([alt])',viewport:'meta[name="viewport"]'};
const observedNote='입력 페이지의 정적 HTML 관측입니다. 실제 화면·외부 연결 화면·계정 데이터는 별도로 확인합니다.';
function excerpt(value:string,max=4000){return value.length>max?value.slice(0,max)+`… (원문 ${value.length}자 중 발췌)`:value;}
function isContactLink(value:string){
  try{const u=new URL(value);return ['tel:','mailto:'].includes(u.protocol)||(/^https?:$/.test(u.protocol)&&(u.hostname==='channel.io'||u.hostname.endsWith('.channel.io')||['pf.kakao.com','open.kakao.com'].includes(u.hostname)));}catch{return false;}
}

/** One frozen observation is used by the header, checklist, review cards and every export. */
export function finalizeReportEvidence(report:MarketingReport,data:ExtractedWebsiteData):MarketingReport {
  const sourceUrl=data.finalUrl||data.url,capturedAt=data.seoEvidence?.capturedAt||report.pageEvidence?.capturedAt||new Date().toISOString();
  const origin=new Map((report.checklist||[]).map(c=>[c.id,c]));
  const contactLinks=(data.anchorHrefs||[]).filter(isContactLink).slice(0,8).map(s=>excerpt(s,300));
  const ctas=[...new Set(data.ctaButtons||[])];
  const contactCtas=ctas.filter(s=>/문의|상담|견적|예약|contact|consult|demo/i.test(s));
  const h1=`H1 요소 ${data.h1Count??'미확인'}개 · ${data.h1.length}개 텍스트 수집: ${data.h1.length?excerpt(data.h1.join(' / ')):'정적 HTML에서 비어 있지 않은 H1 텍스트 미감지'}`;
  const contact=`전화·이메일 패턴 ${data.hasContactInfo?'감지':'미감지'} · 폼 ${data.hasForm?'감지':'미감지'} · 문의·상담 CTA ${contactCtas.length}종 · 연락 링크 ${contactLinks.length}개${contactLinks.length?': '+contactLinks.join(' / '):''}`;
  const facts:{id:string;label:string;category:ChecklistItem['category'];status:ChecklistItem['status'];value:string;note:string;guide:string}[]=[
    {id:'title',label:'title 태그',category:'seo',status:!data.seoEvidence?'review':data.title&&data.seoEvidence.titleCount===1?'pass':'warning',value:`${excerpt(data.title)||'정적 HTML에서 title 미감지'} · title ${data.seoEvidence?.titleCount??'미확인'}개`,note:'검색 제목 원문과 개수의 관측입니다. 고정 글자 수를 합격 기준으로 사용하지 않습니다.',guide:'페이지 주제를 간결하게 설명하는 고유 제목인지 확인하세요. 50~60자에 맞추기 위한 불필요한 확장은 하지 않습니다.'},
    {id:'meta_description',label:'Meta Description',category:'seo',status:!data.seoEvidence?'review':data.description&&data.seoEvidence.descriptionCount===1?'pass':'warning',value:`${excerpt(data.description)||'정적 HTML에서 description 미감지'} · description ${data.seoEvidence?.descriptionCount??'미확인'}개`,note:'검색 설명의 존재·개수입니다. 설명 미기재는 Google 색인 필수 요건 위반이나 실제 스니펫 미노출을 뜻하지 않습니다.',guide:'본문에 맞는 고유 설명인지 확인하세요. 실제 검색 스니펫 채택은 별도로 확인합니다.'},
    {id:'og_tags',label:'Open Graph',category:'seo',status:data.ogTitle&&data.ogDescription?'pass':'warning',value:`og:title: ${excerpt(data.ogTitle)||'미감지'} / og:description: ${excerpt(data.ogDescription)||'미감지'}`,note:'공유용 메타데이터입니다. 검색 제목·설명과 구분합니다.',guide:'공유 미리보기와 페이지 내용이 일치하는지 확인하세요.'},
    {id:'h1',label:'H1',category:'content',status:data.h1.length?'pass':'warning',value:h1,note:'H1 존재 여부를 관측했습니다. 대표성·목차·기기별 노출은 렌더링 검토 대상이며 개수만으로 검색 패널티를 판정하지 않습니다.',guide:'수집한 H1을 PC·모바일 화면과 대조하세요. 반응형 복제나 숨겨진 요소를 구분한 뒤 대표 제목의 위계를 검토합니다.'},
    {id:'image_alt',label:'이미지 ALT',category:'content',status:data.imageCount===0?'review':data.imageWithoutAlt===0?'pass':'warning',value:`이미지 ${data.imageCount}개 / alt 속성 누락 ${data.imageWithoutAlt}개 / 빈 alt ${data.seoEvidence?.imagesEmptyAlt??'미확인'}개`,note:'속성 존재를 검사했습니다. 빈 alt는 장식 이미지에 적절할 수 있습니다. 설명의 정확성과 이미지 역할은 별도 검토합니다.',guide:'alt 속성이 누락된 이미지의 역할을 확인하고 정보성 이미지에는 설명을, 장식 이미지에는 빈 alt를 적용하세요.'},
    {id:'viewport',label:'모바일 viewport',category:'seo',status:data.viewportMeta?'pass':'warning',value:excerpt(data.viewportMeta)||'정적 HTML에서 viewport 미감지',note:'메타 태그만 확인했습니다. 모바일 레이아웃·터치·속도는 미측정입니다.',guide:'실제 모바일 화면에서 잘림·확대·입력·터치 동작과 성능을 확인하세요.'},
    {id:'cta_clarity',label:'CTA 문구·연결 확인',category:'conversion',status:'review',value:`수집한 CTA: ${ctas.join(' / ')||'미감지'}`,note:'문구 감지는 클릭 위치·목적·문의 완료의 검증이 아닙니다.',guide:'주요 CTA의 실제 위치와 연결 화면을 대조하고 클릭→문의 완료 흐름을 테스트하세요.'},
    {id:'cta_repeat',label:'CTA 반복 배치 검토',category:'conversion',status:'review',value:`수집한 버튼·링크 문구 ${data.buttons.length}개 · 주요 CTA ${data.ctaButtons.length}회`,note:'수집한 문구 표본입니다. 전체 페이지의 모든 버튼 수나 실제 화면 배치가 아니며 반복 횟수만으로 전환 개선을 판정하지 않습니다.',guide:'페이지 길이·기기별 노출과 CTA 역할을 확인하고, 클릭·문의 완료 데이터를 기준으로 배치를 테스트하세요.'},
    {id:'contact_info',label:'연락 경로 확인',category:'conversion',status:'review',value:contact,note:'수집 범위에서 패턴을 찾지 못한 경우에도 연락처나 문의 기능 부재로 단정하지 않습니다.',guide:'폼·채널톡·카카오톡·전화·이메일 중 실제 제공하는 문의 경로를 끝까지 테스트하세요. 누락이 확인된 정보만 보완합니다.'},
    {id:'trust_review',label:'후기·사례 확인',category:'trust',status:'review',value:`후기·리뷰 관련 표현 ${data.hasReviewKeyword?'감지':'미감지'}`,note:'관련 단어 감지는 실제 고객 후기의 존재·진위·사용 권한을 증명하지 않습니다.',guide:'해당 원문·사례·출처·공개 사용 가능 범위를 확인한 뒤 안내하세요.'},
    {id:'trust_certification',label:'인증·경력 확인',category:'trust',status:'review',value:`인증·신뢰 관련 표현 ${data.hasTrustKeyword?'감지':'미감지'}`,note:'키워드 감지와 실제 인증·경력 검증은 다릅니다.',guide:'기관·인증명·대상·기간과 확인 가능한 근거를 대조하세요.'},
    {id:'price_info',label:'가격·견적 확인',category:'conversion',status:'review',value:`가격·견적 관련 표현 ${data.hasPriceKeyword?'감지':'미감지'}`,note:'관련 표현만 관측했습니다. 실제 금액·포함 범위·추가 비용과 모든 서비스의 가격 공개 여부는 미확인입니다.',guide:'실제 서비스에 적용되는 금액·범위·별도 협의 조건을 확인하고 누락이 확인된 안내만 보완하세요.'},
  ];
  const checklist=facts.map(f=>({...origin.get(f.id),id:f.id,label:f.label,category:f.category,status:f.status,currentValue:f.value,diagnosis:f.note,guide:f.guide,evidenceType:'observed' as const,sourceUrl,capturedAt,locator:locations[f.id]||'body · 링크·버튼 관측'}));
  const canonical=(s:string)=>/H1|대표 제목|목차/i.test(s)?facts[3]:/연락처|전화번호|이메일|NAP|지역 정보/.test(s)?facts[8]:/CTA|버튼/i.test(s)?facts[6]:/후기|리뷰/.test(s)?facts[9]:/인증/.test(s)?facts[10]:/가격|견적/.test(s)?facts[11]:undefined;
  const criticalIssues=report.criticalIssues.map(issue=>{
    const fact=canonical(issue.title+' '+issue.problem);
    if(fact)return {...issue,title:`${fact.label} · 실제 화면 확인`,problem:fact.value,reason:fact.note,recommendation:fact.guide,priority:'low' as const,badExample:fact.value,goodExample:undefined,exampleNote:'관측값과 실제 화면을 대조한 뒤 수정 여부를 결정하세요.',evidenceStatus:'review' as const,evidenceNote:`${observedNote} · ${sourceUrl} · ${capturedAt}`};
    const unmeasured=/모바일|첫 화면|랜딩|전환 흐름|전환율|이탈률/.test(issue.title+' '+issue.problem);
    if(unmeasured||issue.evidenceStatus==='review')return {...issue,title:unmeasured?'실제 화면·전환 데이터 확인':issue.title,problem:unmeasured?'정적 HTML만으로 실제 화면의 품질·광고 메시지 일치·전환 흐름의 문제를 확정하지 않았습니다.':issue.problem,reason:'실제 화면·광고 원본·행동 데이터와 원문을 대조해야 합니다.',recommendation:'현재 페이지와 원문을 먼저 확인하세요. '+issue.recommendation,priority:'low' as const,goodExample:undefined,evidenceStatus:'review' as const,evidenceNote:'AI 검토 의견입니다. 확인 전에는 문제 확정·감점·수정 지시로 사용하지 않습니다.'};
    return {...issue,evidenceStatus:'review' as const,evidenceNote:issue.evidenceNote||'수집 원문에 대한 AI 검토 의견이며 원인·개선 효과를 검증한 결과가 아닙니다.'};
  });
  const criteria=facts.filter(f=>f.id in rules).map(f=>({id:f.id,label:f.label,status:f.status,rule:rules[f.id],evidence:f.value,locator:locations[f.id]}));
  const measured=criteria.filter(c=>c.status!=='review'),passed=measured.filter(c=>c.status==='pass').length;
  const score=measured.length?Math.round(100*passed/measured.length):null;
  const axes:EvidenceReview['axes']=Object.entries(labels).map(([key,label])=>{
    const mapping:Record<string,number[]>={cta:[6,7],copywriting:[0,1,3],trust:[8,9,10],seo:[0,1,3,4]};
    const ids=mapping[key];
    if(key==='copywriting'){
      const body=(data.siteEditing?.elements||[]).filter(e=>e.kind==='text'&&!['header','nav','footer'].includes(e.region||'')).slice(0,2).map(e=>e.text).join(' ')||data.bodyText;
      return {key,label,status:'review',evidence:`수집 본문 ${data.bodyText.length}자 · 발췌: ${body.slice(0,500)}${body.length>500?'…':''}`,nextStep:'발췌를 앞뒤 문맥과 대조하고, 반복 문장이 새로운 정보를 제공하는지 검토하세요. 빈도만으로 과잉·삭제 필요성을 판단하지 않습니다.'};
    }
    return {key,label,status:ids?'review':'unmeasured',evidence:ids?ids.map(i=>facts[i].value).join(' · '):key==='adLanding'?'광고 원본·타겟·유입 문맥 미수집':key==='mobileUx'?'실제 모바일 렌더링·터치·Core Web Vitals 미측정':key==='conversionFlow'?'클릭→입력→제출 완료·이벤트 수신 미측정':'기기별 첫 화면·시각적 위계 미측정',nextStep:ids?ids.map(i=>facts[i].guide).join(' '):key==='adLanding'?'광고 문구·혜택·조건과 도착 페이지를 함께 대조하세요.':key==='mobileUx'?'실제 모바일 기기에서 렌더링·터치·입력과 성능을 확인하세요.':key==='conversionFlow'?'실제 문의 동선을 끝까지 실행하고 클릭·완료 이벤트를 확인하세요.':'PC·모바일 첫 화면에서 고객·제공 가치·다음 행동이 함께 보이는지 확인하세요.'};
  });
  const evidenceReview:EvidenceReview={version:1,sourceUrl,capturedAt,score,passed,assessed:measured.length,unknown:criteria.length-measured.length,note:EVIDENCE_SCORE_NOTE,criteria,axes};
  const discovery=report.discoverability?{...report.discoverability,summary:'수집 HTML에 대한 AI 검토 의견입니다. 실제 검색 노출이나 AI 인용 가능성을 점수로 검증한 결과가 아닙니다.',contentStructure:{...report.discoverability.contentStructure,status:'warning' as const,currentValue:h1,diagnosis:facts[3].note,guide:facts[3].guide},eeat:{...report.discoverability.eeat,status:'warning' as const,currentValue:contact,diagnosis:facts[8].note,guide:facts[8].guide},localBrand:{...report.discoverability.localBrand,status:'warning' as const,currentValue:contact,diagnosis:'브랜드·지역·NAP의 실제 일치와 지역 검색 노출은 별도 확인 대상입니다.',guide:facts[8].guide},priorityActions:(report.discoverability.priorityActions||[]).map(s=>canonical(s)?.guide||s)}:report.discoverability;
  const scope=(s:string)=>canonical(s)?.guide||s;
  return {...report,checklist,criticalIssues,discoverability:discovery,evidenceReview,
    oneLineSummary:`HTML 기본 항목 ${measured.length}개 중 ${passed}개 충족 · 실제 화면·문의 흐름·광고 랜딩·모바일은 별도 확인이 필요합니다.`,
    finalCta:{...report.finalCta,title:'확인한 근거로 다음 실행을 정하세요',description:`수집한 HTML 기본 항목 ${measured.length}개 중 ${passed}개가 점검 기준을 충족했습니다. 실제 화면·문의 과정·광고 원본과 계정 데이터를 함께 대조해 필요한 개선 순서를 정리하세요.`},
    priorityRoadmap:{immediately:report.priorityRoadmap.immediately.map(scope),thisWeek:report.priorityRoadmap.thisWeek.map(scope),thisMonth:report.priorityRoadmap.thisMonth.map(scope)},
    quickWinsDetailed:report.quickWinsDetailed?.map(q=>{const f=canonical(q.title);return f?{...q,title:`${f.label} 확인`,beforeExample:f.value,steps:[f.guide],afterExample:'실제 누락·문제 여부를 확인한 뒤 필요한 부분만 보완하세요.'}:{...q,steps:['실제 원문·화면에서 문제 여부를 확인한 뒤 다음 AI 검토 제안의 적용 여부를 결정하세요.',...q.steps]};}),
  };
}

export function evidenceScoreText(report:MarketingReport){const e=report.evidenceReview;return e?`HTML 기본 항목 ${e.passed}/${e.assessed}개 충족${e.score===null?'':` · ${e.score}%`}`:`AI 참고 평가 ${report.overallScore}/100 · 세부 배점 미검증`;}

/** Prefer observed crawl problems to stylistic advice or unmeasured UX assumptions. */
export function evidencePriorities(report:MarketingReport){
  const review=report.evidenceReview;if(!review)return [];
  const official=report.officialSeoAudit?.mode==='diagnosis'&&report.officialSeoAudit.targetUrl===report.url?report.officialSeoAudit.checks.filter(c=>c.status==='action'):[];
  const rank=(c:typeof official[number])=>c.id==='http'?0:c.id==='google-document-size'?1:c.topic==='crawl'?2:3;
  const candidates=[...official.sort((a,b)=>rank(a)-rank(b)).map(c=>({title:c.title,note:c.evidence})),...review.criteria.filter(c=>c.status!=='pass').map(c=>({title:c.label,note:c.evidence})),...review.axes.filter(a=>a.status==='unmeasured').map(a=>({title:a.label,note:a.nextStep}))];
  const seen=new Set<string>();return candidates.filter(c=>{if(seen.has(c.title))return false;seen.add(c.title);return true;}).slice(0,3);
}
