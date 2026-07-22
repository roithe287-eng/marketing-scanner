import { z } from "zod";

// 12가지 마케팅 진단 체크리스트
export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.enum(["seo", "content", "trust", "conversion"]),
  label: z.string(),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(),
  diagnosis: z.string(),
  guide: z.string(),
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

// v44: 비판매/정보성 사이트를 위한 Discoverability 스키마
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

// v45-W1: AI 인용 시뮬레이션 스키마
export const LlmCitationEngineSchema = z.enum(["chatgpt", "gemini"]);

export const LlmCitationQuestionResultSchema = z.object({
  engine: LlmCitationEngineSchema,
  question: z.string(),
  questionType: z.enum(["brand", "industry", "service", "local"]),
  cited: z.boolean(),
  citationRank: z.number().nullable().optional(), // 1위, 2위 등
  responseSnippet: z.string().optional(), // AI 답변 발췌
  reasoning: z.string().optional(),
});

export const LlmCitationTestSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
  citationRate: z.number().min(0).max(100), // 인용률 (0~100%)
  totalTests: z.number(),
  totalCited: z.number(),
  summary: z.string(),
  results: z.array(LlmCitationQuestionResultSchema),
  engineScores: z.object({
    chatgpt: z.number().min(0).max(100),
    gemini: z.number().min(0).max(100),
  }),
  priorityActions: z.array(z.string()).optional(),
});

// v45-W1: 광고비 낭비 시뮬레이션 스키마
export const AdWasteScenarioSchema = z.object({
  id: z.string(),
  label: z.string(),
  savingAmount: z.number(), // 월 절감액 (원)
  savingRate: z.number(), // 절감률 (%)
  duration: z.string(), // 예상 개선 기간 ("즉시", "1주", "1개월")
  actions: z.array(z.string()), // 실행 액션 목록
});

export const AdWasteSimulationSchema = z.object({
  baseWasteRate: z.number(), // 현재 낭비율 (%)
  contributionFactors: z.object({
    cta: z.number(),
    firstView: z.number(),
    trust: z.number(),
    mobileUx: z.number(),
  }),
  scenarios: z.array(AdWasteScenarioSchema),
  summary: z.string(),
});

export const MarketingReportSchema = z.object({
  url: z.string(),
  overallScore: z.number().min(0).max(100),
  oneLineSummary: z.string(),
  meta: z
    .object({
      siteName: z.string().optional(),
      ogImage: z.string().optional(),
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

  checklist: z.array(ChecklistItemSchema).optional(),

  criticalIssues: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      reason: z.string(),
      recommendation: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      badExample: z.string().optional(),
      goodExample: z.string().optional(),
      exampleNote: z.string().optional(),
    })
  ),

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
    currentHeroHeadline: z.string().optional(),
    currentCtaText: z.string().optional(),
    competitorCopyInsight: z.string().optional(),
  }),

  finalCta: z.object({
    title: z.string(),
    description: z.string(),
    buttonText: z.string(),
  }),

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

  // v44: 비판매/정보성 발견성 지표
  discoverability: DiscoverabilitySchema.nullable().optional(),

  // v45-W1: AI 인용 시뮬레이션 (ChatGPT + Gemini)
  llmCitationTest: LlmCitationTestSchema.nullable().optional(),

  // v45-W1: 광고비 낭비 시뮬레이션 (기본값 서버에서 계산)
  adWasteSimulation: AdWasteSimulationSchema.nullable().optional(),

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
export type LlmCitationTest = z.infer<typeof LlmCitationTestSchema>;
export type LlmCitationQuestionResult = z.infer<
  typeof LlmCitationQuestionResultSchema
>;
export type AdWasteSimulation = z.infer<typeof AdWasteSimulationSchema>;
export type AdWasteScenario = z.infer<typeof AdWasteScenarioSchema>;
