import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마케팅스캐너 | URL 하나로 확인하는 우리 사이트의 마케팅 약점",
  description:
    "진짜마케팅이 만든 무료 웹사이트 마케팅 진단 도구. URL만 넣으면 첫 화면, CTA, 카피, 신뢰 요소, 광고 랜딩 적합도까지 AI가 자동으로 분석합니다.",
  openGraph: {
    title: "마케팅스캐너 | 진짜마케팅",
    description: "URL 하나로 확인하는 우리 사이트의 마케팅 약점",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
