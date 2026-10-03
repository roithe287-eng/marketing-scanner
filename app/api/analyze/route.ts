import {getSharedReport} from "@/lib/shareStore";
import {baselineQuestions, canonicalPage} from "@/lib/geoComparison";
import type {GeoBaseline} from "@/lib/reportSchema";
import { NextRequest, NextResponse } from "next/server";
import { extractWebsite } from "@/lib/extractWebsite";
import { analyzeMarketing } from "@/lib/analyzeMarketing";
import { analyzeDiscoverability } from "@/lib/analyzeDiscoverability";
import { analyzeCitation } from "@/lib/analyzeCitation";
import { analyzeAdWaste } from "@/lib/analyzeAdWaste";
import { analyzeKeywordRank } from "@/lib/analyzeKeywordRank";
import { analyzeBenchmark } from "@/lib/analyzeBenchmark";
import { analyzeAeoBriefing } from "@/lib/analyzeAeoBriefing";
import { analyzePlaceAdvisor } from "@/lib/analyzePlaceAdvisor";
import { analyzeTechnicalSeo } from "@/lib/analyzeTechnicalSeo";
import { analyzeKeywordFrequency } from "@/lib/analyzeKeywordFreq";
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
  try {
    const body = await req.json();
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
    let fixedQuestions: ReturnType<typeof baselineQuestions> | undefined;
    if (body.baselineId !== undefined) {
      if (typeof body.baselineId !== 'string' || !/^[A-Za-z0-9]{4,12}$/.test(body.baselineId)) return NextResponse.json({message:'기준 보고서 ID가 올바르지 않습니다.'},{status:400});
      const previous = await getSharedReport(body.baselineId);
      if (!previous?.llmCitationTest) return NextResponse.json({message:'기준 보고서가 만료되었거나 GEO 관측이 없습니다. 다른 기준 보고서를 선택해 주세요.'},{status:422});
      if (!canonicalPage(url) || canonicalPage(previous.url) !== canonicalPage(url)) return NextResponse.json({message:'기준 보고서와 같은 URL로만 비교할 수 있습니다.'},{status:400});
      geoBaseline = {reportId:body.baselineId,url:previous.url,citation:previous.llmCitationTest};
      try {fixedQuestions = baselineQuestions(geoBaseline);} catch (error) {return NextResponse.json({message:error instanceof Error?error.message:'기준 질문을 확인할 수 없습니다.'},{status:422});}
      if (geoQuestions !== undefined && JSON.stringify(geoQuestions.map((q:string)=>q.trim())) !== JSON.stringify(fixedQuestions.map(q=>q.question))) return NextResponse.json({message:'비교 모드에서는 기준 보고서의 질문을 그대로 사용합니다.'},{status:400});
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
    const pageEvidence=capturePageEvidence(websiteData);
    console.log(`[타이밍] 사이트 추출: ${Date.now() - t0}ms`);

    // 2. v45-W3: 4가지 병렬 분석
    //    - 메인 분석 (필수)
    //    - Discoverability (v44)
    //    - AI Citation (v45-W1)
    //    - Keyword Rank (v45-W2)
    const t1 = Date.now();
    const [report, discoverability, llmCitation, keywordRank] =
      await Promise.all([
        analyzeMarketing(websiteData),
        analyzeDiscoverability(websiteData).catch((e) => {
          console.warn("[discoverability] 실패:", e?.message || e);
          return null;
        }),
        analyzeCitation(websiteData, geoQuestions?.map((q: string) => q.trim()), {fixedQuestions, fresh:!!geoBaseline}).catch((e) => {
          console.warn("[citation] 실패:", e?.message || e);
          return null;
        }),
        analyzeKeywordRank(websiteData).catch((e) => {
          console.warn("[keyword] 실패:", e?.message || e);
          return null;
        }),
      ]);
    console.log(`[타이밍] AI 병렬 분석: ${Date.now() - t1}ms`);

    report.url = url;
    report.pageEvidence=pageEvidence;
    report.competitorAnalysis = null;
    report.discoverability = discoverability;
    report.llmCitationTest = llmCitation;
    if (geoBaseline) report.geoBaseline = geoBaseline;
    report.keywordRankTracking = keywordRank;

    // v45-W1: 광고비 낭비 시뮬레이션
    try {
      report.adWasteSimulation = analyzeAdWaste(report.diagnosis, 5_000_000);
    } catch (e) {
      console.warn("[adwaste] 실패:", e);
      report.adWasteSimulation = null;
    }

    // v45-W3: 업종별 벤치마크 (메인 분석 이후 · 우리 점수 필요)
    // v45-W4: 네이버 AI 브리핑 준비도 (규칙 기반 · AI 호출 없음 · 병렬 가능)
    // v46-W1: 네이버 생태계 연동 진단 (플레이스 + 서치어드바이저 · 규칙 기반)
    // v46-W2: 수집·색인 기술 진단 + 키워드 빈도 분석 (규칙 기반 · AI 호출 없음)
    try {
      const [bench, briefing, ecosystem] = await Promise.all([
        analyzeBenchmark(websiteData, report.diagnosis).catch((e) => {
          console.warn("[benchmark] 실패:", e);
          return null;
        }),
        analyzeAeoBriefing(websiteData).catch((e) => {
          console.warn("[briefing] 실패:", e);
          return null;
        }),
        analyzePlaceAdvisor(websiteData).catch((e) => {
          console.warn("[ecosystem] 실패:", e);
          return null;
        }),
      ]);
      report.industryBenchmark = bench;
      (report as any).naverBriefingReadiness = briefing;
      (report as any).naverEcosystemReadiness = ecosystem;
      // v46-W2: 순수 동기 규칙 분석 — 실패해도 리포트를 막지 않음
      try {
        report.technicalSeo = analyzeTechnicalSeo(websiteData);
        report.keywordFrequency = analyzeKeywordFrequency(websiteData);
      } catch (e) {
        console.warn("[technical-seo/keyword-freq] 실패:", e);
        report.technicalSeo = null;
        report.keywordFrequency = null;
      }
    } catch (e) {
      console.warn("[benchmark/briefing/ecosystem] 실패:", e);
      report.industryBenchmark = null;
      (report as any).naverBriefingReadiness = null;
      (report as any).naverEcosystemReadiness = null;
      report.technicalSeo = null;
      report.keywordFrequency = null;
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
