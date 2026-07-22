import OpenAI from "openai";
import { ExtractedWebsiteData } from "./extractWebsite";
import {
  LlmCitationTest,
  LlmCitationTestSchema,
  LlmCitationQuestionResult,
} from "./reportSchema";
import { Redis } from "@upstash/redis";

/**
 * v45-W1: AI 인용 시뮬레이션 (ChatGPT + Gemini 2.5 Flash)
 * - 자동 생성한 4가지 질문 × 2개 엔진 = 8회 테스트
 * - 사이트가 실제로 AI 답변에 인용되는지 실증
 * - 24h Redis 캐싱으로 비용 절감
 * - 실패 시 null 반환 (기존 흐름 방해 X)
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.5-flash";
const AI_TIMEOUT_MS = 25000;
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h

// Redis 캐싱 (선택적)
let redis: Redis | null = null;
try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn("[citation] Redis 초기화 실패:", e);
}

function hashUrl(url: string): string {
  // 간단한 hash — cache key용
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h << 5) - h + url.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function extractBrandName(data: ExtractedWebsiteData): string {
  if (data.ogSiteName && data.ogSiteName.length < 30) return data.ogSiteName;
  if (data.title) {
    const clean = data.title.split(/[|\-–·]/)[0].trim();
    if (clean.length < 30) return clean;
  }
  return extractDomain(data.finalUrl || data.url).split(".")[0];
}

type QuestionType = "brand" | "industry" | "service" | "local";

interface GeneratedQuestion {
  question: string;
  type: QuestionType;
}

/**
 * 4가지 질문 자동 생성 (AI가 사이트 특성 파악해서 생성)
 */
async function generateQuestions(
  data: ExtractedWebsiteData
): Promise<GeneratedQuestion[]> {
  const brandName = extractBrandName(data);
  const bodyPreview = (data.bodyText || "").slice(0, 1500);

  const prompt = `사이트 정보를 보고 이 사이트가 AI 답변에 인용되기를 원할 만한 4가지 질문을 생성하라.

[사이트]
브랜드: ${brandName}
타이틀: ${data.title}
설명: ${data.description || data.ogDescription || "(없음)"}
H1: ${(data.h1 || []).slice(0, 3).join(" | ")}
본문 발췌: ${bodyPreview}

각 질문은 다음 4가지 유형에 정확히 하나씩:
1) brand: 브랜드 인지 질문 ("${brandName} 어떤가요?" 같은 형식)
2) industry: 업종 추천 질문 ("XX 잘하는 곳 추천" 같은 형식)
3) service: 서비스/문제 해결 질문 ("XX 어떻게 해야 해?" 같은 형식)
4) local: 지역 특정 질문 (지역명 감지되면 지역+업종, 아니면 브랜드+지역 조합)

JSON만 응답:
{"questions":[
  {"question":"...","type":"brand"},
  {"question":"...","type":"industry"},
  {"question":"...","type":"service"},
  {"question":"...","type":"local"}
]}`;

  try {
    const resp = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "질문 생성 도우미. JSON만 응답.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length >= 4) {
      return parsed.questions.slice(0, 4);
    }
  } catch (e) {
    console.warn("[citation] 질문 생성 실패, fallback:", e);
  }

  // Fallback 질문
  const brand = brandName;
  const domain = extractDomain(data.finalUrl || data.url);
  return [
    { question: `${brand} 어떤 회사인가요?`, type: "brand" },
    { question: `${brand}과 비슷한 업체 추천해주세요`, type: "industry" },
    { question: `${brand} 서비스 후기 알려주세요`, type: "service" },
    { question: `${domain} 어떤 사이트인가요?`, type: "local" },
  ];
}

/**
 * ChatGPT 단일 질문 실행
 */
async function askChatGPT(
  question: string,
  brandName: string,
  domain: string
): Promise<{ cited: boolean; rank: number | null; snippet: string }> {
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
              "일반 사용자에게 답변하는 AI 어시스턴트다. 알고 있는 브랜드·서비스가 있다면 자연스럽게 추천/언급하라. 한국어로 3~5개 항목을 순위 형식으로 답하라.",
          },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      { signal: controller.signal }
    );
    clearTimeout(timer);

    const answer = resp.choices[0]?.message?.content || "";
    return detectCitation(answer, brandName, domain);
  } catch (e: any) {
    clearTimeout(timer);
    console.warn("[citation:chatgpt] 오류:", e?.message || e);
    return { cited: false, rank: null, snippet: "" };
  }
}

