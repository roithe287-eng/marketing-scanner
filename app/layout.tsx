import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./access.css";
import "./visual-theme.css";
import "./diagnosis-graphics.css";
import "./landing-preview.css";
import "./report-layout-refinements.css";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "마케팅스캐너 | URL 하나로 확인하는 우리 사이트의 마케팅 약점",
  description:
    "진짜마케팅의 웹사이트 마케팅 진단 서비스. 승인된 계정으로 URL을 진단하면 첫 화면, CTA, 카피, 신뢰 요소, 광고 랜딩 적합도까지 AI가 자동으로 분석합니다.",
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
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
