import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  keywordSource: "ai" | "fallback"; // 어떻게 추출했는지 (디버깅용)
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
  let rank = 0;

  for (const item of items) {
    rank++;
    let domain = "";
    try {
      domain = new URL(item.link).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }

    if (domain === ourDomain || domain.endsWith(`.${ourDomain}`)) continue;
    if (ourDomain.endsWith(`.${domain}`)) continue;
    if (seen.has(domain)) continue;

    // 네이버 자체/구글/다음 검색결과 제외
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
      $('meta[property="og:description"]')
        .attr("content")
        ?.trim()
        .slice(0, 300) ||
      "";
    competitor.h1 = $("h1")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

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
 * AI를 활용한 업종 키워드 추출
 * 사이트의 모든 메타 정보를 종합해서 가장 검색 효율이 좋은 업종/제품 키워드를 뽑아냄.
 *
 * 예시:
 * - "우리웨어 공식 사이트" + keywords "야구잠바,단체복..." → "단체복 과잠바"
 * - "봄카드" + keywords "청첩장,모바일청첩장..." → "모바일청첩장"
 * - "회사이름" + h1 "최고의 밀키트" → "밀키트"
 */
async function extractKeywordWithAI(siteData: {
  title?: string;
  ogTitle?: string;
  ogDescription?: string;
  description?: string;
  keywords?: string;
  h1?: string[];
  h2?: string[];
}): Promise<string | null> {
  try {
    const prompt = `다음 한국 웹사이트 정보를 보고, "네이버 검색"에 사용할 가장 효과적인 업종/제품 키워드를 1개만 추출하라.

규칙:
- 회사명, 브랜드명, 사이트명은 제외하라.
- 그 사이트가 판매하는 "제품 카테고리" 또는 "업종" 키워드만 추출하라.
- 한국어 2~10자 이내.
- 검색했을 때 동종업종 경쟁사들이 잘 나올 만한 일반명사 위주.
- 너무 broad한 단어(쇼핑, 인터넷, 비즈니스 등)는 피하라.

예시 입력: title="우리웨어 공식 사이트", keywords="야구잠바,코치자켓,단체복,과잠바..."
예시 출력: 단체복 과잠바

예시 입력: title="봄카드", keywords="청첩장,모바일청첩장,돌잔치청첩장..."
예시 출력: 모바일 청첩장

웹사이트 정보:
- title: ${siteData.title || ""}
- og:title: ${siteData.ogTitle || ""}
- og:description: ${siteData.ogDescription || ""}
- meta description: ${siteData.description || ""}
- meta keywords: ${(siteData.keywords || "").slice(0, 400)}
- H1: ${JSON.stringify(siteData.h1?.slice(0, 3) || [])}
- H2 일부: ${JSON.stringify(siteData.h2?.slice(0, 5) || [])}

JSON 형식으로만 응답하라:
{"keyword": "추출한 키워드"}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 100,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text);
    const keyword = (parsed.keyword || "").trim();
    if (!keyword || keyword.length < 2 || keyword.length > 30) return null;

    return keyword;
  } catch (err: any) {
    console.warn("AI 키워드 추출 실패:", err?.message);
    return null;
  }
}

/**
 * 폴백: AI 실패 시 단순 규칙으로 키워드 추출
 */
function extractKeywordFallback(siteData: {
  title?: string;
  ogTitle?: string;
  keywords?: string;
  h1?: string[];
}): string {
  // meta keywords가 있으면 첫 1~2개 단어 활용
  if (siteData.keywords) {
    const firstKeyword = siteData.keywords.split(",")[0]?.trim();
    if (firstKeyword && firstKeyword.length >= 2 && firstKeyword.length <= 30) {
      return firstKeyword;
    }
  }

  // og:title 또는 title
  const candidates = [siteData.ogTitle, siteData.h1?.[0], siteData.title]
    .filter((s): s is string => !!s && s.length > 0);

  if (candidates.length === 0) return "";

  let keyword = candidates[0];
  keyword = keyword.split(/[|\-–—·:]/)[0].trim();
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
    // 1. 키워드 추출 (AI 우선, 실패 시 폴백)
    let keyword = await extractKeywordWithAI({
      title: siteData.title,
      ogTitle: siteData.ogTitle,
      ogDescription: siteData.ogDescription,
      description: siteData.description,
      keywords: siteData.keywords,
      h1: siteData.h1,
      h2: siteData.h2,
    });

    let keywordSource: "ai" | "fallback" = "ai";

    if (!keyword) {
      keyword = extractKeywordFallback({
        title: siteData.title,
        ogTitle: siteData.ogTitle,
        keywords: siteData.keywords,
        h1: siteData.h1,
      });
      keywordSource = "fallback";
    }

    if (!keyword || keyword.length < 2) {
      console.warn("검색 키워드를 추출할 수 없음");
      return null;
    }

    console.log(
      `[경쟁사 분석] 키워드: "${keyword}" (출처: ${keywordSource})`
    );

    // 2. 우리 도메인 추출
    let ourDomain = "";
    try {
      ourDomain = new URL(siteData.url).hostname.replace(/^www\./, "");
    } catch {
      // ignore
    }

    // 3. 네이버 검색 (1차)
    let items = await searchNaverWeb(keyword, 15);

    // 3-1. 결과가 너무 적거나 우리 도메인 빼면 0개면 한번 더 시도
    let competitors = pickCompetitors(items, ourDomain, 3);

    if (competitors.length === 0 && keywordSource === "ai") {
      // AI 키워드로 안 됐으면 폴백 키워드로 한번 더
      const fallbackKeyword = extractKeywordFallback({
        title: siteData.title,
        ogTitle: siteData.ogTitle,
        keywords: siteData.keywords,
        h1: siteData.h1,
      });
      if (fallbackKeyword && fallbackKeyword !== keyword) {
        console.log(
          `[경쟁사 분석] 1차 결과 0개, 폴백 키워드 재시도: "${fallbackKeyword}"`
        );
        try {
          items = await searchNaverWeb(fallbackKeyword, 15);
          competitors = pickCompetitors(items, ourDomain, 3);
          if (competitors.length > 0) {
            keyword = fallbackKeyword;
            keywordSource = "fallback";
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (competitors.length === 0) {
      console.warn("경쟁사를 찾을 수 없음");
      return null;
    }

    // 4. 각 경쟁사 메타 정보 병렬 수집
    await Promise.all(competitors.map((c) => fetchCompetitorMeta(c)));

    return {
      searchKeyword: keyword,
      keywordSource,
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
