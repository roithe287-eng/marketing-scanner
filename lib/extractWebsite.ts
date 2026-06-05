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
- 일반론("개선이 필요합니다")이 아니라, 실제 사이트의 데이터(타이틀, H1, 버튼 문구, 이미지 alt 등)를 근거로 인용한다.
- 개선안은 실제 실행 가능한 수준으로 작성한다.
- 예시 카피는 "한국어"로, 진짜마케팅의 직설적이고 명확한 톤으로 작성한다.
- 모든 점수는 0~100점이며, 그 사이트의 실제 상태를 반영해야 한다 (전부 70점대로 채우지 말 것).
- 최종 CTA는 "광고비를 늘리기 전에 랜딩/전환 흐름부터 점검하자"는 진짜마케팅의 메시지로 작성한다.

매우 중요:
- 사이트의 제품/서비스가 무엇인지를 추측할 때, title, og:title, og:description, keywords, h1, h2, 이미지 alt 텍스트를 종합해서 판단하라.
- 절대로 키워드 한두 개로 추측하지 말 것. 예: title에 'TV' 가 들어있다고 해서 'TV 카드' 라고 단정하지 말 것.
- 사이트의 정확한 비즈니스를 파악할 수 없다면, "제품/서비스 식별이 어렵습니다"라고 솔직히 명시하라.

반드시 JSON 형식으로만 응답한다.`;

const USER_PROMPT_TEMPLATE = (data: ExtractedWebsiteData) => `
아래 웹사이트를 8개 항목으로 진단하라.

[웹사이트 기본 정보]
- URL: ${data.url}
- 최종 URL: ${data.finalUrl}
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

[이미지 alt 텍스트 (이미지로 만든 사이트의 콘텐츠 단서)]
${JSON.stringify(data.imageAlts.slice(0, 20))}

[신뢰 요소 키워드 감지]
- 후기/리뷰 관련: ${data.hasReviewKeyword ? "있음" : "없음"}
- 가격/문의 관련: ${data.hasPriceKeyword ? "있음" : "없음"}
- 인증/수상/파트너 관련: ${data.hasTrustKeyword ? "있음" : "없음"}

[페이지 구조]
- 이미지 수: ${data.imageCount}개 (alt 없는 이미지: ${data.imageWithoutAlt}개)
- 내부 링크: ${data.internalLinkCount}개 / 외부 링크: ${data.externalLinkCount}개
- script 태그 수: ${data.scriptCount}개
- JS-heavy 사이트 추정: ${data.isJsHeavy ? "예 (콘텐츠 추출 제한적)" : "아니오"}

[본문 텍스트 (앞부분 8000자)]
${data.bodyText.slice(0, 8000)}

---

위 데이터를 바탕으로 아래 JSON 형식으로만 응답하라.

⚠️ 중요한 진단 원칙:
1. 제품/서비스 식별: title + og:* + h1 + h2 + 이미지 alt + 본문을 종합 판단. 단편적 키워드로 추측하지 말 것.
2. 본문 텍스트가 200자 미만이거나 isJsHeavy가 true면, "JavaScript 렌더링으로 콘텐츠 추출 제한적"이라고 oneLineSummary에 명시.
3. 점수는 0~100점, 항목별로 실제 데이터를 근거로 차등 평가하라.
4. criticalIssues는 3~5개, quickWins는 3~6개, 로드맵 각 단계는 2~5개로 작성하라.

