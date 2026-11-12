import {z} from 'zod';
import type {LocalPlaceEvidence} from './localPlaceSchema';
import type {ExtractedWebsiteData} from './extractWebsite';
import {analyzeWebsitePurpose} from './websitePurpose';
import {nonCommercePlaybook} from './nonCommercePlaybook';
import {classificationText,ownBusinessRole,providerIdentity,isContextOnlyEvidence} from './websiteIdentity';
import {SKI_DESTINATIONS,seasonalProfile} from './seasonalPlaceCatalog';

export const CompetitionScopeSchema=z.object({
  version:z.literal(1),sourceUrl:z.string().url().max(4000),
  kind:z.enum(['commerce','service','organization','education','content','public_service','mixed','unknown']),
  profile:z.string().max(80),label:z.string().max(120),
  specialties:z.array(z.string().max(60)).max(16),
  area:z.string().max(100),destinations:z.array(z.string().max(60)).max(6),
  nationwide:z.boolean(),
});
export type CompetitionScope=z.infer<typeof CompetitionScopeSchema>;
type Input=Partial<ExtractedWebsiteData>&{url:string;localPlaceEvidence?:LocalPlaceEvidence};
const profiles:Record<string,string>={agency:'광고·제작 대행',software:'소프트웨어',manufacturing:'제조',home:'시공·생활 서비스',medical:'병의원',legal:'법률',education:'교육',commerce:'상품 판매',restaurant:'식당',cafe:'카페',lodging:'숙박',rental:'대여',veterinary:'동물병원',pet_care:'반려동물 돌봄',pet_store:'반려동물 매장'};
const localProfiles=new Set(['medical','legal','professional','accounting','home','home_service','restaurant','cafe','lodging','rental','veterinary','pet_care','pet_store','beauty','education','fitness','automotive','real_estate','retail','culture','event','welfare','living','funeral','pharmacy']);
const facetRules:Record<string,[string,RegExp][]>={
  medical:[['한방',/한방|한의원/],['치과',/치과|치아|임플란트/],['피부과',/피부과/],['안과',/안과|라식|라섹/],['정형외과',/정형외과/],['성형외과',/성형외과/],['내과',/내과/],['소아',/소아청소년과|소아과/],['산부인과',/산부인과/],['이비인후과',/이비인후과/]],
  legal:[['변호사',/법무법인|법률사무소|변호사/],['세무',/세무/],['회계',/회계/],['노무',/노무/],['법무사',/법무사/]],
  professional:[['세무',/세무/],['회계',/회계/],['노무',/노무/],['변리',/변리/]],
  education:[['미용',/미용|헤어|네일/],['외국어',/영어|어학|외국어/],['코딩',/코딩|프로그래밍/],['음악',/음악|피아노|보컬/],['마케팅',/마케팅|광고/]],
  home:[['시공',/인테리어|리모델링|시공/],['청소',/청소|소독|방역/],['이사',/이사/],['수리',/수리|누수/]],
  home_service:[['시공',/인테리어|리모델링|시공/],['청소',/청소|소독|방역/],['이사',/이사/],['수리',/수리|누수/]],
  fitness:[['필라테스',/필라테스/],['요가',/요가/],['골프',/골프/],['헬스',/헬스|피트니스|\bPT\b/i],['수영',/수영/],['테니스',/테니스/]],
  automotive:[['정비',/정비|수리|카센터/],['세차',/세차|디테일링/],['판매',/중고차|자동차\s*매장/]],
  pet_care:[['미용',/미용|목욕/],['호텔',/호텔|위탁|돌봄/],['훈련',/훈련|유치원/]],
};
const areas:[string,RegExp][]=[['서울',/서울/],['부산',/부산/],['대구',/대구/],['인천',/인천/],['광주',/광주(?:광역시|\s|$)/],['대전',/대전/],['울산',/울산/],['세종',/세종/],['경기',/경기도|(?:^|\s)경기(?=\s)/],['강원',/강원/],['충북',/충북|충청북도/],['충남',/충남|충청남도/],['전북',/전북|전라북도/],['전남',/전남|전라남도/],['경북',/경북|경상북도/],['경남',/경남|경상남도/],['제주',/제주/]];
function areaOf(text:string):string{
  // Province comes first in a street address; city is retained for regional shops.
  const found=areas.map(([name,re])=>({name,index:text.search(re)})).filter(v=>v.index>=0).sort((a,b)=>a.index-b.index)[0];
  if(!found)return '';
  const city=/^(경기|강원|충북|충남|전북|전남|경북|경남)$/.test(found.name)?text.match(/(?:도|자치도)\s+([가-힣]{2,10})[시군](?=\s)/)?.[1]:'';
  return [found.name,city].filter(Boolean).join(' ');
}

