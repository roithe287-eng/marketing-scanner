import {z} from 'zod';
import type {ExtractedWebsiteData} from './extractWebsite';
import {AnswerContentPlanSchema,AnswerIntentSchema,type AnswerContentPlan,type AnswerSource,type AnswerKeyword,type AnswerIntent,type AnswerQuestion} from './answerContentSchema';

export const ANSWER_CONTENT_TITLE='네이버 AI 브리핑 대응 콘텐츠 개선안';
export const ANSWER_CONTENT_NOTICE='입력한 페이지의 수집된 내용으로 만든 추천 질문입니다. 네이버 자동완성 순위·AI 브리핑 답변·인용 여부는 측정하지 않았습니다. 답변 초안은 원문을 재배치한 것이며, 게시 전 현재 운영 조건을 확인해 주세요. 인용이나 노출을 보장하지 않습니다.';
export const ANSWER_STATUS={supported:'답변 근거 확인',partial:'추가 정보 필요',not_observed:'수집 범위에서 미확인',review:'페이지 답변 대조 필요'};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
const compact=(text:string)=>clean(text).replace(/\s/g,'').toLocaleLowerCase();
export type AnswerPageData=Pick<ExtractedWebsiteData,'url'|'finalUrl'|'title'|'description'|'ogDescription'|'h1'|'h2'|'bodyText'|'isJsHeavy'|'siteEditing'|'seoEvidence'>;

