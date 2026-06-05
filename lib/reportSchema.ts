import { z } from "zod";

export const MarketingReportSchema = z.object({
  url: z.string(),
  overallScore: z.number().min(0).max(100),
  oneLineSummary: z.string(),
  diagnosis: z.object({
    firstView: z.number().min(0).max(100),
    cta: z.number().min(0).max(100),
    copywriting: z.number().min(0).max(100),
    trust: z.number().min(0).max(100),
    conversionFlow: z.number().min(0).max(100),
    adLanding: z.number().min(0).max(100),
    mobileUx: z.number().min(0).max(100),
    seo: z.number().min(0).max(100),
  }),
  criticalIssues: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      reason: z.string(),
      recommendation: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  quickWins: z.array(z.string()),
  priorityRoadmap: z.object({
    immediately: z.array(z.string()),
    thisWeek: z.array(z.string()),
    thisMonth: z.array(z.string()),
  }),
  exampleCopy: z.object({
    heroHeadline: z.string(),
    subHeadline: z.string(),
    ctaText: z.string(),
  }),
  finalCta: z.object({
    title: z.string(),
    description: z.string(),
    buttonText: z.string(),
  }),
  // 경쟁사 비교 (옵션 - API 키 없거나 검색 실패 시 null)
  competitorAnalysis: z
    .object({
      searchKeyword: z.string(),
      competitors: z.array(
        z.object({
          rank: z.number(),
          title: z.string(),
          link: z.string(),
          description: z.string(),
          domain: z.string(),
          metaTitle: z.string().optional(),
          metaDescription: z.string().optional(),
          h1: z.string().optional(),
          ctaTexts: z.array(z.string()).optional(),
          fetchError: z.string().optional(),
          // AI가 작성한 분석
          keyMessage: z.string().optional(), // 이 경쟁사가 강조하는 메시지
          differentiation: z.string().optional(), // 우리와의 차이점
        })
      ),
      overallComparison: z.string().optional(), // 전체적인 경쟁 환경 요약
      ourPositioning: z.string().optional(), // 우리가 취해야 할 포지셔닝 제안
    })
    .nullable()
    .optional(),
});

export type MarketingReport = z.infer<typeof MarketingReportSchema>;
