import {positionProfile,defaultPositionIndustry} from './industryPositioning';
import type {MarketingReport,IndustryCategory} from './reportSchema';
import {queryMatches,COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE} from './competitorResearch';
import {safeHttpUrl} from './citationMeasurement';
export const POSITION_METHOD='industry-evidence-v4';
export const POSITION_AXES={x:'상품·서비스 설명',y:'선택·이용 근거'};
export const POSITION_NOTE='동일하게 페이지 제목·메타 설명만 비교합니다. 좌표는 표현 탐지 지표이며 가격 수준·품질·시장점유율·검색 순위·성과를 평가한 점수가 아닙니다.';
export const POSITION_CRITERIA=positionProfile('etc').criteria;
type Input={id:string;name:string;url:string;own:boolean;title?:string;description?:string;fetchError?:string;searchRank?:number;sourceLabel?:string};
export const POSITION_SIZE_NOTE='버블 면적은 선택한 업종의 정보 단서 수에 따라 커집니다. 같은 표현은 한 번만 세며 종류별 최대 2개, 총 8개입니다. 실제 서비스 품질·매출·검색 순위의 강점은 아닙니다.';
export function positionCoordinates(x:number,y:number){return {left:22+x*.56,top:78-y*.56};}
export function positionDiameter(signals:number,mobile=false){const max=mobile?64:80;return Math.sqrt(44**2+(max**2-44**2)*Math.max(0,Math.min(8,signals))/8);}
function positiveExpressions(text:string,pattern:RegExp) {
  const found=new Map<string,string>();
  for(const match of text.matchAll(new RegExp(pattern.source,'gi'))) {
    const after=text.slice((match.index||0)+match[0].length);
    if(!/^\s*(?:[은는이가을를]\s*)?(?:없|미제공|미보유|미지원|불가|예정|준비\s*중|제공하지|지원하지|확인되지)/.test(after))found.set(match[0].toLocaleLowerCase().replace(/\s/g,''),match[0]);
  }
  return [...found.values()];
}
export function scorePosition(input:Input,keyword:string,category:IndustryCategory='etc') {
  const title=(input.title||'').trim(),description=(input.description||'').trim();
  const fields=[{label:'페이지 제목',text:title},{label:'메타 설명',text:description}];
  const fieldsPresent=fields.filter(f=>f.text).length,match=queryMatches(keyword,`${title} ${description}`);
  const eligible=!input.fetchError&&fieldsPresent===2&&match.terms.length>0;
  const termFields=fields.map(f=>({...f,matched:queryMatches(keyword,f.text).matched}));
  const profile=positionProfile(category);
  const checks=profile.criteria.map(c=>{const sources=fields.map(f=>({...f,matches:positiveExpressions(f.text,c.pattern)}));const field=sources.find(f=>f.matches.length);const distinct=new Map<string,string>();for(const source of sources)for(const text of source.matches)distinct.set(text.toLocaleLowerCase().replace(/\s/g,''),text);const signals=[...distinct.values()];return {...c,found:!!field,field:field?.label||'',excerpt:field?.text||'',matched:field?.matches[0]||'',signals,signalCount:Math.min(2,signals.length)};});
  const signalCount=eligible?checks.reduce((sum,c)=>sum+c.signalCount,0):null;
  const keywordScore=eligible?Math.round(termFields.reduce((sum,f)=>sum+f.matched.length,0)/(match.terms.length*2)*100):null;
  const x=eligible?(checks[0].signalCount+checks[1].signalCount)*25:null;
  const y=eligible?(checks[2].signalCount+checks[3].signalCount)*25:null;
  return {...input,profile,keywordScore,title,description,fieldsPresent,terms:match.terms,matched:match.matched,termFields,checks,signalCount,x,y,
    reason:eligible?'':input.fetchError?'페이지 수집 실패 · 검색 요약으로 좌표를 대신 계산하지 않음':!match.terms.length?'비교할 검색어 구성 단어를 확인할 수 없음':`제목·메타 설명 ${fieldsPresent}/2개 확인 · 같은 범위로 비교하기 위해 판정 보류`};
}
export type PositionRow=ReturnType<typeof scorePosition>;
export function positionGroups(rows:PositionRow[]) {
  const groups=new Map<string,{x:number;y:number;rows:PositionRow[]}>();
  for(const row of rows)if(row.x!==null&&row.y!==null){const key=`${row.x}:${row.y}`;const group=groups.get(key)||{x:row.x,y:row.y,rows:[]};group.rows.push(row);groups.set(key,group);}
  return [...groups.values()].map(g=>({...g,signalCount:g.rows.reduce((sum,r)=>sum+(r.signalCount||0),0)/g.rows.length}));
}
export function buildCompetitorPositioning(report:MarketingReport,industry?:IndustryCategory) {
  const analysis=report.competitorAnalysis;if(!analysis)return null;
  const detected=defaultPositionIndustry(report),category=industry||detected.category,profile=positionProfile(category);
  const samePage=(a:string,b:string)=>{try{const x=new URL(a),y=new URL(b);return x.hostname.replace(/^www\./,'')===y.hostname.replace(/^www\./,'')&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'')&&x.search===y.search;}catch{return false;}};
  const page=report.pageEvidence&&samePage(report.pageEvidence.requestedUrl,report.url)?report.pageEvidence:undefined;
  const own=analysis.ourSite&&analysis.ourSite.url&&samePage(analysis.ourSite.url,report.url)?analysis.ourSite:undefined;
  const rows=[scorePosition({id:'own',name:report.meta?.siteName||'자사',url:safeHttpUrl(report.url)||'',own:true,title:page?.title??own?.title,description:page?.description??own?.metaDescription,sourceLabel:page?'저장된 입력 페이지':own?'저장된 경쟁사 분석의 자사 원문':'자사 원문 미저장'},analysis.searchKeyword,category),
    ...analysis.competitors.map((c,i)=>scorePosition({id:`candidate-${i+1}`,name:c.domain,url:safeHttpUrl(c.link)||'',own:false,title:c.metaTitle,description:c.metaDescription,fetchError:c.fetchError,searchRank:c.searchRank,sourceLabel:'저장된 후보 페이지'},analysis.searchKeyword,category))];
  return {analysis,profile,industryBasis:industry?'직접 선택한 업종 기준':detected.basis,rows,groups:positionGroups(rows),known:rows.filter(r=>!r.own&&r.x!==null),own:rows[0]};
}
export function positioningActions(row:PositionRow) {
  if(row.x===null)return [{title:'먼저 비교할 원문 확보',evidence:row.reason,action:'해당 URL의 페이지 제목과 메타 설명이 실제로 제공되는지 확인하고 다시 분석하세요. 수집 제한과 설명 부재는 별도로 점검합니다.',template:'원문 수집 후 같은 키워드·같은 두 필드로 비교',metric:'동일 범위로 비교 가능한 원문 2/2개 확보'}];
  const tasks=[];
  if((row.keywordScore??0)<100)tasks.push({title:'대표 검색어와 페이지 주제 연결',evidence:row.termFields.map(f=>`${f.label}에서 미탐지: ${row.terms.filter(t=>!f.matched.includes(t)).join(' · ')||'없음'}`).join(' / '),action:'이 검색어가 실제 주력 상품·서비스와 맞는지 먼저 확인하세요. 맞으면 제목과 설명에 자연스럽게 반영하고, 다르면 주력 상품을 설명하는 입력 페이지로 다시 진단합니다.',template:`[실제 제공하는 서비스·제품] | [브랜드]`,metric:'대상 URL의 검색 노출·클릭·CTR을 같은 검색어·기간으로 전후 비교'});
  row.checks.filter(c=>!c.found).slice(0,2).forEach(c=>tasks.push({title:`${c.label} 설명 검토`,evidence:'수집된 제목·메타 설명에서는 관련 표현을 탐지하지 못했습니다. 페이지 본문에는 있을 수 있습니다.',action:c.action,template:c.template,metric:c.id==='process'?'문의 버튼 클릭률·문의 완료 세션 비율을 전후 비교':'해당 URL의 CTR·유입 후 문의 완료 세션 비율을 전후 비교'}));
  if(!tasks.length)tasks.push({title:'현재 표현의 사실성과 연결 페이지 점검',evidence:'검색어와 업종별 네 가지 정보 표현을 모두 탐지했습니다.',action:'표현을 더 늘리기보다 가격 조건·사례 원문·진행 안내가 실제 페이지에 연결되어 있는지 점검하고 고객 질문에 맞춰 내용을 보완하세요.',template:'[설명 속 약속] → [실제로 확인 가능한 근거·안내 페이지]',metric:'CTR·문의 완료 세션 비율·문의 내용의 적합성을 함께 비교'});
  return tasks.slice(0,3);
}
export function positioningBrief(report:MarketingReport,row:PositionRow) {
  return [`검색 메시지 포지셔닝 · ${row.name}`,row.url,`대표 키워드: ${report.competitorAnalysis?.searchKeyword||''}`,POSITION_NOTE,POSITION_SIZE_NOTE,COMPETITOR_API_NOTE,COMPETITOR_VOLUME_NOTE,
    row.x===null?row.reason:`${row.profile.label} 기준 · X 상품·서비스 설명 ${row.x}/100 · Y 선택·이용 근거 ${row.y}/100 · 버블 단서 ${row.signalCount}/8개`,
    ...positioningActions(row).flatMap((t,i)=>[`\n${i+1}. ${t.title}`,`근거: ${t.evidence}`,`실행: ${t.action}`,`작성 틀: ${t.template}`,`확인 지표: ${t.metric}`])].join('\n');
}