type IntentGuide={question:(keyword:string)=>string;fields:string[];template:(keyword:string)=>string;placement:string;match:RegExp};
export const ANSWER_GUIDES:Record<AnswerIntent,IntentGuide>={
  definition:{question:k=>`${k}는 어떤 제품·서비스인가요?`,fields:['대상 고객','핵심 기능·제공 가치'],template:k=>`${k}는 [대상 고객]을 위한 [제품·서비스 유형]입니다. [핵심 기능 또는 제공 범위]를 제공합니다.`,placement:'대표 소개 문단 아래',match:/입니다|제공|위한|서비스|제품|소개/},
  price:{question:k=>`${k}의 가격은 무엇에 따라 달라지나요?`,fields:['가격 또는 견적 산정 기준','포함·별도 비용'],template:k=>`${k}의 [가격 또는 견적]은 [산정 기준]에 따라 정해집니다. [포함 항목]은 포함되며, [추가 비용 발생 조건]은 별도로 안내합니다.`,placement:'가격·견적 안내와 문의 버튼 사이',match:/가격|비용|요금|견적|원\b|원입니다|부가세|유료|무료|할인/},
  delivery:{question:k=>`${k} 제작·배송에는 얼마나 걸리나요?`,fields:['기간 산정 시작 기준','제작 기간','배송 포함 여부'],template:k=>`${k} 제작은 [기간 산정 시작 기준]부터 [제작 기간]이 소요됩니다. 배송은 [포함 여부 및 배송 기간]이며, [일정이 달라지는 조건]은 주문 전 확인해 주세요.`,placement:'주문·제작 안내 아래',match:/제작|배송|납기|영업일|소요|기간|일정/},
  minimum:{question:k=>`${k}는 몇 ${/과잠|의류|단체복|유니폼/.test(k)?'벌':'개'}부터 주문할 수 있나요?`,fields:['최소 주문 수량','혼합·추가 주문 조건'],template:k=>`${k}의 최소 주문 수량은 [최소 수량]입니다. [사이즈·옵션 혼합 가능 범위]이며, 추가 주문 시 [적용 조건]을 확인해 주세요.`,placement:'상품 옵션·주문 안내 아래',match:/최소|수량|벌|개부터|장부터|추가 주문|소량/},
  process:{question:k=>`${k} 이용은 어떤 순서로 진행되나요?`,fields:['진행 단계','고객 준비사항','완료 기준'],template:k=>`${k}는 [첫 단계] → [중간 단계] → [완료 단계] 순서로 진행합니다. 시작 전 [고객 준비사항]이 필요하며, [완료 기준]을 확인한 뒤 마무리합니다.`,placement:'이용 절차 안내와 신청 버튼 사이',match:/절차|단계|진행|신청|상담|계약|확정|접수/},
  scope:{question:k=>`${k}에는 어떤 항목이 포함되나요?`,fields:['기본 포함 항목','제외·추가 항목'],template:k=>`${k}의 기본 제공 범위는 [포함 항목]입니다. [제외 또는 추가 항목]은 별도이며, [적용 조건]에 따라 범위가 달라집니다.`,placement:'서비스·상품 구성 안내 아래',match:/포함|제외|제공|범위|구성|별도/},
  choice:{question:k=>`${k}를 선택할 때 무엇을 확인해야 하나요?`,fields:['선택 기준','조건별 차이','실제 사례'],template:k=>`${k}를 선택할 때는 [선택 기준]을 확인해 주세요. [사용 조건 A]에는 [적합한 조건], [사용 조건 B]에는 [다른 조건]을 비교할 수 있습니다.`,placement:'특징 설명 아래 비교표와 함께',match:/선택|비교|기준|적합|권장|장점|단점|원단|소재/},
  care:{question:k=>`${k}는 어떻게 사용·관리하나요?`,fields:['사용·관리 방법','주의사항'],template:k=>`${k}는 [사용·관리 방법]에 따라 관리해 주세요. [주의해야 할 조건]에서는 [확인할 조치]가 필요합니다.`,placement:'사용법·관리 안내 아래',match:/세탁|관리|사용법|보관|주의|취급|사용 방법/},
  comparison:{question:k=>`${k}의 종류별 차이는 무엇인가요?`,fields:['비교할 종류','동일 기준의 차이','선택 조건'],template:k=>`${k}의 [종류 A]와 [종류 B]는 [비교 기준]에서 차이가 있습니다. [조건별 차이]를 확인하고 [사용 목적]에 맞춰 선택해 주세요.`,placement:'종류·옵션 설명 아래 비교표',match:/차이|비교|종류|옵션|장단점|특징/},
  location:{question:k=>`${k}는 어디에서 이용할 수 있나요?`,fields:['제공 지역·위치','이용·예약 조건'],template:k=>`${k}는 [제공 지역 또는 위치]에서 이용할 수 있습니다. [운영 시간·예약 조건]을 확인한 뒤 [이용 방법]으로 신청해 주세요.`,placement:'위치·이용 안내 아래',match:/주소|위치|지역|방문|예약|운영 시간|영업 시간/},
  eligibility:{question:k=>`${k}는 어떤 조건에서 이용할 수 있나요?`,fields:['이용 대상','필수 조건','제외 조건'],template:k=>`${k}는 [이용 대상]이 [필수 조건]을 충족할 때 이용할 수 있습니다. [제외 조건]에 해당하면 [별도 확인사항]을 먼저 확인해 주세요.`,placement:'이용 대상·신청 자격 안내 아래',match:/자격|대상|조건|제외|신청|필수/},
  proof:{question:k=>`${k}의 실제 사례는 어디에서 확인하나요?`,fields:['공개 가능한 실제 사례','기간·조건','결과 확인 자료'],template:k=>`${k}의 [실제 사례명]은 [진행 기간과 조건]에 따라 진행했습니다. [확인 가능한 결과]와 [검증 자료 또는 사례 페이지]를 함께 확인해 주세요.`,placement:'사례·후기 영역 아래',match:/사례|실적|후기|결과|검증|포트폴리오/},
};

/** A bounded pool from the already fetched page. No search API data, extra crawl or hidden state. */
export function answerSources(data:AnswerPageData):AnswerSource[]{
  const sources:AnswerSource[]=[];const seen=new Set<string>();
  const add=(text:string,kind:AnswerSource['kind'],location:string,selector?:string)=>{
    const value=clean(text);if(value.length<2||value.length>700||seen.has(value)||sources.length>=100)return;
    seen.add(value);sources.push({id:`p${sources.length+1}`,text:value,kind,location:location.slice(0,300),...(selector?{selector}: {})});
  };
  add(data.title||'','title','페이지 제목','title');
  add(data.description||data.ogDescription||'','description','페이지 설명');
  for(const [i,h] of (data.h1||[]).entries())add(h,'heading',`대표 제목 ${i+1}`);
  const elements=data.siteEditing?.elements||[];
  const usable=elements.filter(e=>!e.truncated&&!['nav','header','footer'].includes(e.region||'')&&['text','heading'].includes(e.kind));
  for(const e of usable)add(e.text,e.kind==='heading'?'heading':'body',e.section?.label||e.heading||'본문',e.selector);
  if(!usable.some(e=>e.kind==='heading'))for(const h of (data.h2||[]).slice(0,10))add(h,'heading','소제목');
  // Exclude known navigation/footer copies from the fallback body pool as well.
  const chrome=elements.filter(e=>['nav','header','footer'].includes(e.region||'')).map(e=>clean(e.text));
  for(const line of (data.bodyText||'').split(/\n+/)){
    const value=clean(line);
    if(value.length<12||chrome.some(t=>t.includes(value)))continue;
    add(value,'body','본문 발췌');
  }
  return sources;
}

