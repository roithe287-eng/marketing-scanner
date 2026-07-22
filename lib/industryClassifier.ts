import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { IndustryCategory } from "./reportSchema";

/**
 * v45-W3: AI 업종 자동 분류기
 * - 사이트 URL·본문·타이틀 분석 후 20개 카테고리 중 하나로 태깅
 * - 개인정보 저장 X · 오직 카테고리만 반환
 * - 실패 시 "etc" 반환
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
function quickClassify(data: ExtractedWebsiteData): IndustryCategory | null {
  const text = [
    data.title,
    data.description,
    data.ogTitle,
    data.ogDescription,
    ...(data.h1 || []),
    ...(data.h2 || []).slice(0, 5),
    data.bodyText?.slice(0, 1500) || "",
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<string, number> = {};
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
    let s = 0;
    for (const h of hints) {
      if (text.includes(h.toLowerCase())) s++;
    }
    if (s > 0) scores[cat] = s;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 3) {
    return sorted[0][0] as IndustryCategory;
  }
  return null;
}

/**
 * AI 업종 분류
 */
export async function classifyIndustry(
  data: ExtractedWebsiteData
): Promise<IndustryCategory> {
  // 1. 키워드 기반 강한 매칭이면 AI 호출 없이 즉시 반환
  const quick = quickClassify(data);
  if (quick) {
    return quick;
  }

  // 2. AI 분류
  if (!process.env.OPENAI_API_KEY) {
    return "etc";
  }

  const bodyPreview = (data.bodyText || "").slice(0, 1500);
  const prompt = `다음 사이트의 업종을 20개 카테고리 중 하나로 정확히 분류하라.

[사이트]
타이틀: ${data.title}
설명: ${data.description || data.ogDescription || ""}
H1: ${(data.h1 || []).slice(0, 3).join(" | ")}
H2: ${(data.h2 || []).slice(0, 5).join(" | ")}
본문 발췌: ${bodyPreview}

[20개 카테고리]
education / medical / commerce / realestate / legal / beauty / food /
travel / it_service / manufacturing / finance / consulting / media /
sports / pet / automotive / parenting / interior / ecommerce / etc

JSON만 응답:
{"category":"education"}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: "업종 분류 도우미. JSON만 응답.",
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
    const cat = String(parsed.category || "etc").toLowerCase();

    // 유효성 검사
    if (Object.keys(INDUSTRY_LABELS).includes(cat)) {
      return cat as IndustryCategory;
    }
    return "etc";
  } catch (e: any) {
    clearTimeout(timer);
    console.warn("[industry] AI 분류 실패:", e?.message || e);
    return "etc";
  }
}

export function industryLabel(cat: IndustryCategory): string {
  return INDUSTRY_LABELS[cat] || "기타";
}
