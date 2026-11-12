import {SEASONAL_PROFILES,SKI_DESTINATIONS} from './seasonalPlaceCatalog';
import type {LocalPlaceEvidence} from './localPlaceSchema';
import {offeringClauses} from './websiteIdentity';
export type SeasonalEvidence=NonNullable<LocalPlaceEvidence['seasonal']>;
const absent=/(?:미제공|제공하지|취급하지|운영하지|하지\s*않|서비스\s*종료|(?:렌탈|대여|강습)\s*불가)/;
const clean=(v:string,max=220)=>v.replace(/\s+/gu,' ').trim().slice(0,max);
const specs:[string,string,RegExp,string][]=[
  ['period','시즌 연도·운영기간',/시즌|운영\s*기간|개장|폐장|수확\s*기간|판매\s*기간/,'올해 상품과 지난 시즌의 연도·기간을 구분하고, 실제 운영일을 플레이스·예약·홈페이지에서 대조하세요.'],
  ['hours','성수기 시간·예약 마감',/운영시간|영업시간|반납\s*(?:시간|마감)|예약\s*마감|입장\s*마감|집결\s*(?:시간|시각)/,'매장 영업시간, 상품 이용시간, 집결·반납·예약 마감을 나누고 주말·휴일 변경을 확인하세요.'],
  ['price','요일·기간별 요금',/성수기|비수기|주말\s*(?:요금|가격)|주중\s*(?:요금|가격)|시간권|추가\s*(?:요금|비용)/,'성수기·비수기·주중·주말과 인원/시간별 가격을 실제 예약 옵션과 맞추세요.'],
  ['package','상품 구성·포함/별도',/포함|불포함|별도|패키지|구성|준비물/,'상품명만으로 포함 여부를 추정하지 말고 장비·입장·강습·교통·포장 등의 포함/별도를 표시하세요.'],
  ['handoff','위치·픽업·수령·반납',/픽업|셔틀|수령|반납|집결|출항|배송|철거|회수/,'매장 주소와 이용 목적지·집결지를 구분하고 실제 픽업/배송 범위·수령/반납 절차를 설명하세요.'],
  ['capacity','사이즈·정원·예약 수량',/사이즈|정원|재고|수량|예약\s*인원|최소\s*인원|연령|신장|규격/,'대여 사이즈·체험 정원·작물 수확량 등 상품에 맞는 수량과 이용 조건을 확인하세요.'],
  ['weather','기상·일정 변경·취소',/우천|기상|폭설|강풍|수위|물때|결빙|취소|환불|일정\s*변경/,'기상과 일정 변경 시 안내 경로, 취소/환불 조건을 운영 기준과 예약 페이지에 일치시키세요.'],
];
export const SEASONAL_CHECKS=specs.map(([key,label,,action])=>({key,label,action}));
export function captureSeasonalEvidence(input:{sector:string;identity:string;description:string;headings:string[];lines:string[]}):SeasonalEvidence|undefined{
  const offered=(values:string[])=>values.flatMap(offeringClauses).filter(v=>!absent.test(v));
  const own=offered([input.identity,input.description]).join(' ');
  const headings=offered(input.headings);
  const profiles=SEASONAL_PROFILES.filter(p=>p.allowed.includes(input.sector)&&(p.identity.test(own)||headings.some(h=>p.identity.test(h)))).slice(0,4);
  if(!profiles.length)return;
  // Paragraphs support facts only after the business's own identity/offer heading establishes the service.
  const lines=[input.identity,input.description,...headings,...input.lines].filter(Boolean);
  const positive=offered(lines);
  const observations=profiles.map(p=>{
    const source=positive.find(v=>p.identity.test(v))||own;
    const at=source.search(p.identity);
    const terms=p.services.flatMap(([label,re])=>{const line=positive.find(v=>re.test(v));const matched=line?.match(re)?.[0];return matched?[{label,matchedAs:clean(matched,80)}]:[];}).slice(0,8);
    return {id:p.id,excerpt:clean(source.slice(Math.max(0,at-25),at+160)),terms};
  });
  const destinations=profiles.some(p=>p.id==='ski')?SKI_DESTINATIONS.flatMap(d=>{
    const line=positive.find(v=>!/(?:경쟁|비교|고객사|블로그|후기|기사)/.test(v)&&d.aliases.test(v)&&(v===input.identity||v===input.description||/스키|보드|렌탈|대여|픽업|오시는\s*길|반납/.test(v)));
    const match=line?.match(d.aliases);return match?[{id:d.id,label:d.label,matchedAs:clean(match[0],80),excerpt:clean(line!.slice(Math.max(0,(match.index||0)-25),(match.index||0)+135))}]:[];
  }).slice(0,6):[];
  const seasonLabels=[...new Set(lines.filter(v=>/시즌|운영\s*기간|개장|폐장|체험\s*기간|요금표|행사\s*기간/.test(v)).flatMap(v=>v.match(/(?:20\d{2}|\d{2})\s*[\/–−-]\s*(?:20\d{2}|\d{2})(?=\s*(?:시즌|season|동계|스키)|[^\d]|$)|20\d{2}\s*년/g)||[]))].filter(v=>{const ns=v.match(/\d+/g)?.map(Number)||[];return ns.length===1||ns.length===2&&((ns[1]%100)===(ns[0]+1)%100);}).slice(0,6).map(v=>clean(v,30));
  const signals=specs.flatMap(([key,label,re])=>{const line=lines.find(v=>re.test(v));if(!line)return [];const at=line.search(re);return [{key,label,excerpt:clean(line.slice(Math.max(0,at-25),at+150))}];});
  return {version:1,profiles:observations,destinations,seasonLabels,signals};
}
