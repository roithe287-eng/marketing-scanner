import {naverReportSearchAllowed} from '@/lib/naverReportPolicy';
import {sameSite} from '@/lib/siteIdentity';
import {CompetitionScopeSchema} from '@/lib/competitionScope';
import {CommunityContextSchema} from '@/lib/communityContext';
import {withBudget} from '@/lib/runtime/budget';
import {z} from 'zod';
import {requirePrincipal} from '@/lib/saas/auth';
import {reserve} from '@/lib/saas/store';
import {readJson,failure} from '@/lib/security/request';
import {publicUrl} from '@/lib/security/safeFetch';
import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetitors } from "@/lib/competitorAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const startedAt=Date.now();
  let finish:Awaited<ReturnType<typeof reserve>>|undefined;
  try {
    const principal=await requirePrincipal(req,true);
    const hint=z.string().max(2000);
    const body = z.object({url:z.string().min(1).max(2048),hints:z.object({scope:CompetitionScopeSchema.optional(),communityContext:CommunityContextSchema.optional(),title:hint.optional(),ogTitle:hint.optional(),ogDescription:hint.optional(),description:hint.optional(),h1:z.array(hint).max(50).optional(),h2:z.array(hint).max(100).optional(),keywords:hint.optional(),bodyText:z.string().max(8000).optional()})}).parse(await readJson(req,49_152));
    const { url, hints } = body || {};

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { message: "URL이 필요합니다." },
        { status: 400 }
      );
    }

    const scope=hints.scope;
    const wigStores=scope?.profile==='hairpieces_wigs'&&scope.kind==='commerce'&&sameSite(scope.sourceUrl,url);
    if (!wigStores&&!naverReportSearchAllowed()) {
      return NextResponse.json(
        {
          message: "이 보고서에서는 외부 검색 API를 이용한 자동 경쟁사 조회를 제공하지 않습니다.",
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

    publicUrl(url);
    finish=await reserve(principal,'competitor',{headers:req.headers,url});
    const t0 = Date.now();

    const result = await withBudget(Math.max(1,48000-(Date.now()-startedAt)),()=>analyzeCompetitors({
      url,
      communityContext: hints.communityContext,
      scope:hints.scope,
      title: hints.title || "",
      ogTitle: hints.ogTitle || "",
      ogDescription: hints.ogDescription || "",
      description: hints.description || "",
      h1: Array.isArray(hints.h1) ? hints.h1 : [],
      h2: Array.isArray(hints.h2) ? hints.h2 : [],
      keywords: hints.keywords || "",
      bodyText:hints.bodyText||'',
    }),req.signal);

    console.log(`[타이밍] 경쟁사 분석 (단독): ${Date.now() - t0}ms`);

    await finish(!result);
    return NextResponse.json({
      competitorAnalysis: result,
    });
  } catch (error: unknown) {
    if(finish)await finish(true).catch(()=>{});
    return failure(error);
  }
}
