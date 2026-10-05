import { z } from "zod";
import {SiteEditingSchema} from './siteEditingSchema';
import {NaverOptimizationSchema} from './naverSchema';
import {SearchSignalsSchema} from './growthSchema';
import {CompetitorResearchSchema,CompetitorOwnSiteSchema} from './competitorSchema';

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

// v44: Discoverability 스키마
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

// v45-W1: AI 인용 시뮬레이션
export const LlmCitationEngineSchema = z.enum(["chatgpt", "gemini"]);
export const CitationSourceSchema = z.object({
  url: z.string().url().refine(value => /^https?:\/\//i.test(value)),
  title: z.string(),
  ownership: z.enum(["own", "external", "unresolved"]),
});
export const LlmCitationQuestionResultSchema = z.object({
  engine: LlmCitationEngineSchema,
  question: z.string(),
  questionType: z.enum(["brand", "industry", "service", "local"]),
  cited: z.boolean(),
  citationRank: z.number().nullable().optional(),
  responseSnippet: z.string().optional(),
  reasoning: z.string().optional(),
  status: z.enum(["ok", "error", "timeout", "unavailable", "unverified"]).optional(),
  brandMentioned: z.boolean().optional(),
  branded: z.boolean().optional(),
  journey: z.string().optional(),
  model: z.string().optional(),
  requestFingerprint: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  measuredAt: z.string().optional(),
  durationMs: z.number().optional(),
  searchUsed: z.boolean().optional(),
  citationVerified: z.boolean().optional(),
  sources: z.array(CitationSourceSchema).optional(),
  responseText: z.string().optional(),
  errorMessage: z.string().optional(),
});
export const LlmCitationTestSchema = z.object({
  measurementProtocol: z.enum(["geo-compare-v1","geo-compare-v2"]).optional(),
  targetUrl: z.string().url().optional(),
  brandName: z.string().optional(),
  measurementVersion: z.literal(2).optional(),
  measuredAt: z.string().optional(),
  questionSetId: z.string().optional(),
  cacheHit: z.boolean().optional(),
  validTests: z.number().optional(),
  citationValidTests: z.number().optional(),
  failedTests: z.number().optional(),
  mentionRate: z.number().nullable().optional(),
  ownedCitationRate: z.number().nullable().optional(),
  brandedCitationRate: z.number().nullable().optional(),
  unbrandedCitationRate: z.number().nullable().optional(),
  actionPlan: z.array(z.object({
    question: z.string(),
    journey: z.string(),
    targetUrl: z.string().optional(),
    action: z.enum(["review_cited", "improve_candidate", "research_page", "retry"]),
    evidence: z.string(),
    nextStep: z.string(),
    accuracy: z.literal("needs_review"),
  })).optional(),
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

export const GeoBaselineSchema = z.object({
  reportId: z.string().regex(/^[A-Za-z0-9]{4,12}$/),
  url: z.string().url(),
  citation: LlmCitationTestSchema,
});
export type GeoBaseline = z.infer<typeof GeoBaselineSchema>;

// v45-W1: 광고비 낭비 시뮬레이션
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

// v45-W2: 키워드 순위 트래킹
export const KeywordRankItemSchema = z.object({
  keyword: z.string(),
  naverWebRank: z.number().nullable(),
  naverBlogRank: z.number().nullable().optional(),
  totalResults: z.number().optional(),
  status: z.enum(["top", "mid", "low", "none"]),
  competitorAtTop: z.string().optional(),
  observationStatus:z.enum(['found','not_found','error','unavailable']).optional(),
  returnedCount:z.number().optional(),
  requestedCount:z.number().optional(),
  apiStart:z.number().optional(),
  matchedUrl:z.string().optional(),
  observedAt:z.string().optional(),
  errorMessage:z.string().optional(),
});
export const KeywordRankTrackingSchema = z.object({
  measurementVersion:z.literal(2).optional(),
  failedCount:z.number().optional(),
  validCount:z.number().optional(),
  totalKeywords: z.number(),
  averageRank: z.number().nullable(),
  visibleCount: z.number(),
  topFiveCount: z.number(),
  hiddenCount: z.number(),
  summary: z.string(),
  keywords: z.array(KeywordRankItemSchema),
  priorityActions: z.array(z.string()).optional(),
});

// v45-W2: 경쟁사 딥다이브
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
  winPoints: z.array(z.string()),
  summary: z.string(),
});

// v45-W4: 네이버 AI 브리핑(ADVoost AEO) 준비도 스키마
export const BriefingCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.enum(["technical", "content"]),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(),
  diagnosis: z.string(),
  guide: z.string(),
  naverRef: z.string().optional(),
});

export const NaverBriefingReadinessSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  summary: z.string(),
  checks: z.array(BriefingCheckSchema),
  priorityActions: z.array(z.string()),
});

