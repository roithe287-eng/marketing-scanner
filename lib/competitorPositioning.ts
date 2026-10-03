import type {MarketingReport} from './reportSchema';
import {queryMatches,COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE} from './competitorResearch';
import {safeHttpUrl} from './citationMeasurement';
export const POSITION_METHOD='message-evidence-v2';
export const POSITION_AXES={x:'검색어 연결도',y:'선택 정보 범위'};
export const POSITION_NOTE='동일하게 페이지 제목·메타 설명만 비교합니다. 좌표는 표현 탐지 지표이며 가격 수준·품질·시장점유율·검색 순위·성과를 평가한 점수가 아닙니다.';
export const POSITION_CRITERIA=[
  {id:'cost',label:'가격·조건',pattern:/(?:\d[\d,.]*\s*(?:만\s*)?원|\d[\d,.]*\s*%\s*(?:할인|적립)|가격|비용|요금|수수료|견적|무료\s*(?:배송|상담|체험)|최소\s*(?:주문|수량)|배송비|환불|교환)/i,action:'가격을 공개할 수 있으면 적용 범위·부가세·추가 비용을 함께 적고, 견적형이면 금액이 달라지는 조건을 설명하세요.',template:'[서비스/제품]은 [포함 범위] 기준 [확인한 가격 또는 견적 조건]으로 제공합니다.'},
  {id:'scope',label:'대상·범위',pattern:/(?:대상|전용|맞춤|기업|사업자|소상공인|초보|입문|어린이|유아|반려|가정용|업소용|단체|B2B|B2C|전국|지역|포함|제외|지원\s*범위|서비스\s*범위)/i,action:'누구에게 맞는 제품·서비스인지와 포함·제외 범위를 한 문장으로 설명하세요. 지역·수량·이용 조건은 실제 기준만 적습니다.',template:'[구체적인 고객]을 위한 [서비스/제품]으로 [제공 범위]를 지원합니다.'},
  {id:'proof',label:'사례·근거',pattern:/(?:사례|포트폴리오|고객사|후기|리뷰|인증|특허|시험\s*성적|검사\s*결과|수상|연구\s*결과)/i,action:'자사 사례·후기·인증 중 확인 가능한 자료를 연결하세요. 수치에는 기간·대상·집계 기준을 붙이고 성과를 일반화하지 않습니다.',template:'[실제 사례/인증]의 [대상·기간·기준]과 원문 자료를 확인할 수 있습니다.'},
  {id:'process',label:'진행·지원',pattern:/(?:절차|진행\s*과정|진행\s*방식|제작\s*기간|배송\s*(?:기간|일정)|소요\s*(?:기간|시간)|상담\s*후|예약\s*후|상담|문의|예약|\d+\s*단계|사후\s*(?:관리|지원)|고객\s*지원|A\/S)/i,action:'문의·주문 후 진행 순서, 필요한 준비물과 응대 방법을 안내하세요. 확인되지 않은 처리 시간은 약속하지 않습니다.',template:'[문의/주문] 후 [실제 진행 단계]로 이어지며 [지원 범위·확인된 일정]을 안내합니다.'},
] as const;
type Input={id:string;name:string;url:string;own:boolean;title?:string;description?:string;fetchError?:string;searchRank?:number;sourceLabel?:string};
function positiveExpression(text:string,pattern:RegExp) {
  for(const match of text.matchAll(new RegExp(pattern.source,'gi'))) {
    const after=text.slice((match.index||0)+match[0].length);
    if(!/^\s*(?:[은는이가을를]\s*)?(?:없|미제공|미보유|미지원|불가|예정|준비\s*중|제공하지|지원하지|확인되지)/.test(after))return match[0];
  }
  return '';
}
export function scorePosition(input:Input,keyword:string) {
  const title=(input.title||'').trim(),description=(input.description||'').trim();
  const fields=[{label:'페이지 제목',text:title},{label:'메타 설명',text:description}];
  const fieldsPresent=fields.filter(f=>f.text).length,match=queryMatches(keyword,`${title} ${description}`);
  const eligible=!input.fetchError&&fieldsPresent===2&&match.terms.length>0;
  const checks=POSITION_CRITERIA.map(c=>{const field=fields.find(f=>positiveExpression(f.text,c.pattern));return {...c,found:!!field,field:field?.label||'',excerpt:field?.text||'',matched:field?positiveExpression(field.text,c.pattern):''};});
  const x=eligible?Math.round(match.matched.length/match.terms.length*100):null;
  const y=eligible?checks.filter(c=>c.found).length*25:null;
  return {...input,title,description,fieldsPresent,terms:match.terms,matched:match.matched,checks,x,y,
    reason:eligible?'':input.fetchError?'페이지 수집 실패 · 검색 요약으로 좌표를 대신 계산하지 않음':!match.terms.length?'비교할 검색어 구성 단어를 확인할 수 없음':`제목·메타 설명 ${fieldsPresent}/2개 확인 · 같은 범위로 비교하기 위해 판정 보류`};
}
export type PositionRow=ReturnType<typeof scorePosition>;
export function positionGroups(rows:PositionRow[]) {
  const groups=new Map<string,{x:number;y:number;rows:PositionRow[]}>();
  for(const row of rows)if(row.x!==null&&row.y!==null){const key=`${row.x}:${row.y}`;const group=groups.get(key)||{x:row.x,y:row.y,rows:[]};group.rows.push(row);groups.set(key,group);}
  return [...groups.values()];
}
export function buildCompetitorPositioning(report:MarketingReport) {
  const analysis=report.competitorAnalysis;if(!analysis)return null;
  const samePage=(a:string,b:string)=>{try{const x=new URL(a),y=new URL(b);return x.hostname.replace(/^www\./,'')===y.hostname.replace(/^www\./,'')&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'')&&x.search===y.search;}catch{return false;}};
  const page=report.pageEvidence&&samePage(report.pageEvidence.requestedUrl,report.url)?report.pageEvidence:undefined;
  const own=analysis.ourSite&&analysis.ourSite.url&&samePage(analysis.ourSite.url,report.url)?analysis.ourSite:undefined;
  const rows=[scorePosition({id:'own',name:report.meta?.siteName||'자사',url:safeHttpUrl(report.url)||'',own:true,title:page?.title??own?.title,description:page?.description??own?.metaDescription,sourceLabel:page?'저장된 입력 페이지':own?'저장된 경쟁사 분석의 자사 원문':'자사 원문 미저장'},analysis.searchKeyword),
    ...analysis.competitors.map((c,i)=>scorePosition({id:`candidate-${i+1}`,name:c.domain,url:safeHttpUrl(c.link)||'',own:false,title:c.metaTitle,description:c.metaDescription,fetchError:c.fetchError,searchRank:c.searchRank,sourceLabel:'저장된 후보 페이지'},analysis.searchKeyword))];
  return {analysis,rows,groups:positionGroups(rows),known:rows.filter(r=>!r.own&&r.x!==null),own:rows[0]};
}
export function positioningActions(row:PositionRow) {
  if(row.x===null)return [{title:'먼저 비교할 원문 확보',evidence:row.reason,action:'해당 URL의 페이지 제목과 메타 설명이 실제로 제공되는지 확인하고 다시 분석하세요. 수집 제한과 설명 부재는 별도로 점검합니다.',template:'원문 수집 후 같은 키워드·같은 두 필드로 비교',metric:'동일 범위로 비교 가능한 원문 2/2개 확보'}];
  const tasks=[];
  if(row.x<100)tasks.push({title:'대표 검색어와 페이지 주제 연결',evidence:`탐지되지 않은 구성 단어: ${row.terms.filter(t=>!row.matched.includes(t)).join(' · ')}`,action:'이 검색어가 실제 주력 상품·서비스와 맞는지 먼저 확인하세요. 맞으면 제목과 설명에 자연스럽게 반영하고, 다르면 주력 상품을 설명하는 입력 페이지로 다시 진단합니다.',template:`[실제 제공하는 서비스·제품] | [브랜드]`,metric:'대상 URL의 검색 노출·클릭·CTR을 같은 검색어·기간으로 전후 비교'});
  row.checks.filter(c=>!c.found).slice(0,2).forEach(c=>tasks.push({title:`${c.label} 설명 검토`,evidence:'수집된 제목·메타 설명에서는 관련 표현을 탐지하지 못했습니다. 페이지 본문에는 있을 수 있습니다.',action:c.action,template:c.template,metric:c.id==='process'?'문의 버튼 클릭률·문의 완료 세션 비율을 전후 비교':'해당 URL의 CTR·유입 후 문의 완료 세션 비율을 전후 비교'}));
  if(!tasks.length)tasks.push({title:'현재 표현의 사실성과 연결 페이지 점검',evidence:'검색어 구성 단어와 네 가지 선택 정보 표현을 모두 탐지했습니다.',action:'표현을 더 늘리기보다 가격 조건·사례 원문·진행 안내가 실제 페이지에 연결되어 있는지 점검하고 고객 질문에 맞춰 내용을 보완하세요.',template:'[설명 속 약속] → [실제로 확인 가능한 근거·안내 페이지]',metric:'CTR·문의 완료 세션 비율·문의 내용의 적합성을 함께 비교'});
  return tasks.slice(0,3);
}
export function positioningBrief(report:MarketingReport,row:PositionRow) {
  return [`검색 메시지 포지셔닝 · ${row.name}`,row.url,`대표 키워드: ${report.competitorAnalysis?.searchKeyword||''}`,POSITION_NOTE,COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE,
    row.x===null?row.reason:`X 검색어 연결도 ${row.x}/100 · Y 선택 정보 범위 ${row.y}/100`,
    ...positioningActions(row).flatMap((t,i)=>[`\n${i+1}. ${t.title}`,`근거: ${t.evidence}`,`실행: ${t.action}`,`작성 틀: ${t.template}`,`확인 지표: ${t.metric}`])].join('\n');
}
