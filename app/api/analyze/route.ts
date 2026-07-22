import { NextRequest, NextResponse } from "next/server";
import { extractWebsite } from "@/lib/extractWebsite";
import { analyzeMarketing } from "@/lib/analyzeMarketing";
import { analyzeDiscoverability } from "@/lib/analyzeDiscoverability";

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

    // 1. 사이트 추출
    const websiteData = await extractWebsite(url);
    console.log(`[타이밍] 사이트 추출: ${Date.now() - t0}ms`);

    // 2. v44: 메인 분석 + Discoverability 분석 병렬 실행
    //    - 메인 분석: 기존 8개 커머스 지표 (필수)
    //    - Discoverability: SEO·GEO·AI 답변 대응력 8개 (옵셔널, 실패 시 null)
    const t1 = Date.now();
    const [report, discoverability] = await Promise.all([
      analyzeMarketing(websiteData),
      analyzeDiscoverability(websiteData).catch((e) => {
        console.warn("[discoverability] 병렬 실행 실패:", e?.message || e);
        return null;
      }),
    ]);
    console.log(`[타이밍] AI 병렬 분석: ${Date.now() - t1}ms`);
    console.log(`[타이밍] 총 소요: ${Date.now() - t0}ms`);

    report.url = url;
    // 경쟁사 분석은 null로 표시 (프론트에서 별도 호출)
    report.competitorAnalysis = null;
    // v44: Discoverability 결과 병합 (실패 시 null → UI에서 자동 숨김)
    report.discoverability = discoverability;

    return NextResponse.json({
      ...report,
      // 프론트가 경쟁사 추가 호출 여부 판단용
      _hasCompetitor: !!(
        process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
      ),
      // 경쟁사 분석에 필요한 추출 데이터 전달 (재추출 방지)
      _websiteHints: {
        title: websiteData.title,
        ogTitle: websiteData.ogTitle,
        ogDescription: websiteData.ogDescription,
        description: websiteData.description,
        h1: websiteData.h1,
        h2: websiteData.h2,
        keywords: websiteData.keywords,
      },
    });
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