function keyword(term:string,pool:AnswerSource[]):AnswerKeyword|null{
  const value=clean(term);if(value.length<2||value.length>40||!/[가-힣a-z]/i.test(value))return null;
  if(/^(홈페이지|사이트|회사|서비스|제품|상품|로그인|회원가입|고객센터|문의|메뉴|copyright|home)$/i.test(value))return null;
  const evidence=pool.filter(p=>compact(p.text).includes(compact(value))).sort((a,b)=>({title:4,heading:3,description:2,body:1}[b.kind]-{title:4,heading:3,description:2,body:1}[a.kind])).slice(0,3);
  if(!evidence.length)return null;
  const kinds=new Set(evidence.map(e=>e.kind));
  const confidence=kinds.has('body')&&(kinds.has('title')||kinds.has('heading'))?'high':kinds.has('title')||kinds.has('heading')?'medium':'low';
  return {term:value,evidence,confidence,reason:`${[...new Set(evidence.map(e=>e.location))].join(' · ')}에서 표현을 확인했습니다. 페이지 주제 후보이며 검색량 순위가 아닙니다.`};
}

export function fallbackKeywords(pool:AnswerSource[]):AnswerKeyword[]{
  const scores=new Map<string,number>();
  const stop=/^(입니다|합니다|있는|위한|대한|통해|전문|우리|고객|안내|확인|이용|관련|바로|가기|보기|전체|더보기|개인정보|처리방침|이용약관|네이버|카카오|사업자|대표|주식회사|copyright|the|and|for)$/i;
  for(const p of pool){
    const weight={title:12,heading:8,description:5,body:1}[p.kind];
    const tokens=[...new Set((p.text.match(/[가-힣a-zA-Z][가-힣a-zA-Z0-9+·-]{1,19}/g)||[]).map(t=>t.replace(/(에서는|으로|에서|에는|은|는|을|를|의)$/,'')))];
    for(const t of tokens)if(t.length>=2&&!stop.test(t))scores.set(t,(scores.get(t)||0)+weight);
  }
  return [...scores].sort((a,b)=>b[1]-a[1]).map(([t])=>keyword(t,pool)).filter((k):k is AnswerKeyword=>!!k).slice(0,3);
}

const RawQuestionSchema=z.object({question:z.string().min(5).max(160),intent:AnswerIntentSchema,evidenceIds:z.array(z.string().max(30)).max(3),missingFacts:z.array(z.string().min(2).max(100)).max(5)});
export const AnswerSuggestionSchema=z.object({primaryKeyword:z.string().min(2).max(40),secondaryKeywords:z.array(z.string().min(2).max(40)).max(2),topicScope:z.enum(['focused','mixed','unknown']),questions:z.array(RawQuestionSchema).length(3)});

function defaultIntents(k:string,pool:AnswerSource[]):AnswerIntent[]{
  const context=[k,...pool.filter(p=>p.kind!=='body').map(p=>p.text)].join(' ');
  if(/과잠|단체복|유니폼|맞춤.?제작|의류/.test(context))return ['delivery','minimum','price'];
  if(/대행|마케팅|컨설팅|강의|교육|상담/.test(context))return ['scope','process','price'];
  if(/매장|식당|카페|음식점|숙소/.test(context))return ['location','price','choice'];
  if(/식품|음료|와인|가전|화장품|뷰티|제품/.test(context))return ['choice','care','comparison'];
  return ['definition','choice','process'];
}

