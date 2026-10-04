import { NextRequest } from "next/server";
import {
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
} from "@/lib/security/request";
import { inquirySchema } from "@/lib/saas/validation";
import { saveInquiry, limitRequest, rateLimit } from "@/lib/saas/store";
import { digest } from "@/lib/security/request";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    await limitRequest(req.headers, "inquiry", 4, 3600);
    const { website: _, ...body } = inquirySchema.parse(await readJson(req));
    await rateLimit("inquiry-email:" + digest(body.email), 3, 86400);
    await saveInquiry(body);
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
