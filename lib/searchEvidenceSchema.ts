import {z} from 'zod';

const linkUrl=z.string().url().max(2048).refine(value=>/^https?:\/\//i.test(value));
export const InternalLinkAuditSchema=z.object({
  checked:z.number().int().nonnegative(),
  rows:z.array(z.object({
    source:linkUrl, target:linkUrl, anchor:z.string().max(160), final:linkUrl,
    status:z.enum(['ok','broken','redirect','review']), http:z.number().int().optional(),
    redirects:z.array(z.number().int()).max(3), canonical:linkUrl.optional(),
  })).max(32),
});
export type InternalLinkAudit=z.infer<typeof InternalLinkAuditSchema>;
export const ProductOfferAuditSchema=z.object({
  product:z.string().max(200),
  fields:z.array(z.object({
    id:z.enum(['price','currency','inventory']), label:z.string(), page:z.string(), markup:z.string(),
    state:z.enum(['match','mismatch','missing','review']),
  })).length(3),
});
export type ProductOfferAudit=z.infer<typeof ProductOfferAuditSchema>;
