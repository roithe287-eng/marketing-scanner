import {requirePrincipal} from '@/lib/saas/auth';
import {readJson,privateJson,failure,AccessError} from '@/lib/security/request';
import { NextRequest, NextResponse } from "next/server";
import {
  saveSharedReport,
  isShareStoreAvailable,
  getSharedReport,
  updateSharedReportCompetitor,
} from "@/lib/shareStore";

import {baselineQuestions} from "@/lib/geoComparison";
import {createDiagnosisBaseline} from '@/lib/diagnosisComparison';
import { MarketingReportSchema } from "@/lib/reportSchema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
 try { const principal=await requirePrincipal(req);
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[A-Za-z0-9]{4,12}$/.test(id)) return NextResponse.json({message:"올바른 공유 링크 또는 ID를 입력해 주세요."},{status:400});
  if (!isShareStoreAvailable()) return NextResponse.json({message:"기준 보고서를 불러올 수 없습니다."},{status:503});
  const report = await getSharedReport(id,principal);
  if (!report) return NextResponse.json({message:"공유 보고서가 만료되었거나 찾을 수 없습니다."},{status:404});
  if(req.nextUrl.searchParams.get('mode')==='diagnosis') {
    const diagnosisBaseline=createDiagnosisBaseline(report,id);
    let geoBaseline;
    if(report.llmCitationTest){const candidate={reportId:id,url:report.url,citation:report.llmCitationTest};try{baselineQuestions(candidate);geoBaseline=candidate;}catch{ /* Page comparison does not require GEO observations. */ }}
    return privateJson({diagnosisBaseline,geoBaseline});
  }
  if (!report.llmCitationTest) return NextResponse.json({message:"GEO 관측이 포함된 보고서를 사용해 주세요."},{status:422});
  const baseline = {reportId:id,url:report.url,citation:report.llmCitationTest};
  try {baselineQuestions(baseline);} catch (error) {return NextResponse.json({message:error instanceof Error?error.message:"질문을 불러올 수 없습니다."},{status:422});}
  return privateJson({baseline});
 }catch(error){return failure(error);}
}

export async function POST(req: NextRequest) {
  try {
    const principal=await requirePrincipal(req,true);
    if(principal.kind==='account'&&!principal.account.features.reports)throw new AccessError(403,'보고서 보관 권한이 없습니다.');
    if (!isShareStoreAvailable()) {
      return NextResponse.json(
        {
          message:
            "보고서 저장을 일시적으로 사용할 수 없습니다.",
        },
        { status: 503 }
      );
    }

    const body = await readJson(req,2_000_000);
    const parsed = MarketingReportSchema.safeParse(body?.report);
    if (!parsed.success) return NextResponse.json({message:"분석 결과 형식이 올바르지 않습니다."},{status:400});
    const report = parsed.data;

    const id = await saveSharedReport(report,principal);
    if (!id) {
      return NextResponse.json(
        { message: "공유 링크 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id });
  } catch (error: any) {
    return failure(error);
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
    const principal=await requirePrincipal(req,true);
    if(principal.kind==='account'&&!principal.account.features.reports)throw new AccessError(403,'보고서 보관 권한이 없습니다.');
    if (!isShareStoreAvailable()) {
      return NextResponse.json(
        { message: "공유 기능을 사용할 수 없습니다." },
        { status: 503 }
      );
    }

    const body = await readJson(req,2_000_000);
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
    const existing = await getSharedReport(id,principal);
    if (!existing) {
      return NextResponse.json(
        { message: "해당 공유 링크를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const ok = await updateSharedReportCompetitor(id, checked.data,principal);
    if (!ok) {
      return NextResponse.json(
        { message: "업데이트에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return failure(error);
  }
}
