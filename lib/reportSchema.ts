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
});

export type MarketingReport = z.infer<typeof MarketingReportSchema>;
