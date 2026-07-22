import { NextRequest, NextResponse } from "next/server";
import { extractWebsite } from "@/lib/extractWebsite";
import { analyzeMarketing } from "@/lib/analyzeMarketing";
import { analyzeDiscoverability } from "@/lib/analyzeDiscoverability";
import { analyzeCitation } from "@/lib/analyzeCitation";
import { analyzeAdWaste } from "@/lib/analyzeAdWaste";

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

    // 2. v45-W1: 메인 분석 + Discoverability + AI Citation 병렬 실행
    //    - 메인 분석 (필수)
    //    - Discoverability (옵셔널, 실패 시 null)
    //    - AI Citation (옵셔널, 실패 시 null)
    const t1 = Date.now();
    const [report, discoverability, llmCitation] = await Promise.all([
      analyzeMarketing(websiteData),
      analyzeDiscoverability(websiteData).catch((e) => {
        console.warn("[discoverability] 실패:", e?.message || e);
        return null;
      }),
      analyzeCitation(websiteData).catch((e) => {
        console.warn("[citation] 실패:", e?.message || e);
        return null;
      }),
    ]);
    console.log(`[타이밍] AI 병렬 분석: ${Date.now() - t1}ms`);

    report.url = url;
    report.competitorAnalysis = null;
    report.discoverability = discoverability;
    report.llmCitationTest = llmCitation;

    // v45-W1: 광고비 낭비 시뮬레이션 (기본 500만원 기준 서버 계산)
    //         → 클라이언트에서 슬라이더로 실시간 재계산
    try {
      report.adWasteSimulation = analyzeAdWaste(report.diagnosis, 5_000_000);
    } catch (e) {
      console.warn("[adwaste] 실패:", e);
      report.adWasteSimulation = null;
    }

    console.log(`[타이밍] 총 소요: ${Date.now() - t0}ms`);

    return NextResponse.json({
      ...report,
      _hasCompetitor: !!(
        process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
      ),
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