/** Uses the same page-purpose and playbook decisions as the report, never search snippets. */
export function buildCompetitionScope(input:Input):CompetitionScope{
  const data={...input,finalUrl:input.finalUrl||input.url,title:input.title||'',description:input.description||'',h1:input.h1||[],h2:input.h2||[],bodyText:input.bodyText||''};
  const purpose=analyzeWebsitePurpose(data),place=data.localPlaceEvidence||data.diagnosticSeed?.page.localPlaceEvidence;
  const identity=providerIdentity(data),headings=providerIdentity({...data,description:''});
  const role=ownBusinessRole(data),book=nonCommercePlaybook(purpose,identity,place);
  const kind=purpose.kind==='unknown'&&!['agency','software','manufacturing','home','education'].includes(role||'')&&/쇼핑몰|공식몰|전문몰|온라인몰|스토어|\bshop\b|\bstore\b/i.test(identity)?'commerce':purpose.kind;
  let profile=kind==='commerce'?'commerce':role==='manufacturing'?'manufacturing':book.local&&place?place.sector:purpose.business?.id||book.id;
  if(profile.startsWith('place_'))profile=profile.slice(6);
  if(profile==='organization'&&role==='manufacturing')profile=role;
  const facets=facetRules[profile]||[];
  const primary=facets.filter(([,re])=>re.test(headings));
  const specialties=(primary.length?primary:facets.filter(([,re])=>re.test(identity))).map(([id])=>id);
  const season=place?.seasonal?.profiles.map(p=>p.id)||[];
  if(season.length&&purpose.kind!=='commerce'&&!['agency','software','manufacturing'].includes(profile))specialties.push(...season.map(s=>'season:'+s));
  const headingDestinations=SKI_DESTINATIONS.filter(d=>d.aliases.test(headings));
  const destinations=specialties.includes('season:ski')?(headingDestinations.length?headingDestinations.map(d=>d.id):place?.seasonal?.destinations.map(d=>d.id)||[]):[];
  const nationwide=/(?:전국|온라인|비대면)\s*(?:출장|서비스|상담|수업|교육|진료|지원)/.test(identity);
  const area=localProfiles.has(profile)&&!nationwide?areaOf(place?.address||headings)||areaOf(identity):'';
  return {version:1,sourceUrl:data.finalUrl,kind,profile,label:profiles[profile]||purpose.business?.label||book.label,specialties:[...new Set(specialties)].slice(0,16),area,destinations:destinations.slice(0,6),nationwide};
}

const equivalent=[['home','home_service'],['legal','accounting','professional'],['hospitality','lodging'],['travel','travel_booking'],['medical_consulting','agency']];
const known=(scope:CompetitionScope)=>!['service','unknown','mixed','organization'].includes(scope.profile)&&scope.kind!=='unknown';
export function competitionMismatch(own:CompetitionScope,candidate:CompetitionScope,strict=true):string|undefined{
  if(['commerce','mixed'].includes(own.kind)&&['content','education','public_service'].includes(candidate.kind))return '상품 판매 업체와 정보·교육 페이지의 사업 유형이 다름';
  if(own.kind==='commerce'&&candidate.kind!=='commerce'&&candidate.kind!=='mixed'&&candidate.kind!=='unknown')return '자사는 상품 판매형이며 후보는 다른 제공 방식의 업체';
  if(!['commerce','mixed','unknown'].includes(own.kind)&&candidate.kind==='commerce')return '자사는 서비스·기관형이며 후보는 상품 판매형';
  if(known(own)){
    if(known(candidate)&&own.profile!==candidate.profile&&!equivalent.some(g=>g.includes(own.profile)&&g.includes(candidate.profile)))return `실제 제공 업무 불일치: 자사 ${own.label} · 후보 ${candidate.label}`;
    if(strict&&!known(candidate))return '후보 원문에서 자사와 같은 제공 업무를 확인하지 못함';
  }
  if(own.specialties.length&&!own.specialties.some(s=>candidate.specialties.includes(s))&&(strict||candidate.specialties.length))return '진료·교육·작업 분야 또는 시즌 서비스가 다르거나 원문 근거가 부족함';
  if(own.destinations.length&&!own.destinations.some(s=>candidate.destinations.includes(s))&&(strict||candidate.destinations.length))return '스키장·이용 목적지가 다르거나 후보의 해당 지역 운영 근거가 부족함';
  if(own.area&&!candidate.nationwide){
    const sameDestination=own.destinations.some(id=>candidate.destinations.includes(id));
    const overlap=candidate.area?(own.area===candidate.area||own.area.startsWith(candidate.area+' ')||candidate.area.startsWith(own.area+' ')):sameDestination;
    if(!overlap&&(strict||candidate.area))return '지역 서비스의 운영 지역이 다르거나 후보 원문에서 해당 지역을 확인하지 못함';
  }
}

/** A client noun cannot be the whole query for a provider with a clear role. */
export function scopeAllowsKeyword(query:string,scope?:CompetitionScope):boolean{
  if(!scope)return true;
  if(scope.profile==='rental'&&!/렌탈|렌털|렌트|대여|강습|rental/i.test(query))return false;
  const roleTerms:Record<string,RegExp>={international_logistics:/이사|물류|운송|포워딩|통관|freight|relocation|logistics/i,agency:/광고|마케팅|브랜딩|제작|대행/,medical_consulting:/컨설팅|마케팅|광고|개원/,software:/소프트웨어|솔루션|시스템|SaaS|프로그램/i,manufacturing:/제조|생산|공장|가공/,home:/시공|인테리어|리모델링|청소|소독|방역|수리|누수|이사/,education:/교육|학원|수업|강의|과정|수강|학교|클래스/};
  return !roleTerms[scope.profile]||roleTerms[scope.profile].test(query);
}

export function eligibleMetadata(text:string|undefined):string{
  return text&&!isContextOnlyEvidence('',text)?classificationText(text):'';
}

export function competitionScopeLabel(scope:CompetitionScope):string{
  const season=scope.specialties.find(s=>s.startsWith('season:'))?.slice(7);
  const label=season&&seasonalProfile(season)?.label||scope.label;
  const destinations=scope.destinations.map(id=>SKI_DESTINATIONS.find(d=>d.id===id)?.label||id).filter(label=>!scope.area.split(' ').includes(label));
  return [label,...scope.specialties.filter(s=>!s.startsWith('season:')),scope.area,...destinations].filter(Boolean).join(' · ');
}
