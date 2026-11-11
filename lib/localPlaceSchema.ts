import {z} from 'zod';
const url=z.string().url().max(2048).refine(v=>{const u=new URL(v);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;});
export const LocalPlaceEvidenceSchema=z.object({
  sector:z.string().max(40),name:z.string().max(120),identity:z.string().max(500),address:z.string().max(300),
  branch:z.string().max(80),franchise:z.boolean(),
  links:z.array(z.object({url,kind:z.enum(['place','short'])})).max(8),
  terms:z.array(z.object({group:z.enum(['상품·서비스','방문·이용 조건','고객·목적','지역·지점']),term:z.string().max(80)})).max(32),
  signals:z.array(z.object({key:z.string().max(30),label:z.string().max(80),excerpt:z.string().max(200)})).max(8),
  media:z.object({images:z.number().int().nonnegative(),described:z.number().int().nonnegative(),videos:z.number().int().nonnegative()}),
});
export const LocalPlaceItemSchema=z.object({
  name:z.string().max(200),category:z.string().max(200),description:z.string().max(700),address:z.string().max(300),roadAddress:z.string().max(300),
  link:z.union([url,z.literal('')]),mapUrl:url,match:z.enum(['consistent','candidate']),reasons:z.array(z.string().max(160)).max(4),
});
export const LocalPlaceLookupSchema=z.object({
  status:z.enum(['observed','empty','unavailable','error','limited','not_queried']),observedAt:z.string().max(40),
  queries:z.array(z.string().max(180)).max(2),items:z.array(LocalPlaceItemSchema).max(5),note:z.string().max(700),
});
export type LocalPlaceEvidence=z.infer<typeof LocalPlaceEvidenceSchema>;
export type LocalPlaceItem=z.infer<typeof LocalPlaceItemSchema>;
export type LocalPlaceLookup=z.infer<typeof LocalPlaceLookupSchema>;
