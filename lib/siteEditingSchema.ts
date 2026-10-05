import {z} from 'zod';

export const PlatformIdSchema=z.enum(['imweb','cafe24','wordpress','shopify','wix','nextjs','cloudflare','vercel']);
export const PageElementSchema=z.object({
  key:z.string().max(40),kind:z.enum(['title','description','heading','text','cta','image','form']),
  tag:z.string().max(20),selector:z.string().max(1000),text:z.string().max(1400),
  truncated:z.boolean(),heading:z.string().max(300),order:z.number().int().nonnegative(),
  anchor:z.string().max(300).optional(),href:z.string().max(4000).optional(),
});
export const SiteEditingSchema=z.object({
  version:z.literal(1),source:z.literal('static-html'),
  signals:z.array(z.object({id:PlatformIdSchema,kind:z.enum(['cms','framework','delivery']),evidence:z.array(z.string().max(250)).max(8)})).max(8),
  elements:z.array(PageElementSchema).max(100),elementsTruncated:z.boolean(),
});
export type SiteEditing=z.infer<typeof SiteEditingSchema>;
export type PageElement=z.infer<typeof PageElementSchema>;
export type PlatformId=z.infer<typeof PlatformIdSchema>;
