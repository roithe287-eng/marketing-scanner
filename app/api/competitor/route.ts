import {publicCompetitorSearchAvailable} from '@/lib/publicCompetitorSearch';
import {naverReportSearchAllowed} from '@/lib/naverReportPolicy';
import {sameSite} from '@/lib/siteIdentity';
import {COMPETITOR_REQUEST_BYTES,CompetitorRequestSchema} from '@/lib/competitorRequest';
import {withBudget} from '@/lib/runtime/budget';
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
    const {url,hints}=CompetitorRequestSchema.parse(await readJson(req,COMPETITOR_REQUEST_BYTES));
    const scope=hints.scope;
    const wigStores=scope?.profile==='hairpieces_wigs'&&scope.kind==='commerce'&&sameSite(scope.sourceUrl,url);
    if (!wigStores&&!naverReportSearchAllowed()&&!publicCompetitorSearchAvailable()) {
      const message='현재 이 보고서의 외부 경쟁사 검색을 이용할 수 없습니다.';
      return NextResponse.json({message,competitorAnalysis:null,competitorStatus:{status:'unavailable',message}});
    }

    publicUrl(url);
    finish=await reserve(principal,'competitor',{headers:req.headers,url});
    const t0 = Date.now();

    const result = await withBudget(Math.max(1,48000-(Date.now()-startedAt)),()=>analyzeCompetitors({
      url,
      communityContext: hints.communityContext,
      scope:hints.scope,
      metadataTruncated:hints.metadataTruncated,
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

    await finish(!result||result.research.selectionStatus==='lookup_unavailable');
    return NextResponse.json({
      competitorAnalysis: result,
    });
  } catch (error: unknown) {
    if(finish)await finish(true).catch(()=>{});
    return failure(error);
  }
}
