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
  citationRank: z.number().nullable().optional(),
  responseSnippet: z.string().optional(),
  reasoning: z.string().optional(),
});

export const LlmCitationTestSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]).optional(),
  citationRate: z.number().min(0).max(100),
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
  savingAmount: z.number(),
  savingRate: z.number(),
  duration: z.string(),
  actions: z.array(z.string()),
});

export const AdWasteSimulationSchema = z.object({
  baseWasteRate: z.number(),
  contributionFactors: z.object({
    cta: z.number(),
    firstView: z.number(),
    trust: z.number(),
    mobileUx: z.number(),
  }),
  scenarios: z.array(AdWasteScenarioSchema),
  summary: z.string(),
});

// v45-W2: 키워드 순위 트래킹 (네이버만)
export const KeywordRankItemSchema = z.object({
  keyword: z.string(),
  naverWebRank: z.number().nullable(), // 웹문서 순위 (1~15, null=미노출)
  naverBlogRank: z.number().nullable().optional(), // 블로그 순위 (선택)
  totalResults: z.number().optional(), // 네이버 검색 결과 총 개수
  status: z.enum(["top", "mid", "low", "none"]), // top(1-5), mid(6-10), low(11-15), none(미노출)
  competitorAtTop: z.string().optional(), // 1위에 있는 경쟁사 도메인
});

export const KeywordRankTrackingSchema = z.object({
  totalKeywords: z.number(),
  averageRank: z.number().nullable(), // 노출된 키워드 평균 순위
  visibleCount: z.number(), // 15위 내 노출 개수
  topFiveCount: z.number(), // 5위 내 노출 개수
  hiddenCount: z.number(), // 미노출 개수
  summary: z.string(),
  keywords: z.array(KeywordRankItemSchema),
  priorityActions: z.array(z.string()).optional(),
});

// v45-W2: 경쟁사 딥다이브 스키마
export const CompetitorDeepDiveSchema = z.object({
  domain: z.string(),
  targetUrl: z.string(),
  fetchedAt: z.string(),
  overallScore: z.number().min(0).max(100).optional(),
  copyStrategy: z.object({
    keyMessages: z.array(z.string()),
    repeatedPhrases: z.array(z.string()),
    toneStyle: z.string(),
    weakness: z.string().optional(),
  }),
  ctaStyle: z.object({
    ctaTexts: z.array(z.string()),
    ctaCount: z.number(),
    ctaColor: z.string().optional(),
    analysis: z.string(),
  }),
  performance: z.object({
    loadingSpeed: z.string().optional(),
    hasJsonLd: z.boolean(),
    schemaTypes: z.array(z.string()).optional(),
    h1Count: z.number().optional(),
    imageCount: z.number().optional(),
  }),
  trustElements: z.object({
    hasReview: z.boolean(),
    hasContact: z.boolean(),
    hasAward: z.boolean().optional(),
    trustSignals: z.array(z.string()),
  }),
  winPoints: z.array(z.string()), // 우리가 이길 수 있는 포인트
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

  discoverability: DiscoverabilitySchema.nullable().optional(),
  llmCitationTest: LlmCitationTestSchema.nullable().optional(),
  adWasteSimulation: AdWasteSimulationSchema.nullable().optional(),

  // v45-W2: 키워드 순위 트래킹 (네이버 검색 API)
  keywordRankTracking: KeywordRankTrackingSchema.nullable().optional(),

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
export type KeywordRankItem = z.infer<typeof KeywordRankItemSchema>;
export type KeywordRankTracking = z.infer<typeof KeywordRankTrackingSchema>;
export type CompetitorDeepDive = z.infer<typeof CompetitorDeepDiveSchema>;