// v46-W1: 네이버 생태계 연동 진단 스키마
export const EcoCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.enum(["place", "advisor"]),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(),
  diagnosis: z.string(),
  guide: z.string(),
});

export const NaverEcosystemReadinessSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  isLocalBusiness: z.boolean(),
  placeScore: z.number().min(0).max(100),
  advisorScore: z.number().min(0).max(100),
  summary: z.string(),
  checks: z.array(EcoCheckSchema),
  priorityActions: z.array(z.string()),
});

// v46-W2: 수집·색인 기술 진단 (네이버 애드부스트 진단 대응)
export const TechnicalSeoCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.enum(["aeo", "index", "crawl"]),
  status: z.enum(["pass", "warning", "fail"]),
  currentValue: z.string(),
  diagnosis: z.string(),
  guide: z.string(),
  evidence: z.array(z.string()).optional(),
});

export const TechnicalSeoSchema = z.object({
  overallScore: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  summary: z.string(),
  counts: z.object({
    pass: z.number(),
    warning: z.number(),
    fail: z.number(),
  }),
  checks: z.array(TechnicalSeoCheckSchema),
  priorityActions: z.array(z.string()),
});

// v46-W2: 키워드 빈도 분석 (네이버 애드부스트 '키워드 요약' 대응)
export const KeywordFreqItemSchema = z.object({
  keyword: z.string(),
  count: z.number(),
  density: z.number(),
  inTitle: z.boolean(),
  inMetaDescription: z.boolean(),
});

export const KeywordFrequencySchema = z.object({
  totalTokens: z.number(),
  uniqueSingles: z.number(),
  uniquePhrases: z.number(),
  singles: z.array(KeywordFreqItemSchema),
  phrases: z.array(KeywordFreqItemSchema),
});

// v45-W3: 업종별 벤치마크 리더보드
export const IndustryCategorySchema = z.enum([
  "education",
  "medical",
  "commerce",
  "realestate",
  "legal",
  "beauty",
  "food",
  "travel",
  "it_service",
  "manufacturing",
  "finance",
  "consulting",
  "media",
  "sports",
  "pet",
  "automotive",
  "parenting",
  "interior",
  "ecommerce",
  "etc",
]);

export const IndustryMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  ours: z.number(),
  average: z.number(),
  topTen: z.number(),
  gapVsAverage: z.number(), // ours - average
  gapVsTopTen: z.number(), // ours - topTen
  status: z.enum(["above_top", "above_avg", "below_avg", "critical"]),
});

export const IndustryBenchmarkSchema = z.object({
  methodVersion:z.literal(2).optional(),windowDays:z.number().optional(),scoringMethod:z.string().optional(),scopeNote:z.string().optional(),
  category: IndustryCategorySchema,
  categoryLabel: z.string(), // 한글 라벨 (예: "교육")
  sampleSize: z.number(), // 표본 개수 N
  hasSufficientSample: z.boolean(), // 10개 이상 여부
  summary: z.string(),
  metrics: z.array(IndustryMetricSchema).optional(),
  strongestArea: z.string().optional(), // "상위 10% 근접" 영역
  weakestArea: z.string().optional(), // "가장 뒤처진" 영역
  priorityActions: z.array(z.string()).optional(),
});

export const PageEvidenceSchema=z.object({
  version:z.literal(1),
  requestedUrl:z.string().max(4000),
  finalUrl:z.string().max(4000),
  capturedAt:z.string().datetime(),
  title:z.string().max(600),
  description:z.string().max(1600),
  h1:z.array(z.string().max(500)).max(6),
  h2:z.array(z.string().max(500)).max(12),
  ctaButtons:z.array(z.string().max(200)).max(12),
  bodyText:z.string().max(12000),
  bodyTruncated:z.boolean(),
  searchSignals:SearchSignalsSchema.optional(),
  siteEditing:SiteEditingSchema.optional(),
});
export type PageEvidence=z.infer<typeof PageEvidenceSchema>;

export const DiagnosisScoresSchema = z.object({
    firstView: z.number().min(0).max(100),
    cta: z.number().min(0).max(100),
    copywriting: z.number().min(0).max(100),
    trust: z.number().min(0).max(100),
    conversionFlow: z.number().min(0).max(100),
    adLanding: z.number().min(0).max(100),
    mobileUx: z.number().min(0).max(100),
    seo: z.number().min(0).max(100),
  });

export const DiagnosisCheckSchema=z.object({key:z.string().max(600),label:z.string().max(600),status:z.enum(['pass','warning','fail','review']),evidence:z.string().max(20000),source:z.string().max(100)});
export const DiagnosisBaselineSchema=z.object({
 version:z.literal(1),reportId:z.string().regex(/^[A-Za-z0-9]{4,12}$/),url:z.string().max(4000),finalUrl:z.string().max(4000).optional(),capturedAt:z.string().datetime().optional(),method:z.string().max(100).optional(),overallScore:z.number().min(0).max(100),diagnosis:DiagnosisScoresSchema,checks:z.array(DiagnosisCheckSchema).max(500),
});
export type DiagnosisBaseline=z.infer<typeof DiagnosisBaselineSchema>;
export type DiagnosisCheck=z.infer<typeof DiagnosisCheckSchema>;

