import {z} from 'zod';
export const CompetitorResearchSchema=z.object({
  version:z.literal(2),capturedAt:z.string(),provider:z.literal('naver_web'),requestedCount:z.number().int().nonnegative(),
  returnedCount:z.number().int().nonnegative(),apiStart:z.number().int().positive(),totalDocuments:z.number().int().nonnegative().nullable(),
  searchVolumeStatus:z.literal('not_measured'),keywordReason:z.string(),
  keywordEvidence:z.array(z.object({field:z.string(),text:z.string(),matched:z.array(z.string())})),
  alternatives:z.array(z.object({keyword:z.string(),fields:z.array(z.string())})),
  attemptedKeywords:z.array(z.string()),eligibleCount:z.number().int().nonnegative(),budgetDeferredCount:z.number().int().nonnegative(),
  successfulPages:z.number().int().nonnegative(),selectedCount:z.number().int().nonnegative(),
});
export const CompetitorOwnSiteSchema=z.object({url:z.string().optional(),domain:z.string(),title:z.string(),metaDescription:z.string(),h1:z.string()});
