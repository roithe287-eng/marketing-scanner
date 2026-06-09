import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ms_internal";

/**
 * v21: 내부 직원만 메인 접근 허용
 * - 공유 페이지(/r/*)는 누구나 접근 가능
 * - 로그인/접근제한 페이지는 누구나 접근 가능
 * - 그 외 메인 화면(/)과 핵심 API는 쿠키 보유자만 접근
 * - 환경변수 INTERNAL_ACCESS_KEY 미설정 시 차단 비활성화 (개발 환경)
 */
export function middleware(req: NextRequest) {
  const expected = process.env.INTERNAL_ACCESS_KEY;
  // 키 미설정 → 차단 기능 OFF (개발 편의)
  if (!expected || expected.length < 4) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // 항상 허용되는 공개 경로 (광고주가 공유 링크 접속 시 필요한 부분만)
  const isPublic =
    pathname.startsWith("/r/") || // 공유 결과 페이지
    pathname.startsWith("/restricted") || // 접근 제한 페이지
    pathname.startsWith("/api/login") || // 로그인 처리
    pathname.startsWith("/api/logout") || // 로그아웃 처리
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/logo-jinjja.png" ||
    pathname === "/logo.svg" ||
    pathname.startsWith("/og-default") ||
    pathname.includes(".png") ||
    pathname.includes(".jpg") ||
    pathname.includes(".ico") ||
    pathname.includes(".svg");

  if (isPublic) {
    return NextResponse.next();
  }

  // 쿠키 보유 여부 확인
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isInternal = token === expected;

  if (isInternal) {
    return NextResponse.next();
  }

  // API 호출은 401 JSON 응답
  if (pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ message: "접근 권한이 없습니다." }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  // 페이지 요청은 /restricted 로 리다이렉트
  const url = req.nextUrl.clone();
  url.pathname = "/restricted";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 파일 외 모든 요청에 적용
  matcher: ["/((?!_next/static|_next/image).*)"],
};
