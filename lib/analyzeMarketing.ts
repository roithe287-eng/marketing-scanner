import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";
import { CompetitorAnalysisResult } from "./competitorAnalysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `너는 15년 차 퍼포먼스 마케터이자 랜딩페이지 전환율 최적화(CRO) 전문가다.
"진짜마케팅"의 시니어 컨설턴트 역할로, 클라이언트의 웹사이트를 마케팅/전환 관점에서 진단한다.

핵심 원칙:
- 단순 디자인 평가가 아니라 "광고 유입 후 전환 가능성" 중심으로 판단한다.
- 일반론이 아니라, 사이트의 실제 데이터(title, h1, 버튼, 이미지 alt 등)를 직접 인용한다.
- 개선안은 "이렇게 바꾸면 됩니다" 식으로 구체적 예시를 제공한다.
- 예시 카피는 한국어로, 진짜마케팅의 직설적이고 명확한 톤으로 작성한다.
- 점수는 0~100점이며, 차등 평가한다 (전부 70점대로 채우지 말 것).

매우 중요:
- 사이트의 제품/서비스 파악은 title + og + h1 + h2 + 이미지 alt + 본문을 종합 판단.
- 절대 단편 키워드로 추측하지 말 것.
- 경쟁사 데이터가 있으면 메시지 차이를 구체적으로 비교하라.

반드시 JSON 형식으로만 응답한다.`;

function buildCompetitorPromptSection(
  competitorAnalysis: CompetitorAnalysisResult | null
): string {
  if (!competitorAnalysis || competitorAnalysis.competitors.length === 0)
    return "";

  const compSection = competitorAnalysis.competitors
    .map(
      (c) => `
[경쟁사 ${c.rank}: ${c.domain}]
- 검색결과 제목: ${c.title}
- 검색결과 설명(파워링크/메타): ${c.description}
- 실제 사이트 title: ${c.metaTitle || "(수집실패)"}
- 실제 사이트 meta description: ${c.metaDescription || "(수집실패)"}
- 실제 사이트 H1: ${c.h1 || "(없음)"}
- CTA 버튼: ${JSON.stringify(c.ctaTexts || [])}
`
    )
    .join("\n");

  return `
[경쟁사 분석 데이터]
검색 키워드: "${competitorAnalysis.searchKeyword}"
네이버 검색 상위 경쟁사 ${competitorAnalysis.competitors.length}곳:
${compSection}
`;
}

const USER_PROMPT_TEMPLATE = (
  data: ExtractedWebsiteData,
  competitorAnalysis: CompetitorAnalysisResult | null
) => `
아래 웹사이트를 진단하라.

[웹사이트 기본 정보]
- URL: ${data.url}
- title: ${data.title || "(없음)"}
- meta description: ${data.description || "(없음)"}
- meta keywords: ${data.keywords || "(없음)"}
- og:title: ${data.ogTitle || "(없음)"}
- og:description: ${data.ogDescription || "(없음)"}
- viewport meta: ${data.viewportMeta || "(없음)"}
- favicon: ${data.hasFavicon ? "있음" : "없음"}

[제목 구조]
- H1 (${data.h1.length}개): ${JSON.stringify(data.h1)}
- H2 (${data.h2.length}개): ${JSON.stringify(data.h2.slice(0, 15))}
- H3 일부: ${JSON.stringify(data.h3.slice(0, 8))}

[버튼/CTA]
- 전체 버튼 텍스트: ${JSON.stringify(data.buttons.slice(0, 40))}
- CTA로 보이는 버튼: ${JSON.stringify(data.ctaButtons)}
- 폼 존재: ${data.hasForm ? "있음" : "없음"}
- 연락처 정보: ${data.hasContactInfo ? "있음" : "없음"}

[이미지]
- 이미지 수: ${data.imageCount}개
- alt 없는 이미지: ${data.imageWithoutAlt}개
- 이미지 alt 텍스트 일부: ${JSON.stringify(data.imageAlts.slice(0, 15))}

