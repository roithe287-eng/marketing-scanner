import {providerIdentity,ownBusinessRole,providerBody,classificationText,isExcludedOffering,isContextOnlyEvidence} from './websiteIdentity';
import { getOpenAI } from "./openaiClient";
import { ExtractedWebsiteData } from "./extractWebsite";
import { IndustryCategory } from "./reportSchema";
import {analyzeWebsitePurpose,isNonCommerce} from './websitePurpose';
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

/**
 * v45-W3: AI 업종 자동 분류기
 * - 사이트 URL·본문·타이틀 분석 후 20개 카테고리 중 하나로 태깅
 * - 개인정보 저장 X · 오직 카테고리만 반환
 * - 실패 시 "etc" 반환
 */

const OPENAI_MODEL = "gpt-4o-mini";
const AI_TIMEOUT_MS = 15000;

// 20개 업종 카테고리 라벨 매핑
export const INDUSTRY_LABELS: Record<IndustryCategory, string> = {
  education: "교육",
  medical: "의료·병원",
  commerce: "커머스·쇼핑",
  realestate: "부동산",
  legal: "법률·세무",
  beauty: "뷰티·미용",
  food: "식음료·외식",
  travel: "여행·숙박",
  logistics: "해외이사·국제물류",
  it_service: "IT·서비스",
  manufacturing: "제조·산업",
  finance: "금융·투자",
  consulting: "컨설팅·마케팅",
  media: "미디어·콘텐츠",
  sports: "스포츠·피트니스",
  pet: "반려동물",
  automotive: "자동차",
  parenting: "육아·교육",
  interior: "인테리어·건축",
  ecommerce: "이커머스",
  etc: "기타",
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
  etc: [],
};

/**
 * 키워드 기반 빠른 예비 분류 (AI 호출 전 힌트)
 */
export function classifyIndustryFromEvidence(data: ExtractedWebsiteData): IndustryCategory | null {
  const purpose=analyzeWebsitePurpose(data);
  if(purpose.community)return 'media';
  if(purpose.business)return purpose.business.industry;
  if(isNonCommerce(purpose)&&ownBusinessRole(data)==='manufacturing')return 'manufacturing';
  if(isNonCommerce(purpose)&&purpose.sector){
    const categories:Record<NonNullable<typeof purpose.sector>['id'],IndustryCategory>={legal:'legal',medical:'medical',medical_consulting:'consulting',property_sales:'realestate',insurance:'finance',rehabilitation:'legal',startup:'consulting',franchise:'consulting'};
    return categories[purpose.sector.id];
  }
  if(isNonCommerce(purpose)){
    const place=data.diagnosticSeed?.page.localPlaceEvidence;
    const book=nonCommercePlaybook(purpose,providerIdentity(data),place);
    const season=book.id.startsWith('season_')?SEASON_INDUSTRIES[book.id.slice(7)]:undefined;
    const local=book.local&&place?PLACE_INDUSTRIES[place.sector]:undefined;
    const category=season||local||SERVICE_INDUSTRIES[book.id];
    if(category)return category;
  }
  if(data.productContext?.sources.length&&(data.productContext.commerce===true||data.productContext.discovery==='public_catalog'))return 'ecommerce';
  if(purpose.kind==='commerce'&&ownBusinessRole(data)==='retail')return 'ecommerce';
  const primary=classificationText([data.title,data.description,data.ogTitle,data.ogDescription,...data.h1||[]].filter(v=>v&&!isContextOnlyEvidence('',v)).join(' ')).toLowerCase();
  const body=classificationText(providerBody(data).slice(0,2500)).toLowerCase();
  const contains=(text:string,hint:string)=>/^[a-z ]+$/i.test(hint)?new RegExp('\\b'+hint.replace(/ /g,'\\s+')+'\\b','i').test(text):text.includes(hint.toLowerCase());
  const generic=new Set(['브랜드','제품','매장','상담','앱','플랫폼','콘텐츠','설계','app','store','shop','content']);
  const scores=Object.entries(CATEGORY_HINTS).map(([category,hints])=>{
    const concrete=hints.filter(h=>!generic.has(h));
    const primaryHits=concrete.filter(h=>contains(primary,h)).length;
    const bodyHits=concrete.filter(h=>contains(body,h)).length;
    return {category,primaryHits,score:primaryHits*4+Math.min(3,bodyHits),eligible:primaryHits>=2||primaryHits>=1&&bodyHits>=1||bodyHits>=3};
  }).filter(s=>s.eligible).sort((a,b)=>b.score-a.score);
  if(scores[0]&&scores[0].score>(scores[1]?.score||0))return scores[0].category as IndustryCategory;
  return null;
}

