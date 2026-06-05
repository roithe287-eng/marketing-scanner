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
