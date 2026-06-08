import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitors } from "@/lib/competitorAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, hints } = body || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { message: "URL이 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
      return NextResponse.json(
        {
          message: "네이버 검색 API가 설정되지 않았습니다.",
          competitorAnalysis: null,
        },
        { status: 200 }
      );
    }

    if (!hints || typeof hints !== "object") {
      return NextResponse.json(
        { message: "사이트 정보(hints)가 필요합니다." },
        { status: 400 }
      );
    }

    const t0 = Date.now();

    const result = await analyzeCompetitors({
      url,
      title: hints.title || "",
      ogTitle: hints.ogTitle || "",
      ogDescription: hints.ogDescription || "",
      description: hints.description || "",
      h1: Array.isArray(hints.h1) ? hints.h1 : [],
      h2: Array.isArray(hints.h2) ? hints.h2 : [],
      keywords: hints.keywords || "",
    });

    console.log(`[타이밍] 경쟁사 분석 (단독): ${Date.now() - t0}ms`);

    return NextResponse.json({
      competitorAnalysis: result,
    });
  } catch (error: any) {
    console.error("[/api/competitor] error:", error);
    return NextResponse.json(
      {
        message:
          error?.message ||
          "경쟁사 분석 중 문제가 발생했습니다.",
        competitorAnalysis: null,
      },
      { status: 200 } // 200 - 메인 결과에 영향 X
    );
  }
}
