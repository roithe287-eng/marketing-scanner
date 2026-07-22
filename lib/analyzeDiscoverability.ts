import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { Discoverability, DiscoverabilitySchema } from "./reportSchema";

/**
 * v44: 비판매/정보성 사이트 발견성·GEO 지표 분석
 * - 커머스와 무관하게 항상 실행됨
 * - SEO 기본기, 정보구조, 중복표현, GEO, 구조화데이터,
 *   E-E-A-T, 로컬·브랜드, AI 답변 대응력 8개 축 진단
 * - 병렬 호출용, 실패 시 null 반환 (기존 리포트 흐름 방해 X)
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const AI_TIMEOUT_MS = 40000;

const SYSTEM_PROMPT = `너는 SEO/GEO 전문가다. 웹사이트를 다음 관점에서 진단한다:
1) 네이버·구글 검색 노출력 (SEO)
2) ChatGPT·Claude·Gemini·Perplexity 등 생성형 AI 인용 대응력 (GEO)
3) 정보성/브랜드/서비스형 사이트 관점 (커머스 아님)

원칙: 실제 데이터 인용 · 추측 금지 · 점수 차등 평가 · 한국어 직설.
중요: 오직 JSON 객체만 응답. 마크다운 금지. { 로 시작 } 로 끝.`;

function compressText(text: string, maxLen: number): string {
  if (!text) return "";
  const compressed = text
    .replace(/\s+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  return compressed.slice(0, maxLen);
}

function buildUserPrompt(data: ExtractedWebsiteData): string {
  const bodyPreview = compressText(data.bodyText || "", 3500);
  const jsonLdSummary =
    data.schemaTypes && data.schemaTypes.length > 0
      ? data.schemaTypes.join(", ")
      : "(JSON-LD 없음)";

  return `[사이트 정보]
URL: ${data.finalUrl || data.url}
타이틀: ${data.title || "(없음)"}
메타설명: ${data.description || "(없음)"}
og:title: ${data.ogTitle || "(없음)"}
og:description: ${data.ogDescription || "(없음)"}
og:site_name: ${data.ogSiteName || "(없음)"}
키워드 메타: ${data.keywords || "(없음)"}
H1: ${(data.h1 || []).slice(0, 5).join(" | ") || "(없음)"}
H2: ${(data.h2 || []).slice(0, 10).join(" | ") || "(없음)"}
H3: ${(data.h3 || []).slice(0, 10).join(" | ") || "(없음)"}
JSON-LD 스키마 타입: ${jsonLdSummary}
연락처 정보 존재: ${data.hasContactInfo ? "있음" : "없음"}
파비콘: ${data.hasFavicon ? "있음" : "없음"}
viewport meta: ${data.viewportMeta || "(없음)"}

[본문 발췌 (앞 3500자)]
${bodyPreview || "(본문 추출 실패)"}

[진단 지시]
아래 8개 축을 0~100 점수로 평가하고 JSON으로만 응답하라.

1) seoFoundation: 타이틀·메타·H1·canonical 등 SEO 기본기
2) contentStructure: 헤딩 계층·목차·페이지 목적 명료성
3) redundancy: 반복 키워드·중복 문장·boilerplate 비율 (낮을수록 감점)
4) geo: 생성형 AI 인용 대응력 (정의문·FAQ·팩트·수치)
5) structuredData: JSON-LD 구조화 데이터 유효성·완결성
6) eeat: 저자·회사·연락처·업데이트·전문성 신호
7) localBrand: 브랜드명 명확성·지역 키워드·NAP·상호 일관성
8) aiAnswerability: "OO은 무엇인가", "OO 특징", "OO 어디" 등에 답할 수 있는 문장 존재 여부

각 항목마다:
- id (문자열 고정 사용)
- label (한글, 12자 이내)
- score (0~100, 정수)
- status: pass(80+) / warning(50~79) / fail(0~49)
- currentValue: 현재 상태를 20자 이내로 압축 (숫자·팩트 위주)
- diagnosis: 왜 그 점수인지 1문장 (실제 데이터 근거)
- guide: 어떻게 개선할지 1문장 (구체적 실행 가이드)

또한:
- overallScore: 8개 평균 (정수)
- grade: A(90+) B(80+) C(70+) D(60+) F(60미만)
- siteType: commerce / content / brand / service / mixed / unknown 중 감지된 값
- summary: 이 사이트의 발견성·AI 인용 대응력을 1문장 총평 (60자 내외)
- priorityActions: 우선 실행 액션 3개 배열 (각 30자 내외)

응답 예시 구조:
{
  "overallScore": 72,
  "grade": "C",
  "siteType": "brand",
  "summary": "...",
  "seoFoundation": { "id": "seoFoundation", "label": "SEO 기본기", "score": 85, "status": "pass", "currentValue": "...", "diagnosis": "...", "guide": "..." },
  "contentStructure": { "id": "contentStructure", "label": "정보 구조", ... },
  "redundancy": { "id": "redundancy", "label": "중복·과잉 표현", ... },
  "geo": { "id": "geo", "label": "GEO 대응", ... },
  "structuredData": { "id": "structuredData", "label": "구조화 데이터", ... },
  "eeat": { "id": "eeat", "label": "E-E-A-T", ... },
  "localBrand": { "id": "localBrand", "label": "로컬·브랜드", ... },
  "aiAnswerability": { "id": "aiAnswerability", "label": "AI 답변 대응력", ... },
  "priorityActions": ["...", "...", "..."]
}
`;
}

/**
 * Discoverability 분석 실행
 * - 실패해도 null 반환 (기존 흐름 방해 X)
 */
export async function analyzeDiscoverability(
  data: ExtractedWebsiteData
): Promise<Discoverability | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[discoverability] OPENAI_API_KEY 없음 → 스킵");
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);

    const content = resp.choices[0]?.message?.content?.trim() || "";
    if (!content) {
      console.warn("[discoverability] 빈 응답");
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.warn("[discoverability] JSON 파싱 실패:", e);
      return null;
    }

    const result = DiscoverabilitySchema.safeParse(parsed);
    if (!result.success) {
      console.warn(
        "[discoverability] 스키마 검증 실패:",
        result.error.issues.slice(0, 3)
      );
      return null;
    }

    return result.data;
  } catch (error: any) {
    clearTimeout(timer);
    if (error?.name === "AbortError") {
      console.warn("[discoverability] 타임아웃");
    } else {
      console.warn("[discoverability] 에러:", error?.message || error);
    }
    return null;
  }
}
