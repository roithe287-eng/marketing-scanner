import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
  AccessError,
  digest,
  isInternal,
} from "@/lib/security/request";
import { emailSchema } from "@/lib/saas/validation";
import {
  db,
  emailKey,
  getAccount,
  verifyPassword,
  createSession,
  deleteSession,
  rateLimit,
  limitRequest,
} from "@/lib/saas/store";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
import { isActive } from "@/lib/saas/types";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/login", req.url));
}
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    await limitRequest(req.headers, "login", 12, 900);
    const body = z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .parse(await readJson(req));
    await rateLimit("login-email:" + digest(body.email), 8, 900);
    const id = await db().get<string>(emailKey(body.email));
    const account = id ? await getAccount(id) : null;
    const valid = await verifyPassword(
      body.password,
      account?.passwordHash || null,
    );
    if (
      !account ||
      !valid ||
      !isActive(account) ||
      (account.role === "admin" && !isInternal(req.headers))
    )
      throw new AccessError(
        401,
        "이메일·비밀번호 또는 계정 이용 상태를 확인해 주세요.",
      );
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    return setSession(
      privateJson({ ok: true, admin: account.role === "admin" }),
      await createSession(account),
    );
  } catch (error) {
    return failure(error);
  }
}
