import OpenAI from "openai";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { CompetitorDeepDive } from "./reportSchema";

/**
 * v45-W2: 경쟁사 딥다이브
 * - 단일 경쟁사 URL 하나 받아서 상세 분석
 * - 카피 전략·CTA 스타일·성능·신뢰 요소·우리가 이길 포인트
 * - 사용자 인터랙션(모달 클릭) 후 지연 호출
 * - 실패 시 null 반환
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = "gpt-4o-mini";
const AI_TIMEOUT_MS = 30000;
const FETCH_TIMEOUT_MS = 12000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CTA_KEYWORDS = [
  "문의", "상담", "신청", "구매", "주문", "예약",
  "다운로드", "시작", "가입", "등록", "체험", "견적",
  "무료", "지금", "바로",
  "buy", "order", "sign up", "signup", "get started",
  "contact", "consult", "download",
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * URL fetch → HTML 파싱
 */
async function fetchAndParse(targetUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 인코딩 자동 감지
    const contentType = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    let html: string;

    if (contentType.toLowerCase().includes("euc-kr")) {
      html = iconv.decode(buf, "euc-kr");
    } else {
      html = buf.toString("utf-8");
    }

    const $ = cheerio.load(html);

    const title = $("title").first().text().trim() || "";
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDesc = $('meta[property="og:description"]').attr("content") || "";
    const h1s: string[] = [];
    $("h1").each((_, el) => {
      const t = $(el).text().trim();
      if (t) h1s.push(t);
    });
    const h2s: string[] = [];
    $("h2").each((_, el) => {
      const t = $(el).text().trim();
      if (t) h2s.push(t);
    });

    // CTA 후보 추출
    const ctaTexts: string[] = [];
    $("a, button").each((_, el) => {
      const txt = $(el).text().trim();
      if (!txt || txt.length > 30) return;
      if (CTA_KEYWORDS.some((kw) => txt.toLowerCase().includes(kw.toLowerCase()))) {
        if (!ctaTexts.includes(txt)) ctaTexts.push(txt);
      }
    });

    // JSON-LD 감지
    const jsonLdTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of arr) {
          if (item && item["@type"]) {
            const t = item["@type"];
            if (Array.isArray(t)) jsonLdTypes.push(...t);
            else jsonLdTypes.push(String(t));
          }
        }
      } catch {
        /* ignore */
      }
    });

    // 신뢰 요소 감지
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const hasReview =
      /후기|리뷰|평점|별점|고객만족|review|rating|testimonial/i.test(bodyText);
    const hasContact =
      /(연락처|고객센터|전화|이메일|contact)/i.test(bodyText) ||
      $('a[href^="tel:"]').length > 0;
    const hasAward = /수상|인증|award|certified|iso/i.test(bodyText);

    const trustSignals: string[] = [];
    if (hasReview) trustSignals.push("리뷰/후기");
    if (hasContact) trustSignals.push("연락처");
    if (hasAward) trustSignals.push("수상/인증");
    if ($('img[alt*="로고" i], img[alt*="logo" i]').length > 0)
      trustSignals.push("로고");

    return {
      title,
      metaDesc,
      ogTitle,
      ogDesc,
      h1s,
      h2s,
      ctaTexts: ctaTexts.slice(0, 15),
      jsonLdTypes: Array.from(new Set(jsonLdTypes)),
      hasReview,
      hasContact,
      hasAward,
      trustSignals,
      bodySnippet: bodyText.slice(0, 3000),
      h1Count: $("h1").length,
      imageCount: $("img").length,
    };
  } catch (e: any) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * AI 분석 (카피 전략·톤·차별화 포인트)
 */
