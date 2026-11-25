import {INDUSTRY_LABELS} from './industryCategory';
export {INDUSTRY_LABELS} from './industryCategory';
import {directIndustries} from './providerClaims';
import {keywordList} from './industryLanguage';
import {providerIdentity,ownBusinessRole,providerBody,classificationText,isExcludedOffering,isContextOnlyEvidence} from './websiteIdentity';
import { ExtractedWebsiteData } from "./extractWebsite";
import { IndustryCategory } from "./reportSchema";
import {analyzeWebsitePurpose,isNonCommerce} from './websitePurpose';
import {sameSite} from './siteIdentity';
import type {IndustryDecision,IndustryEvidence} from './industryDecisionSchema';
import {isSecondarySection,isOtherBranch} from './websiteIdentity';
import {nonCommercePlaybook} from './nonCommercePlaybook';

// Use the same identity chosen for the report. Client examples and seasonal
// product mentions must not replace a professional service or commerce model.
const PLACE_INDUSTRIES:Partial<Record<string,IndustryCategory>>={
  pharmacy:'medical',finance:'finance',medical:'medical',legal:'legal',professional:'legal',
  veterinary:'pet',pet_care:'pet',pet_store:'pet',cafe:'food',restaurant:'food',
  lodging:'travel',travel:'travel',beauty:'beauty',education:'education',fitness:'sports',
  automotive:'automotive',home_service:'interior',real_estate:'realestate',retail:'commerce',
};
const SEASON_INDUSTRIES:Partial<Record<string,IndustryCategory>>={
  ski:'sports',snow_ice:'sports',water_leisure:'sports',surf_dive:'sports',beach_pool:'sports',
  camp_picnic:'travel',strawberry:'travel',harvest:'travel',flowers_foliage:'travel',fishing_tidal:'travel',
  winter_car:'automotive',season_event:'travel',seasonal_food:'food',cooling:'interior',
};
const SERVICE_INDUSTRIES:Partial<Record<string,IndustryCategory>>={
  software:'it_service',agency:'consulting',accounting:'legal',home:'interior',
  hospitality:'travel',real_estate:'realestate',fitness:'sports',study_abroad:'education',
  education:'education',content:'media',community:'media',
};

const CATEGORY_HINTS: Record<IndustryCategory, string[]> = {
  education: ["학원", "강의", "수업", "교육", "과외", "온라인 클래스", "코딩스쿨", "수강", "튜터", "academy", "school", "course"],
  medical: ["병원", "의원", "클리닉", "진료", "치과", "한의원", "의료", "hospital", "clinic", "medical"],
  commerce: ["쇼핑", "매장", "판매", "브랜드", "제품", "shop", "store"],
  realestate: ["부동산", "아파트", "매매", "전세", "월세", "분양", "임대", "estate", "realtor"],
  legal: ["법무", "변호사", "세무사", "노무사", "법률", "소송", "상담", "lawyer", "attorney"],
  beauty: ["미용", "뷰티", "네일", "왁싱", "피부관리", "메이크업", "미용실", "salon", "beauty"],
  food: ["음식점", "카페", "레스토랑", "맛집", "배달", "delivery", "restaurant", "cafe"],
  travel: ["여행", "숙박", "호텔", "펜션", "리조트", "관광", "투어", "travel", "hotel"],
  logistics: ["해외이사", "귀국이사", "국제운송", "국제물류", "포워딩", "해상운송", "항공운송", "freight", "relocation"],
  it_service: ["SaaS", "소프트웨어", "앱", "플랫폼", "솔루션", "개발", "cloud", "app"],
  manufacturing: ["제조", "공장", "생산", "산업재", "부품", "설비", "manufacturing"],
  finance: ["금융", "은행", "보험", "투자", "대출", "카드", "finance", "banking"],
  consulting: ["컨설팅", "마케팅", "광고", "대행", "에이전시", "consulting", "agency"],
  media: ["미디어", "콘텐츠", "매거진", "블로그", "유튜브", "뉴스", "media", "content"],
  sports: ["헬스", "요가", "필라테스", "PT", "피트니스", "골프", "gym", "fitness"],
  pet: ["반려동물", "강아지", "고양이", "펫", "동물병원", "사료", "pet", "dog"],
  automotive: ["자동차", "정비", "튜닝", "중고차", "렌트카", "auto", "car"],
  parenting: ["육아", "유아", "아동", "베이비", "장난감", "kids", "baby"],
  interior: ["인테리어", "리모델링", "건축", "설계", "가구", "interior", "design"],
  ecommerce: ["온라인 쇼핑몰", "이커머스", "장바구니", "결제", "cart", "checkout"],
  fortune: [],
  etc: [],
};