/**
 * Gemini 2.5 Flash 단일 질문 실행 (Google Search Grounding 활성)
 */
async function askGemini(
  question: string,
  brandName: string,
  domain: string
): Promise<{ cited: boolean; rank: number | null; snippet: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return { cited: false, rank: null, snippet: "" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    // Gemini REST API 호출 (google-search grounding 활성)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${question}\n\n(한국어로 3~5개 항목을 순위 형식으로 추천해주세요.)`,
            },
          ],
        },
      ],
      tools: [{ google_search: {} }], // Grounding 활성
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 700,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      console.warn(
        "[citation:gemini] API 오류:",
        resp.status,
        await resp.text().catch(() => "")
      );
      return { cited: false, rank: null, snippet: "" };
    }

    const data = await resp.json();
    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || "")
        .join(" ") ||
      "";

    return detectCitation(answer, brandName, domain);
  } catch (e: any) {
    clearTimeout(timer);
    console.warn("[citation:gemini] 오류:", e?.message || e);
    return { cited: false, rank: null, snippet: "" };
  }
}

/**
 * AI 답변에서 브랜드/도메인 인용 여부 및 순위 감지
 */
function detectCitation(
  answer: string,
  brandName: string,
  domain: string
): { cited: boolean; rank: number | null; snippet: string } {
  if (!answer || answer.length < 5) {
    return { cited: false, rank: null, snippet: "" };
  }

  const lowerAnswer = answer.toLowerCase();
  const lowerBrand = brandName.toLowerCase();
  const lowerDomain = domain.toLowerCase();
  const domainCore = lowerDomain.split(".")[0];

  const cited =
    lowerAnswer.includes(lowerBrand) ||
    lowerAnswer.includes(lowerDomain) ||
    (domainCore.length >= 4 && lowerAnswer.includes(domainCore));

  if (!cited) {
    return {
      cited: false,
      rank: null,
      snippet: answer.slice(0, 200),
    };
  }

  // 순위 감지: "1.", "2)", "첫 번째" 등 앞의 번호 찾기
  const lines = answer.split("\n");
  let rank: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.toLowerCase().includes(lowerBrand) ||
      line.toLowerCase().includes(lowerDomain) ||
      (domainCore.length >= 4 && line.toLowerCase().includes(domainCore))
    ) {
      const numMatch = line.match(/^\s*(\d+)[\.\)\s]/);
      if (numMatch) {
        rank = parseInt(numMatch[1], 10);
        break;
      }
    }
  }

  // 순위 못 찾으면 등장 순서로 추정
  if (rank === null) {
    const citedIndex = lowerAnswer.indexOf(lowerBrand);
    const beforeText = answer.slice(0, citedIndex);
    const numMatches = beforeText.match(/\n\s*(\d+)[\.\)]/g);
    if (numMatches && numMatches.length > 0) {
      const last = numMatches[numMatches.length - 1];
      const n = last.match(/(\d+)/);
      if (n) rank = parseInt(n[1], 10);
    }
  }

  return {
    cited: true,
    rank,
    snippet: answer.slice(0, 250),
  };
}

/**
 * 종합 점수 계산 (인용률 + 순위 가중)
 */
function calcOverallScore(results: LlmCitationQuestionResult[]): number {
  if (results.length === 0) return 0;
  let sum = 0;
  for (const r of results) {
    if (!r.cited) continue;
    // 순위별 점수: 1위=100, 2위=85, 3위=70, 4위=55, 5위+=40, 순위없음=25
    if (r.citationRank === 1) sum += 100;
    else if (r.citationRank === 2) sum += 85;
    else if (r.citationRank === 3) sum += 70;
    else if (r.citationRank === 4) sum += 55;
    else if (r.citationRank && r.citationRank >= 5) sum += 40;
    else sum += 25; // 인용은 됨, 순위 불명
  }
  return Math.round(sum / results.length);
}

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * AI 인용 시뮬레이션 메인 함수
 */
