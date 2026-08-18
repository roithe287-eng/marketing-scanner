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
  ogImage: string;
  ogSiteName: string;
  faviconUrl: string;
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
  // v46-W1: 서치어드바이저·플레이스 진단용 필드
  naverSiteVerification: boolean; // <meta name="naver-site-verification">
  rssLink: string; // <link type="application/rss+xml" href>
  hasMapEmbed: boolean; // 지도 임베드 (네이버맵/구글맵/카카오맵 iframe)
  hasNaverPlaceLink: boolean; // 네이버 플레이스 링크 존재
  scriptCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  isJsHeavy: boolean;

  // v26: 네이버 AI 광고 준비도 점검용 필드
  /** JSON-LD schema.org 구조화 데이터 (파싱 성공한 객체 배열) */
  jsonLdSchemas: any[];
  /** schema.org @type 목록 (예: ['Product', 'Organization']) */
  schemaTypes: string[];
  /** schema에 description 필드 존재 여부 */
  schemaHasDescription: boolean;
  /** schema에 name 필드 존재 여부 */
  schemaHasName: boolean;
  /** schema에 price 필드 존재 여부 */
  schemaHasPrice: boolean;
  /** schema에 aggregateRating 필드 존재 여부 */
  schemaHasRating: boolean;
  /** 감지된 전환 추적 스크립트 목록 (네이버 wcs, GTM, GA 등) */
  trackingScripts: string[];
  /** 네이버 전환 스크립트(wcs.js/wcslog) 설치 여부 */
  hasNaverConversionScript: boolean;
  /** GTM 설치 여부 */
  hasGTM: boolean;
  /** Google Analytics 설치 여부 */
  hasGA: boolean;
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

// v45-W5: robots.txt 준수 가드 — 'Disallow: /' (전체 차단) 사이트는 추출 거부
// robots 파싱은 경량 정규식 기반 (완전한 robots 파서 도입 대신 최소 규칙)
async function isBlockedByRobots(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": SCANNER_UA },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false; // robots.txt 없음/오류 → 차단 규칙 없음으로 간주
    const text = (await res.text()).toLowerCase();
    // User-agent: * 아래의 Disallow: / (루트 전체 차단) 탐지
    return /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/m.test(text) ||
           /user-agent:\s*\*[\s\S]*?disallow:\s*\/(\r?\n|$)/.test(text);
  } catch {
    return false; // 확인 실패 시 추출 허용 (서비스 중단 방지)
  }
}

// v45-W5: 식별 가능한 봇 UA — 크롤러 정체성을 명시 (법적 투명성)
// 환경변수 SCANNER_CONTACT_URL 로 연락처 URL 지정 가능 (미설정 시 서비스 URL)
const SCANNER_UA = `JinjjaScanner/1.0 (+${
  process.env.NEXT_PUBLIC_SITE_URL || "https://marketingscanner.com"
})`;

