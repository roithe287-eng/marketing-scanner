import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import {
  KeywordRankTracking,
  KeywordRankItem,
} from "./reportSchema";

/**
 * v45-W2: 키워드 순위 트래킹 (네이버 검색 API)
 * - AI가 사이트 특성 기반 3~5개 핵심 키워드 자동 추출
 * - 네이버 웹문서 검색 API로 각 키워드 순위 조회
 * - 우리 도메인이 15위 내 노출되는지 확인
 * - 실패 시 null 반환 (기존 흐름 방해 X)
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = "gpt-4o-mini";
const AI_TIMEOUT_MS = 20000;
const NAVER_TIMEOUT_MS = 8000;
const MAX_KEYWORDS = 5;

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * AI가 사이트 특성 기반 핵심 키워드 3~5개 자동 추출
 */
async function generateKeywords(
  data: ExtractedWebsiteData
): Promise<string[]> {
  const bodyPreview = (data.bodyText || "").slice(0, 2000);

  const prompt = `이 사이트가 네이버 검색에서 노출되기를 원할 만한 핵심 키워드 5개를 추출하라.

[사이트 정보]
타이틀: ${data.title}
설명: ${data.description || data.ogDescription || ""}
H1: ${(data.h1 || []).slice(0, 3).join(" | ")}
H2: ${(data.h2 || []).slice(0, 5).join(" | ")}
키워드 메타: ${data.keywords || ""}
본문 발췌: ${bodyPreview}

원칙:
1) 실제 사용자가 네이버에 검색할 만한 자연어 키워드 (예: "강남 마케팅 대행")
2) 너무 짧거나(1글자) 너무 길지 않게 (2~15자)
3) 브랜드명·업종·지역·서비스명 조합 우선
4) 너무 일반적인 단어 (예: "회사", "홈페이지") 제외
5) 각 키워드는 서로 겹치지 않게 다양한 유형

JSON만 응답:
{"keywords":["...","...","...","...","..."]}`;

  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "SEO 키워드 추출 도우미. JSON만 응답.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
      return parsed.keywords
        .filter((k: any) => typeof k === "string" && k.length >= 2 && k.length <= 30)
        .slice(0, MAX_KEYWORDS);
    }
  } catch (e) {
    console.warn("[keyword] 키워드 생성 실패:", e);
  }

  // Fallback: 사이트 타이틀·H1에서 단순 추출
  const fallback: string[] = [];
  if (data.title) {
    const t = data.title.split(/[|\-–·]/)[0].trim();
    if (t && t.length <= 30) fallback.push(t);
  }
  if (data.h1 && data.h1[0] && data.h1[0].length <= 30) {
    fallback.push(data.h1[0]);
  }
  return fallback.slice(0, MAX_KEYWORDS);
}

/**
 * 네이버 웹문서 검색 API 호출
 */
async function searchNaverWeb(
  query: string,
  display = 15
): Promise<
  Array<{ title: string; link: string; description: string }> | null
> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn("[keyword] NAVER credential 없음");
    return null;
  }

  const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(
    query
  )}&display=${display}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NAVER_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[keyword] 네이버 API HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (e: any) {
    console.warn("[keyword] 네이버 API 오류:", e?.message || e);
    return null;
  }
}

/**
 * URL에서 도메인 추출 (검색 결과 URL 비교용)
 */
function domainOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * 단일 키워드 순위 조회
 */
