import type {SiteDiagnostics} from './siteDiagnosticsSchema';
import type {MedicalAudit} from './medicalAuditSchema';
import {sameSite,siteIdentity} from './siteIdentity';

export const PLACE_CATEGORIES = ['증상','질병','시술','검진'] as const;
export type PlaceCategory = typeof PLACE_CATEGORIES[number];
export type PlaceTerm = {category:PlaceCategory; term:string};
export const PLACE_LIMIT = 30;
export const PLACE_TITLE = '병의원 플레이스 검색 키워드';
export const PLACE_RULE = '실제 진료하는 항목을 네 분류 합계 30개까지 등록하세요. 기존 진료 질병명은 질병 분류로 자동 이전됩니다.';
export const PLACE_ROLLOUT = '2026년 11월 12일부터 검색 결과에 순차 반영됩니다.';
export const PLACE_EXCLUSIONS = '검색·광고 모두 제외하려면 스마트플레이스의 업체정보 → 제공 서비스 → 검색 제외 키워드, 광고만 제외하려면 네이버애즈 광고그룹 → 제외 키워드에서 설정하세요.';
export const PLACE_NOTICE = 'https://new.smartplace.naver.com/notices/1152';
export const PLACE_AD_NOTICE = 'https://ads.naver.com/notice/35296';

export const placeTermKey = (value:string) => value.normalize('NFKC').replace(/\s+/gu,'').toLocaleLowerCase('ko');
const excludedSite = /동물\s*병원|동물\s*의료|수의\s*(?:과|사)|반려동물|국회\s*의원|(?:시|구|군|도)의회|병원\s*(?:찾기|검색\s*포털|추천\s*목록|채용|컨설팅|마케팅)|컨설팅|광고대행|홈페이지\s*제작|의료기기\s*(?:판매|쇼핑|유통)|(?:협회|학회|신문|언론|뉴스|기자|쇼핑몰|의료용품|병원용품|납품|고객사|포트폴리오|제작\s*사례|블로그|후기|병원\s*목록)|(?:헤어|두피|자동차)\s*클리닉/i;
export function excludedPlaceIdentity(identity:string,url:string) {
  const site = siteIdentity(url);
  return !site || site.shared || /(^|\.)(?:naver\.com|naver\.me)$/.test(site.host) || excludedSite.test(identity);
}
export function clinicPlaceIdentity(title:string,identity:string,url:string,clinical:boolean,namedEntity:boolean) {
  if (excludedPlaceIdentity(identity,url)) return false;
  const named = /[가-힣A-Za-z0-9]+(?:병원|의원|치과|피부과|성형외과|정형외과|안과|이비인후과|내과|산부인과|소아청소년과|비뇨의학과|정신건강의학과|재활의학과|가정의학과|클리닉)|\b(?:clinic|hospital|dentist)\b/i.test(title);
  return (named && clinical) || (namedEntity && (named || clinical));
}

/** Only links published on the clinic's own page. Never resolve short links or fetch Place. */
export function placeChannel(url:string,label:string) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.port) return undefined;
    const host = parsed.hostname;
    if (['m.place.naver.com','pcmap.place.naver.com','place.naver.com'].includes(host)) {
      const match = parsed.pathname.match(/^\/(hospital|place)\/(\d+)(?:\/|$)/);
      if (match) return {kind:'place' as const,url:'https://m.place.naver.com/'+match[1]+'/'+match[2]};
    }
    if (host === 'map.naver.com') {
      const id = parsed.pathname.match(/\/(?:entry\/place|place)\/(\d+)(?:\/|$)/)?.[1];
      if (id) return {kind:'place' as const,url:'https://map.naver.com/p/entry/place/'+id};
    }
    if (host === 'naver.me' && /^\/[a-z\d]+\/?$/i.test(parsed.pathname) && /네이버\s*(?:지도|플레이스|예약)|길\s*찾기|오시는\s*길/.test(label)) {
      return {kind:'short' as const,url:'https://naver.me'+parsed.pathname};
    }
  } catch { /* Unusable source link. */ }
  return undefined;
}

export type PlaceCandidate = {term:string;url:string;basis:'title'|'context'|'body'};
function candidateBasis(term:string,title:string,url:string):PlaceCandidate['basis'] {
  if (/\/(?:columns?|articles?|news|blog|visit|doctors?|staff)(?:[/.\-_]|$)/i.test(new URL(url).pathname) || /칼럼|약력|활동\s*이력/.test(title)) return 'context';
  return placeTermKey(title).includes(placeTermKey(term))?'title':'body';
}