{
  "url": "${data.url}",
  "overallScore": <0-100 정수>,
  "oneLineSummary": "<이 사이트의 마케팅 상태를 한 문장으로 직설적으로 요약>",
  "diagnosis": {
    "firstView": <0-100>,
    "cta": <0-100>,
    "copywriting": <0-100>,
    "trust": <0-100>,
    "conversionFlow": <0-100>,
    "adLanding": <0-100>,
    "mobileUx": <0-100, viewport 메타 유무 반영>,
    "seo": <0-100, title/description/H1/alt 반영>
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
  "quickWins": ["<오늘 바로 적용 가능한 개선안>", ...],
  "priorityRoadmap": {
    "immediately": ["<즉시 개선 항목>", ...],
    "thisWeek": ["<이번 주 개선 항목>", ...],
    "thisMonth": ["<이번 달 개선 항목>", ...]
  },
  "exampleCopy": {
    "heroHeadline": "<이 사이트의 실제 제품/서비스에 맞는 강력한 메인 헤드라인 한국어>",
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

  const result = MarketingReportSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Schema validation failed:", result.error.format());
    return parsed as MarketingReport;
  }

  return result.data;
}

import * as cheerio from "cheerio";
import iconv from "iconv-lite";

export type ExtractedWebsiteData = {
  url: string;
  finalUrl: string;
  detectedEncoding: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
  h1: string[];
  h2: string[];
  h3: string[];
  buttons: string[];
  ctaButtons: string[];
  links: string[];
  bodyText: string;
  imageAlts: string[];
  imageCount: number;
  imageWithoutAlt: number;
  hasForm: boolean;
  hasReviewKeyword: boolean;
  hasPriceKeyword: boolean;
  hasTrustKeyword: boolean;
  hasContactInfo: boolean;
  viewportMeta: string;
  hasFavicon: boolean;
  scriptCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  isJsHeavy: boolean;
};

const CTA_KEYWORDS = [
  "문의",
  "상담",
  "신청",
  "구매",
  "주문",
  "예약",
  "다운로드",
  "시작",
  "가입",
  "등록",
  "체험",
  "견적",
  "buy",
  "order",
  "sign up",
  "signup",
  "get started",
  "contact",
  "consult",
  "demo",
  "free trial",
  "subscribe",
];

// 실제 Chrome 브라우저처럼 보이는 헤더 (봇 차단 우회)
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function tryFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
}

/**
 * Content-Type 헤더 + HTML 안의 meta charset을 보고 인코딩 자동 감지 후
 * iconv-lite로 올바르게 디코딩
 */