// Keep each evidence channel separate. A repeated meta/OG description is one observation.
const broadHints=new Set(['브랜드','제품','매장','상담','앱','플랫폼','콘텐츠','설계','카드','app','store','shop','content']);
const concreteHints=(category:IndustryCategory)=>CATEGORY_HINTS[category].filter(h=>!broadHints.has(h));
function matchingHints(text:string,hints:string[]){
  return hints.filter(h=>/^[a-z ]+$/i.test(h)?new RegExp('\\b'+h.replace(/ /g,'\\s+')+'\\b','i').test(text):text.toLowerCase().includes(h.toLowerCase()));
}
type IndustryInput=Parameters<typeof analyzeWebsitePurpose>[0]&Partial<Pick<ExtractedWebsiteData,'ogTitle'|'collectionNotice'>>;
function industrySources(data:IndustryInput){
  const eligible=(s:string|undefined)=>s&&!isContextOnlyEvidence('',s)&&!keywordList(s)?classificationText(s):'';
  const names=[data.title,...data.h1||[],data.ogTitle].map(eligible).filter(Boolean);
  const meta=[...new Set([data.description,data.ogDescription].map(eligible).filter(Boolean))];
  const body=providerBody(data).slice(0,6000).split(/\n+/).map(eligible).filter(Boolean);
  const primary=[...names,...meta];
  const independent=body.map(line=>primary.reduce((v,p)=>v.split(p).join(' '),line)).filter(line=>line.trim()&&!primary.some(p=>p.includes(line.trim())));
  return {names,meta,body,independent};
}

/**
 * 키워드 기반 빠른 예비 분류 (AI 호출 전 힌트)
 */
export function classifyIndustryFromEvidence(data:IndustryInput,purpose=analyzeWebsitePurpose(data)): IndustryCategory | null {
  if(purpose.community)return 'media';
  if(purpose.business)return purpose.business.industry;
  if(isNonCommerce(purpose)&&ownBusinessRole(data)==='manufacturing')return 'manufacturing';
  if(isNonCommerce(purpose)&&purpose.sector){
    const categories:Record<NonNullable<typeof purpose.sector>['id'],IndustryCategory>={legal:'legal',medical:'medical',medical_consulting:'consulting',property_sales:'realestate',insurance:'finance',rehabilitation:'legal',startup:'consulting',franchise:'consulting'};
    return categories[purpose.sector.id];
  }
  if(isNonCommerce(purpose)){
    const place=data.localPlaceEvidence||data.diagnosticSeed?.page.localPlaceEvidence;
    const book=nonCommercePlaybook(purpose,providerIdentity(data),place);
    const season=book.id.startsWith('season_')?SEASON_INDUSTRIES[book.id.slice(7)]:undefined;
    if(!season&&place?.sector==='rental'&&/렌터카|렌트카|(?:자동차|차량)\s*대여/.test(providerIdentity(data)))return 'automotive';
    const local=book.local&&place?PLACE_INDUSTRIES[place.sector]:undefined;
    const category=season||local||book.industry||SERVICE_INDUSTRIES[book.id];
    if(category)return category;
    // A concrete local business without a benchmark category must not fall
    // through to incidental words such as insurance in its operating terms.
    if(book.local&&place&&place.sector!=='local')return 'etc';
  }
  if(data.productContext?.sources.length&&(data.productContext.commerce===true||data.productContext.discovery==='public_catalog'))return 'ecommerce';
  if(purpose.kind==='commerce'&&ownBusinessRole(data)==='retail')return 'ecommerce';
  const sources=industrySources(data);
  if(purpose.declaredIndustry)return purpose.declaredIndustry.category;
  const scores=Object.keys(CATEGORY_HINTS).map(key=>{
    const category=key as IndustryCategory,hints=concreteHints(category);
    const nameHits=matchingHints(sources.names.join(' '),hints).length;
    const metaHits=matchingHints(sources.meta.join(' '),hints).length;
    const bodyHits=matchingHints(sources.independent.join(' '),hints).length;
    const eligible=nameHits>=2||nameHits>=1&&(metaHits>=1||bodyHits>=1)||metaHits>=1&&bodyHits>=1||bodyHits>=3;
    return {category,score:nameHits*5+Math.min(3,metaHits)*2+Math.min(3,bodyHits),eligible};
  }).filter(s=>s.eligible).sort((a,b)=>b.score-a.score);
  if(scores[0]&&scores[0].score>(scores[1]?.score||0))return scores[0].category as IndustryCategory;
  return null;
}

