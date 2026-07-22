import { NextRequest, NextResponse } from "next/server";
import { analyzeDeepDive } from "@/lib/analyzeDeepDive";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * v45-W2: 경쟁사 딥다이브 API
 * POST /api/deepdive
 * body: { targetUrl: string, ourDomain?: string, ourTitle?: string }
 *
 * 사용자가 CompetitorComparison 카드의 "딥다이브 분석" 버튼 클릭 시 호출됨
 * 결과: CompetitorDeepDive 객체
 */

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
    const rawTarget = body?.targetUrl;
    const ourDomain = body?.ourDomain || "";
    const ourTitle = body?.ourTitle || "";

    if (!rawTarget || typeof rawTarget !== "string") {
      return NextResponse.json(
        { message: "targetUrl이 필요합니다." },
        { status: 400 }
      );
    }

    const targetUrl = normalizeUrl(rawTarget);
    if (!isValidUrl(targetUrl)) {
      return NextResponse.json(
        { message: "올바른 URL 형식이 아닙니다." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OPENAI_API_KEY 미설정" },
        { status: 500 }
      );
    }

    const result = await analyzeDeepDive(targetUrl, {
      domain: ourDomain,
      title: ourTitle,
    });

    if (!result) {
      return NextResponse.json(
        { message: "딥다이브 분석에 실패했습니다. 잠시 후 재시도해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/deepdive] error:", error);
    return NextResponse.json(
      {
        message:
          error?.message ||
          "딥다이브 분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
