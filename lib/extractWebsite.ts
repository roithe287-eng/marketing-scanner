import * as cheerio from "cheerio";

export type ExtractedWebsiteData = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  h1: string[];
  h2: string[];
  h3: string[];
  buttons: string[];
  ctaButtons: string[];
  links: string[];
  bodyText: string;
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

export async function extractWebsite(
  url: string
): Promise<ExtractedWebsiteData> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarketingScanner/1.0; +https://prorealmkt.com)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      // 10초 타임아웃
      signal: AbortSignal.timeout(15000),
    });
  } catch (err: any) {
    throw new Error(
      `웹사이트에 접속할 수 없습니다. (URL 또는 네트워크 확인 필요: ${
        err?.message || "unknown"
      })`
    );
  }

  if (!res.ok) {
    throw new Error(`웹사이트 응답 오류: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // 불필요한 노드 제거
  $("script, style, noscript, iframe").remove();

  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() || "";
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || "";
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
  const hostname = new URL(url).hostname;
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

  const scriptCount = $("script").length; // 위에서 제거했지만 원본은 셀 수 있도록
  // 위에서 script 제거했기 때문에 원본 html에서 카운트
  const scriptCountFromHtml = (html.match(/<script/gi) || []).length;

  return {
    url,
    finalUrl: res.url || url,
    title,
    description,
    ogTitle,
    ogDescription,
    h1,
    h2,
    h3,
    buttons,
    ctaButtons,
    links,
    bodyText,
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
  };
}