const roleCategories={agency:'consulting',software:'it_service',manufacturing:'manufacturing',home:'interior',education:'education',retail:'ecommerce'} as const;
const comparableCategory=(category:IndustryCategory)=>category==='commerce'?'ecommerce':category;

function providerClaims(row:IndustryEvidence){
  const text=classificationText(row.text);
  const explicit=directIndustries(text);
  if(explicit.length||!['title','heading'].includes(row.field))return explicit;
  const role=ownBusinessRole({title:text});
  if(role)return [roleCategories[role]];
  if(/(?:동물병원|동물의료센터)(?:\s|$)/.test(text))return ['pet'] as const;
  if(/(?:법무법인|법률사무소|법무사)(?:\s|$)/.test(text))return ['legal'] as const;
  if(/(?:병원|의원|치과|한의원|클리닉)(?:\s*[|·-]|$)/.test(text))return ['medical'] as const;
  return [];
}

/** Authorize industry-specific output from first-party statements and products only. */
export function reviewIndustry(data:IndustryInput):IndustryDecision{
  const sourceUrl=data.finalUrl||data.url;
  if(!sameSite(sourceUrl,data.url)&&!sameSite(data.url,sourceUrl))return {status:'review',reason:'redirected',sourceUrl,evidence:[]};
  if(data.collectionNotice)return {status:'review',reason:'restricted',sourceUrl,evidence:[]};
  const purpose=analyzeWebsitePurpose(data);
  const place=data.localPlaceEvidence||data.diagnosticSeed?.page.localPlaceEvidence;
  const rows:IndustryEvidence[]=[];
  const add=(field:IndustryEvidence['field'],value:string|undefined,url=sourceUrl)=>{
    const text=value?.replace(/\s+/g,' ').trim();
    if(!text||text.length<2||keywordList(text)||isSecondarySection('',text,url)||!classificationText(text)||!sameSite(url,sourceUrl))return;
    if(!rows.some(row=>row.text===text.slice(0,240)))rows.push({field,text:text.slice(0,240),url});
  };
  add('title',data.title);
  data.h1.slice(0,4).forEach(text=>add('heading',text));
  add('description',data.description||data.ogDescription);
  const headings=rows.filter(row=>row.field==='title'||row.field==='heading');
  for(const line of providerBody(data).slice(0,7000).split(/\n+/u).slice(0,24)){
    for(const text of line.split(/(?<=[.!?。])\s+/u).slice(0,5)){
      if(!headings.some(row=>row.text.includes(text.trim())||text.trim()===row.text))add('body',text);
    }
  }
  for(const doc of data.businessDocuments||[]){
    if(doc.source==='search_excerpt'||doc.url===sourceUrl||isOtherBranch(doc.title,place?.branch)||isSecondarySection(doc.title,'',doc.url))continue;
    for(const section of doc.sections.filter(s=>!isSecondarySection(s.heading,s.text,doc.url)).slice(0,4))add('document',section.text,doc.url);
  }
  for(const product of [...data.productDiscovery?.sources||[],...data.productContext?.sources||[]])add('product',product.name,product.url);
  const primary=rows.filter(row=>['title','heading','description'].includes(row.field));
  const claims=(list:IndustryEvidence[])=>new Set(list.flatMap(row=>[...providerClaims(row)].map(comparableCategory)));
  const lead=claims(headings),confirmed=claims(rows.filter(row=>row.field==='body'||row.field==='document'));
  const allClaims=claims(rows);
  const candidate=classifyIndustryFromEvidence(data,purpose);
  const selected=candidate&&comparableCategory(candidate);
  // If headline and substantive copy agree, a stale description may be ignored.
  // A competing service declared in the headline or substantive copy still requires review.
  const corroborated=lead.size===1&&confirmed.size===1&&[...lead][0]===[...confirmed][0];
  const conflict=lead.size>1||confirmed.size>1||allClaims.size>1&&!corroborated;
  if(conflict&&!purpose.community){
    const evidence=rows.filter(row=>providerClaims(row).length).slice(0,4);
    return {status:'review',reason:'conflicting',sourceUrl,evidence};
  }
  const specialists=[...purpose.business?.evidence||[],...purpose.sector?.evidence||[],...purpose.community?.evidence||[]];
  const direct=selected?rows.filter(row=>providerClaims(row).some(category=>comparableCategory(category)===selected)):[];
  const specialistEvidence=rows.filter(row=>specialists.some(s=>s.text.replace(/\s+/g,' ').includes(row.text)));
  const matched=selected?rows.filter(row=>matchingHints(classificationText(row.text),concreteHints(selected)).length):[];
  const products=rows.filter(row=>row.field==='product');
  const verifiedProducts=products.length>0&&(purpose.kind==='commerce'||purpose.kind==='mixed'||data.productContext?.discovery==='public_catalog');
  const corroboratingFields=new Set(matched.map(row=>row.field==='heading'?'title':row.field));
  const specialistSupported=specialistEvidence.some(row=>row.field!=='description')||
    specialistEvidence.length>0&&corroboratingFields.size>=2;
  const explicitProvider=direct.some(row=>row.field!=='description'&&directIndustries(row.text).length>0);
  const placeSupported=!!(place?.sector&&place.sector!=='local'&&place.address&&matched.length);
  const supported=specialistSupported||verifiedProducts||explicitProvider||corroboratingFields.size>=2||placeSupported;
  if(!candidate||candidate==='etc'||!supported)return {status:'review',reason:'insufficient',sourceUrl,evidence:primary.slice(0,2)};
  const evidence=[...new Set([...specialistEvidence,...direct,...(verifiedProducts?products:[]),...matched])].slice(0,4);
  const label=purpose.business?.label||purpose.sector?.label||(purpose.community?'커뮤니티':INDUSTRY_LABELS[candidate]);
  return {status:'matched',category:candidate,sourceUrl,label,evidence};
}

