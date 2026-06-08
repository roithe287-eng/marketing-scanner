import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";
import { CompetitorAnalysisResult } from "./competitorAnalysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// AI 호출별 자체 타임아웃 (Vercel 60초 한도보다 작게)
const AI_TIMEOUT_MS = 35000;
const AI_TIMEOUT_RETRY_MS = 25000;

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
- 검색결과 설명(파워링크): ${c.description}
- 실제 사이트 title: ${c.metaTitle || "(수집실패)"}
- 실제 사이트 meta description: ${c.metaDescription || "(수집실패)"}
- 실제 사이트 H1: ${c.h1 || "(없음)"}
- CTA 버튼: ${JSON.stringify(c.ctaTexts || [])}
${c.fetchError ? `- 수집 오류: ${c.fetchError}` : ""}
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
- meta keywords: ${(data.keywords || "").slice(0, 300)}
- og:title: ${data.ogTitle || "(없음)"}
- og:description: ${data.ogDescription || "(없음)"}
- viewport meta: ${data.viewportMeta || "(없음)"}
- favicon: ${data.hasFavicon ? "있음" : "없음"}

[제목 구조]
- H1 (${data.h1.length}개): ${JSON.stringify(data.h1.slice(0, 5))}
- H2 (${data.h2.length}개): ${JSON.stringify(data.h2.slice(0, 10))}
- H3 일부: ${JSON.stringify(data.h3.slice(0, 5))}

[버튼/CTA]
- 전체 버튼 텍스트: ${JSON.stringify(data.buttons.slice(0, 30))}
- CTA로 보이는 버튼: ${JSON.stringify(data.ctaButtons)}
- 폼 존재: ${data.hasForm ? "있음" : "없음"}
- 연락처 정보: ${data.hasContactInfo ? "있음" : "없음"}

[이미지]
- 이미지 수: ${data.imageCount}개
- alt 없는 이미지: ${data.imageWithoutAlt}개
- 이미지 alt 텍스트 일부: ${JSON.stringify(data.imageAlts.slice(0, 12))}

[신뢰 요소 키워드 감지]
- 후기/리뷰: ${data.hasReviewKeyword ? "있음" : "없음"}
- 가격/문의: ${data.hasPriceKeyword ? "있음" : "없음"}
- 인증/수상/파트너: ${data.hasTrustKeyword ? "있음" : "없음"}

[본문 텍스트 (앞부분 4500자)]
${data.bodyText.slice(0, 4500)}

${buildCompetitorPromptSection(competitorAnalysis)}

---

위 데이터를 바탕으로 JSON 형식으로만 응답하라.

