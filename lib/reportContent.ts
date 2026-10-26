import type {MarketingReport} from './reportSchema';
import type {PageElement} from './siteEditingSchema';
import {editingEvidence} from './siteGuidebook';
import {safeHttpUrl} from './citationMeasurement';

const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
export type SourceGroup={id:string;text:string;kinds:PageElement['kind'][];occurrences:number;heading:string;chrome:boolean;truncated:boolean;linkIds:string[]};
export type SourceLink={id:string;url:string;labels:string[];category:'page'|'action'|'internal'|'external';occurrences:number};
export type SourceLibrary={groups:SourceGroup[];links:SourceLink[];rawCount:number;pageUrl:string;capturedAt?:string;newCapture:boolean};
/** Preserve functional queries and anchors; remove tracking and synthetic text fragments only. */
export function sourcePageUrl(value:string):string|null{
 const safe=safeHttpUrl(value);if(!safe)return null;
 const url=new URL(safe);
 if(url.hash.includes(':~:'))url.hash=url.hash.split(':~:')[0].replace(/^#$/,'');
 for(const key of [...url.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid|msclkid)$/i.test(key))url.searchParams.delete(key);
 return url.href;
}
export function buildSourceLibrary(report:MarketingReport):SourceLibrary{
 const page=editingEvidence(report),pageUrl=sourcePageUrl(page?.finalUrl||report.url)||'',groups:SourceGroup[]=[],links:SourceLink[]=[];
 const byText=new Map<string,SourceGroup>(),byUrl=new Map<string,SourceLink>();let rawCount=0;
 function link(value:string,label:string){const url=sourcePageUrl(value);if(!url)return undefined;const prior=byUrl.get(url);if(prior){prior.occurrences++;if(label&&!prior.labels.includes(label))prior.labels.push(label);return prior.id;}
  const category:SourceLink['category']=url===pageUrl?'page':pageUrl&&new URL(url).origin===new URL(pageUrl).origin?(/문의|상담|신청|예약|견적|접수|등록|contact|apply|book/i.test(label)?'action':'internal'):'external';
  const entry={id:`L${String(links.length+1).padStart(2,'0')}`,url,labels:label?[label]:[],category,occurrences:1};links.push(entry);byUrl.set(url,entry);return entry.id;
 }
 if(pageUrl)link(pageUrl,'분석한 페이지');
 function add(text:string,kind:PageElement['kind'],heading='',chrome=false,truncated=false,href?:string){
  const value=clean(text);if(!value)return;rawCount++;
  const id=href&&sourcePageUrl(href)!==pageUrl?link(href,value):undefined,key=value.normalize('NFKC').toLowerCase(),prior=byText.get(key);
  if(prior){prior.occurrences++;if(!prior.kinds.includes(kind))prior.kinds.push(kind);if(id&&!prior.linkIds.includes(id))prior.linkIds.push(id);prior.chrome=prior.chrome&&chrome;prior.truncated=prior.truncated&&truncated;return;}
  const group={id:`S${String(groups.length+1).padStart(2,'0')}`,text:value,kinds:[kind],occurrences:1,heading,chrome,truncated,linkIds:id?[id]:[]};groups.push(group);byText.set(key,group);
 }
 const elements=page?.siteEditing?.elements||[];
 for(const e of elements)add(e.text,e.kind,e.section?.label||e.heading||'',!!e.region&&['nav','header','footer'].includes(e.region),e.truncated,e.kind==='cta'?e.href:undefined);
 if(page){
  if(!elements.some(e=>e.kind==='title'))add(page.title,'title');
  if(!elements.some(e=>e.kind==='description'))add(page.description,'description');
  for(const h of [...page.h1,...page.h2])if(!byText.has(clean(h).normalize('NFKC').toLowerCase()))add(h,'heading');
  for(const section of page.siteEditing?.contentSections||[]){
   const prior=byText.get(clean(section.text).normalize('NFKC').toLowerCase());
   if(!prior){add(section.text,'text',section.heading,false,section.truncated,section.url);continue;}
   // The same captured node may appear in both inventories: enrich it without counting it twice.
   prior.chrome=false;prior.truncated=prior.truncated&&section.truncated;
   if(!prior.kinds.includes('text'))prior.kinds.push('text');
   if(!prior.heading)prior.heading=section.heading;
   const id=section.url&&sourcePageUrl(section.url)!==pageUrl?link(section.url,section.text):undefined;
   if(id&&!prior.linkIds.includes(id))prior.linkIds.push(id);
  }
  const chrome=elements.filter(e=>['nav','header','footer'].includes(e.region||'')).map(e=>clean(e.text));
  for(const line of page.bodyText.split(/\n+/)){
   const value=clean(line);if(value.length<32||value.length>1400||chrome.some(c=>c.includes(value))||/^(?:개인정보|이용약관|copyright|사업자등록)/i.test(value)||byText.has(value.normalize('NFKC').toLowerCase()))continue;
   add(value,'text','본문 발췌');
  }
 }
 if(report.productContext?.status==='observed')for(const product of report.productContext.sources)link(product.url,product.name);
 for(const evidence of [...(report.answerContentPlan?.primaryKeyword?.evidence||[]),...(report.answerContentPlan?.secondaryKeywords.flatMap(k=>k.evidence)||[]),...(report.answerContentPlan?.questions.flatMap(q=>q.evidence)||[])])if(evidence.url)link(evidence.url,evidence.text.slice(0,70));
 return {groups,links,rawCount,pageUrl,capturedAt:page?.capturedAt,newCapture:!!page?.siteEditing?.contentSections};
}
export const CONTENT_FACETS=[
 {id:'offer',label:'서비스·주제',icon:'copywriting',match:/어학연수|대학유학|조기유학|초중고유학|영어캠프|인턴십|인턴쉽|워킹홀리데이|프로그램|커리큘럼|교육|컨설팅|서비스|사업|제품|제공|주제|자료|연구|지원사업/,question:'무엇을 제공하거나 설명하나요?',action:'서비스·주제별로 대상, 포함 범위, 상세 안내를 한 묶음으로 정리하세요.'},
 {id:'audience',label:'대상·이용 지역',icon:'firstView',match:/초중고|대학생|직장인|입문자|대상|자격|전문가|기업|학생|가족|미국|캐나다|호주|영국|뉴질랜드|아일랜드|몰타|필리핀|지역|전국|위치/,question:'누구에게, 어느 지역에 해당하나요?',action:'대상·지역별 차이를 나누고, 각각에 적용되는 조건을 연결하세요.'},
 {id:'process',label:'이용·신청 흐름',icon:'conversionFlow',match:/상담|신청|수속|접수|예약|절차|단계|진행|문의|견적|다운로드|구독/,question:'관심을 가진 다음 무엇을 하면 되나요?',action:'문의·신청 다음에 진행되는 단계와 준비사항을 같은 화면에서 안내하세요.'},
 {id:'conditions',label:'비용·일정·조건',icon:'cta',match:/비용|가격|수강료|견적|기간|일정|포함|제외|조건|할인|무료|특가|마감|원\b/,question:'비용과 일정에는 어떤 조건이 있나요?',action:'가격·일정 표현 옆에 적용 대상, 포함·별도 항목, 확인 날짜를 붙이세요.'},
 {id:'proof',label:'사례·전문성',icon:'trust',match:/후기|사례|합격|진학|수료|경력|노하우|수상|인증|연혁|전문|실적|프로젝트|출처|작성자|저자|센터|네트워크/,question:'고객이 어떤 근거를 확인할 수 있나요?',action:'사례·후기는 대상과 시점, 전문성·수상 주장은 확인 자료를 함께 보여주세요.'},
 {id:'support',label:'혜택·후속 지원',icon:'adLanding',match:/혜택|지원|관리|보장|장학|정착|사후|케어|이벤트|세미나|설명회/,question:'이용 전후에 어떤 지원을 받나요?',action:'혜택과 지원의 범위·기간·제외 조건을 구체적으로 나누세요.'},
] as const;
export type ContentFacetId=typeof CONTENT_FACETS[number]['id'];
/** Explain the mapping with literal words from the page, never assert a business claim is verified. */
export function buildContentFacets(library:SourceLibrary){
 const pool=library.groups.filter(g=>!g.chrome&&!g.kinds.every(k=>['image','form'].includes(k)));
 const specific:Record<ContentFacetId,RegExp>={offer:/어학연수|대학유학|조기유학|영어캠프|인턴십|워킹홀리데이|프로그램|커리큘럼|컨설팅|서비스|제품|사업/,audience:/대상|자격|학생|대학생|직장인|가족|지역|위치/,process:/절차|단계|신청 후|접수 후|상담 후|준비 서류/,conditions:/비용|가격|수강료|기간|일정|포함|제외/,proof:/후기|사례|경력|수상|인증|실적/,support:/혜택|장학|정착|사후|현지|출국|케어/};
 return CONTENT_FACETS.map(f=>{
  const matches=pool.filter(g=>f.match.test(g.text));
  const score=(g:SourceGroup)=>Number(specific[f.id].test(g.text))*8+Number(g.kinds.includes('text'))*2+Number(g.text.length>=60);
  const ranked=[...matches].sort((a,b)=>score(b)-score(a)||b.text.length-a.text.length);
  const evidence:SourceGroup[]=[];
  for(const group of ranked){if(evidence.some(e=>e.text.includes(group.text)||group.text.includes(e.text)))continue;evidence.push(group);if(evidence.length===3)break;}
  const words=[...new Set(evidence.map(e=>e.text.match(f.match)?.[0]).filter((v):v is string=>!!v))];
  return {...f,count:matches.length,evidence:evidence.map(e=>{const at=Math.max(0,e.text.search(f.match));const start=e.text.length>420?Math.max(0,at-100):0;const end=Math.min(e.text.length,start+420);return {...e,excerpt:(start?'…':'')+e.text.slice(start,end)+(end<e.text.length?'…':''),excerpted:start>0||end<e.text.length};}),why:words.length?`원문에 ${words.map(w=>`‘${w}’`).join('·')} 표현이 있어 이 항목으로 연결했습니다. 문구의 구체적인 조건과 실제 운영은 별도 확인이 필요합니다.`:'이 내용을 직접 설명하는 문구를 저장된 범위에서 찾지 못했습니다. 다른 페이지에 있는지는 확인하지 않았습니다.'};
 });
}
