import {z} from 'zod';

export const SearchSignalsSchema=z.object({
  version:z.literal(1),
  httpStatus:z.number().int(),
  titleCount:z.number().int().nonnegative(),
  descriptionCount:z.number().int().nonnegative(),
  canonicals:z.array(z.string().max(4000)).max(8),
  googleDirectives:z.array(z.string().max(300)).max(40),
  crawlers:z.array(z.object({agent:z.enum(['Googlebot','Yeti','OAI-SearchBot']),allowed:z.boolean().nullable(),detail:z.string().max(1200)})).max(3),
  schemaTypes:z.array(z.string().max(150)).max(40),
  jsonLdErrors:z.number().int().nonnegative(),
  internalLinkCount:z.number().int().nonnegative(),
  isJsHeavy:z.boolean(),
  bodyTextLength:z.number().int().nonnegative(),
});
export type SearchSignals=z.infer<typeof SearchSignalsSchema>;