export async function analyzeCitation(
  data: ExtractedWebsiteData
): Promise<LlmCitationTest | null> {
  const enabled = process.env.ENABLE_LLM_CITATION !== "false";
  if (!enabled) {
    console.log("[citation] ENABLE_LLM_CITATION=false → 스킵");
    return null;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[citation] OPENAI_API_KEY 없음 → 스킵");
    return null;
  }

  const url = data.finalUrl || data.url;
  const brandName = extractBrandName(data);
  const domain = extractDomain(url);
  const cacheKey = `ms:citation:${hashUrl(url)}`;

  // 캐시 조회
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log("[citation] Redis 캐시 히트");
        const parsed =
          typeof cached === "string" ? JSON.parse(cached) : cached;
        const result = LlmCitationTestSchema.safeParse(parsed);
        if (result.success) return result.data;
      }
    } catch (e) {
      console.warn("[citation] 캐시 조회 실패:", e);
    }
  }

  try {
    // 질문 4개 생성
    const questions = await generateQuestions(data);

    // 각 질문을 2개 엔진에 병렬 호출 (총 8회)
    const testPromises = questions.flatMap((q) => [
      askChatGPT(q.question, brandName, domain).then(
        (r): LlmCitationQuestionResult => ({
          engine: "chatgpt",
          question: q.question,
          questionType: q.type,
          cited: r.cited,
          citationRank: r.rank,
          responseSnippet: r.snippet,
        })
      ),
      askGemini(q.question, brandName, domain).then(
        (r): LlmCitationQuestionResult => ({
          engine: "gemini",
          question: q.question,
          questionType: q.type,
          cited: r.cited,
          citationRank: r.rank,
          responseSnippet: r.snippet,
        })
      ),
    ]);

    const results = await Promise.all(testPromises);

    const totalTests = results.length;
    const totalCited = results.filter((r) => r.cited).length;
    const citationRate =
      totalTests > 0 ? Math.round((totalCited / totalTests) * 100) : 0;
    const overallScore = calcOverallScore(results);
    const grade = gradeFromScore(overallScore);

    const chatgptResults = results.filter((r) => r.engine === "chatgpt");
    const geminiResults = results.filter((r) => r.engine === "gemini");
    const chatgptScore = calcOverallScore(chatgptResults);
    const geminiScore = calcOverallScore(geminiResults);

    // 개선 액션 자동 생성
    const priorityActions: string[] = [];
    if (citationRate < 30) {
      priorityActions.push(
        "브랜드명·서비스 정의문을 홈페이지 첫 화면에 명시 (AI가 학습·인용하기 쉬운 형태)"
      );
    }
    if (geminiScore < chatgptScore - 10) {
      priorityActions.push(
        "Google 검색 노출 강화 (JSON-LD Organization/LocalBusiness 도입, sitemap.xml 제출)"
      );
    }
    if (chatgptScore < 30) {
      priorityActions.push(
        "위키·언론 보도·업계 매체 노출 확대로 AI 학습 데이터 진입"
      );
    }
    if (priorityActions.length === 0) {
      priorityActions.push(
        "FAQ 페이지 신설로 AI 인용률 추가 상승 여지 확보"
      );
    }

    const summary =
      citationRate >= 60
        ? `AI 답변 인용률 ${citationRate}%로 양호. 대부분의 질문에서 언급됨.`
        : citationRate >= 30
        ? `AI 답변 인용률 ${citationRate}%로 보통 수준. 추가 SEO/GEO 강화 필요.`
        : `AI 답변 인용률 ${citationRate}%로 낮음. 브랜드·서비스 정보의 웹 노출 확대 시급.`;

    const finalResult: LlmCitationTest = {
      overallScore,
      grade,
      citationRate,
      totalTests,
      totalCited,
      summary,
      results,
      engineScores: {
        chatgpt: chatgptScore,
        gemini: geminiScore,
      },
      priorityActions: priorityActions.slice(0, 3),
    };

    // Redis 캐시 저장
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(finalResult), {
          ex: CACHE_TTL_SECONDS,
        });
      } catch (e) {
        console.warn("[citation] 캐시 저장 실패:", e);
      }
    }

    return finalResult;
  } catch (e: any) {
    console.warn("[citation] 실행 실패:", e?.message || e);
    return null;
  }
}
