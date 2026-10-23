import {z} from 'zod';
import type {ExtractedWebsiteData} from './extractWebsite';

export const PurposeKindSchema=z.enum(['commerce','service','organization','education','content','public_service','mixed','unknown']);
const source=z.object({text:z.string().max(600),locator:z.string().max(1000)});
export const WebsitePurposeSchema=z.object({
  version:z.literal(1),kind:PurposeKindSchema,label:z.string().max(100),sourceUrl:z.string().max(4000).url().refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}}),
  capturedAt:z.string().datetime().optional(),evidence:z.array(source).max(8),
  goal:z.object({key:z.enum(['purchase','contact','booking','application','download','subscribe','read','unknown']),label:z.string().max(100),observed:z.boolean(),evidence:z.array(source).max(4)}),
  pricingObserved:z.boolean(),note:z.string().max(1000),
  checks:z.array(z.object({id:z.string().max(80),label:z.string().max(150),status:z.enum(['observed','review','not_applicable']),evidence:z.array(source).max(3),guide:z.string().max(1200)})).max(8),
});
export type WebsitePurpose=z.infer<typeof WebsitePurposeSchema>;
export type PurposeKind=WebsitePurpose['kind'];
type PurposeInput=Pick<ExtractedWebsiteData,'url'|'finalUrl'|'title'|'description'|'h1'|'h2'|'bodyText'> & Partial<Pick<ExtractedWebsiteData,'ogDescription'|'siteEditing'|'buttons'|'ctaButtons'|'productContext'|'productDiscovery'|'seoEvidence'|'schemaTypes'>>;
const labels:Record<PurposeKind,string>={commerce:'상품 판매형',service:'서비스·상담형',organization:'기업·기관 소개형',education:'교육·프로그램형',content:'정보·콘텐츠형',public_service:'공공·지원 안내형',mixed:'판매·비커머스 혼합형',unknown:'목적 확인 필요'};
const patterns={
  public_service:/지원사업|신청\s*자격|지원\s*대상|공공\s*서비스|민원|공익|복지|보조금|public service|eligibility/i,
  education:/교육|강의|수강|커리큘럼|학습|연수|훈련|curriculum|training|course|learning/i,
  content:/칼럼|연구\s*자료|자료실|매거진|블로그|뉴스레터|기술\s*문서|사용자\s*가이드|기사|article|documentation|research|newsletter/i,
  organization:/회사\s*소개|기업\s*소개|기관\s*소개|사업\s*분야|기업\s*연혁|제조|생산|연구개발|manufactur|about us/i,
  service:/컨설팅|대행|세무|법률|설계|진료|의원|클리닉|서비스|소프트웨어|솔루션|consulting|agency|clinic|software|saas/i,
} as const;
const actionPatterns={purchase:/장바구니|구매하기|바로\s*구매|결제하기|add to cart|buy now|checkout/i,booking:/예약|진료\s*접수|book (?:a|an)|appointment/i,application:/신청|수강|접수|지원하기|apply|enroll|register/i,download:/다운로드|자료\s*받기|안내서\s*받기|download/i,subscribe:/구독|뉴스레터\s*신청|subscribe/i,contact:/문의|상담|견적|contact|consult|demo/i} as const;
const actionLabels={purchase:'구매·결제',contact:'상담·문의',booking:'예약·접수',application:'신청·등록',download:'자료 다운로드',subscribe:'구독',read:'본문·자료 읽기',unknown:'다음 행동 확인'};
const short=(s:string,max=600)=>s.replace(/\s+/g,' ').trim().slice(0,max);
export const isNonCommerce=(p:WebsitePurpose|undefined)=>!!p&&!['commerce','mixed','unknown'].includes(p.kind);
export const showProductCollection=(p:WebsitePurpose|undefined)=>!p||!isNonCommerce(p);

