import { NextRequest, NextResponse } from "next/server";
import { extractWebsite } from "@/lib/extractWebsite";
import { analyzeMarketing } from "@/lib/analyzeMarketing";
import { analyzeCompetitors } from "@/lib/competitorAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { message: "URL을 입력해주세요." },
        { status: 400 }
      );
    }

    const url = normalizeUrl(rawUrl);
    if (!isValidUrl(url)) {
      return NextResponse.json(
        { message: "올바른 URL 형식이 아닙니다." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const t0 = Date.now();

    // 1. 사이트 추출 (필수, 먼저 실행)
    const websiteData = await extractWebsite(url);
    console.log(`[타이밍] 사이트 추출: ${Date.now() - t0}ms`);

    // 2. 경쟁사 분석과 메인 AI 분석을 "병렬"로 실행 (시간 절약)
    const t1 = Date.now();
    const hasNaverApi = !!(
      process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
    );

    // 경쟁사 분석 Promise (네이버 키 있을 때만)
    const competitorPromise = hasNaverApi
      ? analyzeCompetitors({
          url,
          title: websiteData.title,
          ogTitle: websiteData.ogTitle,
          ogDescription: websiteData.ogDescription,
          description: websiteData.description,
          h1: websiteData.h1,
          h2: websiteData.h2,
          keywords: websiteData.keywords,
        }).catch((e) => {
          console.warn("[경쟁사] 실패 (계속 진행):", e?.message);
          return null;
        })
      : Promise.resolve(null);

    // 경쟁사 먼저 대기 (메인 AI 호출 시 데이터 필요)
    const competitorAnalysisResult = await competitorPromise;
    console.log(`[타이밍] 경쟁사 분석: ${Date.now() - t1}ms`);

    // 3. AI 메인 분석 (경쟁사 데이터 포함)
    const t2 = Date.now();
    const report = await analyzeMarketing(
      websiteData,
      competitorAnalysisResult
    );
    console.log(`[타이밍] AI 분석: ${Date.now() - t2}ms`);
    console.log(`[타이밍] 총 소요: ${Date.now() - t0}ms`);

    report.url = url;

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("[/api/analyze] error:", error);
    return NextResponse.json(
      {
        message:
          error?.message ||
          "분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
