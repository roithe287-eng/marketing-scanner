import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// v14: 경쟁사 분리. 메인 분석만 빠르게.
// Vercel 60초 한도. AI 호출은 35초 안에 끝나야 안전.
const AI_TIMEOUT_MS = 35000;

const SYSTEM_PROMPT = `너는 15년차 퍼포먼스 마케터이자 CRO 전문가다.
"진짜마케팅"의 시니어 컨설턴트로서 웹사이트를 마케팅/전환 관점에서 진단한다.

원칙:
- 광고 유입 후 전환 가능성 중심으로 판단
- 사이트의 실제 데이터를 직접 인용 (추측 금지)
- 실행 가능한 구체적 개선안 제시
- 카피는 한국어, 진짜마케팅 톤 (직설적·명확)
- 점수 차등 평가 (전부 70점대 X)
- 반드시 JSON만 응답`;

const buildPrompt = (
  data: ExtractedWebsiteData,
  mode: "full" | "compact" | "minimal" = "full"
) => {
  // v14: 더 작게. 7000자 목표.
  const limits = {
    full: { body: 2200, h2: 6, h3: 0, btn: 18, alt: 6 },
    compact: { body: 1300, h2: 4, h3: 0, btn: 12, alt: 4 },
    minimal: { body: 600, h2: 2, h3: 0, btn: 6, alt: 2 },
  };
  const l = limits[mode];

  return `
[웹사이트 정보]
URL: ${data.url}
title: ${(data.title || "(없음)").slice(0, 100)}
description: ${(data.description || "(없음)").slice(0, 160)}
keywords: ${(data.keywords || "(없음)").slice(0, 120)}
og:title: ${(data.ogTitle || "(없음)").slice(0, 100)}
og:description: ${(data.ogDescription || "(없음)").slice(0, 160)}
viewport: ${data.viewportMeta || "(없음)"}
favicon: ${data.hasFavicon ? "있음" : "없음"}

[제목]
H1(${data.h1.length}): ${JSON.stringify(data.h1.slice(0, 3))}
H2(${data.h2.length}): ${JSON.stringify(data.h2.slice(0, l.h2))}

[CTA/버튼]
버튼: ${JSON.stringify(data.buttons.slice(0, l.btn))}
CTA감지: ${JSON.stringify(data.ctaButtons.slice(0, 6))}
폼:${data.hasForm ? "Y" : "N"} 연락처:${data.hasContactInfo ? "Y" : "N"}

[이미지]
총${data.imageCount}개 / alt없음 ${data.imageWithoutAlt}개
alt샘플: ${JSON.stringify(data.imageAlts.slice(0, l.alt))}

[신뢰요소]
후기:${data.hasReviewKeyword ? "Y" : "N"} 가격:${data.hasPriceKeyword ? "Y" : "N"} 인증:${data.hasTrustKeyword ? "Y" : "N"}

[본문 ${l.body}자]
${data.bodyText.slice(0, l.body)}

---
JSON 형식으로만 응답하라. 위 데이터의 실제 값을 인용. 추측 금지. 점수는 차등 평가.

{
  "url": "${data.url}",
  "overallScore": <0-100>,
  "oneLineSummary": "<직설적 한 줄>",
  "diagnosis": { "firstView":<0-100>,"cta":<0-100>,"copywriting":<0-100>,"trust":<0-100>,"conversionFlow":<0-100>,"adLanding":<0-100>,"mobileUx":<0-100>,"seo":<0-100> },
  "checklist": [
    {"id":"title","category":"seo","label":"title 태그","status":"pass|warning|fail","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"meta_description","category":"seo","label":"Meta Description","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"og_tags","category":"seo","label":"Open Graph","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"h1","category":"content","label":"H1 헤드라인","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"image_alt","category":"content","label":"이미지 ALT","status":"...","currentValue":"<N중 M누락>","diagnosis":"...","guide":"..."},
    {"id":"viewport","category":"seo","label":"모바일 viewport","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"cta_clarity","category":"conversion","label":"CTA 명확도","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"cta_repeat","category":"conversion","label":"CTA 반복","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"contact_info","category":"conversion","label":"연락처","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"trust_review","category":"trust","label":"후기/리뷰","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"trust_certification","category":"trust","label":"인증/수상","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},
    {"id":"price_info","category":"conversion","label":"가격/견적","status":"...","currentValue":"...","diagnosis":"...","guide":"..."}
  ],
  "criticalIssues": [
    {"title":"...","problem":"...","reason":"...","recommendation":"...","priority":"high|medium|low","badExample":"<현재 실제 예>","goodExample":"<개선 예시>","exampleNote":"<한줄>"}
  ],
  "quickWinsDetailed": [
    {"title":"...","steps":["Step 1...","Step 2..."],"beforeExample":"...","afterExample":"..."}
  ],
  "priorityRoadmap": { "immediately":["..."],"thisWeek":["..."],"thisMonth":["..."] },
  "exampleCopy": {
    "currentHeroHeadline":"<실제 h1 또는 title>",
    "currentCtaText":"<감지된 CTA 또는 '(CTA 없음)'>",
    "heroHeadline":"<개선>","subHeadline":"<서브>","ctaText":"<6~12자 CTA>"
  },
  "finalCta": {"title":"<진짜마케팅 상담 유도>","description":"<2-3문장>","buttonText":"진짜마케팅 무료 상담 신청"}
}`;
};

async function callOpenAI(
  prompt: string,
  timeoutMs: number,
  maxTokens: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: maxTokens,
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

export async function analyzeMarketing(
  data: ExtractedWebsiteData
): Promise<MarketingReport> {
  let text: string | null = null;

  // v14: 경쟁사 제외. 3단계 fallback (점점 작아짐)
  const attempts: Array<{
    name: string;
    prompt: string;
    timeout: number;
    maxTokens: number;
  }> = [
    {
      name: "1차 풀분석",
      prompt: buildPrompt(data, "full"),
      timeout: AI_TIMEOUT_MS,
      maxTokens: 2500,
    },
    {
      name: "2차 컴팩트",
      prompt: buildPrompt(data, "compact"),
      timeout: 25000,
      maxTokens: 2200,
    },
    {
      name: "3차 안전모드",
      prompt: buildPrompt(data, "minimal"),
      timeout: 18000,
      maxTokens: 2000,
    },
  ];

  for (const attempt of attempts) {
    try {
      console.log(
        `[AI] ${attempt.name} 시도 (프롬프트 ${attempt.prompt.length}자, max_tokens ${attempt.maxTokens})`
      );
      const t0 = Date.now();
      text = await callOpenAI(attempt.prompt, attempt.timeout, attempt.maxTokens);
      console.log(`[AI] ${attempt.name} 성공 (${Date.now() - t0}ms)`);
      break;
    } catch (err: any) {
      console.warn(`[AI] ${attempt.name} 실패: ${err?.message}`);
      if (err?.message !== "AI_TIMEOUT") {
        // AI timeout이 아닌 다른 에러는 즉시 throw
        throw err;
      }
      // timeout이면 다음 시도
    }
  }

  if (!text) {
    throw new Error("AI 분석을 3차 시도 모두 실패했습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI 응답을 JSON으로 파싱하지 못했습니다.");
  }

  const result = MarketingReportSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.format());
    return parsed as MarketingReport;
  }
  return result.data;
}
