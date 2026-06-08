import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// v15: 극한 다이어트. OpenAI API 자체가 느린 환경(Tier 1) 대응.
// AI 호출 30초 안에 끝나야 안전 (네트워크 + Vercel 오버헤드 감안)
const AI_TIMEOUT_MS = 30000;

const SYSTEM_PROMPT = `너는 15년차 퍼포먼스 마케터다. "진짜마케팅" 시니어 컨설턴트로서 웹사이트를 마케팅/전환 관점에서 진단한다.
원칙: 실제 데이터 인용(추측 금지), 점수 차등 평가, 한국어 직설적 톤, JSON만 응답.`;

/**
 * v15: 본문 텍스트 압축
 * - 연속 공백/줄바꿈 1개로
 * - 의미 없는 특수문자 제거
 * - 정보 밀도 ↑, 토큰 ↓
 */
function compressText(text: string, maxLen: number): string {
  if (!text) return "";
  const compressed = text
    .replace(/\s+/g, " ") // 연속 공백 → 1개
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars 제거
    .replace(/[•·▪▫■□◆◇○●★☆※]+/g, " ") // 장식 문자 제거
    .trim();
  return compressed.slice(0, maxLen);
}

const buildPrompt = (
  data: ExtractedWebsiteData,
  mode: "lean" | "minimal" = "lean"
) => {
  // v15: 무조건 작게. lean이 기본.
  const limits = {
    lean: { body: 900, h2: 4, btn: 10, alt: 4 },
    minimal: { body: 400, h2: 2, btn: 5, alt: 2 },
  };
  const l = limits[mode];

  const body = compressText(data.bodyText, l.body);
  const title = compressText(data.title || "(없음)", 80);
  const desc = compressText(data.description || "(없음)", 130);
  const ogTitle = compressText(data.ogTitle || "", 80);
  const ogDesc = compressText(data.ogDescription || "", 130);
  const kw = compressText(data.keywords || "(없음)", 100);

  return `[사이트 정보]
URL: ${data.url}
title: ${title}
desc: ${desc}
og:title: ${ogTitle}
og:desc: ${ogDesc}
keywords: ${kw}
viewport: ${data.viewportMeta ? "Y" : "N"}, favicon: ${data.hasFavicon ? "Y" : "N"}

[제목]
H1(${data.h1.length}): ${JSON.stringify(data.h1.slice(0, 2).map((s) => s.slice(0, 60)))}
H2(${data.h2.length}): ${JSON.stringify(data.h2.slice(0, l.h2).map((s) => s.slice(0, 50)))}

[CTA]
버튼: ${JSON.stringify(data.buttons.slice(0, l.btn).map((s) => s.slice(0, 30)))}
CTA감지: ${JSON.stringify(data.ctaButtons.slice(0, 4).map((s) => s.slice(0, 30)))}
폼:${data.hasForm ? "Y" : "N"} 연락처:${data.hasContactInfo ? "Y" : "N"}

[이미지] 총${data.imageCount}개/alt없음${data.imageWithoutAlt}개
alt: ${JSON.stringify(data.imageAlts.slice(0, l.alt).map((s) => s.slice(0, 25)))}

[신뢰] 후기:${data.hasReviewKeyword ? "Y" : "N"} 가격:${data.hasPriceKeyword ? "Y" : "N"} 인증:${data.hasTrustKeyword ? "Y" : "N"}

[본문]
${body}

---
위 데이터 인용해서 JSON만 응답. 점수 차등. checklist 12개 모두 포함.

{"url":"${data.url}","overallScore":<0-100>,"oneLineSummary":"<직설 한줄>","diagnosis":{"firstView":<0-100>,"cta":<0-100>,"copywriting":<0-100>,"trust":<0-100>,"conversionFlow":<0-100>,"adLanding":<0-100>,"mobileUx":<0-100>,"seo":<0-100>},"checklist":[{"id":"title","category":"seo","label":"title 태그","status":"pass|warning|fail","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"meta_description","category":"seo","label":"Meta Description","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"og_tags","category":"seo","label":"Open Graph","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"h1","category":"content","label":"H1","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"image_alt","category":"content","label":"이미지 ALT","status":"...","currentValue":"<N중 M누락>","diagnosis":"...","guide":"..."},{"id":"viewport","category":"seo","label":"모바일 viewport","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"cta_clarity","category":"conversion","label":"CTA 명확도","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"cta_repeat","category":"conversion","label":"CTA 반복","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"contact_info","category":"conversion","label":"연락처","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"trust_review","category":"trust","label":"후기/리뷰","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"trust_certification","category":"trust","label":"인증","status":"...","currentValue":"...","diagnosis":"...","guide":"..."},{"id":"price_info","category":"conversion","label":"가격/견적","status":"...","currentValue":"...","diagnosis":"...","guide":"..."}],"criticalIssues":[{"title":"...","problem":"...","reason":"...","recommendation":"...","priority":"high|medium|low","badExample":"<실제 예>","goodExample":"<개선 예>","exampleNote":"<한줄>"}],"quickWinsDetailed":[{"title":"...","steps":["Step 1...","Step 2..."],"beforeExample":"...","afterExample":"..."}],"priorityRoadmap":{"immediately":["..."],"thisWeek":["..."],"thisMonth":["..."]},"exampleCopy":{"currentHeroHeadline":"<실제 h1/title>","currentCtaText":"<감지 CTA 또는 '(없음)'>","heroHeadline":"<개선>","subHeadline":"<서브>","ctaText":"<6~12자>"},"finalCta":{"title":"<상담을 권하는 짧고 강력한 헤드라인. '유도' '권유' 단어 금지>","description":"<2-3문장. 사이트 구체 이슈 언급>","buttonText":"진짜마케팅 무료 상담 신청"}}`;
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

  // v15: 2단계만. 둘 다 매우 가벼움. 합쳐서 50초 안에 끝나도록.
  const attempts: Array<{
    name: string;
    prompt: string;
    timeout: number;
    maxTokens: number;
  }> = [
    {
      name: "1차 lean",
      prompt: buildPrompt(data, "lean"),
      timeout: AI_TIMEOUT_MS, // 30초
      maxTokens: 1800,
    },
    {
      name: "2차 minimal",
      prompt: buildPrompt(data, "minimal"),
      timeout: 18000, // 18초
      maxTokens: 1500,
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
    throw new Error(
      "AI 분석이 시간 내에 완료되지 못했습니다. 잠시 후 다시 시도하거나 다른 URL을 시도해주세요."
    );
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