async function aiAnalyze(
  competitor: any,
  ourInfo: { domain: string; title: string; keyMessages?: string[] }
) {
  const prompt = `경쟁사 사이트를 분석해 우리 사이트가 이길 수 있는 포인트를 도출하라.

[경쟁사]
도메인: ${competitor.domain}
타이틀: ${competitor.title}
메타 설명: ${competitor.metaDesc}
H1: ${competitor.h1s.join(" | ")}
H2 (5개): ${competitor.h2s.slice(0, 5).join(" | ")}
CTA 문구 (샘플): ${competitor.ctaTexts.slice(0, 5).join(", ")}
JSON-LD 스키마: ${competitor.jsonLdTypes.join(", ") || "(없음)"}
신뢰 요소: ${competitor.trustSignals.join(", ") || "(없음)"}
본문 발췌: ${competitor.bodySnippet.slice(0, 1500)}

[우리 사이트]
도메인: ${ourInfo.domain}
타이틀: ${ourInfo.title}

분석 지시:
1) copyStrategy.keyMessages: 경쟁사가 강조하는 핵심 메시지 3개 (본문에서 실제 문구 인용)
2) copyStrategy.repeatedPhrases: 반복 사용된 표현 3개 (예: "10년 노하우", "1위")
3) copyStrategy.toneStyle: 톤 스타일 한 줄 요약 (예: "신뢰 강조형·수치 위주")
4) copyStrategy.weakness: 카피 관점 약점 1개 (예: "구체적 수치·사례 부족")
5) ctaStyle.analysis: CTA 배치·문구·개수 분석 1문장
6) winPoints: 우리가 이길 수 있는 포인트 3~5개 (경쟁사에 없는 것, 우리가 잘할 수 있는 것)
7) summary: 종합 총평 한 줄

JSON만 응답:
{
  "copyStrategy": {
    "keyMessages": ["...","...","..."],
    "repeatedPhrases": ["...","...","..."],
    "toneStyle": "...",
    "weakness": "..."
  },
  "ctaStyle": {
    "analysis": "..."
  },
  "winPoints": ["...","...","..."],
  "summary": "..."
}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const resp = await openai.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "경쟁사 분석 전문가. 실제 데이터 인용 · 추측 금지 · JSON만 응답.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal }
    );
    clearTimeout(timer);

    const content = resp.choices[0]?.message?.content?.trim() || "";
    return JSON.parse(content);
  } catch (e: any) {
    clearTimeout(timer);
    console.warn("[deepdive] AI 분석 실패:", e?.message || e);
    return null;
  }
}

/**
 * 경쟁사 딥다이브 메인 함수
 */
export async function analyzeDeepDive(
  targetUrl: string,
  ourInfo: { domain: string; title: string; keyMessages?: string[] }
): Promise<CompetitorDeepDive | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[deepdive] OPENAI_API_KEY 없음");
    return null;
  }

  try {
    // 1. 페이지 fetch·파싱
    const parsed = await fetchAndParse(targetUrl);
    const domain = extractDomain(targetUrl);

    const competitor = {
      ...parsed,
      domain,
    };

    // 2. AI 분석
    const aiResult = await aiAnalyze(competitor, ourInfo);

    if (!aiResult) {
      // AI 실패 시에도 기본 정보만 반환
      return {
        domain,
        targetUrl,
        fetchedAt: new Date().toISOString(),
        copyStrategy: {
          keyMessages: parsed.h1s.slice(0, 3),
          repeatedPhrases: [],
          toneStyle: "AI 분석 실패",
        },
        ctaStyle: {
          ctaTexts: parsed.ctaTexts,
          ctaCount: parsed.ctaTexts.length,
          analysis: "CTA 자동 분석만 수행",
        },
        performance: {
          hasJsonLd: parsed.jsonLdTypes.length > 0,
          schemaTypes: parsed.jsonLdTypes,
          h1Count: parsed.h1Count,
          imageCount: parsed.imageCount,
        },
        trustElements: {
          hasReview: parsed.hasReview,
          hasContact: parsed.hasContact,
          hasAward: parsed.hasAward,
          trustSignals: parsed.trustSignals,
        },
        winPoints: [
          "AI 분석 실패 · 기본 데이터만 표시",
          "재시도 권장",
        ],
        summary: "기본 정보만 추출됨. AI 분석은 실패했습니다.",
      };
    }

    // 3. 결과 통합
    return {
      domain,
      targetUrl,
      fetchedAt: new Date().toISOString(),
      copyStrategy: {
        keyMessages: aiResult.copyStrategy?.keyMessages || [],
        repeatedPhrases: aiResult.copyStrategy?.repeatedPhrases || [],
        toneStyle: aiResult.copyStrategy?.toneStyle || "",
        weakness: aiResult.copyStrategy?.weakness,
      },
      ctaStyle: {
        ctaTexts: parsed.ctaTexts,
        ctaCount: parsed.ctaTexts.length,
        analysis: aiResult.ctaStyle?.analysis || "",
      },
      performance: {
        hasJsonLd: parsed.jsonLdTypes.length > 0,
        schemaTypes: parsed.jsonLdTypes,
        h1Count: parsed.h1Count,
        imageCount: parsed.imageCount,
      },
      trustElements: {
        hasReview: parsed.hasReview,
        hasContact: parsed.hasContact,
        hasAward: parsed.hasAward,
        trustSignals: parsed.trustSignals,
      },
      winPoints: Array.isArray(aiResult.winPoints)
        ? aiResult.winPoints.slice(0, 5)
        : [],
      summary: aiResult.summary || "",
    };
  } catch (e: any) {
    console.warn("[deepdive] 실행 실패:", e?.message || e);
    return null;
  }
}