/** A model suggestion must cite literal eligible page text, never invent a basis. */
export function groundedIndustrySuggestion(value:unknown,data:Parameters<typeof industrySources>[0]):IndustryCategory{
  if(!value||typeof value!=='object')return 'etc';
  const result=value as Record<string,unknown>,category=String(result.category||'etc').toLowerCase();
  if(!Object.hasOwn(INDUSTRY_LABELS,category)||category==='etc')return 'etc';
  const evidence=typeof result.evidence==='string'?result.evidence.replace(/\s+/g,' ').trim():'';
  if(evidence.length<4||evidence.length>200||isExcludedOffering(evidence))return 'etc';
  const sources=industrySources(data);
  const hints=concreteHints(category as IndustryCategory);
  const containsQuote=(s:string)=>s.replace(/\s+/g,' ').includes(evidence);
  const direct=directIndustries(evidence);
  const matchesClaim=direct.length===1&&direct[0]===category;
  if(!matchesClaim&&!matchingHints(classificationText(evidence),hints).length)return 'etc';
  if([...sources.names,...sources.independent].some(containsQuote))return category as IndustryCategory;
  if(!sources.meta.some(containsQuote))return 'etc';
  const supported=matchingHints([...sources.names,...sources.independent].join(' '),hints).length>0;
  return supported||matchesClaim?category as IndustryCategory:'etc';
}

export async function classifyIndustry(data:ExtractedWebsiteData):Promise<IndustryCategory>{
  const decision=data.industryDecision||reviewIndustry(data);
  return decision.status==='matched'?decision.category:'etc';
}

export function industryLabel(cat: IndustryCategory): string {
  return INDUSTRY_LABELS[cat] || "기타";
}
