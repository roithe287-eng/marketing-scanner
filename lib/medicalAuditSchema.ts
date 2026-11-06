import {z} from 'zod';
import {PLACE_CATEGORIES} from './hospitalPlace';

const url=z.string().url().max(2048).refine(v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
export const MedicalEvidenceSchema=z.object({text:z.string().max(600),locator:z.string().max(150),url});
export const MedicalProfileIdSchema=z.enum(['plastic','dermatology','korean','primary','musculoskeletal','dental','ophthalmology','pediatric','gynecology','ent','psychiatry','urology','hospital','cross_specialty']);
export const MedicalPageEvidenceSchema=z.object({
  place:z.object({facility:z.boolean(),terms:z.array(z.object({category:z.enum(PLACE_CATEGORIES),term:z.string().min(1).max(40)})).max(48)}).optional(),
  facilityCandidate:z.boolean(),providerOnly:z.boolean(),sensitive:z.boolean(),
  identity:z.string().max(1500),textLength:z.number().int().nonnegative(),
  signals:z.array(z.object({key:z.string().max(80),evidence:MedicalEvidenceSchema})).max(30),
  formats:z.array(z.enum(['JSON-LD','Microdata','RDFa'])).max(3),
  entities:z.array(z.object({
    type:z.string().max(80),id:z.string().max(2048),name:z.string().max(300),address:z.string().max(500),telephone:z.string().max(80),
    specialties:z.array(z.string().max(200)).max(15),issues:z.array(z.string().max(600)).max(12),
  })).max(20),
  channels:z.array(z.object({label:z.string().max(100),url})).max(10),
  roles:z.array(z.enum(['doctors','services','visit','cost','article'])).max(5),
});
export const MedicalAuditSchema=z.object({
  version:z.literal(1),reviewedOn:z.enum(['2026-11-04','2026-11-06']),scopeNote:z.string().max(1500),
  systems:z.array(z.string().max(80)).max(3),institutions:z.array(z.string().max(80)).max(6),
  profiles:z.array(z.object({id:MedicalProfileIdSchema,label:z.string().max(100),evidence:z.array(MedicalEvidenceSchema).max(3),focus:z.string().max(1000),questions:z.array(z.string().max(300)).max(3),schemaHint:z.string().max(500)})).max(14),
  checks:z.array(z.object({id:z.string().max(80),label:z.string().max(160),status:z.enum(['observed','needs_review','unverified','not_applicable','clinical_review']),
    evidence:z.array(MedicalEvidenceSchema).max(6),detail:z.string().max(2000),action:z.string().max(1500),sources:z.array(z.string().max(40)).max(5),
  })).max(20),
  sources:z.array(z.object({id:z.string().max(40),title:z.string().max(200),url})).max(20),
});
export type MedicalPageEvidence=z.infer<typeof MedicalPageEvidenceSchema>;
export type MedicalAudit=z.infer<typeof MedicalAuditSchema>;
export type MedicalEvidence=z.infer<typeof MedicalEvidenceSchema>;