async function trackKeyword(
  keyword: string,
  ourDomain: string
): Promise<KeywordRankItem> {
  const items = await searchNaverWeb(keyword, 15);

  if (!items) {
    return {
      keyword,
      naverWebRank: null,
      status: "none",
    };
  }

  // 우리 도메인 순위 찾기
  let ourRank: number | null = null;
  let competitorAtTop: string | undefined = undefined;

  for (let i = 0; i < items.length; i++) {
    const d = domainOf(items[i].link);
    if (i === 0 && d && d !== ourDomain) {
      competitorAtTop = d;
    }
    if (
      d === ourDomain ||
      d.endsWith("." + ourDomain) ||
      ourDomain.endsWith("." + d)
    ) {
      ourRank = i + 1;
      break;
    }
  }

  let status: KeywordRankItem["status"];
  if (ourRank === null) status = "none";
  else if (ourRank <= 5) status = "top";
  else if (ourRank <= 10) status = "mid";
  else status = "low";

  return {
    keyword,
    naverWebRank: ourRank,
    totalResults: items.length,
    status,
    competitorAtTop,
  };
}

/**
 * 키워드 순위 트래킹 메인 함수
 */
export async function analyzeKeywordRank(
  data: ExtractedWebsiteData
): Promise<KeywordRankTracking | null> {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.warn("[keyword] NAVER credential 없음 → 스킵");
    return null;
  }

  const ourUrl = data.finalUrl || data.url;
  const ourDomain = extractDomain(ourUrl);

  try {
    // 1. AI가 5개 키워드 추출
    const keywords = await generateKeywords(data);
    if (keywords.length === 0) {
      console.warn("[keyword] 키워드 추출 실패");
      return null;
    }

    // 2. 각 키워드 병렬로 순위 조회
    const results = await Promise.all(
      keywords.map((k) => trackKeyword(k, ourDomain))
    );

    // 3. 통계 집계
    const visible = results.filter((r) => r.naverWebRank !== null);
    const topFive = results.filter(
      (r) => r.naverWebRank !== null && r.naverWebRank <= 5
    );
    const hidden = results.filter((r) => r.naverWebRank === null);

    const averageRank =
      visible.length > 0
        ? Math.round(
            (visible.reduce((s, r) => s + (r.naverWebRank || 0), 0) /
              visible.length) *
              10
          ) / 10
        : null;

    // 4. 총평 & 개선 액션
    let summary: string;
    if (topFive.length >= 3) {
      summary = `${keywords.length}개 키워드 중 ${topFive.length}개가 네이버 5위 내 노출. 검색 유입 매우 우수.`;
    } else if (visible.length >= 3) {
      summary = `${keywords.length}개 중 ${visible.length}개 노출(15위 내). 상위권 진입 여지 있음.`;
    } else if (visible.length > 0) {
      summary = `${keywords.length}개 중 ${visible.length}개만 15위 내 노출. 네이버 SEO 개선 시급.`;
    } else {
      summary = `${keywords.length}개 키워드 모두 15위 내 미노출. 네이버 검색 노출 전략 재수립 필요.`;
    }

    const priorityActions: string[] = [];
    if (hidden.length > 0) {
      const hiddenList = hidden
        .slice(0, 2)
        .map((r) => `"${r.keyword}"`)
        .join(", ");
      priorityActions.push(
        `${hiddenList} 키워드 대응 랜딩 페이지 신설 · 제목·h1에 명시`
      );
    }
    const midOrLow = results.filter(
      (r) => r.naverWebRank !== null && r.naverWebRank > 5
    );
    if (midOrLow.length > 0) {
      priorityActions.push(
        `현재 6~15위 키워드 상위권 진입 위해 콘텐츠 강화·백링크 확보`
      );
    }
    if (topFive.length === 0) {
      priorityActions.push(
        `브랜드명 검색어 최우선 방어 (자체 콘텐츠·블로그 노출 강화)`
      );
    }
    if (priorityActions.length === 0) {
      priorityActions.push(`현재 순위 유지 위해 정기 콘텐츠 업데이트 지속`);
    }

    return {
      totalKeywords: keywords.length,
      averageRank,
      visibleCount: visible.length,
      topFiveCount: topFive.length,
      hiddenCount: hidden.length,
      summary,
      keywords: results,
      priorityActions: priorityActions.slice(0, 3),
    };
  } catch (e: any) {
    console.warn("[keyword] 실행 실패:", e?.message || e);
    return null;
  }
}