// 실제 Chrome 브라우저처럼 보이는 헤더 (봇 차단 우회)
// v45-W5: User-Agent만 식별 가능한 값으로 교체, 나머지 브라우저 헤더 유지
const BROWSER_HEADERS = {
  "User-Agent": SCANNER_UA,
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
  // v45-W5: robots.txt 전체 차단 사이트는 추출 거부 (법적 준수)
  const blocked = await isBlockedByRobots(url);
  if (blocked) {
    throw new Error(
      "해당 사이트는 robots.txt에서 크롤링을 전면 차단하고 있어 진단할 수 없습니다."
    );
  }

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
  let ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('meta[name="twitter:image"]').attr("content")?.trim() ||
    "";
  const ogSiteName =
    $('meta[property="og:site_name"]').attr("content")?.trim() || "";
  let faviconUrl =
    $('link[rel="icon"]').attr("href")?.trim() ||
    $('link[rel="shortcut icon"]').attr("href")?.trim() ||
    $('link[rel="apple-touch-icon"]').attr("href")?.trim() ||
    "";

  // 상대경로 → 절대경로 변환 (url 매개변수 사용)
  try {
    const base = new URL(url);
    if (ogImage && !ogImage.startsWith("http")) {
      ogImage = new URL(ogImage, base).toString();
    }
    if (faviconUrl && !faviconUrl.startsWith("http")) {
      faviconUrl = new URL(faviconUrl, base).toString();
    } else if (!faviconUrl) {
      faviconUrl = new URL("/favicon.ico", base).toString();
    }
  } catch {
    // 이그노어
  }
  const keywords =
    $('meta[name="keywords"]').attr("content")?.trim() || "";

  // ===== v26: 네이버 AI 광고 준비도 점검용 데이터 추출 =====

  // 1. JSON-LD schema.org 파싱
  const jsonLdSchemas: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      // 배열이면 그대로, 단일 객체면 하나씩 추가
      if (Array.isArray(parsed)) {
        for (const item of parsed) jsonLdSchemas.push(item);
      } else if (parsed && typeof parsed === "object") {
        // @graph 필드 처리
        if (Array.isArray(parsed["@graph"])) {
          for (const item of parsed["@graph"]) jsonLdSchemas.push(item);
        } else {
          jsonLdSchemas.push(parsed);
        }
      }
    } catch {
      // JSON 파싱 실패 시 조용히 무시
    }
  });

  // 2. @type 목록 추출
  const schemaTypes: string[] = [];
  let schemaHasDescription = false;
  let schemaHasName = false;
  let schemaHasPrice = false;
  let schemaHasRating = false;

  function inspectSchemaObject(obj: any) {
    if (!obj || typeof obj !== "object") return;
    const t = obj["@type"];
    if (typeof t === "string") schemaTypes.push(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") schemaTypes.push(x);
    if (typeof obj.name === "string" && obj.name.trim().length > 0) schemaHasName = true;
    if (typeof obj.description === "string" && obj.description.trim().length > 0)
      schemaHasDescription = true;
    // price 확인: 직접 price 또는 offers.price
    if (obj.price !== undefined && obj.price !== null && String(obj.price).length > 0)
      schemaHasPrice = true;
    if (obj.offers) {
      const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
      for (const o of offers) {
        if (o && (o.price !== undefined && o.price !== null && String(o.price).length > 0))
          schemaHasPrice = true;
      }
    }
    if (obj.aggregateRating) schemaHasRating = true;
  }
  for (const s of jsonLdSchemas) inspectSchemaObject(s);

  // 3. 전환 추적 스크립트 감지 (HTML 전체 문자열에서)
  const lowerHtml = html.toLowerCase();
  const hasNaverConversionScript =
    lowerHtml.includes("wcs.js") ||
    lowerHtml.includes("wcs_do") ||
    lowerHtml.includes("wcslog") ||
    lowerHtml.includes("siteanalytics.naver");
  const hasGTM =
    lowerHtml.includes("googletagmanager.com/gtm.js") ||
    /gtm-[a-z0-9]+/i.test(html);
  const hasGA =
    lowerHtml.includes("google-analytics.com") ||
    lowerHtml.includes("gtag(") ||
    /ga-[a-z0-9-]+/i.test(html) ||
    /g-[a-z0-9]{8,}/i.test(html);

  const trackingScripts: string[] = [];
  if (hasNaverConversionScript) trackingScripts.push("네이버 전환스크립트(wcs)");
  if (hasGTM) trackingScripts.push("Google Tag Manager");
  if (hasGA) trackingScripts.push("Google Analytics");
  if (lowerHtml.includes("connect.facebook.net") || lowerHtml.includes("fbq("))
    trackingScripts.push("Meta Pixel");
  if (lowerHtml.includes("kakaopixel") || lowerHtml.includes("kakao.com/k_track"))
    trackingScripts.push("카카오 픽셀");

  // ===== v26 끝 =====

  const viewportMeta =
    $('meta[name="viewport"]').attr("content")?.trim() || "";
  const hasFavicon =
    $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;

  // v46-W1: 네이버 서치어드바이저 소유 확인 메타태그
  const naverSiteVerification =
    $('meta[name="naver-site-verification"]').length > 0;

  // v46-W1: RSS 피드 링크
  const rssLink =
    $('link[type="application/rss+xml"]').attr("href")?.trim() || "";

  // v46-W1: 지도 임베드 감지 (iframe src 기준)
  let hasMapEmbed = false;
  $("iframe").each((_, el) => {
    const src = ($(el).attr("src") || "").toLowerCase();
    if (
      src.includes("map.naver.com") ||
      src.includes("maps.google") ||
      src.includes("google.com/maps") ||
      src.includes("map.kakao.com")
    ) {
      hasMapEmbed = true;
    }
  });

  // v46-W1: 네이버 플레이스 링크 감지
  let hasNaverPlaceLink = false;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").toLowerCase();
    if (
      href.includes("place.naver.com") ||
      href.includes("map.naver.com") ||
      href.includes("pcmap.place.naver.com")
    ) {
      hasNaverPlaceLink = true;
    }
  });

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
    ogImage,
    ogSiteName,
    faviconUrl,
    keywords,
    // v26: 네이버 AI 광고 준비도 점검용
    jsonLdSchemas,
    schemaTypes,
    schemaHasDescription,
    schemaHasName,
    schemaHasPrice,
    schemaHasRating,
    trackingScripts,
    hasNaverConversionScript,
    hasGTM,
    hasGA,
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
    naverSiteVerification,
    rssLink,
    hasMapEmbed,
    hasNaverPlaceLink,
    scriptCount: scriptCountFromHtml,
    internalLinkCount,
    externalLinkCount,
    isJsHeavy,
  };
}