/** Submitted-page purpose candidates, not a verified business model or a performance score. */
export function analyzeWebsitePurpose(data:PurposeInput):WebsitePurpose{
  const elements=(data.siteEditing?.elements||[]).filter(e=>!['nav','header','footer'].includes(e.region||''));
  const units:{text:string;locator:string}[]=[];
  const add=(text:string,locator:string)=>{const value=short(text);if(value&&!units.some(u=>u.text===value))units.push({text:value,locator});};
  add(data.title,'head > title');add(data.description||data.ogDescription||'','meta[name="description"]');
  (data.h1||[]).slice(0,4).forEach(h=>add(h,'h1'));(data.h2||[]).slice(0,8).forEach(h=>add(h,'h2'));
  const body=elements.filter(e=>['heading','text'].includes(e.kind));
  if(body.length)body.slice(0,20).forEach(e=>add(e.text,e.selector));
  else (data.bodyText||'').split(/\n+/).slice(0,20).forEach(t=>add(t,'body · 수집 텍스트'));
  const actions:{text:string;locator:string}[]=[];
  const ctaElements=elements.filter(e=>e.kind==='cta');
  if(data.siteEditing)ctaElements.forEach(e=>actions.push({text:short(e.text),locator:e.selector}));
  else for(const text of new Set([...(data.buttons||[]),...(data.ctaButtons||[])]))actions.push({text:short(text),locator:'button · a · input[type="submit"] 표본'});
  const matched=Object.fromEntries(Object.entries(patterns).map(([key,re])=>[key,units.filter(u=>re.test(u.text))]));
  const articleTypes=(data.schemaTypes||[]).filter(t=>/^(?:Article|BlogPosting|NewsArticle|TechArticle|ScholarlyArticle)$/i.test(t));
  const courseTypes=(data.schemaTypes||[]).filter(t=>/^(?:Course|EducationalOccupationalProgram)$/i.test(t));
  const structuredKind=articleTypes.length?'content':courseTypes.length?'education':undefined;
  const candidate=structuredKind||(['public_service','content','education','organization','service'] as const).find(k=>matched[k].length>=2||(matched[k].some(u=>/title|description|^h1$/.test(u.locator))&&(k!=='service'||actions.some(a=>Object.values(actionPatterns).some(re=>re.test(a.text))))));
  const purchase=actions.filter(a=>actionPatterns.purchase.test(a.text));
  const commerce=purchase.length>0||(!candidate&&(data.productContext?.commerce===true||data.productDiscovery?.commerce===true));
  const kind:PurposeKind=commerce?(candidate&&candidate!=='content'?'mixed':'commerce'):candidate||'unknown';
  const preferred:Record<PurposeKind,(keyof typeof actionPatterns)[]>={commerce:['purchase','contact'],mixed:['purchase','contact','booking','application','download'],service:['booking','contact','application','download'],organization:['contact','download','application'],education:['application','booking','download','contact'],content:['subscribe','download'],public_service:['application','download','contact'],unknown:['contact','booking','application','download','subscribe']};
  const action=preferred[kind].find(k=>actions.some(a=>actionPatterns[k].test(a.text)));
  const goalKey=action||(['content','organization','education','public_service'].includes(kind)?'read':'unknown');
  const evidence=(structuredKind?[{text:'@type: '+[...articleTypes,...courseTypes].join(', '),locator:'script[type="application/ld+json"] · @type'},...units]:candidate?matched[candidate]:units).slice(0,commerce?6:8);
  if(commerce&&evidence.length<8)evidence.push(...purchase.slice(0,8-evidence.length));
  const pricingPattern=/가격|비용|요금|견적|유료|무료|수강료|구독료|수수료|참가비|pricing|fees|\bcost\b/i;
  const pricingObserved=units.some(u=>pricingPattern.test(u.text));
  const pricingApplies=commerce||['service','education','unknown'].includes(kind)||(kind==='organization'&&pricingObserved)||(kind==='content'&&units.some(u=>/구독료|유료\s*구독/.test(u.text)))||(kind==='public_service'&&units.some(u=>/신청\s*수수료|참가비/.test(u.text)));
  const checks:WebsitePurpose['checks']=[];
  const check=(id:string,label:string,re:RegExp,guide:string,applicable=true)=>{
    const found=units.filter(u=>re.test(u.text)).slice(0,3);
    checks.push({id,label,status:!applicable?'not_applicable':found.length?'observed':'review',evidence:found,guide});
  };
  check('audience','대상과 제공 가치',/대상|위한|제공|해결|소개|전문|목적|\bfor\b|help|provide/i,'누구를 위한 어떤 정보·업무인지 원문과 실제 제공 범위를 대조하세요. 미감지를 실제 부재로 단정하지 않습니다.');
  if(kind==='content'){
    check('source','작성자·출처·확인 날짜',/작성|저자|출처|참고|발행|수정|업데이트|author|source|updated|published/i,'작성자·원자료·작성 또는 수정 날짜를 실제 문서와 대조하고, 확인 가능한 출처로 연결되는지 검토하세요.');
    check('answer','주제와 직접 답변',/정의|의미|방법|원리|요약|설명|기준|가이드|guide|how|definition/i,'제목의 질문에 본문이 답하는지, 적용 조건과 예외·원자료가 함께 있는지 읽고 확인하세요.');
    check('navigation','본문·관련 자료 연결',/관련|목차|다음|자료|참고|링크|문서|related|contents|reference/i,'본문 읽기와 관련 자료·출처 이동이 자연스러운지 확인하세요. 상담 폼이나 구매 버튼을 필수로 추가하지 않습니다.');
  }else if(kind==='education'){
    check('curriculum','커리큘럼과 학습 범위',/커리큘럼|학습|과정|차시|강의|curriculum|syllabus|learn/i,'교육 대상·선수 조건·학습 범위와 실제 강의 내용을 대조하세요. 성과나 수료·자격을 추측하지 않습니다.');
    check('schedule','일정·장소·준비사항',/일정|기간|온라인|장소|준비|선수|시간|schedule|online|prerequisite/i,'일정·운영 방식·준비사항이 현재 프로그램에 적용되는지 확인하세요.');
    check('application','신청과 이용 조건',/신청|수강|등록|대상|마감|enroll|apply|register/i,'신청 대상과 절차·마감·유료 여부 및 적용되는 변경 조건을 확인하고 실제 신청 경로를 테스트하세요.');
  }else if(kind==='public_service'){
    check('eligibility','지원 대상과 제외 조건',/자격|대상|제외|조건|eligibility|eligible/i,'공식 공고의 대상·제외 조건·적용 기간과 대조하세요. 지원 여부나 선정 가능성을 추정하지 않습니다.');
    check('application','신청 절차와 준비 자료',/신청|절차|서류|준비|접수|apply|document/i,'공식 접수 경로·기간·필요 자료가 현재 공고와 일치하는지 확인하세요.');
    check('source','운영 주체·공식 출처·최신성',/기관|운영|공고|출처|수정|문의|공지|official|updated/i,'운영 기관과 원공고·확인 날짜 및 문의 경로를 대조하세요.');
  }else{
    check('scope',kind==='organization'?'사업 분야와 제공 역량':'제공 범위와 제외 항목',/사업|분야|범위|제공|포함|제외|역량|기술|scope|capability|provide/i,'실제 업무·기술·제공 범위와 제외 항목을 확인하세요. 사이트가 거래를 목적으로 할 때만 상품 판매 조건을 추가로 점검합니다.');
    check('process',kind==='organization'?'실적·프로젝트·담당 주체':'이용 절차와 준비사항',/사례|프로젝트|실적|담당|절차|단계|준비|진행|process|project|team/i,'공개 가능한 실제 사례·담당 주체·진행 절차를 대조하세요. 수집하지 못한 수치나 고객 후기를 만들지 않습니다.');
    check('proof','전문성과 확인 가능한 근거',/경력|사례|프로젝트|연혁|담당|출처|기술|자격|인증|team|experience|reference/i,'업무에 맞는 담당자·이력·사례·출처를 확인하세요. 모든 사이트에 후기·별점·인증을 필수로 요구하지 않습니다.');
  }
  check('price','가격·거래 조건 적용 범위',pricingPattern,pricingApplies&&pricingObserved?'관측한 비용 표현의 적용 대상·포함 범위·추가 협의 조건을 확인하세요.':'이 페이지에는 판매 가격을 필수로 요구하지 않습니다. 별도 유료 신청·거래가 있다면 해당 경로에서 조건을 확인하세요.',pricingApplies);
  checks.push({id:'goal',label:`다음 행동 · ${actionLabels[goalKey]}`,status:action?'observed':'review',evidence:action?actions.filter(a=>actionPatterns[action].test(a.text)).slice(0,3):[],guide:goalKey==='read'?'본문·출처·관련 자료를 실제로 읽고 이동하는 경로를 확인하세요. 버튼 개수·문의 폼 유무를 성과로 평가하지 않습니다.':`${actionLabels[goalKey]} 경로를 실제로 실행해 연결 대상·준비사항·완료 기준을 확인하세요. 입력 폼이나 완료 화면은 정적 HTML만으로 검증하지 않습니다.`});
  return WebsitePurposeSchema.parse({version:1,kind,label:labels[kind],sourceUrl:data.finalUrl||data.url,capturedAt:data.seoEvidence?.capturedAt,evidence,goal:{key:goalKey,label:actionLabels[goalKey],observed:!!action,evidence:action?actions.filter(a=>actionPatterns[action].test(a.text)).slice(0,4):[]},pricingObserved,checks,note:'입력 페이지의 제목·본문·행동 문구로 분류한 목적 후보입니다. 사업 전체의 유형이나 실제 전환 성과를 확정하지 않습니다. 문구 관측은 내용의 정확성·최신성·실제 동작 검증과 구분하며, 미확인은 부재나 감점 사유가 아닙니다.'});
}

export function purposePrompt(data:PurposeInput){const p=analyzeWebsitePurpose(data);return JSON.stringify({kind:p.kind,label:p.label,goal:p.goal,evidence:p.evidence,checks:p.checks.map(c=>({label:c.label,applicable:c.status!=='not_applicable'})),rule:'페이지 목적에 맞춰 분석한다. 정보형·기업형·공공형에 상품 가격·배송·재고·장바구니·후기·별점을 필수로 요구하지 않는다. 미확인 목적·수치·운영 조건은 추측하지 않는다.'});}
export function outOfPurpose(text:string,p:WebsitePurpose){
  if(!isNonCommerce(p))return false;
  const retail='(?:장바구니|재고|배송비|배송.?정책|반품.?정책|최소.?주문|구매.?버튼|결제.?버튼|상품.?가격|판매.?상품)';
  const change='(?:추가|등록|구현|설치|부재|없|누락|부족|노출|개선)';
  return new RegExp(`${retail}.{0,20}${change}|${change}.{0,12}${retail}|상품.?등록`).test(text)||(['content','public_service'].includes(p.kind)&&/후기.?부재|후기.?추가|가격표.?추가|고객.?리뷰.?추가|비용과 계약|제공 업체/.test(text));
}
