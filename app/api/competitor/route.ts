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
  let finish:((refund?:boolean)=>Promise<void>)|undefined;
  try {
    const principal=await requirePrincipal(req,true);
    const hint=z.string().max(2000);
    const body = z.object({url:z.string().min(1).max(2048),hints:z.object({title:hint.optional(),ogTitle:hint.optional(),ogDescription:hint.optional(),description:hint.optional(),h1:z.array(hint).max(50).optional(),h2:z.array(hint).max(100).optional(),keywords:hint.optional()})}).parse(await readJson(req,32_768));
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

    publicUrl(url);
    finish=await reserve(principal,'competitor',{headers:req.headers,url});
    const t0 = Date.now();

    const result = await withBudget(Math.max(1,48000-(Date.now()-startedAt)),()=>analyzeCompetitors({
      url,
      title: hints.title || "",
      ogTitle: hints.ogTitle || "",
      ogDescription: hints.ogDescription || "",
      description: hints.description || "",
      h1: Array.isArray(hints.h1) ? hints.h1 : [],
      h2: Array.isArray(hints.h2) ? hints.h2 : [],
      keywords: hints.keywords || "",
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
