import {z} from 'zod';

export const AnswerIntentSchema=z.enum(['definition','price','delivery','minimum','process','scope','choice','care','comparison','location','eligibility','proof']);
export const AnswerSourceSchema=z.object({
  id:z.string().max(30),text:z.string().min(1).max(700),
  kind:z.enum(['title','description','heading','body','product']),
  location:z.string().max(300),selector:z.string().max(1000).optional(),url:z.string().max(2048).optional(),
});
export const AnswerKeywordSchema=z.object({
  term:z.string().min(2).max(40),evidence:z.array(AnswerSourceSchema).min(1).max(3),
  confidence:z.enum(['high','medium','low']),reason:z.string().max(400),
});
export const AnswerQuestionSchema=z.object({
  id:z.string().max(30),question:z.string().min(5).max(160),intent:AnswerIntentSchema,
  status:z.enum(['supported','partial','not_observed','review']),
  evidence:z.array(AnswerSourceSchema).max(3),missingFacts:z.array(z.string().max(100)).max(5),
  draft:z.string().max(3000),template:z.string().max(1500),
  placement:z.string().max(400),steps:z.array(z.string().max(300)).max(4),
});
export const AnswerContentPlanSchema=z.object({
  version:z.literal(1),source:z.literal('own-page'),mode:z.enum(['ai-assisted','basic','limited']),
  targetUrl:z.string().max(4000),observedAt:z.string().datetime(),
  scope:z.enum(['submitted-page','submitted-page-and-products']),coverage:z.enum(['partial','limited']),
  observation:z.literal('not-measured'),notice:z.string().max(700),
  primaryKeyword:AnswerKeywordSchema.nullable(),secondaryKeywords:z.array(AnswerKeywordSchema).max(2),
  topicScope:z.enum(['focused','mixed','unknown']),
  questions:z.array(AnswerQuestionSchema).max(3),
});
export type AnswerContentPlan=z.infer<typeof AnswerContentPlanSchema>;
export type AnswerSource=z.infer<typeof AnswerSourceSchema>;
export type AnswerKeyword=z.infer<typeof AnswerKeywordSchema>;
export type AnswerQuestion=z.infer<typeof AnswerQuestionSchema>;
export type AnswerIntent=z.infer<typeof AnswerIntentSchema>;