[신뢰 요소 키워드 감지]
- 후기/리뷰: ${data.hasReviewKeyword ? "있음" : "없음"}
- 가격/문의: ${data.hasPriceKeyword ? "있음" : "없음"}
- 인증/수상/파트너: ${data.hasTrustKeyword ? "있음" : "없음"}

[본문 텍스트 (앞부분 5000자)]
${data.bodyText.slice(0, 5000)}

${buildCompetitorPromptSection(competitorAnalysis)}

---

위 데이터를 바탕으로 다음 JSON 형식으로만 응답하라.

⚠️ 작성 원칙:
1. 모든 진단은 위 데이터에 실제로 있는 값을 인용해야 한다. 추측 금지.
2. 점수는 차등 평가 (전부 70점대 X).
3. checklist 12개 항목 모두 작성. currentValue는 위 데이터에서 실제 값을 그대로 넣어라.
4. criticalIssues 3~5개. 각 이슈에 badExample(현재 사이트 실제 잘못된 예)과 goodExample(개선된 예시)을 반드시 포함.
5. quickWinsDetailed는 4~6개. 각 항목은 단계(steps) 2~4개로 분해.
6. priorityRoadmap은 짧고 간결하게 (Critical과 중복되지 않게 - 시점 기준 분류만).
7. exampleCopy에는 currentHeroHeadline(현재 h1 또는 title)을 반드시 넣고, 경쟁사 데이터가 있다면 competitorCopyInsight도 작성.

