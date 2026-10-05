import {withBudget,optionalStage,remainingBudget} from '@/lib/runtime/budget';
import {requirePrincipal} from '@/lib/saas/auth';
import {reserve} from '@/lib/saas/store';
import {readJson,failure} from '@/lib/security/request';
import {publicUrl} from '@/lib/security/safeFetch';
import {getSharedReport} from "@/lib/shareStore";
import {baselineQuestions, canonicalPage} from "@/lib/geoComparison";
import type {GeoBaseline,DiagnosisBaseline} from "@/lib/reportSchema";
import {createDiagnosisBaseline,DIAGNOSIS_METHOD} from '@/lib/diagnosisComparison';
import { NextRequest, NextResponse } from "next/server";
import { extractWebsite } from "@/lib/extractWebsite";
import { analyzeMarketing } from "@/lib/analyzeMarketing";
import { analyzeDiscoverability } from "@/lib/analyzeDiscoverability";
import { analyzeCitation } from "@/lib/analyzeCitation";
import {classifyIndustry} from "@/lib/industryClassifier";
import { analyzeKeywordRank } from "@/lib/analyzeKeywordRank";
import { analyzeBenchmark } from "@/lib/analyzeBenchmark";
import { analyzeKeywordFrequency } from "@/lib/analyzeKeywordFreq";
import {analyzeNaverOptimization} from "@/lib/analyzeNaverOptimization";
import {capturePageEvidence} from '@/lib/pageEvidence';

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
  const startedAt=Date.now();
  let finish:((refund?:boolean)=>Promise<void>)|undefined;
  try {
    const principal=await requirePrincipal(req,true);
    const body = await readJson(req);
    const rawUrl = body?.url;
    const geoQuestions = body?.geoQuestions;
    if (geoQuestions !== undefined && (!Array.isArray(geoQuestions) || geoQuestions.length > 5 || geoQuestions.some((q: unknown) => typeof q !== 'string' || q.trim().length < 5 || q.length > 250))) {
      return NextResponse.json({message:'GEO 질문은 5~250자로 최대 5개까지 입력해주세요.'},{status:400});
    }

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

    let geoBaseline: GeoBaseline | undefined;
    let diagnosisBaseline:DiagnosisBaseline|undefined;
    let fixedQuestions: ReturnType<typeof baselineQuestions> | undefined;
    if (body.baselineId !== undefined) {
      if (typeof body.baselineId !== 'string' || !/^[A-Za-z0-9]{4,12}$/.test(body.baselineId)) return NextResponse.json({message:'기준 보고서 ID가 올바르지 않습니다.'},{status:400});
      const previous = await getSharedReport(body.baselineId,principal);
      if (!previous) return NextResponse.json({message:'기준 보고서를 찾을 수 없거나 접근 권한이 없습니다. 보관된 기준 보고서를 선택해 주세요.'},{status:422});
      if (!canonicalPage(url) || canonicalPage(previous.url) !== canonicalPage(url)) return NextResponse.json({message:'기준 보고서와 같은 URL로만 비교할 수 있습니다.'},{status:400});
      diagnosisBaseline=createDiagnosisBaseline(previous,body.baselineId);
      if(previous.llmCitationTest){const candidate={reportId:body.baselineId,url:previous.url,citation:previous.llmCitationTest};try{fixedQuestions=baselineQuestions(candidate);geoBaseline=candidate;}catch{ /* Page comparison still works without reusable GEO questions. */ }}
      if (fixedQuestions&&geoQuestions !== undefined && JSON.stringify(geoQuestions.map((q:string)=>q.trim())) !== JSON.stringify(fixedQuestions.map(q=>q.question))) return NextResponse.json({message:'비교 모드에서는 기준 보고서의 질문을 그대로 사용합니다.'},{status:400});
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "분석 서비스 준비 중입니다. 잠시 후 다시 시도해 주세요." },
        { status: 500 }
      );
    }

    publicUrl(url);
    finish=await reserve(principal,'analyze');
    // Leave time for both quota finalization and a failed-finalization refund.
    const payload=await withBudget(Math.max(1,48_000-(Date.now()-startedAt)),async()=>{
    const t0 = Date.now();

    // 1. 사이트 추출
    const websiteData = await withBudget(14_000,()=>extractWebsite(url),undefined,"페이지 수집 시간이 초과되었습니다. 최종 페이지 URL을 확인한 뒤 다시 시도해 주세요.");
    const pageEvidence=capturePageEvidence(websiteData);
    console.log(`[타이밍] 사이트 추출: ${Date.now() - t0}ms`);

    // 2. v45-W3: 4가지 병렬 분석
    //    - 메인 분석 (필수)
    //    - Discoverability (v44)
    //    - AI Citation (v45-W1)
    //    - Keyword Rank (v45-W2)
    const t1 = Date.now();
    const optionalBudget=Math.max(1,remainingBudget()-2500);
    const [report, discoverability, llmCitation, keywordRank, category] = await Promise.all([
      analyzeMarketing(websiteData),
      optionalStage('discoverability','AI 검색 준비도',Math.min(34_000,optionalBudget),()=>analyzeDiscoverability(websiteData)),
      optionalStage('citation','GEO 답변·출처 관측',Math.min(34_000,optionalBudget),()=>analyzeCitation(websiteData,geoQuestions?.map((q:string)=>q.trim()),{fixedQuestions,fresh:!!geoBaseline})),
      optionalStage('keywords','네이버 키워드 관측',Math.min(30_000,optionalBudget),()=>analyzeKeywordRank(websiteData)),
      optionalStage('category','업종 분류',Math.min(5000,optionalBudget),()=>classifyIndustry(websiteData)),
    ]);
    console.log(`[타이밍] AI 병렬 분석: ${Date.now() - t1}ms`);

    report.url = url;
    report.pageEvidence=pageEvidence;
    report.diagnosisMethod=`${DIAGNOSIS_METHOD}:${process.env.OPENAI_MODEL||'gpt-4.1-mini'}`;
    if(diagnosisBaseline)report.diagnosisBaseline=diagnosisBaseline;
    report.competitorAnalysis = null;
    report.discoverability = discoverability.value;
    report.llmCitationTest = llmCitation.value;
    if (geoBaseline) report.geoBaseline = geoBaseline;
    report.keywordRankTracking = keywordRank.value;

    report.adWasteSimulation=null; // Page scores cannot establish ad waste or savings.

    // Versioned, source-backed observations; account-only checks stay unverified.
    report.naverOptimization = analyzeNaverOptimization(websiteData);
    report.naverAiReadiness = null;
    report.naverBriefingReadiness = null;
    report.naverEcosystemReadiness = null;
    report.technicalSeo = null; // Replaced by scoped observations in naverOptimization.
    report.keywordFrequency = analyzeKeywordFrequency(websiteData);
    const benchmark=await optionalStage('benchmark','업종 비교 데이터',Math.max(1,Math.min(2500,remainingBudget()-500)),()=>category.value?analyzeBenchmark(websiteData,report.diagnosis,category.value,report.diagnosisMethod!):Promise.resolve(null));
    report.industryBenchmark=benchmark.value;
    report.analysisWarnings=[discoverability,llmCitation,keywordRank,category,benchmark].flatMap(stage=>stage.warning?[stage.warning]:[]);

    console.log(`[타이밍] 총 소요: ${Date.now() - t0}ms`);

    return {
      ...report,
      _hasCompetitor: !!(
        process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET && (principal.kind==='internal'||principal.account.features.competitor)
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
    };
    },req.signal);
    await finish();
    return NextResponse.json(payload);
  } catch (error: unknown) {
    if(finish)await finish(true).catch(()=>{});
    return failure(error);
  }
}