function decodeHtml(
  buffer: ArrayBuffer,
  contentTypeHeader: string | null
): { html: string; encoding: string } {
  const bytes = new Uint8Array(buffer);

  // 1) Content-Type 헤더에서 charset 추출
  let charset = "";
  if (contentTypeHeader) {
    const m = contentTypeHeader.match(/charset=([^;]+)/i);
    if (m) charset = m[1].trim().toLowerCase().replace(/['"]/g, "");
  }

  // 2) 헤더에 없으면 HTML 앞부분 (latin1로 임시 디코딩) 안에서 meta charset 찾기
  if (!charset) {
    const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
    let m =
      head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)["']?/i) ||
      head.match(
        /<meta[^>]+content\s*=\s*["'][^"']*charset=([\w-]+)[^"']*["']/i
      );
    if (m) charset = m[1].trim().toLowerCase();
  }

  // 정규화
  if (!charset) charset = "utf-8";
  if (charset === "ks_c_5601-1987" || charset === "ksc5601") charset = "cp949";
  if (charset === "euckr") charset = "euc-kr";

  // 3) iconv-lite로 디코딩 (지원 안 하는 경우 utf-8로 폴백)
  let html: string;
  try {
    if (iconv.encodingExists(charset)) {
      html = iconv.decode(Buffer.from(bytes), charset);
    } else {
      html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      charset = "utf-8 (fallback)";
    }
  } catch {
    html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    charset = "utf-8 (fallback)";
  }

  return { html, encoding: charset };
}

export async function extractWebsite(
  url: string
): Promise<ExtractedWebsiteData> {
  let res: Response | null = null;
  let lastError: any = null;

  // 1차: 입력 URL 그대로 시도
  try {
    res = await tryFetch(url);
  } catch (err: any) {
    lastError = err;
  }

  // 2차: www. 추가해서 재시도
  if (!res || !res.ok) {
    try {
      const u = new URL(url);
      if (!u.hostname.startsWith("www.")) {
        const wwwUrl = `${u.protocol}//www.${u.hostname}${u.pathname}${u.search}`;
        res = await tryFetch(wwwUrl);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 3차: http로 다운그레이드 시도
  if (!res || !res.ok) {
    try {
      if (url.startsWith("https://")) {
        const httpUrl = url.replace("https://", "http://");
        res = await tryFetch(httpUrl);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!res) {
    throw new Error(
      `웹사이트에 접속할 수 없습니다. 사이트가 봇 접근을 차단하고 있거나 일시적으로 응답이 없습니다. (에러: ${
        lastError?.message || "unknown"
      })`
    );
  }

  if (!res.ok) {
    throw new Error(
      `웹사이트 응답 오류: HTTP ${res.status}. 사이트가 외부 접근을 차단하고 있을 수 있습니다.`
    );
  }

  // 인코딩 자동 감지하여 디코딩 (EUC-KR/CP949/UTF-8 지원)
  const buffer = await res.arrayBuffer();
  const contentTypeHeader = res.headers.get("content-type");
  const { html, encoding: detectedEncoding } = decodeHtml(
    buffer,
    contentTypeHeader
  );

  if (!html || html.length < 100) {
    throw new Error(
      "사이트가 빈 페이지를 반환했습니다. JavaScript로만 렌더링되는 SPA 사이트일 가능성이 높습니다."
    );
  }

  const $ = cheerio.load(html);

  // 불필요한 노드 제거
  $("script, style, noscript, iframe").remove();

  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() || "";
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || "";
  const keywords =
    $('meta[name="keywords"]').attr("content")?.trim() || "";
  const viewportMeta =
    $('meta[name="viewport"]').attr("content")?.trim() || "";
  const hasFavicon =
    $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;

  const h1 = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 10);

  const h2 = $("h2")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 20);

  const h3 = $("h3")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean)
    .slice(0, 20);

  const buttons = $("button, a, [role='button'], input[type='submit']")
    .map((_, el) => {
      const $el = $(el);
      const text =
        $el.text().replace(/\s+/g, " ").trim() ||
        $el.attr("value")?.trim() ||
        $el.attr("aria-label")?.trim() ||
        "";
      return text;
    })
    .get()
    .filter((text) => text.length > 0 && text.length < 40)
    .slice(0, 80);

  const ctaButtons = buttons.filter((b) => {
    const lower = b.toLowerCase();
    return CTA_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
  });

  // 링크 분류
  const allLinks = $("a")
    .map((_, el) => $(el).attr("href") || "")
    .get()
    .filter(Boolean);

  let internalLinkCount = 0;
  let externalLinkCount = 0;
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    // ignore
  }
  for (const link of allLinks) {
    try {
      if (link.startsWith("/") || link.startsWith("#")) {
        internalLinkCount++;
      } else if (link.startsWith("http")) {
        const linkHost = new URL(link).hostname;
        if (linkHost === hostname) internalLinkCount++;
        else externalLinkCount++;
      }
    } catch {
      // ignore invalid URLs
    }
  }

  const links = allLinks.slice(0, 50);

  // 이미지 alt 텍스트도 수집 (이미지로만 만든 사이트 대응)
  const imageAlts = $("img")
    .map((_, el) => $(el).attr("alt")?.trim() || "")
    .get()
    .filter((alt) => alt.length > 0 && alt.length < 100)
    .slice(0, 30);

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);

  const imageCount = $("img").length;
  const imageWithoutAlt = $("img").filter((_, el) => {
    const alt = $(el).attr("alt");
    return !alt || alt.trim().length === 0;
  }).length;

  const hasForm = $("form, input, textarea, select").length > 0;

  // 봇 차단 / 빈 SPA 감지 - 한글 + 영문 모두 검사
  const scriptCountFromHtml = (html.match(/<script/gi) || []).length;
  const isJsHeavy =
    bodyText.length < 300 && scriptCountFromHtml > 5;

  // 본문 텍스트가 너무 짧으면 SPA로 추정
  if (bodyText.length < 50 && imageAlts.length < 3) {
    throw new Error(
      "사이트에서 충분한 콘텐츠를 추출하지 못했습니다. JavaScript로만 렌더링되는 SPA 사이트(React/Vue/Angular)이거나 봇 접근이 차단되었을 수 있습니다."
    );
  }

  const hasReviewKeyword =
    /후기|리뷰|평점|고객사|사례|testimonial|review|stars?/i.test(bodyText);
  const hasPriceKeyword =
    /가격|비용|요금|견적|상담|문의|price|pricing|quote|cost/i.test(bodyText);
  const hasTrustKeyword =
    /인증|수상|파트너|도입|고객사|미디어|보증|검증|공식|특허|award|certified|trusted|partner/i.test(
      bodyText
    );
  const hasContactInfo =
    /(\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4})|([\w.+-]+@[\w-]+\.[\w.-]+)/.test(
      bodyText
    );

  return {
    url,
    finalUrl: res.url || url,
    detectedEncoding,
    title,
    description,
    ogTitle,
    ogDescription,
    keywords,
    h1,
    h2,
    h3,
    buttons,
    ctaButtons,
    links,
    bodyText,
    imageAlts,
    imageCount,
    imageWithoutAlt,
    hasForm,
    hasReviewKeyword,
    hasPriceKeyword,
    hasTrustKeyword,
    hasContactInfo,
    viewportMeta,
    hasFavicon,
    scriptCount: scriptCountFromHtml,
    internalLinkCount,
    externalLinkCount,
    isJsHeavy,
  };
}