/** Unknown model IDs and any model-written answer prose are discarded. Facts are full source units only. */
export function buildAnswerContentPlan(data:AnswerPageData,suggestion?:unknown):AnswerContentPlan{
  const pool=answerSources(data),fallback=fallbackKeywords(pool);
  const parsed=AnswerSuggestionSchema.safeParse(suggestion);
  const ai=parsed.success?parsed.data:null;
  const primary=(ai&&keyword(ai.primaryKeyword,pool))||fallback[0]||null;
  const assisted=!!(ai&&primary&&compact(primary.term)===compact(ai.primaryKeyword));
  const secondaries=(assisted?ai!.secondaryKeywords.map(k=>keyword(k,pool)).filter((k):k is AnswerKeyword=>!!k):fallback.slice(1)).filter((k,i,a)=>compact(k.term)!==compact(primary?.term||'')&&a.findIndex(v=>compact(v.term)===compact(k.term))===i).slice(0,2);
  const limited=(data.bodyText||'').trim().length<80||data.isJsHeavy===true;
  const intents=defaultIntents(primary?.term||'',pool);
  const fallbackRows=intents.map(intent=>({question:ANSWER_GUIDES[intent].question(primary?.term||'이 페이지'),intent,evidenceIds:[] as string[],missingFacts:ANSWER_GUIDES[intent].fields}));
  const rows=assisted?ai!.questions:fallbackRows;
  const usedQuestions=new Set<string>();
  const questions:AnswerQuestion[]=primary?rows.map((row,i)=>{
    const guide=ANSWER_GUIDES[row.intent];
    let question=row.question;
    if(usedQuestions.has(compact(question))||/https?:|<[^>]+>|자동완성|브리핑.*(순위|선정)|\d/.test(question))question=fallbackRows[i].question;
    usedQuestions.add(compact(question));
    const evidence=[...new Set(row.evidenceIds)].flatMap(id=>{const p=pool.find(p=>p.id===id&&p.kind==='body'&&p.text.length>=12&&guide.match.test(p.text));return p?[p]:[];}).slice(0,3);
    const missingFacts=[...new Set(row.missingFacts.map(clean).filter(s=>!/[<>\d]|https?:|보장|100%/.test(s)))];
    if(!evidence.length&&!missingFacts.length)missingFacts.push(...guide.fields);
    if(limited&&!missingFacts.includes('실제 페이지의 전체 답변과 운영 조건'))missingFacts.splice(4,1,'실제 페이지의 전체 답변과 운영 조건');
    const status=evidence.length?(missingFacts.length?'partial':'supported'):(!assisted||limited)?'review':'not_observed';
    const draft=evidence.map(e=>e.text).join('\n');
    return {id:`answer-${i+1}`,question,intent:row.intent,status,evidence,missingFacts,
      draft,template:guide.template(primary.term),placement:guide.placement,
      steps:['해당 질문과 첫 문장 답변을 고객이 읽을 수 있는 본문 텍스트로 배치합니다.','수량·금액·기간·예외 조건은 실제 운영 기준과 대조한 뒤 게시합니다.','수정 후 같은 URL을 재진단하고, 실제 검색 노출은 별도로 확인합니다.']};
  }):[];
  return AnswerContentPlanSchema.parse({version:1,source:'own-page',mode:limited?'limited':assisted?'ai-assisted':'basic',targetUrl:data.finalUrl||data.url,observedAt:data.seoEvidence?.capturedAt||new Date().toISOString(),scope:'submitted-page',coverage:limited?'limited':'partial',observation:'not-measured',notice:ANSWER_CONTENT_NOTICE,primaryKeyword:primary,secondaryKeywords:secondaries,topicScope:assisted?ai!.topicScope:'unknown',questions});
}

export function answerQuestionText(question:AnswerQuestion):string{
  return `Q. ${question.question}\nA. ${question.draft||question.template}${question.missingFacts.length?`\n[게시 전 확인: ${question.missingFacts.join(' / ')}]`:''}`;
}
export function answerPlanText(plan:AnswerContentPlan):string{
  return `${ANSWER_CONTENT_TITLE}\n대표 키워드: ${plan.primaryKeyword?.term||'확인 필요'}\n${plan.notice}\n\n${plan.questions.map(answerQuestionText).join('\n\n')}`;
}
