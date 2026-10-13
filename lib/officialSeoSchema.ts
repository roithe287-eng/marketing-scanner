import {z} from 'zod';

export const OfficialSeoCheckSchema=z.object({
  id:z.string().max(100),title:z.string().max(200),topic:z.string().max(80),
  engines:z.array(z.enum(['naver','google'])).min(1).max(2),
  status:z.enum(['observed','action','manual','not_applicable']),
  evidence:z.string().max(6000),interpretation:z.string().max(2000),
  steps:z.array(z.string().max(2000)).max(12),completion:z.string().max(1000),
});
export const OfficialSeoAuditSchema=z.object({
  version:z.literal(1),catalogVersion:z.literal('2026-10-13'),
  targetUrl:z.string().max(4000),observedAt:z.string().optional(),
  mode:z.enum(['diagnosis','guide']),checks:z.array(OfficialSeoCheckSchema).max(100),
});
export type OfficialSeoCheck=z.infer<typeof OfficialSeoCheckSchema>;
export type OfficialSeoAudit=z.infer<typeof OfficialSeoAuditSchema>;
export type OfficialSeoEngine='naver'|'google';
export type OfficialGuidePropertyGroup={scope:string;required:string[];recommended:string[];conditional:string[]};
export type OfficialSeoGuide={
  id:string;engine:OfficialSeoEngine;title:string;url:string;category:string;
  topic:string;guidance:string[];applicability:string;
  status:'reviewed'|'unavailable';
  properties?:OfficialGuidePropertyGroup[];
};
