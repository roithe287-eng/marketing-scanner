import {z} from 'zod';

export const NaverCheckSchema = z.object({
  id:z.string(), title:z.string(), category:z.enum(['search','ads','shopping','developers']),
  status:z.enum(['observed','action','manual','not_applicable']),
  evidence:z.string(), interpretation:z.string(), steps:z.array(z.string()), completion:z.string(),
  sourceIds:z.array(z.string()), owner:z.enum(['content','developer','marketer']),
  priority:z.enum(['high','normal']), basis:z.enum(['official','observation']),
});
export const NaverSourceSchema = z.object({
  id:z.string(), title:z.string(), url:z.string().url(), reviewedAt:z.string(), updatedAt:z.string().optional(),
});
export const NaverOptimizationSchema = z.object({
  version:z.literal(2), rulesReviewedAt:z.string(), observedAt:z.string().optional(), targetUrl:z.string(),
  mode:z.enum(['diagnosis','guide']), checks:z.array(NaverCheckSchema), sources:z.array(NaverSourceSchema),
});
export type NaverCheck=z.infer<typeof NaverCheckSchema>;
export type NaverOptimization=z.infer<typeof NaverOptimizationSchema>;
export type NaverSource=z.infer<typeof NaverSourceSchema>;
