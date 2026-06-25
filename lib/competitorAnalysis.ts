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
  h2?: string[];
  ctaTexts?: string[];
  bodySnippet?: string;
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

async function searchNaverWeb(query: string, display = 15) {
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
    signal: AbortSignal.timeout(8000),
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

/**
 * v27: 대형 종합몰 · 오픈마켓 · 가격비교 사이트 제외 리스트
 * - 동종업종 경쟁사로 볼 수 없는 일반 소상공인 광고주 관점 차단
 * - 도메인 설사도 포함 (예: m.coupang.com, mall.coupang.com 등)
 */
const LARGE_MARKETPLACE_DOMAINS = [
  // 오픈마켓
  "coupang.com",
  "gmarket.co.kr",
  "auction.co.kr",
  "11st.co.kr",
  "tmon.co.kr",
  "wemakeprice.com",
  "interpark.com",
  // 종합쇼핑몰
  "ssg.com",
  "lotteon.com",
  "emart.com",
  "hmall.com",
  "hyundaihmall.com",
  "akmall.com",
  "galleria.co.kr",
  "shinsegae.com",
  // 가격비교
  "enuri.com",
  "danawa.com",
  "bestkeyword.co.kr",
  // 대형 전문몰
  "oliveyoung.co.kr",
  "musinsa.com",
  "ablyrocks.com",
  "zigzag.kr",
  "a-bly.com",
  "brandi.co.kr",
  "kakaomakers.com",
  "kakaomakers.co.kr",
  "market.kakao.com",
  // 해외직구
  "aliexpress.com",
  "amazon.com",
  "amazon.co.jp",
  "taobao.com",
  "tmall.com",
  // 더 추가 가능
];

function isLargeMarketplace(domain: string): boolean {
  const d = domain.toLowerCase();
  return LARGE_MARKETPLACE_DOMAINS.some((blocked) => {
    // 정확 일치 또는 서브도메인 (e.g. m.coupang.com)
    return d === blocked || d.endsWith(`.${blocked}`);
  });
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

    // v27: 광포털 · 검색엔진 · 백과사전 제외
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

    // v27: 대형 종합몰 · 오픈마켓 · 가격비교 사이트 제외
    if (isLargeMarketplace(domain)) continue;

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
 * 경쟁사 사이트 깊이 있는 메타 + 콘텐츠 수집
 * - 타임아웃 8초
 * - 인코딩 자동 감지
 * - H1, H2, CTA 버튼, 본문 일부까지 수집
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
    $("script, style, noscript, iframe").remove();

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

    // H2 일부 수집 (경쟁사가 강조하는 메시지 파악)
    competitor.h2 = $("h2")
      .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean)
      .slice(0, 8);

    // 본문 일부 (경쟁사의 핵심 메시지 추출용)
    competitor.bodySnippet = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);

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
      "시작",
      "지금",
    ];
    const buttons = $("button, a, [role='button'], input[type='submit']")
      .map((_, el) => {
        const $el = $(el);
        return (
          $el.text().replace(/\s+/g, " ").trim() ||
          $el.attr("value")?.trim() ||
          ""
        );
      })
      .get()
      .filter((t) => t.length > 0 && t.length < 30)
      .filter((t) => ctaKeywords.some((k) => t.includes(k)));
    competitor.ctaTexts = Array.from(new Set(buttons)).slice(0, 8);
  } catch (err: any) {
    competitor.fetchError = err?.message || "fetch failed";
  }
}

/**
 * AI를 활용한 업종 키워드 추출 (정확도 우선)
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
- 한국어 2~15자 이내.
- 검색했을 때 동종업종 경쟁사들이 잘 나올 만한 일반명사 위주.
- 너무 broad한 단어(쇼핑, 인터넷, 비즈니스 등)는 피하라.

예시:
- title="우리웨어 공식 사이트", keywords="야구잠바,코치자켓,단체복,과잠바..." → 출력: "단체복 과잠바"
- title="봄카드", keywords="청첩장,모바일청첩장..." → 출력: "모바일 청첩장"
- title="진짜마케팅", h1="네이버광고 메타광고" → 출력: "메타광고 대행사"

웹사이트 정보:
- title: ${siteData.title || ""}
- og:title: ${siteData.ogTitle || ""}
- og:description: ${siteData.ogDescription || ""}
- meta description: ${siteData.description || ""}
- meta keywords: ${(siteData.keywords || "").slice(0, 500)}
- H1: ${JSON.stringify(siteData.h1?.slice(0, 3) || [])}
- H2 일부: ${JSON.stringify(siteData.h2?.slice(0, 8) || [])}

JSON 형식으로만 응답하라:
{"keyword": "추출한 키워드"}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
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
 * 폴백: AI 실패 시 단순 규칙 기반 키워드 추출
 */
function extractKeywordFallback(siteData: {
  title?: string;
  ogTitle?: string;
  keywords?: string;
  h1?: string[];
}): string {
  if (siteData.keywords) {
    const firstKeyword = siteData.keywords.split(",")[0]?.trim();
    if (firstKeyword && firstKeyword.length >= 2 && firstKeyword.length <= 30) {
      return firstKeyword;
    }
  }

  const candidates = [siteData.h1?.[0], siteData.ogTitle, siteData.title]
    .filter((s): s is string => !!s && s.length > 0);

  if (candidates.length === 0) return "";

  let keyword = candidates[0];
  const parts = keyword
    .split(/[|\-–—·:]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) {
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
    // 1. AI 키워드 추출 우선
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
      console.warn("[경쟁사] 키워드 추출 실패");
      return null;
    }

    console.log(`[경쟁사] 키워드: "${keyword}" (${keywordSource})`);

    let ourDomain = "";
    try {
      ourDomain = new URL(siteData.url).hostname.replace(/^www\./, "");
    } catch {}

    // 2. 네이버 검색 (5개로 확장)
    let items = await searchNaverWeb(keyword, 15);
    let competitors = pickCompetitors(items, ourDomain, 5);

    // 3. 결과 부족시 폴백 키워드로 재시도
    if (competitors.length === 0 && keywordSource === "ai") {
      const fallbackKeyword = extractKeywordFallback({
        title: siteData.title,
        ogTitle: siteData.ogTitle,
        keywords: siteData.keywords,
        h1: siteData.h1,
      });
      if (fallbackKeyword && fallbackKeyword !== keyword) {
        console.log(
          `[경쟁사] 0개, 폴백 재시도: "${fallbackKeyword}"`
        );
        try {
          items = await searchNaverWeb(fallbackKeyword, 15);
          competitors = pickCompetitors(items, ourDomain, 5);
          if (competitors.length > 0) {
            keyword = fallbackKeyword;
            keywordSource = "fallback";
          }
        } catch {}
      }
    }

    if (competitors.length === 0) {
      console.warn("[경쟁사] 최종 결과 0개");
      return null;
    }

    // 4. 각 경쟁사 메타 + 콘텐츠 병렬 수집 (개별 8초, 전체 15초 상한)
    await Promise.race([
      Promise.all(competitors.map((c) => fetchCompetitorMeta(c))),
      new Promise((resolve) => setTimeout(resolve, 15000)),
    ]);

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
    console.error("[경쟁사] 실패:", err?.message);
    return null;
  }
}