export function buildHospitalPlaceReview(diagnostics?:SiteDiagnostics|null) {
  if (!diagnostics?.medicalAudit) return undefined;
  const root = diagnostics.pages.find(p=>p.url === diagnostics.targetUrl);
  const medical = root?.medicalEvidence;
  if (!root || !medical || medical.providerOnly || medical.sensitive) return undefined;
  // Older snapshots can show the new policy, but must not imply a keyword scan took place.
  const oldClinic = !medical.place && medical.facilityCandidate && clinicPlaceIdentity(root.title,medical.identity,root.url,
    medical.signals.some(s=>['doctors','hours','scope'].includes(s.key)),false);
  if (!medical.place?.facility && !oldClinic) return undefined;
  const groups = PLACE_CATEGORIES.map(category=>({category,terms:[] as PlaceCandidate[]}));
  const links:NonNullable<ReturnType<typeof placeChannel>>[] = [];
  if (!diagnostics.limited) for (const page of diagnostics.pages) {
    const evidence = page.medicalEvidence;
    if (!sameSite(page.url,root.url) || !evidence || evidence.providerOnly || evidence.sensitive || excludedPlaceIdentity(evidence.identity,page.url)) continue;
    for (const channel of evidence.channels) {
      const link = placeChannel(channel.url,channel.label);
      if (link) links.push(link);
    }
    if (!medical.place || !evidence.place) continue;
    for (const item of evidence.place.terms) {
      const group = groups.find(g=>g.category === item.category)!;
      const basis=candidateBasis(item.term,page.title,page.url);
      const previous=group.terms.find(t=>placeTermKey(t.term)===placeTermKey(item.term));
      const priority={title:2,body:1,context:0};
      if(!previous) group.terms.push({term:item.term,url:page.url,basis});
      else if(priority[basis]>priority[previous.basis]) Object.assign(previous,{url:page.url,basis});
    }
  }
  const entity=medical.entities.find(e=>['Hospital','MedicalClinic','Dentist','PhysiciansOffice'].includes(e.type)&&e.name&&root.title.includes(e.name));
  const titleParts=root.title.split(/[|｜]/u).map(part=>part.trim());
  const name=entity?.name||titleParts.find(part=>/병원|의원|한의원|치과|의학과|이비인후과|피부과|클리닉|clinic|hospital/i.test(part))||root.title||new URL(root.url).hostname;
  const profile={name,address:entity?.address||'',host:new URL(root.url).hostname};
  const page={url:root.url,title:root.title,description:root.description.slice(0,200),
    terms:diagnostics.limited?null:medical.place?.terms??null,media:diagnostics.limited?null:medical.place?.media??null};
  return {groups,page,profile,link:links.find(l=>l.kind==='place') || links[0],coverage:diagnostics.limited?'limited':medical.place?'sample':'legacy'} as const;
}
export type HospitalPlaceReview = NonNullable<ReturnType<typeof buildHospitalPlaceReview>>;
export type PlaceInputs = Record<PlaceCategory,string>;
export function comparePlaceEntries(review:HospitalPlaceReview,inputs:PlaceInputs) {
  const entries = PLACE_CATEGORIES.flatMap(category=>inputs[category].split(/[,，、;；\n]+/u)
    .map(term=>term.trim()).filter(Boolean).map(term=>({category,term,key:placeTermKey(term)})));
  const seen = new Set<string>(), duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.key)) duplicates.add(entry.term);
    seen.add(entry.key);
  }
  const matches:string[] = [], otherCategory:string[] = [], toCheck:string[] = [];
  for (const group of review.groups) for (const candidate of group.terms) {
    const inList = entries.filter(entry=>entry.key===placeTermKey(candidate.term));
    if (inList.some(entry=>entry.category===group.category)) matches.push(candidate.term);
    else if (inList.length) otherCategory.push(candidate.term+' ('+inList[0].category+' → '+group.category+' 확인)');
    else toCheck.push(candidate.term);
  }
  return {count:entries.length,duplicates:[...duplicates],matches,otherCategory,toCheck};
}

export const PLACE_SOURCES:MedicalAudit['sources'] = [
  {id:'naver-disease',title:'스마트플레이스 · 우리병원 검색 키워드',url:PLACE_NOTICE},
  {id:'naver-place-ads',title:'네이버애즈 · 병의원 검색 확대',url:PLACE_AD_NOTICE}
];
export const PLACE_ACCOUNT_CHECK:MedicalAudit['checks'][number] = {
  id:'naver-source',label:'네이버 진료정보·검색 키워드 대조',status:'unverified',evidence:[],
  sources:['naver-medical','naver-disease','naver-place-ads'],
  detail:'심평원 제공 진료정보와 병원이 직접 등록하는 검색 키워드는 관리 화면에서 각각 확인하세요.',
  action:'스마트플레이스 업체정보 → 우리병원 검색 키워드에서 증상·질병·시술·검진을 확인하세요. '+PLACE_RULE
};

/** Replace obsolete instructions on saved reports without changing historical observations. */
export const FACILITY_ACCOUNT_CHECK:MedicalAudit['checks'][number] = {
  id:'naver-source',label:'기관 진료정보 확인',status:'unverified',evidence:[],sources:['naver-medical'],
  detail:'공개 페이지에서 병원 등록 정보를 확인하기 어렵습니다.',action:'해당 진료기관의 담당자가 심평원 원천 정보와 기관 정보를 대조하세요.'
};
export function currentPlacePolicy(audit:MedicalAudit,eligible:boolean):MedicalAudit {
  if (audit.reviewedOn !== '2026-11-04') return audit;
  return {...audit,sources:[...audit.sources.filter(s=>!PLACE_SOURCES.some(updated=>s.id===updated.id)),...(eligible?PLACE_SOURCES:[])],
    checks:audit.checks.map(c=>c.id===PLACE_ACCOUNT_CHECK.id?(eligible?PLACE_ACCOUNT_CHECK:FACILITY_ACCOUNT_CHECK):c)};
}
