/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * v25: 공유 페이지(/r/*) 보안 헤더
   * - X-Frame-Options: iframe 임베드 차단 (외부 사이트가 끼워 넣기 방지)
   * - Content-Security-Policy: 외부 스크립트 로드 제한
   * - Referrer-Policy: 외부 클릭 시 referrer 정보 최소화
   * - Permissions-Policy: 카메라/마이크/위치 등 권한 차단
   */
  async headers() {
    return [
      {
        source: "/r/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js inline 스크립트 + 인라인 스타일 허용 (React 동작 필수)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // 광고주 사이트 og:image, favicon 등 외부 이미지 허용
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // OpenAI/Naver API 호출은 서버에서만 (클라이언트는 동일 출처 호출만)
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
