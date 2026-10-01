import { NextRequest, NextResponse } from "next/server";
import {
  saveSharedReport,
  isShareStoreAvailable,
  getSharedReport,
  updateSharedReportCompetitor,
} from "@/lib/shareStore";

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

    const raw = await req.text();
    if (raw.length > 2_000_000) return NextResponse.json({message:"리포트 데이터가 너무 큽니다."},{status:413});
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({message:"올바른 JSON 형식이 필요합니다."},{status:400}); }
    const parsed = MarketingReportSchema.safeParse(body?.report);
    if (!parsed.success) return NextResponse.json({message:"분석 결과 형식이 올바르지 않습니다."},{status:400});
    const report = parsed.data;

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

/**
 * v43: PATCH — 이미 공유된 ID에 경쟁사 분석 데이터만 사후 업데이트
 *
 * 사용자가 경쟁사 분석 완료 전에 공유 버튼을 눌렀을 때
 * page.tsx 에서 자동으로 호출하여 누락된 경쟁사 데이터를 채워줌
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!isShareStoreAvailable()) {
      return NextResponse.json(
        { message: "공유 기능을 사용할 수 없습니다." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { id, competitorAnalysis } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { message: "공유 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!competitorAnalysis || typeof competitorAnalysis !== "object") {
      return NextResponse.json(
        { message: "경쟁사 분석 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    const checked = MarketingReportSchema.shape.competitorAnalysis.safeParse(competitorAnalysis);
    if (!checked.success) return NextResponse.json({message:"경쟁사 결과 형식이 올바르지 않습니다."},{status:400});
    const existing = await getSharedReport(id);
    if (!existing) {
      return NextResponse.json(
        { message: "해당 공유 링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const ok = await updateSharedReportCompetitor(id, checked.data);
    if (!ok) {
      return NextResponse.json(
        { message: "업데이트에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[/api/share PATCH] error:", error);
    return NextResponse.json(
      { message: error?.message || "업데이트 중 문제가 발생했습니다." },
      { status: 500 }
    );
  }
}
