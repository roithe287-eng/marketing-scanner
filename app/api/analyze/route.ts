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
        {
          message:
            "서버에 OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.",
        },
        { status: 500 }
      );
    }

    // 1. 사이트 추출
    const websiteData = await extractWebsite(url);

    // 2. 경쟁사 분석 (네이버 API 키가 있을 때만, 실패해도 본 분석은 진행)
    let competitorAnalysisResult = null;
    if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
      try {
        competitorAnalysisResult = await analyzeCompetitors({
          url,
          title: websiteData.title,
          ogTitle: websiteData.ogTitle,
          description: websiteData.description,
          h1: websiteData.h1,
          keywords: websiteData.keywords,
        });
      } catch (e: any) {
        console.warn("경쟁사 분석 실패 (계속 진행):", e?.message);
      }
    }

    // 3. AI 종합 분석 (경쟁사 데이터 포함)
    const report = await analyzeMarketing(
      websiteData,
      competitorAnalysisResult
    );

    report.url = url;

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("[/api/analyze] error:", error);
    return NextResponse.json(
      {
        message:
          error?.message ||
          "분석 중 문제가 발생했습니다. URL을 확인하거나 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
