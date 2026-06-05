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
- 단순 디자인 평가가 아니라, "광고 유입 후 전환 가능성" 중심으로 판단한다.
- 일반론("개선이 필요합니다")이 아니라, 실제 사이트의 데이터를 근거로 인용한다.
- 개선안은 실제 실행 가능한 수준으로 작성한다.
- 예시 카피는 "한국어"로, 진짜마케팅의 직설적이고 명확한 톤으로 작성한다.
- 모든 점수는 0~100점이며, 그 사이트의 실제 상태를 반영해야 한다 (전부 70점대로 채우지 말 것).
- 최종 CTA는 "광고비를 늘리기 전에 랜딩/전환 흐름부터 점검하자"는 진짜마케팅의 메시지로 작성한다.

매우 중요:
- 사이트의 제품/서비스가 무엇인지를 추측할 때, title, og:title, og:description, keywords, h1, h2, 이미지 alt 텍스트를 종합해서 판단하라.
- 절대로 키워드 한두 개로 추측하지 말 것.
- 경쟁사 데이터가 제공되면, 우리 사이트와의 "메시지 차이"를 구체적으로 비교하라.

반드시 JSON 형식으로만 응답한다.`;

function buildCompetitorPromptSection(
  competitorAnalysis: CompetitorAnalysisResult | null
): string {
  if (!competitorAnalysis || competitorAnalysis.competitors.length === 0) {
    return "";
  }

  const compSection = competitorAnalysis.competitors
    .map(
      (c) => `
[경쟁사 ${c.rank}: ${c.domain}]
- 검색결과 제목: ${c.title}
- 검색결과 설명: ${c.description}
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

[우리 사이트]
- 도메인: ${competitorAnalysis.ourSite.domain}
- title: ${competitorAnalysis.ourSite.title}
- meta description: ${competitorAnalysis.ourSite.metaDescription}
- H1: ${competitorAnalysis.ourSite.h1}
`;
}

const USER_PROMPT_TEMPLATE = (
  data: ExtractedWebsiteData,
  competitorAnalysis: CompetitorAnalysisResult | null
) => `
아래 웹사이트를 8개 항목으로 진단하라.

[웹사이트 기본 정보]
- URL: ${data.url}
- 감지된 인코딩: ${data.detectedEncoding}
- title 태그: ${data.title || "(없음)"}
- meta description: ${data.description || "(없음)"}
- meta keywords: ${data.keywords || "(없음)"}
- og:title: ${data.ogTitle || "(없음)"}
- og:description: ${data.ogDescription || "(없음)"}
- viewport: ${data.viewportMeta || "(없음 - 모바일 최적화 안 됨)"}
- favicon: ${data.hasFavicon ? "있음" : "없음"}

[제목 구조]
- H1 (${data.h1.length}개): ${JSON.stringify(data.h1)}
- H2 (${data.h2.length}개): ${JSON.stringify(data.h2.slice(0, 15))}
- H3 일부: ${JSON.stringify(data.h3.slice(0, 8))}

[버튼/CTA]
- 전체 버튼/링크 텍스트: ${JSON.stringify(data.buttons.slice(0, 40))}
- CTA로 보이는 버튼: ${JSON.stringify(data.ctaButtons)}
- 폼 존재: ${data.hasForm ? "있음" : "없음"}
- 연락처 정보(전화/이메일): ${data.hasContactInfo ? "있음" : "없음"}

[이미지 alt 텍스트]
${JSON.stringify(data.imageAlts.slice(0, 20))}

[신뢰 요소 키워드 감지]
- 후기/리뷰: ${data.hasReviewKeyword ? "있음" : "없음"}
- 가격/문의: ${data.hasPriceKeyword ? "있음" : "없음"}
- 인증/수상/파트너: ${data.hasTrustKeyword ? "있음" : "없음"}

[페이지 구조]
- 이미지 수: ${data.imageCount}개 (alt 없는 이미지: ${data.imageWithoutAlt}개)
- 내부 링크: ${data.internalLinkCount}개 / 외부 링크: ${data.externalLinkCount}개
- script 태그 수: ${data.scriptCount}개
- JS-heavy 사이트 추정: ${data.isJsHeavy ? "예 (콘텐츠 추출 제한적)" : "아니오"}

[본문 텍스트 (앞부분 6000자)]
${data.bodyText.slice(0, 6000)}

${buildCompetitorPromptSection(competitorAnalysis)}

---

위 데이터를 바탕으로 아래 JSON 형식으로만 응답하라.

⚠️ 중요한 진단 원칙:
1. 제품/서비스 식별: title + og:* + h1 + h2 + 이미지 alt + 본문을 종합 판단.
2. 본문 텍스트가 200자 미만이거나 isJsHeavy가 true면, "JavaScript 렌더링으로 콘텐츠 추출 제한적"이라고 명시.
3. 점수는 0~100점, 차등 평가하라.
4. criticalIssues는 3~5개, quickWins는 3~6개.
5. 경쟁사 데이터가 있으면 competitorAnalysis 필드를 반드시 채워라. 각 경쟁사의 keyMessage(강조 메시지)와 differentiation(우리와의 차이)를 구체적으로 작성하라.

{
  "url": "${data.url}",
  "overallScore": <0-100>,
  "oneLineSummary": "<직설적 한 줄 요약>",
  "diagnosis": {
    "firstView": <0-100>, "cta": <0-100>, "copywriting": <0-100>,
    "trust": <0-100>, "conversionFlow": <0-100>, "adLanding": <0-100>,
    "mobileUx": <0-100>, "seo": <0-100>
  },
  "criticalIssues": [
    { "title": "", "problem": "", "reason": "", "recommendation": "", "priority": "high|medium|low" }
  ],
  "quickWins": [""],
  "priorityRoadmap": {
    "immediately": [""], "thisWeek": [""], "thisMonth": [""]
  },
  "exampleCopy": {
    "heroHeadline": "<강력한 메인 헤드라인>",
    "subHeadline": "<서브 카피>",
    "ctaText": "<행동 유도형 CTA, 6~12자>"
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
    "competitors": [
      ${competitorAnalysis.competitors
        .map(
          (c) => `{
        "rank": ${c.rank},
        "title": "${c.title.replace(/"/g, '\\"')}",
        "link": "${c.link}",
        "description": "${c.description.replace(/"/g, '\\"')}",
        "domain": "${c.domain}",
        "metaTitle": "${(c.metaTitle || "").replace(/"/g, '\\"')}",
        "metaDescription": "${(c.metaDescription || "").replace(/"/g, '\\"')}",
        "h1": "${(c.h1 || "").replace(/"/g, '\\"')}",
        "ctaTexts": ${JSON.stringify(c.ctaTexts || [])},
        "keyMessage": "<이 경쟁사가 가장 강조하는 마케팅 메시지 한 줄>",
        "differentiation": "<우리 사이트와 비교했을 때 어떻게 다른지 구체적으로>"
      }`
        )
        .join(",\n      ")}
    ],
    "overallComparison": "<경쟁사들이 공통적으로 강조하는 포인트와 우리가 놓치고 있는 부분을 2-3문장으로>",
    "ourPositioning": "<이 경쟁 환경에서 우리가 취해야 할 차별화 포지셔닝 제안 2-3문장>"
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
    max_tokens: 5000,
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
