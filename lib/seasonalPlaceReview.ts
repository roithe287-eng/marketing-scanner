import type {LocalPlaceEvidence} from './localPlaceSchema';
import {seasonalProfile,SKI_DESTINATIONS} from './seasonalPlaceCatalog';
import {SEASONAL_CHECKS} from './seasonalPlaceEvidence';
export const SEASONAL_TITLE='지역 × 시즌 · 검색 표현과 운영 준비';
export const SEASONAL_SCOPE='홈페이지에서 확인한 지역·서비스를 바탕으로 만든 콘텐츠 조합 제안입니다. 검색량·순위·플레이스 등록 키워드·현재 영업 여부를 조회한 결과가 아닙니다. 계절은 준비 주제이며 실제 운영기간은 업체별로 확인합니다.';
const district=(address:string)=>address.match(/^[가-힣]+\s+([가-힣]+(?:시|군|구))/u)?.[1]||'';
const namedRegions=['가평','양양','제주','서귀포','인제','논산','태안','서산','통영','거제','여수','평창','홍천','정선','양산','무주','부산','서울','춘천','횡성','원주'];
export function buildSeasonalPlaceReview(evidence:LocalPlaceEvidence,sourceUrl:string,observedAt:string){
  const snapshot=evidence.seasonal;if(!snapshot)return;
  const profiles=snapshot.profiles.flatMap(o=>{const p=seasonalProfile(o.id);if(!p)return [];
    let seasons=p.seasons;
    if(p.id==='seasonal_food'&&o.terms.length)seasons=[...new Set(o.terms.flatMap(t=>/빙수/.test(t.label)?['여름']:/전어/.test(t.label)?['가을']:/굴|방어/.test(t.label)?['가을','겨울']:p.seasons))];
    if(p.id==='harvest'&&o.terms.length)seasons=[...new Set(o.terms.flatMap(t=>/감귤/.test(t.label)?['가을','겨울','봄']:/블루베리/.test(t.label)?['봄','여름']:p.seasons))];
    return [{...p,seasons,observation:o}];});if(!profiles.length)return;
  const destinations=snapshot.destinations.flatMap(o=>{const d=SKI_DESTINATIONS.find(x=>x.id===o.id);return d?[{...o,area:d.area,source:d.source}]:[];});
  const regions:{label:string;basis:string}[]=destinations.map(d=>({label:d.label,basis:'홈페이지 목적지 표현: '+d.matchedAs}));
  const area=district(evidence.address);if(area)regions.push({label:area.replace(/[시군구]$/u,''),basis:'홈페이지 주소: '+evidence.address});
  for(const region of namedRegions)if(evidence.identity.includes(region)&&!regions.some(r=>r.label===region))regions.push({label:region,basis:'홈페이지 제목·업체명에서 언급'});
  const uniqueRegions=regions.filter((r,i,a)=>a.findIndex(v=>v.label===r.label)===i).slice(0,5);
  const terms=profiles.flatMap(p=>p.observation.terms.map(t=>({...t,profile:p.label}))).filter((t,i,a)=>a.findIndex(v=>v.label===t.label)===i).slice(0,8);
  const keywordIdeas:{text:string;kind:string;basis:string}[]=[];
  // Pair only regions and service expressions actually present; never create every regional combination.
  for(const region of uniqueRegions.slice(0,3))for(const term of terms.slice(0,3))keywordIdeas.push({text:region.label+' '+term.label,kind:'지역 + 서비스',basis:region.basis+' / 서비스 표현: '+term.matchedAs});
  const date=new Date(observedAt),valid=Number.isFinite(date.getTime());
  const kst=valid?new Date(date.getTime()+9*3600000):null;
  const year=kst?.getUTCFullYear(),month=kst?kst.getUTCMonth()+1:undefined;
  const oldLabels=snapshot.seasonLabels.filter(label=>{const numbers=label.match(/\d+/g)?.map(Number)||[];if(!year||!numbers.length)return false;const first=numbers[0]<100?2000+numbers[0]:numbers[0];return first<(numbers.length===2&&month&&month<=3?year-1:year);});
  const season=snapshot.seasonLabels.filter(label=>!oldLabels.includes(label)).at(-1);
  if(season&&uniqueRegions[0])for(const term of terms.slice(0,2))keywordIdeas.push({text:uniqueRegions[0].label+' '+season+' 시즌 '+term.label,kind:'관측 시즌 + 서비스 · 연도 확인',basis:'홈페이지 시즌 표기: '+season+' / 서비스 표현: '+term.matchedAs});
  const checks=SEASONAL_CHECKS.map(check=>{const signal=snapshot.signals.find(s=>s.key===check.key);return {...check,status:signal?'홈페이지 문구 관측':'표본에서 미확인',excerpt:signal?.excerpt||'이 항목의 설명을 수집 표본에서 확인하지 못했습니다. 원문과 실제 운영 내용을 확인하세요.'};});
  return {profiles,destinations,regions:uniqueRegions,terms,keywordIdeas:keywordIdeas.slice(0,12),seasonLabels:snapshot.seasonLabels,oldLabels,checks,sourceUrl,scope:SEASONAL_SCOPE,
    seasons:[...new Set(profiles.flatMap(p=>p.seasons))],
    stages:[
      {title:'예약 오픈 전',text:'해당 시즌 연도·상품 구성·요금·기간과 실제 제공 수량을 확정하고 홈페이지·플레이스·예약 페이지를 함께 정리하세요.'},
      {title:'운영 기간',text:'매장 영업시간과 이용/집결/반납시간을 구분하고 기상·재고·회차 변경을 실제 운영에 맞게 안내하세요.'},
      {title:'시즌 종료 후',text:'해당 시즌 예약·혜택·새소식 노출을 종료 또는 갱신하고, 다음 시즌 미정 사항을 현재 운영 정보처럼 표시하지 마세요. 업체 자체의 영업 상태는 별도로 확인하세요.'},
    ]};
}
export type SeasonalPlaceReview=NonNullable<ReturnType<typeof buildSeasonalPlaceReview>>;
