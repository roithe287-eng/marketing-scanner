import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `너는 15년 차 퍼포먼스 마케터이자 랜딩페이지 전환율 최적화(CRO) 전문가다.
"진짜마케팅"의 시니어 컨설턴트 역할로, 클라이언트의 웹사이트를 마케팅/전환 관점에서 진단한다.

핵심 원칙:
- 단순 디자인 평가가 아니라, "광고 유입 후 전환 가능성" 중심으로 판단한다.
- 일반론("개선이 필요합니다")이 아니라, 실제 사이트의 데이터(타이틀, H1, 버튼 문구 등)를 근거로 인용한다.
- 개선안은 실제 실행 가능한 수준으로 작성한다.
- 예시 카피는 "한국어"로, 진짜마케팅의 직설적이고 명확한 톤으로 작성한다.
- 모든 점수는 0~100점이며, 그 사이트의 실제 상태를 반영해야 한다 (전부 70점대로 채우지 말 것).
- 최종 CTA는 "광고비를 늘리기 전에 랜딩/전환 흐름부터 점검하자"는 진짜마케팅의 메시지로 작성한다.

반드시 JSON 형식으로만 응답한다.`;

const USER_PROMPT_TEMPLATE = (data: ExtractedWebsiteData) => `
아래 웹사이트를 8개 항목으로 진단하라.

[웹사이트 정보]
- URL: ${data.url}
- 최종 URL: ${data.finalUrl}
- title 태그: ${data.title || "(없음)"}
- meta description: ${data.description || "(없음)"}
- og:title: ${data.ogTitle || "(없음)"}
- og:description: ${data.ogDescription || "(없음)"}
- viewport: ${data.viewportMeta || "(없음 - 모바일 최적화 안 됨)"}
- favicon: ${data.hasFavicon ? "있음" : "없음"}

[제목 구조]
- H1 (${data.h1.length}개): ${JSON.stringify(data.h1)}
- H2 (${data.h2.length}개): ${JSON.stringify(data.h2.slice(0, 10))}
- H3 일부: ${JSON.stringify(data.h3.slice(0, 5))}

[버튼/CTA]
- 전체 버튼/링크 텍스트: ${JSON.stringify(data.buttons.slice(0, 30))}
- CTA로 보이는 버튼: ${JSON.stringify(data.ctaButtons)}
- 폼 존재: ${data.hasForm ? "있음" : "없음"}
- 연락처 정보(전화/이메일): ${data.hasContactInfo ? "있음" : "없음"}

[신뢰 요소 키워드 감지]
- 후기/리뷰 관련: ${data.hasReviewKeyword ? "있음" : "없음"}
- 가격/문의 관련: ${data.hasPriceKeyword ? "있음" : "없음"}
- 인증/수상/파트너 관련: ${data.hasTrustKeyword ? "있음" : "없음"}

[이미지/링크]
- 이미지 수: ${data.imageCount}개 (alt 없는 이미지: ${data.imageWithoutAlt}개)
- 내부 링크: ${data.internalLinkCount}개 / 외부 링크: ${data.externalLinkCount}개

[본문 텍스트 (앞부분 8000자)]
${data.bodyText.slice(0, 8000)}

---

위 데이터를 바탕으로 아래 JSON 형식으로만 응답하라.
점수는 0~100점, 항목별로 실제 데이터를 근거로 차등 평가하라.
criticalIssues는 3~5개, quickWins는 3~6개, 로드맵 각 단계는 2~5개로 작성하라.

{
  "url": "${data.url}",
  "overallScore": <0-100 정수, 8개 항목 평균과 근접하되 가중치 반영>,
  "oneLineSummary": "<이 사이트의 마케팅 상태를 한 문장으로 직설적으로 요약. 예: '제품은 명확하지만 CTA와 신뢰 요소가 약해 광고 유입 시 전환 손실이 큰 상태'>",
  "diagnosis": {
    "firstView": <첫 화면 설득력 0-100>,
    "cta": <CTA 명확도 0-100>,
    "copywriting": <카피라이팅 0-100>,
    "trust": <신뢰 요소 0-100>,
    "conversionFlow": <전환 흐름 0-100>,
    "adLanding": <광고 랜딩 적합도 0-100>,
    "mobileUx": <모바일 UX 0-100, viewport 메타 유무 반영>,
    "seo": <SEO 기본 0-100, title/description/H1/alt 반영>
  },
  "criticalIssues": [
    {
      "title": "<문제 한 줄 요약>",
      "problem": "<무엇이 문제인지 구체적으로>",
      "reason": "<왜 문제인지 - 사이트의 실제 데이터를 인용>",
      "recommendation": "<어떻게 고칠지 - 실행 가능한 액션>",
      "priority": "high" | "medium" | "low"
    }
  ],
  "quickWins": ["<오늘 바로 적용 가능한 개선안 한 줄>", ...],
  "priorityRoadmap": {
    "immediately": ["<즉시 개선 항목>", ...],
    "thisWeek": ["<이번 주 개선 항목>", ...],
    "thisMonth": ["<이번 달 개선 항목>", ...]
  },
  "exampleCopy": {
    "heroHeadline": "<이 사이트에 어울리는 강력한 메인 헤드라인 한국어 예시>",
    "subHeadline": "<서브 카피 한 줄>",
    "ctaText": "<CTA 버튼 문구 - 행동 유도형, 6~12자>"
  },
  "finalCta": {
    "title": "<진짜마케팅 상담 유도 헤드라인. 예: '광고비를 늘리기 전에, 전환 흐름부터 점검하세요.'>",
    "description": "<왜 진짜마케팅과 상담해야 하는지 2-3문장>",
    "buttonText": "진짜마케팅 무료 상담 신청"
  }
}
`;

export async function analyzeMarketing(
  data: ExtractedWebsiteData
): Promise<MarketingReport> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT_TEMPLATE(data) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 4000,
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

  // Zod로 검증
  const result = MarketingReportSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.format());
    // 검증 실패해도 부분적으로 사용 가능하도록 best-effort 반환
    return parsed as MarketingReport;
  }

  return result.data;
}