⚠️ 작성 원칙:
1. 모든 진단은 실제 데이터를 인용. 추측 금지.
2. 점수는 차등 평가 (전부 70점대 X).
3. checklist 12개 항목 모두 작성.
4. criticalIssues 3~5개. badExample/goodExample 반드시 포함.
5. quickWinsDetailed는 4~5개. steps는 2~3개로 짧게.
6. priorityRoadmap은 짧고 간결.
7. exampleCopy에 currentHeroHeadline 반드시 넣고, 경쟁사 데이터 있으면 competitorCopyInsight 작성.

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
    { "id": "title", "category": "seo", "label": "title 태그", "status": "pass|warning|fail", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "meta_description", "category": "seo", "label": "Meta Description", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "og_tags", "category": "seo", "label": "Open Graph 태그", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "h1", "category": "content", "label": "H1 헤드라인", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "image_alt", "category": "content", "label": "이미지 ALT", "status": "...", "currentValue": "<N개 중 M개 누락>", "diagnosis": "...", "guide": "..." },
    { "id": "viewport", "category": "seo", "label": "모바일 viewport", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "cta_clarity", "category": "conversion", "label": "CTA 명확도", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "cta_repeat", "category": "conversion", "label": "CTA 반복 노출", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "contact_info", "category": "conversion", "label": "연락처 정보", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "trust_review", "category": "trust", "label": "후기/리뷰", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "trust_certification", "category": "trust", "label": "인증/수상", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." },
    { "id": "price_info", "category": "conversion", "label": "가격/견적", "status": "...", "currentValue": "...", "diagnosis": "...", "guide": "..." }
  ],
  "criticalIssues": [
    {
      "title": "...", "problem": "...", "reason": "...", "recommendation": "...",
      "priority": "high|medium|low",
      "badExample": "<현재 사이트의 실제 예>",
      "goodExample": "<개선된 예시>",
      "exampleNote": "<한 줄 설명>"
    }
  ],
  "quickWinsDetailed": [
    { "title": "...", "steps": ["Step 1: ...", "Step 2: ..."], "beforeExample": "...", "afterExample": "..." }
  ],
  "priorityRoadmap": {
    "immediately": ["...", "..."],
    "thisWeek": ["...", "..."],
    "thisMonth": ["...", "..."]
  },
  "exampleCopy": {
    "currentHeroHeadline": "<실제 h1 또는 title>",
    "currentCtaText": "<감지된 CTA 또는 '(CTA 없음)'>",
    "heroHeadline": "<개선된 헤드라인>",
    "subHeadline": "<서브 카피>",
    "ctaText": "<개선된 CTA 6~12자>",
    "competitorCopyInsight": "<경쟁사 vs 우리 차이 2-3문장. 경쟁사 없으면 빈 문자열>"
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
        "keyMessage": "<강조 메시지>",
        "differentiation": "<우리와의 차이>"
      }`
        )
        .join(",\n      ")}
    ],
    "overallComparison": "<2-3문장>",
    "ourPositioning": "<2-3문장>"
  }`
      : ""
  }
}
`;

/**
 * AI 호출에 자체 타임아웃 (45초). Vercel 60초 한도 안에 안전하게.
 */
async function callOpenAIWithTimeout(
  prompt: string,
  systemPrompt: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 4500,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("AI 응답이 비어 있습니다.");
    return text;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
      throw new Error("AI_TIMEOUT");
    }
    throw err;
  }
}

// 안전 모드: 입력 과다 시 본문 크게 잘라내서 처리
function createMinimalPrompt(
  data: ExtractedWebsiteData,
  competitor: CompetitorAnalysisResult | null
): string {
  const minimalData = {
    ...data,
    bodyText: data.bodyText.slice(0, 2000),
    h2: data.h2.slice(0, 6),
    h3: data.h3.slice(0, 3),
    buttons: data.buttons.slice(0, 20),
    imageAlts: data.imageAlts.slice(0, 8),
  };
  return USER_PROMPT_TEMPLATE(minimalData, competitor);
}

export async function analyzeMarketing(
  data: ExtractedWebsiteData,
  competitorAnalysis: CompetitorAnalysisResult | null = null
): Promise<MarketingReport> {
  let text: string;

  try {
    // 1차 시도: 경쟁사 데이터 포함 (풀 분석)
    const promptWithCompetitor = USER_PROMPT_TEMPLATE(data, competitorAnalysis);
    console.log(
      `[AI] 1차 호출 (경쟁사 포함, 프롬프트 ${promptWithCompetitor.length}자)`
    );
    text = await callOpenAIWithTimeout(
      promptWithCompetitor,
      SYSTEM_PROMPT,
      AI_TIMEOUT_MS
    );
  } catch (err: any) {
    // 1차 실패 시: 경쟁사 빼고 2차 재시도
    if (err?.message === "AI_TIMEOUT" && competitorAnalysis) {
      console.warn("[AI] 1차 timeout. 경쟁사 빼고 2차 재시도");
      const promptWithoutCompetitor = USER_PROMPT_TEMPLATE(data, null);
      console.log(
        `[AI] 2차 호출 (경쟁사 없이, 프롬프트 ${promptWithoutCompetitor.length}자)`
      );
      try {
        text = await callOpenAIWithTimeout(
          promptWithoutCompetitor,
          SYSTEM_PROMPT,
          AI_TIMEOUT_RETRY_MS
        );
      } catch (err2: any) {
        // 2차도 실패 시: 안전 모드 (데이터 최소화)
        if (err2?.message === "AI_TIMEOUT") {
          console.warn("[AI] 2차도 timeout. 안전 모드로 3차 재시도");
          const minimalPrompt = createMinimalPrompt(data, null);
          console.log(
            `[AI] 3차 호출 (안전 모드, 프롬프트 ${minimalPrompt.length}자)`
          );
          text = await callOpenAIWithTimeout(
            minimalPrompt,
            SYSTEM_PROMPT,
            AI_TIMEOUT_RETRY_MS
          );
        } else {
          throw err2;
        }
      }
    } else if (err?.message === "AI_TIMEOUT") {
      // 경쟁사 없는데도 timeout → 안전 모드
      console.warn("[AI] 1차 timeout. 안전 모드로 2차 재시도");
      const minimalPrompt = createMinimalPrompt(data, null);
      console.log(
        `[AI] 2차 호출 (안전 모드, 프롬프트 ${minimalPrompt.length}자)`
      );
      text = await callOpenAIWithTimeout(
        minimalPrompt,
        SYSTEM_PROMPT,
        AI_TIMEOUT_RETRY_MS
      );
    } else {
      throw err;
    }
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
