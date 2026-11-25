import { NextRequest } from "next/server";
import { z } from "zod";
import { AccessError, failure, isInternal, privateJson, readJson, requireSameOrigin } from "@/lib/security/request";
import { completeOwnerRecovery, requestOwnerRecovery } from "@/lib/saas/ownerRecovery";
import { limitRequest } from "@/lib/saas/store";
import { passwordSchema } from "@/lib/saas/validation";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request") }).strict(),
  z.object({
    action: z.literal("reset"),
    token: z.string().regex(/^[\w-]{43}$/),
    password: passwordSchema,
  }).strict(),
]);

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    if (process.env.VERCEL_ENV !== "production" || !isInternal(req.headers)) {
      throw new AccessError(403, "등록된 관리자 네트워크에서만 비밀번호를 재설정할 수 있습니다.");
    }
    await limitRequest(req.headers, "owner-recovery", 8, 900);
    const body = requestSchema.parse(await readJson(req, 2048));
    if (body.action === "request") {
      await requestOwnerRecovery();
      return privateJson({ ok: true });
    }
    await completeOwnerRecovery(body.token, body.password);
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
