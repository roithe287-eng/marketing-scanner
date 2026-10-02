import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ms_internal";

/**
 * v22: IP 화이트리스트 + 쿠키 인증 결합
 * - 공유 페이지(/r/*)는 누구나 접근 가능 (광고주용)
 * - 메인(/) 과 분석 API는 회사 IP에서만 접속 가능
 * - 환경변수 ALLOWED_IPS 미설정 시 IP 차단 OFF
 * - 환경변수 INTERNAL_ACCESS_KEY 미설정 시 쿠키 차단 OFF
 * - 둘 다 설정되면 둘 다 통과해야 접속 가능 (이중 보안)
 */

/**
 * IP 정규화: IPv4-mapped IPv6 (::ffff:1.2.3.4) → IPv4 (1.2.3.4)
 */
function normalizeIp(ip: string): string {
  if (!ip) return "";
  const trimmed = ip.trim();
  // IPv4-mapped IPv6
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }
  return trimmed;
}

/**
 * 요청에서 실제 클라이언트 IP 추출
 * Vercel은 신뢰 가능한 프록시이므로 x-forwarded-for의 첫 번째 IP가 진짜 클라이언트
 */
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // 여러 IP가 쉼표 구분으로 나열됨 → 첫 번째가 실제 클라이언트
    const first = xff.split(",")[0];
    return normalizeIp(first);
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp);
  // NextRequest.ip는 Vercel/Edge 환경에서만 동작
  const reqIp = (req as any).ip;
  if (reqIp) return normalizeIp(reqIp);
  return "";
}

/**
 * 허용 IP 목록 파싱 (쉼표 구분 환경변수)
 */
function getAllowedIps(): string[] {
  const raw = process.env.ALLOWED_IPS || "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => normalizeIp(s))
    .filter((s) => s.length > 0);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 항상 허용되는 공개 경로 (광고주가 공유 링크 접속 시 필요)
  const isPublic =
    pathname.startsWith("/r/") || // 공유 결과 페이지
    pathname.startsWith("/restricted") || // 접근 제한 안내
    pathname.startsWith("/api/login") || // 로그인 처리
    pathname.startsWith("/api/logout") || // 로그아웃 처리
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/logo-jinjja.png" ||
    pathname === "/logo.svg" ||
    pathname.startsWith("/og-default") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2");

  if (isPublic) {
    return NextResponse.next();
  }

  // 1) IP 화이트리스트 검증
  const allowedIps = getAllowedIps();
  const ipGuardEnabled = allowedIps.length > 0;

  let ipPassed = true;
  if (ipGuardEnabled) {
    const clientIp = getClientIp(req);
    ipPassed = allowedIps.includes(clientIp);
    if (!ipPassed) {
      console.warn(
        `[middleware] IP 차단: ${clientIp} (허용: ${allowedIps.join(", ")})`
      );
    }
  }

  // 2) 쿠키 인증 검증 (v21 유지)
  const expectedKey = process.env.INTERNAL_ACCESS_KEY;
  const cookieGuardEnabled = !!(expectedKey && expectedKey.length >= 4);

  let cookiePassed = true;
  if (cookieGuardEnabled) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    cookiePassed = token === expectedKey;
  }

  // 두 가드 모두 활성화된 경우: 둘 다 통과해야 함
  // 하나만 활성화된 경우: 활성화된 것만 통과하면 됨
  const allPassed = ipPassed && cookiePassed;

  if (allPassed) {
    return NextResponse.next();
  }

  // 차단: API는 401 JSON, 페이지는 /restricted 리다이렉트
  if (pathname.startsWith("/api/")) {
    const reason = !ipPassed ? "허용된 IP가 아닙니다." : "접근 권한이 없습니다.";
    return new NextResponse(JSON.stringify({ message: reason }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/restricted";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 파일 외 모든 요청에 적용
  matcher: ["/((?!_next/static|_next/image).*)"],
};
