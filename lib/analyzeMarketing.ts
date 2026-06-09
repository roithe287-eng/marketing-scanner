import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// v16: 기본값을 gpt-4.1-mini로 변경 (gpt-4o-mini 대비 속도 2배, 비용 비슷)
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// v18: gpt-4.1-mini는 응답이 안정적이넦로 timeout 느슨 늘림
// AI 호출 45초 안에 끝나야 안전 (Vercel 60초 한도 여유)
const AI_TIMEOUT_MS = 45000;

const SYSTEM_PROMPT = `너는 15년차 퍼포먼스 마케터다. "진짜마케팅" 시니어 컨설턴트로서 웹사이트를 마케팅/전환 관점에서 진단한다.
원칙: 실제 데이터 인용(추측 금지), 점수 차등 평가, 한국어 직설적 톤.
중요: 설명문·인사말 없이 오직 JSON 객체만 응답. 마크다운 코드블록 금지. { 로 시작해서 } 로 끝나야 함.`;

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
    const finishReason = response.choices[0]?.finish_reason;
    if (!text) throw new Error("AI 응답이 비어 있습니다.");
    // v16.1: 응답 품질 디버그 로그
    console.log(
      `[AI] 응답 쪽: ${text.length}자, finish_reason: ${finishReason}, 시작: "${text.slice(0, 50).replace(/\n/g, "\\n")}"`
    );
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

  // v18: max_tokens 충분히 늘림 (이전 1800으로 응답 잔림 테스트됨)
  // gpt-4.1-mini는 빠르므로 timeout도 조금 대워도 안전
  const attempts: Array<{
    name: string;
    prompt: string;
    timeout: number;
    maxTokens: number;
  }> = [
    {
      name: "1차 lean",
      prompt: buildPrompt(data, "lean"),
      timeout: 45000, // 45초 (gpt-4.1-mini 응답이 25-35초 걸림)
      maxTokens: 3500,
    },
    {
      name: "2차 minimal",
      prompt: buildPrompt(data, "minimal"),
      timeout: 25000, // 25초
      maxTokens: 3000,
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

  // v16.1: 강력한 JSON 파싱 (gpt-4.1-mini의 다양한 응답 형식 대응)
  const parsed = robustJsonParse(text);
  if (!parsed) {
    console.error("[AI] JSON 파싱 완전 실패. 원본 응답 앞 500자:", text.slice(0, 500));
    throw new Error(
      "AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요."
    );
  }

  const result = MarketingReportSchema.safeParse(parsed);
  let report: MarketingReport;
  if (!result.success) {
    console.warn(
      "[AI] Schema 경고 (그대로 반환):",
      JSON.stringify(result.error.format()).slice(0, 300)
    );
    report = parsed as MarketingReport;
  } else {
    report = result.data;
  }

  // v17: 공유용 meta 정보 자동 채우기
  report.meta = buildShareMeta(data);

  return report;
}

/**
 * v17: 공유 섬네일에 쓰일 meta 정보 추출
 * 업체명: og:site_name > og:title 첫 단어 > 도메인
 */
function buildShareMeta(data: ExtractedWebsiteData): {
  siteName: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  faviconUrl: string;
  domain: string;
} {
  let domain = "";
  try {
    domain = new URL(data.url).hostname.replace(/^www\./, "");
  } catch {
    domain = data.url;
  }

  // 업체명 추출 우선순위
  let siteName = "";
  if ((data as any).ogSiteName) {
    siteName = (data as any).ogSiteName;
  } else if (data.ogTitle) {
    // "업체명 - 설명" 구조에서 앞부분 추출
    siteName = data.ogTitle.split(/[-|:|–|—||｜]/)[0].trim();
  } else if (data.title) {
    siteName = data.title.split(/[-|:|–|—||｜]/)[0].trim();
  }
  if (!siteName || siteName.length < 2) {
    siteName = domain;
  }
  // 너무 길면 잘라냄
  if (siteName.length > 40) {
    siteName = siteName.slice(0, 40) + "…";
  }

  return {
    siteName,
    ogImage: (data as any).ogImage || "",
    ogTitle: data.ogTitle || data.title || "",
    ogDescription: data.ogDescription || data.description || "",
    faviconUrl: (data as any).faviconUrl || "",
    domain,
  };
}

/**
 * v16.1: 강력한 JSON 파서
 * - 마크다운 코드블록 제거 (```json ... ```)
 * - JSON 앞뒤 텍스트 제거
 * - 끝이 잘린 JSON 복구 시도
 * - escape 안 된 줄바꿈/따옴표 수정
 */
function robustJsonParse(raw: string): any | null {
  if (!raw) return null;
  let text = raw.trim();

  // 1차: 바로 파싱 시도
  try {
    return JSON.parse(text);
  } catch {
    // 계속 진행
  }

  // 2차: 마크다운 코드블록 제거
  // ```json\n{...}\n``` 형태 처리
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // 계속
    }
  }

  // 3차: { 으로 시작해서 } 로 끝나는 뎍어리 추출
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // 계속
    }

    // 4차: 잘린 JSON 복구 시도 (끝에 닫는 괄호 몇 개 추가해보기)
    const fixes = [
      "",
      "]",
      "]}",
      "}}]}",
      '"}]}',
      '"}',
      '"}]}',
    ];
    for (const suffix of fixes) {
      try {
        return JSON.parse(candidate + suffix);
      } catch {
        // 계속
      }
    }
  }

  // 5차: BOM / 이상한 제어문자 제거 후 재시도
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  if (cleaned !== text) {
    try {
      return JSON.parse(cleaned);
    } catch {
      // 계속
    }
  }

  return null;
}
