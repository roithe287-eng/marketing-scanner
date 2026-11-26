import {CompetitionScopeSchema} from './competitionScope';
import {z} from 'zod';
import {OwnProductContextSchema} from './ownProductSchema';
export const CompetitorResearchSchema=z.object({
  version:z.literal(2),capturedAt:z.string(),provider:z.enum(['naver_web','official_wig_stores','public_web']),requestedCount:z.number().int().nonnegative(),
  returnedCount:z.number().int().nonnegative(),apiStart:z.number().int().positive(),totalDocuments:z.number().int().nonnegative().nullable(),
  searchVolumeStatus:z.literal('not_measured'),keywordReason:z.string(),
  keywordEvidence:z.array(z.object({field:z.string(),text:z.string(),matched:z.array(z.string())})),
  alternatives:z.array(z.object({keyword:z.string(),fields:z.array(z.string())})),
  attemptedKeywords:z.array(z.string()),eligibleCount:z.number().int().nonnegative(),budgetDeferredCount:z.number().int().nonnegative(),
  successfulPages:z.number().int().nonnegative(),selectedCount:z.number().int().nonnegative(),
  productContext:OwnProductContextSchema.optional(),
  selectionStatus:z.enum(['matched','no_relevant_candidates','insufficient_source','lookup_unavailable']).optional(),selectionMessage:z.string().optional(),
});
type Research=z.infer<typeof CompetitorResearchSchema>;

/** A failed source fetch is not an observed absence of a competing offer. */
export function reviewCandidateCoverage<T extends {research?:Research;filtering?:{metadataCheckedCount:number};competitors:unknown[]}>(analysis:T):T {
  const research=analysis.research;
  const attempted=analysis.filtering?.metadataCheckedCount??0;
  if(analysis.competitors.length||research?.selectionStatus!=='no_relevant_candidates'||!attempted||research.successfulPages>=attempted)return analysis;
  const read=research.successfulPages;
  const selectionMessage=read
    ?`원문을 읽은 ${read}곳에서 같은 상품·서비스를 확인하지 못했습니다. 나머지 ${attempted-read}곳은 원문 미확인입니다.`
    :`후보 ${attempted}곳의 원문을 읽지 못했습니다. 경쟁사 여부를 판정할 자료가 부족합니다.`;
  if(research.selectionMessage===selectionMessage&&read>0)return analysis;
  return {...analysis,research:{...research,selectionStatus:read?'no_relevant_candidates':'lookup_unavailable',selectionMessage}};
}

export const CompetitorOwnSiteSchema=z.object({scope:CompetitionScopeSchema.optional(),url:z.string().optional(),domain:z.string(),title:z.string(),metaDescription:z.string(),h1:z.string()});
