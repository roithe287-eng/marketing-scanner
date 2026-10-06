import { headers, cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  AccessError,
  isInternal,
  requireSameOrigin,
} from "../security/request";
import { Principal } from "./types";
import { isLoginFreeNetwork } from '../security/networkAccess';
import { sessionAccount, SESSION_SECONDS, limitRequest, isOwnerAccount } from "./store";
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-ms_session"
    : "ms_session_dev";
export function setSession(
  res: NextResponse,
  value: string,
  maxAge = SESSION_SECONDS,
) {
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return res;
}
export async function principalFrom(
  headers: Headers,
  session: string | undefined,
): Promise<Principal | null> {
  const account = await sessionAccount(session);
  if (!account) return isLoginFreeNetwork(headers) ? { kind: 'internal' } : null;
  // Valid sessions keep their account identity, permissions, and activity tracking.
  // Login-free network access never grants the sole owner's administrator role.
  if (account.role === "admin" &&
      (!isInternal(headers) || !(await isOwnerAccount(account)))) return null;
  return { kind: "account", account };
}
export async function getPrincipal(req?: NextRequest) {
  return req
    ? principalFrom(req.headers, req.cookies.get(SESSION_COOKIE)?.value)
    : principalFrom(
        await headers(),
        (await cookies()).get(SESSION_COOKIE)?.value,
      );
}
export async function requirePrincipal(req: NextRequest, mutate = false) {
  if (mutate) requireSameOrigin(req);
  const principal = await getPrincipal(req);
  if (!principal)
    throw new AccessError(401, "이용 문의 후 승인된 계정으로 로그인해 주세요.");
  if (mutate) await limitRequest(req.headers, "private", 40, 60);
  return principal;
}
export async function requireAdmin(req?: NextRequest) {
  const h = req?.headers || (await headers());
  if (!isInternal(h))
    throw new AccessError(403, "관리자 접근 권한이 없습니다.");
  const account = await sessionAccount(
    req
      ? req.cookies.get(SESSION_COOKIE)?.value
      : (await cookies()).get(SESSION_COOKIE)?.value,
  );
  if (!account || !(await isOwnerAccount(account)))
    throw new AccessError(403, "관리자 계정으로 로그인해 주세요.");
  return account;
}
