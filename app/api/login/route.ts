import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
  AccessError,
  digest,
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
  isOwnerAccount,
} from "@/lib/saas/store";
import { captureActivity } from "@/lib/saas/activity";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
import { isActive } from "@/lib/saas/types";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/login", req.url));
}
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    await limitRequest(req.headers, "login-request", 24, 60);
    const body = z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .parse(await readJson(req));
    const id = await db().get<string>(emailKey(body.email));
    const account = id ? await getAccount(id) : null;
    // A verified administrator password reset increments the account version.
    // Attempts made with the old password stay in the old limit windows.
    const loginBucket = account?.role === "admin" ? "login-owner:v" + account.version : "login";
    await limitRequest(req.headers, loginBucket, 12, 900);
    await rateLimit(loginBucket + "-email:" + digest(body.email), 8, 900);
    const valid = await verifyPassword(
      body.password,
      account?.passwordHash || null,
    );
    if (
      !account ||
      !valid ||
      !isActive(account) ||
      (account.role === "admin" && !(await isOwnerAccount(account)))
    ) {
      if(account) await captureActivity(account.id,'login_failed',req.headers);
      throw new AccessError(
        401,
        "이메일·비밀번호 또는 계정 이용 상태를 확인해 주세요.",
      );
    }
    await captureActivity(account.id,'login',req.headers);
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    return setSession(
      privateJson({ ok: true, admin: account.role === "admin" }),
      await createSession(account),
    );
  } catch (error) {
    if (error instanceof AccessError && error.status === 429 && error.retryAfterSeconds !== undefined) {
      const seconds = error.retryAfterSeconds;
      const wait = seconds < 60 ? `${seconds}초` : `${Math.ceil(seconds / 60)}분`;
      return failure(new AccessError(429, `로그인 시도 횟수가 초과됐습니다. 약 ${wait} 후 다시 시도해 주세요.`, seconds));
    }
    return failure(error);
  }
}
