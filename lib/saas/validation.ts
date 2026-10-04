import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const featuresSchema = z
  .object({
    competitor: z.boolean(),
    deepdive: z.boolean(),
    reports: z.boolean(),
  })
  .strict();
export const grantSchema = z.object({
  expiresAt: z
    .number()
    .int()
    .min(Date.UTC(2020, 0, 1))
    .max(Date.UTC(2100, 0, 1)),
  monthlyLimit: z.number().int().min(1).max(1000),
  features: featuresSchema,
});
export const inquirySchema = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).default(""),
  email: emailSchema,
  contact: z.string().trim().min(3).max(80),
  url: z.string().trim().max(2048).default(""),
  message: z.string().trim().max(2000).default(""),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
