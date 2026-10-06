import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  AccessError,
  isInternal,
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
  digest,
} from "@/lib/security/request";
import { emailSchema, passwordSchema } from "@/lib/saas/validation";
import { createAdmin, createSession, limitRequest } from "@/lib/saas/store";
import { setSession } from "@/lib/saas/auth";
import { captureActivity } from "@/lib/saas/activity";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    if (!isInternal(req.headers))
      throw new AccessError(
        403,
        "등록된 네트워크에서만 관리자 등록이 가능합니다.",
      );
    await limitRequest(req.headers, "setup", 5, 3600);
    const body = z
      .object({
        token: z.string().regex(/^[\w-]{43}$/),
        name: z.string().trim().min(1).max(80),
        email: emailSchema,
        password: passwordSchema,
      })
      .parse(await readJson(req));
    const expected = process.env.SAAS_SETUP_TOKEN_HASH || "";
    const expires = Number(process.env.SAAS_SETUP_EXPIRES_AT || 0);
    if (
      !/^[a-f0-9]{64}$/.test(expected) ||
      !Number.isFinite(expires) ||
      expires <= Date.now() ||
      !timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(digest(body.token), "hex"),
      )
    )
      throw new AccessError(
        403,
        "관리자 등록 코드가 올바르지 않거나 만료되었습니다.",
      );
    const account = await createAdmin(body);
    await captureActivity(account.id,'owner_created',req.headers);
    return setSession(privateJson({ ok: true }), await createSession(account));
  } catch (error) {
    return failure(error);
  }
}
