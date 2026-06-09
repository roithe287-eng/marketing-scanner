import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, COOKIE_MAX_AGE, getInternalKey } from "@/lib/internalAuth";

export const runtime = "nodejs";

/**
 * GET /api/login?key=<INTERNAL_ACCESS_KEY>
 * 쿠키 발급 후 / 로 리다이렉트
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const provided = url.searchParams.get("key") || "";
  const expected = getInternalKey();

  // 환경변수 미설정 → 차단 기능 비활성화 상태
  if (!expected) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (provided !== expected) {
    return NextResponse.redirect(new URL("/restricted", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set({
    name: COOKIE_NAME,
    value: expected,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
