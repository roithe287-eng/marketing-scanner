import * as cheerio from "cheerio";
import iconv from "iconv-lite";

export type Competitor = {
  rank: number;
  title: string;
  link: string;
  description: string;
  domain: string;
  // 실제 사이트에서 추가로 수집한 정보
  metaTitle?: string;
  metaDescription?: string;
  h1?: string;
  ctaTexts?: string[];
  fetchError?: string;
};

export type CompetitorAnalysisResult = {
  searchKeyword: string;
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
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
};

/**
 * 네이버 검색 API로 웹사이트 검색
 * https://developers.naver.com/docs/serviceapi/search/webkr/webkr.md
 */
async function searchNaverWeb(query: string, display = 10) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다."
    );
  }

  const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(
    query
  )}&display=${display}`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `네이버 검색 API 오류: HTTP ${res.status} ${errText.slice(0, 200)}`
    );
  }

  const data = await res.json();
  return data.items as Array<{
    title: string;
    link: string;
    description: string;
  }>;
}

/**
 * HTML 태그 제거 + 엔티티 디코딩
 */
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

/**
 * 검색 결과를 받아서 우리 사이트와 동일 도메인을 제외하고
 * 상위 N개 경쟁사를 선별
 */
function pickCompetitors(
  items: Array<{ title: string; link: string; description: string }>,
  ourDomain: string,
  limit: number
): Competitor[] {
  const seen = new Set<string>();
  const result: Competitor[] = [];
  let rank = 0;

  for (const item of items) {
    rank++;
    let domain = "";
    try {
      domain = new URL(item.link).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }

    // 우리 사이트 제외
    if (domain === ourDomain || domain.endsWith(`.${ourDomain}`)) continue;
    if (ourDomain.endsWith(`.${domain}`)) continue;

    // 중복 도메인 제외 (블로그/카페 등 동일 도메인 내 여러 글 중복 방지)
    if (seen.has(domain)) continue;

    // 네이버 자체 검색결과 페이지 제외
    if (
      domain.includes("naver.com") ||
      domain.includes("search.daum.net") ||
      domain.includes("google.com")
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

/**
 * 경쟁사 사이트의 메타 정보를 가볍게 가져옴
 * (인코딩 자동 감지 포함, 본문은 받지 않음 - 비용 절약)
 */
async function fetchCompetitorMeta(competitor: Competitor): Promise<void> {
  try {
    const res = await fetch(competitor.link, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      competitor.fetchError = `HTTP ${res.status}`;
      return;
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 인코딩 감지
    let charset = "utf-8";
    const ct = res.headers.get("content-type") || "";
    const ctMatch = ct.match(/charset=([^;]+)/i);
    if (ctMatch) {
      charset = ctMatch[1].trim().toLowerCase().replace(/['"]/g, "");
    } else {
      const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
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

    competitor.metaTitle = $("title").first().text().trim().slice(0, 200);
    competitor.metaDescription =
      $('meta[name="description"]').attr("content")?.trim().slice(0, 300) ||
      $('meta[property="og:description"]').attr("content")?.trim().slice(0, 300) ||
      "";
    competitor.h1 = $("h1").first().text().replace(/\s+/g, " ").trim().slice(0, 200);

    // CTA 버튼 수집 (상위 5개)
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
 * 사이트의 핵심 키워드를 추출해서 검색 쿼리로 사용
 * 우선순위: og:title > h1 > title (단어 단위로 정제)
 */
function extractSearchKeyword(siteData: {
  title?: string;
  ogTitle?: string;
  h1?: string[];
  description?: string;
}): string {
  // 핵심 텍스트 후보 (짧고 의미 있는 것)
  const candidates = [
    siteData.ogTitle,
    siteData.h1?.[0],
    siteData.title,
  ].filter((s): s is string => !!s && s.length > 0);

  if (candidates.length === 0) {
    return siteData.description?.slice(0, 30) || "";
  }

  let keyword = candidates[0];

  // 사이트명/회사명 패턴 제거 (예: "회사명 | 부제목" → "부제목")
  keyword = keyword.split(/[|\-–—]/)[0].trim();

  // 너무 길면 첫 두 단어만
  const words = keyword.split(/\s+/).filter(Boolean);
  if (words.length > 5) {
    keyword = words.slice(0, 4).join(" ");
  }

  // 30자 제한
  return keyword.slice(0, 30);
}

/**
 * 메인 함수: 경쟁사 분석 수행
 */
export async function analyzeCompetitors(siteData: {
  url: string;
  title: string;
  ogTitle: string;
  description: string;
  h1: string[];
  keywords: string;
}): Promise<CompetitorAnalysisResult | null> {
  try {
    // 1. 검색 키워드 결정
    const keyword = extractSearchKeyword(siteData);
    if (!keyword || keyword.length < 2) {
      console.warn("검색 키워드를 추출할 수 없음");
      return null;
    }

    // 2. 우리 도메인 추출
    let ourDomain = "";
    try {
      ourDomain = new URL(siteData.url).hostname.replace(/^www\./, "");
    } catch {
      // ignore
    }

    // 3. 네이버 검색 (여유 있게 10개 가져와서 필터링)
    const items = await searchNaverWeb(keyword, 10);
    if (!items || items.length === 0) return null;

    // 4. 경쟁사 3개 선별
    const competitors = pickCompetitors(items, ourDomain, 3);
    if (competitors.length === 0) return null;

    // 5. 각 경쟁사 메타 정보 병렬 수집 (5초 타임아웃)
    await Promise.all(competitors.map((c) => fetchCompetitorMeta(c)));

    return {
      searchKeyword: keyword,
      competitors,
      ourSite: {
        domain: ourDomain,
        title: siteData.title,
        metaDescription: siteData.description,
        h1: siteData.h1[0] || "",
      },
    };
  } catch (err: any) {
    console.error("경쟁사 분석 실패:", err?.message);
    return null;
  }
}
