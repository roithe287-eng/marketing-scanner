import {BusinessDocumentSchema} from './businessContext';
import {z} from 'zod';
import {MedicalPageEvidenceSchema,MedicalAuditSchema} from './medicalAuditSchema';
import {LocalPlaceEvidenceSchema,LocalPlaceLookupSchema} from './localPlaceSchema';
const HttpUrl=z.string().url().max(2048).refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'공개 HTTP URL이 필요합니다.');

export const DiagnosticFindingSchema=z.object({
  id:z.string().max(120),title:z.string().max(200),status:z.enum(['observed','review','action']),
  evidence:z.string().max(2500),action:z.string().max(1500),urls:z.array(HttpUrl).max(8),
});
export const DiagnosticPageSchema=z.object({
  businessDocument:BusinessDocumentSchema.optional(),
  localPlaceEvidence:LocalPlaceEvidenceSchema.optional(),
  medicalEvidence:MedicalPageEvidenceSchema.optional(),
  url:HttpUrl,title:z.string().max(500),description:z.string().max(1500),
  titleTruncated:z.boolean().optional(),descriptionTruncated:z.boolean().optional(),
  metadataOutsideHead:z.boolean().optional(),metadataDeferred:z.boolean().optional(),
  canonicals:z.array(z.string().max(2048)).max(5),noindex:z.boolean(),
  twitterCard:z.boolean(),jquery:z.array(z.string().max(100)).max(5),
  analytics:z.array(z.enum(['UA','GA4','GTM'])).max(3),backgroundCandidates:z.number().int().nonnegative(),
  medicalRelevant:z.boolean(),medical:z.array(z.object({
    type:z.string().max(80),name:z.string().max(300),id:z.string().max(2048),
    fields:z.array(z.object({label:z.string().max(80),state:z.enum(['present','missing','reference'])})).max(10),
  })).max(20),
});
export const DiagnosticResourceSchema=z.object({url:HttpUrl,status:z.enum(['observed','missing','blocked','unavailable','unsupported']),note:z.string().max(1000)});
export const SiteDiagnosticsSchema=z.object({
  localPlaceLookup:LocalPlaceLookupSchema.optional(),
  medicalAudit:MedicalAuditSchema.optional(),
  version:z.literal(1),observedAt:z.string(),targetUrl:HttpUrl,limited:z.boolean(),
  scopeNote:z.string().max(1500),pages:z.array(DiagnosticPageSchema).max(8),
  attempts:z.array(DiagnosticResourceSchema).max(14),
  sitemap:DiagnosticResourceSchema.extend({declared:z.boolean(),entries:z.number().int().nonnegative(),lastmod:z.number().int().nonnegative(),invalidDates:z.number().int().nonnegative(),futureDates:z.number().int().nonnegative(),sampled:z.boolean()}),
  llms:DiagnosticResourceSchema,
  crawlers:z.array(z.object({agent:z.string().max(80),role:z.string().max(150),status:z.enum(['allowed','blocked','unknown']),rule:z.string().max(600),note:z.string().max(700),source:HttpUrl})).max(12),
  findings:z.array(DiagnosticFindingSchema).max(50),
});
export type DiagnosticPage=z.infer<typeof DiagnosticPageSchema>;
export type DiagnosticFinding=z.infer<typeof DiagnosticFindingSchema>;
export type DiagnosticResource=z.infer<typeof DiagnosticResourceSchema>;
export type SiteDiagnostics=z.infer<typeof SiteDiagnosticsSchema>;
