import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
} from "@/lib/security/request";
import { passwordSchema } from "@/lib/saas/validation";
import {
  activate,
  token,
  limitRequest,
  deleteSession,
} from "@/lib/saas/store";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
import { captureActivity } from "@/lib/saas/activity";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    await limitRequest(req.headers, "activate", 8, 900);
    const body = z
      .object({
        token: z.string().regex(/^[\w-]{43}$/),
        password: passwordSchema,
        consent: z.literal(true),
      })
      .parse(await readJson(req));
    const session=token();
    const account = await activate(body.token, body.password, session);
    await captureActivity(account.id,'activated',req.headers);
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value).catch(()=>{});
    return setSession(privateJson({ ok: true }), session);
  } catch (error) {
    return failure(error);
  }
}
