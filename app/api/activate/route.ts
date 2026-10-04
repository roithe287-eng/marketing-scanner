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
  createSession,
  limitRequest,
  deleteSession,
} from "@/lib/saas/store";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
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
    const account = await activate(body.token, body.password);
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    return setSession(privateJson({ ok: true }), await createSession(account));
  } catch (error) {
    return failure(error);
  }
}
