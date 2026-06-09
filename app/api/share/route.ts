import { NextRequest, NextResponse } from "next/server";
import { saveSharedReport, isShareStoreAvailable } from "@/lib/shareStore";
import { MarketingReportSchema } from "@/lib/reportSchema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    if (!isShareStoreAvailable()) {
      return NextResponse.json(
        {
          message:
            "공유 기능을 사용할 수 없습니다. (Redis 환경변수가 설정되지 않음)",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const report = body?.report;

    if (!report || typeof report !== "object") {
      return NextResponse.json(
        { message: "분석 결과 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // 스키마 검증은 너무 엄격하지 않게. report 필수 필드만 확인.
    if (!report.url || typeof report.overallScore !== "number") {
      return NextResponse.json(
        { message: "분석 결과 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const id = await saveSharedReport(report);
    if (!id) {
      return NextResponse.json(
        { message: "공유 링크 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id });
  } catch (error: any) {
    console.error("[/api/share] error:", error);
    return NextResponse.json(
      {
        message: error?.message || "공유 처리 중 문제가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
