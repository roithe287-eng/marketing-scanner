import { NextRequest } from "next/server";
import { z } from "zod";
import { AccessError, failure, isInternal, privateJson, readJson, requireSameOrigin } from "@/lib/security/request";
import { completeOwnerRecovery, requestOwnerRecovery } from "@/lib/saas/ownerRecovery";
import { limitRequest } from "@/lib/saas/store";
import { passwordSchema } from "@/lib/saas/validation";
import { authorizeRemoteRecovery, remoteRecoveryWindow } from "@/lib/saas/remoteOwnerRecovery";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), startGrant: z.string().regex(/^[\w-]{43}$/).optional() }).strict(),
  z.object({
    action: z.literal("reset"),
    token: z.string().regex(/^[\w-]{43}$/),
    password: passwordSchema,
  }).strict(),
]);

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const internal = isInternal(req.headers);
    if (process.env.VERCEL_ENV !== "production" || (!internal && !remoteRecoveryWindow())) {
      throw new AccessError(403, "등록된 관리자 네트워크에서만 비밀번호를 재설정할 수 있습니다.");
    }
    const body = requestSchema.parse(await readJson(req, 2048));
    if (body.action === "request") {
      const remote = body.startGrant ? authorizeRemoteRecovery(body.startGrant) : null;
      if ((!internal || body.startGrant) && !remote) {
        throw new AccessError(403, "유효한 외부 복구 시작 링크로 다시 열어 주세요.");
      }
      await limitRequest(req.headers, "owner-recovery", 8, 900);
      await requestOwnerRecovery(remote ?? undefined);
      return privateJson({ ok: true });
    }
    await limitRequest(req.headers, "owner-recovery", 8, 900);
    await completeOwnerRecovery(body.token, body.password, internal);
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
