import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 리드 수집 API (MVP)
 * - 일단 콘솔 로그로 저장
 * - 추후 Supabase / Google Sheets / Slack Webhook 등으로 확장
 *
 * 확장 예시:
 *   - process.env.SLACK_WEBHOOK_URL 로 fetch POST
 *   - process.env.SUPABASE_URL 로 insert
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, contact, email, url, overallScore } = body || {};

    if (!name || !contact) {
      return NextResponse.json(
        { message: "이름과 연락처는 필수입니다." },
        { status: 400 }
      );
    }

    const lead = {
      name,
      company: company || "",
      contact,
      email: email || "",
      analyzedUrl: url || "",
      overallScore: overallScore ?? null,
      createdAt: new Date().toISOString(),
    };

    // TODO: 실제 운영에서는 DB/Slack/Sheets로 전송
    console.log("[LEAD]", JSON.stringify(lead));

    // Slack Webhook 예시 (환경변수 설정 시 자동 전송)
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `📩 마케팅스캐너 신규 리드\n• 이름: ${lead.name}\n• 회사: ${
              lead.company || "-"
            }\n• 연락처: ${lead.contact}\n• 이메일: ${
              lead.email || "-"
            }\n• 분석 URL: ${lead.analyzedUrl}\n• 종합점수: ${
              lead.overallScore ?? "-"
            }`,
          }),
        });
      } catch (e) {
        console.error("Slack webhook failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[/api/lead] error:", error);
    return NextResponse.json(
      { message: error?.message || "리드 저장 실패" },
      { status: 500 }
    );
  }
}