/** A model suggestion must cite literal eligible page text, never invent a basis. */
export function groundedIndustrySuggestion(value:unknown,data:ExtractedWebsiteData):IndustryCategory{
  if(!value||typeof value!=='object')return 'etc';
  const result=value as Record<string,unknown>,category=String(result.category||'etc').toLowerCase();
  if(!Object.hasOwn(INDUSTRY_LABELS,category)||category==='etc')return 'etc';
  const evidence=typeof result.evidence==='string'?result.evidence.replace(/\s+/g,' ').trim():'';
  if(evidence.length<4||evidence.length>200||isExcludedOffering(evidence))return 'etc';
  const source=classificationText([data.title,data.description,...data.h1||[],providerBody(data)].filter(v=>v&&!isContextOnlyEvidence('',v)).join(' ')).replace(/\s+/g,' ');
  return source.includes(evidence)?category as IndustryCategory:'etc';
}

/**
 * AI 업종 분류
 */
export async function classifyIndustry(
  data: ExtractedWebsiteData
): Promise<IndustryCategory> {
  // 1. 키워드 기반 강한 매칭이면 AI 호출 없이 즉시 반환
  const quick = classifyIndustryFromEvidence(data);
  if (quick) {
    return quick;
  }

  // 2. AI 분류
  if (!process.env.OPENAI_API_KEY) {
    return "etc";
  }

  const bodyPreview = providerBody(data).slice(0, 1500);
  if(![data.title,data.description,...data.h1||[],bodyPreview].some(v=>v?.trim()))return 'etc';
  const prompt = `다음 사이트의 업종을 20개 카테고리 중 하나로 정확히 분류하라.

[사이트]
페이지 목적: ${analyzeWebsitePurpose(data).label}
타이틀: ${data.title}
설명: ${data.description || data.ogDescription || ""}
H1: ${(data.h1 || []).slice(0, 3).join(" | ")}
본문 발췌: ${bodyPreview}

[20개 카테고리]
education / medical / commerce / realestate / legal / beauty / food /
travel / logistics / it_service / manufacturing / finance / consulting / media /
sports / pet / automotive / parenting / interior / ecommerce / etc

JSON만 응답:
{"category":"education","evidence":"업종 판단에 사용한 원문의 짧은 문구"}
evidence는 위 제목·설명·H1·본문에서 그대로 인용한다. 자사 제공 업무를 확인할 근거가 부족하면 category를 etc로 반환한다.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await getOpenAI().chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "업종 분류 도우미. 자사가 제공하는 업무로 분류한다. 고객사 업종·관련 글·제공하지 않는 업무는 제외한다. 제목·대표 제목·소개와 본문이 충돌하거나 근거가 부족하면 etc를 반환한다. JSON만 응답.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );
    clearTimeout(timer);

    const content = resp.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);
    return groundedIndustrySuggestion(parsed,data);
  } catch (e: any) {
    clearTimeout(timer);
    console.warn("[industry] AI 분류 실패:", e?.message || e);
    return "etc";
  }
}

export function industryLabel(cat: IndustryCategory): string {
  return INDUSTRY_LABELS[cat] || "기타";
}