export const MarketingReportSchema = z.object({
  scoringMethod:z.literal("ai-axes-mean-v1").optional(),
  integrity:z.object({version:z.literal(1),checkedAt:z.string().datetime(),note:z.string(),warnings:z.array(z.object({field:z.string(),message:z.string()})).max(100)}).optional(),
  analysisWarnings:z.array(z.object({key:z.string().max(40),label:z.string().max(80),status:z.enum(["timeout","unavailable","error"])})).max(10).optional(),
  url: z.string(),
  pageEvidence:PageEvidenceSchema.optional(),
  diagnosisMethod:z.string().max(100).optional(),
  diagnosisBaseline:DiagnosisBaselineSchema.optional(),
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
  diagnosis: DiagnosisScoresSchema,

  checklist: z.array(ChecklistItemSchema).optional(),

  criticalIssues: z.array(
    z.object({
      title: z.string(),
      problem: z.string(),
      reason: z.string(),
      recommendation: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      evidenceStatus:z.literal("review").optional(),
      evidenceNote:z.string().optional(),
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
  geoBaseline: GeoBaselineSchema.optional(),
  adWasteSimulation: AdWasteSimulationSchema.nullable().optional(),
  keywordRankTracking: KeywordRankTrackingSchema.nullable().optional(),
  naverOptimization:NaverOptimizationSchema.nullable().optional(),

  // v45-W3: 업종별 벤치마크
  industryBenchmark: IndustryBenchmarkSchema.nullable().optional(),

  // v45-W4: 네이버 AI 브리핑(ADVoost AEO) 준비도 (규칙 기반 · 규칙 분석)
  naverBriefingReadiness: NaverBriefingReadinessSchema.nullable().optional(),

  // v46-W1: 네이버 생태계 연동 진단 (플레이스 + 서치어드바이저 · 규칙 기반)
  naverEcosystemReadiness: NaverEcosystemReadinessSchema.nullable().optional(),

  // v46-W2: 수집·색인 기술 진단 + 키워드 빈도 분석 (규칙 기반 · AI 호출 없음)
  technicalSeo: TechnicalSeoSchema.nullable().optional(),
  keywordFrequency: KeywordFrequencySchema.nullable().optional(),

  competitorStatus: z.object({
    status: z.enum(['pending', 'complete', 'empty', 'unavailable', 'timeout', 'error']),
    message: z.string(),
  }).nullable().optional(),

  competitorAnalysis: z
    .object({
      searchKeyword: z.string(),
      keywordSource: z.enum(["ai", "fallback"]).optional(),
      research:CompetitorResearchSchema.optional(),
      ourSite:CompetitorOwnSiteSchema.optional(),
      filtering: z.object({
        policyVersion: z.literal(1),
        reviewedCount: z.number().int().nonnegative(),
        metadataCheckedCount: z.number().int().nonnegative(),
        excluded: z.array(z.object({domain: z.string(), link: z.string(), title: z.string(), reason: z.string()})),
      }).optional(),
      competitors: z.array(
        z.object({
          rank: z.number(),
          title: z.string(),
          link: z.string(),
          description: z.string(),
          domain: z.string(),
          searchRank: z.number().int().positive().optional(),
          relevance: z.enum(['keyword_match', 'needs_review']).optional(),
          selectionEvidence: z.string().optional(),
          matchedTerms:z.array(z.string()).optional(),
          relevanceBasis:z.enum(['page_metadata','search_snippet']).optional(),
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
export type IndustryCategory = z.infer<typeof IndustryCategorySchema>;
export type IndustryMetric = z.infer<typeof IndustryMetricSchema>;
export type IndustryBenchmark = z.infer<typeof IndustryBenchmarkSchema>;
export type BriefingCheck = z.infer<typeof BriefingCheckSchema>;
export type NaverBriefingReadiness = z.infer<typeof NaverBriefingReadinessSchema>;
export type EcoCheck = z.infer<typeof EcoCheckSchema>;
export type TechnicalSeoCheck = z.infer<typeof TechnicalSeoCheckSchema>;
export type TechnicalSeo = z.infer<typeof TechnicalSeoSchema>;
export type KeywordFreqItem = z.infer<typeof KeywordFreqItemSchema>;
export type KeywordFrequency = z.infer<typeof KeywordFrequencySchema>;
export type NaverEcosystemReadiness = z.infer<typeof NaverEcosystemReadinessSchema>;