{
  "url": "${data.url}",
  "overallScore": <0-100>,
  "oneLineSummary": "<직설적 한 줄 요약>",
  "diagnosis": {
    "firstView": <0-100>, "cta": <0-100>, "copywriting": <0-100>,
    "trust": <0-100>, "conversionFlow": <0-100>, "adLanding": <0-100>,
    "mobileUx": <0-100>, "seo": <0-100>
  },
  "checklist": [
    {
      "id": "title",
      "category": "seo",
      "label": "title 태그",
      "status": "pass|warning|fail",
      "currentValue": "<사이트의 실제 title 값 또는 '(없음)'>",
      "diagnosis": "<현재 상태를 한 문장으로 평가>",
      "guide": "<어떻게 개선하면 되는지 한 문장>"
    },
    {
      "id": "meta_description",
      "category": "seo",
      "label": "Meta Description",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "og_tags",
      "category": "seo",
      "label": "Open Graph 태그 (og:title, og:description)",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "h1",
      "category": "content",
      "label": "H1 헤드라인 (메인 메시지)",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "image_alt",
      "category": "content",
      "label": "이미지 ALT 텍스트",
      "status": "pass|warning|fail",
      "currentValue": "<이미지 N개 중 alt 없는 이미지 M개>",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "viewport",
      "category": "seo",
      "label": "모바일 viewport",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "cta_clarity",
      "category": "conversion",
      "label": "CTA 명확도",
      "status": "pass|warning|fail",
      "currentValue": "<감지된 CTA 버튼 텍스트 나열>",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "cta_repeat",
      "category": "conversion",
      "label": "CTA 반복 노출",
      "status": "pass|warning|fail",
      "currentValue": "<CTA 버튼 개수>",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "contact_info",
      "category": "conversion",
      "label": "연락처 정보 (전화/이메일)",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "trust_review",
      "category": "trust",
      "label": "후기/리뷰 노출",
      "status": "pass|warning|fail",
      "currentValue": "<감지여부>",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "trust_certification",
      "category": "trust",
      "label": "인증/수상/파트너 노출",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    },
    {
      "id": "price_info",
      "category": "conversion",
      "label": "가격/견적 정보",
      "status": "pass|warning|fail",
      "currentValue": "...",
      "diagnosis": "...",
      "guide": "..."
    }
  ],
  "criticalIssues": [
    {
      "title": "<문제 한 줄>",
      "problem": "<무엇이 문제인지>",
      "reason": "<왜 문제인지 - 사이트 실제 데이터 인용>",
      "recommendation": "<어떻게 고치는지>",
      "priority": "high|medium|low",
      "badExample": "<현재 사이트의 실제 잘못된 예 - 큰따옴표로 인용. 예: '문의하기'>",
      "goodExample": "<개선된 예시 - 큰따옴표로. 예: '30초 무료 진단받기 →'>",
      "exampleNote": "<왜 이렇게 바꾸는 게 좋은지 한 줄 설명>"
    }
  ],
  "quickWinsDetailed": [
    {
      "title": "<오늘 바로 적용 가능한 개선 한 줄>",
      "steps": [
        "Step 1: <첫 단계>",
        "Step 2: <두 번째 단계>",
        "Step 3: <세 번째 단계>"
      ],
      "beforeExample": "<수정 전 예시>",
      "afterExample": "<수정 후 예시>"
    }
  ],
  "priorityRoadmap": {
    "immediately": ["<짧고 명확한 액션 1>", "<액션 2>"],
    "thisWeek": ["<액션 1>", "<액션 2>"],
    "thisMonth": ["<액션 1>", "<액션 2>"]
  },
  "exampleCopy": {
    "currentHeroHeadline": "<사이트의 실제 h1 또는 title 값>",
    "currentCtaText": "<감지된 CTA 버튼 중 대표 1개 - 없으면 '(CTA 없음)'>",
    "heroHeadline": "<개선된 메인 헤드라인 예시>",
    "subHeadline": "<서브 카피>",
    "ctaText": "<개선된 CTA 6~12자>",
    "competitorCopyInsight": "<경쟁사들이 강조하는 메시지 vs 우리의 차이 한 줄. 경쟁사 데이터 없으면 빈 문자열>"
  },
  "finalCta": {
    "title": "<진짜마케팅 상담 유도 헤드라인>",
    "description": "<2-3문장>",
    "buttonText": "진짜마케팅 무료 상담 신청"
  }${
    competitorAnalysis
      ? `,
  "competitorAnalysis": {
    "searchKeyword": "${competitorAnalysis.searchKeyword}",
    "keywordSource": "${competitorAnalysis.keywordSource || "ai"}",
    "competitors": [
      ${competitorAnalysis.competitors
        .map(
          (c) => `{
        "rank": ${c.rank},
        "title": ${JSON.stringify(c.title)},
        "link": ${JSON.stringify(c.link)},
        "description": ${JSON.stringify(c.description)},
        "domain": ${JSON.stringify(c.domain)},
        "metaTitle": ${JSON.stringify(c.metaTitle || "")},
        "metaDescription": ${JSON.stringify(c.metaDescription || "")},
        "h1": ${JSON.stringify(c.h1 || "")},
        "ctaTexts": ${JSON.stringify(c.ctaTexts || [])},
        "keyMessage": "<이 경쟁사가 강조하는 메시지 한 줄>",
        "differentiation": "<우리 사이트와 어떻게 다른지 한 줄>"
      }`
        )
        .join(",\n      ")}
    ],
    "overallComparison": "<경쟁사 공통 강조점과 우리가 놓치는 부분 2-3문장>",
    "ourPositioning": "<우리가 취해야 할 차별화 포지셔닝 2-3문장>"
  }`
      : ""
  }
}
`;

export async function analyzeMarketing(
  data: ExtractedWebsiteData,
  competitorAnalysis: CompetitorAnalysisResult | null = null
): Promise<MarketingReport> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT_TEMPLATE(data, competitorAnalysis) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 7000,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("AI 응답을 JSON으로 파싱하지 못했습니다.");
  }

  const result = MarketingReportSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.format());
    return parsed as MarketingReport;
  }

  return result.data;
}
