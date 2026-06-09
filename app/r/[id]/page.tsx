import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSharedReport } from "@/lib/shareStore";
import SharedReportView from "@/components/SharedReportView";

// 30분마다 재생성 (Next.js ISR 비슷한 효과)
export const revalidate = 1800;

type Props = {
  params: { id: string };
};

/**
 * 공유 페이지의 OG 메타 동적 생성
 * → 카톡/페북/슬랙 등이 이 메타 태그를 읽어 썸네일 표시
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = await getSharedReport(params.id);

  if (!report) {
    return {
      title: "마케팅 진단 결과를 찾을 수 없습니다 | 진짜마케팅",
      description: "공유 링크가 만료되었거나 잘못된 주소입니다.",
    };
  }

  const siteName = report.meta?.siteName || report.meta?.domain || "분석 사이트";
  const domain = report.meta?.domain || "";
  const score = report.overallScore ?? 0;
  const ogImage = report.meta?.ogImage || "";

  const title = `${siteName} 마케팅 진단 결과 - ${score}점/100`;
  const description =
    report.oneLineSummary ||
    `${domain}의 마케팅·전환 관점 진단 결과입니다. 종합 점수 ${score}점/100. 진짜마케팅 마케팅스캐너가 자동으로 분석했습니다.`;

  // 절대 URL로 변환
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://marketing-scanner-beta.vercel.app";
  const pageUrl = `${baseUrl}/r/${params.id}`;

  // OG 이미지는 업체 og:image 우선, 없으면 기본 브랜드 이미지
  const finalOgImage = ogImage || `${baseUrl}/og-default.png`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "진짜마케팅 마케팅스캐너",
      images: [
        {
          url: finalOgImage,
          width: 1200,
          height: 630,
          alt: `${siteName} 마케팅 진단 결과`,
        },
      ],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [finalOgImage],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const report = await getSharedReport(params.id);

  if (!report) {
    notFound();
  }

  return <SharedReportView report={report} shareId={params.id} />;
}
