import { z } from "zod";

// 12가지 마케팅 진단 체크리스트
export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.enum(["seo", "content", "trust", "conversion"]),
  label: z.string(),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(), // 현재 사이트의 실제 값 (또는 "(없음)")
  diagnosis: z.string(), // 진단 결과 (한 문장)
  guide: z.string(), // 어떻게 고치면 되는지 (한 문장)
});

// v44: Discoverability 개별 항목 스키마
export const DiscoverabilityItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(),
  diagnosis: z.string(),
  guide: z.string(),
});

// v44: 비판매/정보성 사이트를 위한 Discoverability 스키마 (add-only, optional)
export const DiscoverabilitySchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
  siteType: z
    .enum(["commerce", "content", "brand", "service", "mixed", "unknown"])
    .optional(),
  summary: z.string(),
  seoFoundation: DiscoverabilityItemSchema,
  contentStructure: DiscoverabilityItemSchema,
  redundancy: DiscoverabilityItemSchema,
  geo: DiscoverabilityItemSchema,
  structuredData: DiscoverabilityItemSchema,
  eeat: DiscoverabilityItemSchema,
  localBrand: DiscoverabilityItemSchema,
  aiAnswerability: DiscoverabilityItemSchema,
  priorityActions: z.array(z.string()).optional(),
});

export const MarketingReportSchema = z.object({
  url: z.string(),
  overallScore: z.number().min(0).max(100),
  oneLineSummary: z.string(),
  // 공유용 meta 정보 (서버에서 추가, AI 아니어도 입력용)
  meta: z
    .object({
      siteName: z.string().optional(), // 업체명 (og:site_name 또는 도메인에서)
      ogImage: z.string().optional(), // 업체 대표 이미지
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      faviconUrl: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
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

  // 신규: 12가지 진단 체크리스트
  checklist: z.array(ChecklistItemSchema).optional(),

  criticalIssues: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      reason: z.string(),
      recommendation: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      // 신규: 안된 예시 / 잘된 예시 (Critical에만)
      badExample: z.string().optional(),
      goodExample: z.string().optional(),
      exampleNote: z.string().optional(),
    })
  ),

  // 신규: 단계별 플로우가 있는 Quick Wins
  quickWinsDetailed: z
    .array(
      z.object({
        title: z.string(),
        steps: z.array(z.string()),
        beforeExample: z.string().optional(),
        afterExample: z.string().optional(),
      })
    )
    .optional(),

  // 호환성을 위해 단순 quickWins도 유지 (옵션)
  quickWins: z.array(z.string()).optional(),

  priorityRoadmap: z.object({
    immediately: z.array(z.string()),
    thisWeek: z.array(z.string()),
    thisMonth: z.array(z.string()),
  }),

  exampleCopy: z.object({
    heroHeadline: z.string(),
    subHeadline: z.string(),
    ctaText: z.string(),
    // 신규: 우리 사이트의 현재 카피 (비교용)
    currentHeroHeadline: z.string().optional(),
    currentCtaText: z.string().optional(),
    // 신규: 경쟁사 카피 인사이트
    competitorCopyInsight: z.string().optional(),
  }),

  finalCta: z.object({
    title: z.string(),
    description: z.string(),
    buttonText: z.string(),
  }),

  // v26: 네이버 AI 광고 준비도 점검
  naverAiReadiness: z
    .object({
      overallScore: z.number().min(0).max(100),
      grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
      summary: z.string(),
      checks: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          category: z.enum([
            "schema",
            "site_name",
            "tracking",
            "content",
            "mobile",
          ]),
          status: z.enum(["pass", "warning", "fail"]),
          weight: z.number().optional(),
          currentValue: z.string(),
          diagnosis: z.string(),
          guide: z.string(),
        })
      ),
      notes: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),

  // v44: 비판매/정보성 사이트용 발견성·GEO 지표 (add-only, 항상 표시)
  discoverability: DiscoverabilitySchema.nullable().optional(),

  competitorAnalysis: z
    .object({
      searchKeyword: z.string(),
      keywordSource: z.enum(["ai", "fallback"]).optional(),
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
          keyMessage: z.string().optional(),
          differentiation: z.string().optional(),
        })
      ),
      overallComparison: z.string().optional(),
      ourPositioning: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export type MarketingReport = z.infer<typeof MarketingReportSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type DiscoverabilityItem = z.infer<typeof DiscoverabilityItemSchema>;
export type Discoverability = z.infer<typeof DiscoverabilitySchema>;
