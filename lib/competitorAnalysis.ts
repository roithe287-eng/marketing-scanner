import * as cheerio from "cheerio";
import iconv from "iconv-lite";

export type Competitor = {
  rank: number;
  title: string;
  link: string;
  description: string;
  domain: string;
  metaTitle?: string;
  metaDescription?: string;
  h1?: string;
  ctaTexts?: string[];
  fetchError?: string;
};

export type CompetitorAnalysisResult = {
  searchKeyword: string;
  keywordSource: "ai" | "fallback";
  competitors: Competitor[];
  ourSite: {
    domain: string;
    title: string;
    metaDescription: string;
    h1: string;
  };
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

async function searchNaverWeb(query: string, display = 10) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER 환경변수 미설정");
  }

  const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(
    query
  )}&display=${display}`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`네이버 API HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.items as Array<{
    title: string;
    link: string;
    description: string;
  }>;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function pickCompetitors(
  items: Array<{ title: string; link: string; description: string }>,
  ourDomain: string,
  limit: number
): Competitor[] {
  const seen = new Set<string>();
  const result: Competitor[] = [];

  for (const item of items) {
    let domain = "";
    try {
      domain = new URL(item.link).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }

    if (domain === ourDomain || domain.endsWith(`.${ourDomain}`)) continue;
    if (ourDomain.endsWith(`.${domain}`)) continue;
    if (seen.has(domain)) continue;

    if (
      domain.includes("naver.com") ||
      domain.includes("search.daum.net") ||
      domain.includes("google.com") ||
      domain.includes("blog.naver") ||
      domain.includes("cafe.naver") ||
      domain.includes("namu.wiki") ||
      domain === "wikipedia.org" ||
      domain.endsWith(".wikipedia.org")
    ) {
      continue;
    }

    seen.add(domain);
    result.push({
      rank: result.length + 1,
      title: stripHtml(item.title),
      link: item.link,
      description: stripHtml(item.description),
      domain,
    });

    if (result.length >= limit) break;
  }

  return result;
}

// 타임아웃 단축 (8s → 4s), 인코딩 처리는 유지
async function fetchCompetitorMeta(competitor: Competitor): Promise<void> {
  try {
    const res = await fetch(competitor.link, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      competitor.fetchError = `HTTP ${res.status}`;
      return;
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let charset = "utf-8";
    const ct = res.headers.get("content-type") || "";
    const ctMatch = ct.match(/charset=([^;]+)/i);
    if (ctMatch) {
      charset = ctMatch[1].trim().toLowerCase().replace(/['"]/g, "");
    } else {
      const head = new TextDecoder("latin1").decode(bytes.slice(0, 2048));
      const m =
        head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)["']?/i) ||
        head.match(
          /<meta[^>]+content\s*=\s*["'][^"']*charset=([\w-]+)[^"']*["']/i
        );
      if (m) charset = m[1].trim().toLowerCase();
    }
    if (charset === "ks_c_5601-1987" || charset === "ksc5601")
      charset = "cp949";
    if (charset === "euckr") charset = "euc-kr";

    let html: string;
    try {
      if (iconv.encodingExists(charset)) {
        html = iconv.decode(Buffer.from(bytes), charset);
      } else {
        html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      }
    } catch {
      html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }

    const $ = cheerio.load(html);
    $("script, style, noscript").remove();

    competitor.metaTitle = $("title").first().text().trim().slice(0, 150);
    competitor.metaDescription =
      $('meta[name="description"]').attr("content")?.trim().slice(0, 250) ||
      $('meta[property="og:description"]')
        .attr("content")
        ?.trim()
        .slice(0, 250) ||
      "";
    competitor.h1 = $("h1")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150);

    const ctaKeywords = [
      "문의",
      "상담",
      "신청",
      "구매",
      "주문",
      "예약",
      "다운로드",
      "가입",
      "체험",
      "견적",
    ];
    const buttons = $("button, a, [role='button']")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((t) => t.length > 0 && t.length < 30)
      .filter((t) => ctaKeywords.some((k) => t.includes(k)));
    competitor.ctaTexts = Array.from(new Set(buttons)).slice(0, 5);
  } catch (err: any) {
    competitor.fetchError = err?.message || "fetch failed";
  }
}

/**
 * 폴백 키워드 추출 (AI 호출 없이 빠르게)
 * - meta keywords 우선
 * - title/og:title 폴백
 * - 회사명 패턴 자동 제거
 */
function extractKeyword(siteData: {
  title?: string;
  ogTitle?: string;
  keywords?: string;
  h1?: string[];
}): string {
  // 1순위: meta keywords의 첫 1~2개 단어
  if (siteData.keywords) {
    const firstKeyword = siteData.keywords.split(",")[0]?.trim();
    if (firstKeyword && firstKeyword.length >= 2 && firstKeyword.length <= 30) {
      return firstKeyword;
    }
  }

  // 2순위: h1, og:title, title 중 의미 있는 것
  const candidates = [siteData.h1?.[0], siteData.ogTitle, siteData.title]
    .filter((s): s is string => !!s && s.length > 0);

  if (candidates.length === 0) return "";

  let keyword = candidates[0];
  // "회사명 | 부제" → "부제" 우선 시도, 없으면 회사명
  const parts = keyword.split(/[|\-–—·:]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    // "공식 사이트", "official" 같은 일반 단어 제외하고 가장 의미있는 거 선택
    const filtered = parts.filter(
      (p) => !/공식|사이트|홈페이지|official|site|home/i.test(p)
    );
    keyword = filtered[0] || parts[0];
  }

  const words = keyword.split(/\s+/).filter(Boolean);
  if (words.length > 4) {
    keyword = words.slice(0, 3).join(" ");
  }

  return keyword.slice(0, 30);
}

export async function analyzeCompetitors(siteData: {
  url: string;
  title: string;
  ogTitle: string;
  ogDescription?: string;
  description: string;
  h1: string[];
  h2?: string[];
  keywords: string;
}): Promise<CompetitorAnalysisResult | null> {
  try {
    // 키워드 추출 (AI 호출 없이 폴백만 - 빠름)
    const keyword = extractKeyword({
      title: siteData.title,
      ogTitle: siteData.ogTitle,
      keywords: siteData.keywords,
      h1: siteData.h1,
    });

    if (!keyword || keyword.length < 2) {
      console.warn("[경쟁사] 키워드 추출 실패");
      return null;
    }

    console.log(`[경쟁사] 키워드: "${keyword}"`);

    let ourDomain = "";
    try {
      ourDomain = new URL(siteData.url).hostname.replace(/^www\./, "");
    } catch {}

    // 네이버 검색
    const items = await searchNaverWeb(keyword, 10);
    const competitors = pickCompetitors(items, ourDomain, 3);

    if (competitors.length === 0) {
      console.warn("[경쟁사] 결과 없음");
      return null;
    }

    // 메타 정보 병렬 수집 (4초 타임아웃, 실패해도 계속)
    await Promise.all(competitors.map((c) => fetchCompetitorMeta(c)));

    return {
      searchKeyword: keyword,
      keywordSource: "fallback",
      competitors,
      ourSite: {
        domain: ourDomain,
        title: siteData.title,
        metaDescription: siteData.description,
        h1: siteData.h1[0] || "",
      },
    };
  } catch (err: any) {
    console.error("[경쟁사] 실패:", err?.message);
    return null;
  }
}
