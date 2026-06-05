import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  report: MarketingReport;
};

export default function FinalCTA({ report }: Props) {
  const consultUrl =
    process.env.NEXT_PUBLIC_CONSULT_URL || "https://prorealmkt.com/contact";
  const brandUrl =
    process.env.NEXT_PUBLIC_BRAND_URL || "https://prorealmkt.com";

  return (
    <div className="mt-10 overflow-hidden rounded-[32px] bg-jm-black text-white">
      <div className="grid gap-8 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red">
            JINJJA MARKETING CONSULTING
          </p>
          <h3 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
            {report.finalCta?.title ||
              "광고비를 늘리기 전에, 전환 흐름부터 점검하세요."}
          </h3>
          <p className="mt-5 max-w-2xl text-base leading-8 text-gray-300 md:text-lg">
            {report.finalCta?.description ||
              "현재 사이트의 문제는 광고 세팅만의 문제가 아닐 수 있습니다. 첫 화면, CTA, 카피, 신뢰 요소, 랜딩 흐름까지 함께 개선해야 광고 효율이 안정적으로 올라갑니다."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={consultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="jm-button text-center"
            >
              {report.finalCta?.buttonText || "진짜마케팅 상담 신청하기"}
            </a>
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-4 text-center font-bold text-white hover:bg-white/10 transition"
            >
              진짜마케팅 소개 보기
            </a>
          </div>
        </div>
        <div className="rounded-3xl bg-white/[0.08] p-6">
          <p className="text-xs font-bold tracking-wider text-gray-300">
            상담 전 확인 포인트
          </p>
          <ul className="mt-5 space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="text-jm-red font-black">✓</span>
              <span>광고 성과가 낮은 원인이 세팅인지 랜딩인지 구분</span>
            </li>
            <li className="flex gap-3">
              <span className="text-jm-red font-black">✓</span>
              <span>전환율을 막는 첫 화면·CTA·카피 점검</span>
            </li>
            <li className="flex gap-3">
              <span className="text-jm-red font-black">✓</span>
              <span>메타·구글 광고 유입 기준의 랜딩 적합도 확인</span>
            </li>
            <li className="flex gap-3">
              <span className="text-jm-red font-black">✓</span>
              <span>바로 적용 가능한 개선 우선순위 제안</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
