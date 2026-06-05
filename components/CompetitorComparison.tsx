import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  competitorAnalysis: NonNullable<MarketingReport["competitorAnalysis"]>;
  ourUrl: string;
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function CompetitorComparison({
  competitorAnalysis,
  ourUrl,
}: Props) {
  const ourDomain = getDomainFromUrl(ourUrl);

  return (
    <div className="jm-card mt-8 p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        COMPETITIVE LANDSCAPE
      </p>
      <h3 className="mt-2 text-2xl font-black">동종업종 검색 상단 경쟁사 비교</h3>
      <p className="mt-2 text-sm text-jm-gray leading-6">
        <span className="font-bold text-jm-black">"{competitorAnalysis.searchKeyword}"</span> 키워드 기준 네이버 검색
        상위 사이트들이 강조하는 메시지와 우리 사이트를 비교했습니다.
      </p>

      {/* 전체 경쟁 환경 요약 */}
      {competitorAnalysis.overallComparison && (
        <div className="mt-6 rounded-2xl bg-jm-light-gray p-5">
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            경쟁 환경 요약
          </p>
          <p className="mt-2 text-sm leading-7">
            {competitorAnalysis.overallComparison}
          </p>
        </div>
      )}

      {/* 경쟁사 카드 그리드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {competitorAnalysis.competitors.map((comp) => (
          <div
            key={comp.rank}
            className="rounded-2xl border-2 border-jm-border p-5 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black">
                {comp.rank}
              </span>
              <a
                href={comp.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-jm-gray hover:text-jm-red truncate ml-2 max-w-[180px]"
                title={comp.domain}
              >
                {comp.domain} ↗
              </a>
            </div>

            <h4 className="mt-3 font-black text-base leading-snug line-clamp-2">
              {comp.metaTitle || comp.title}
            </h4>

            {comp.metaDescription && (
              <p className="mt-2 text-xs text-jm-gray leading-6 line-clamp-3">
                {comp.metaDescription}
              </p>
            )}

            {/* 핵심 메시지 (AI 분석) */}
            {comp.keyMessage && (
              <div className="mt-4 rounded-xl bg-jm-red/[0.08] p-3 border-l-4 border-jm-red">
                <p className="text-[10px] font-black tracking-wider text-jm-red">
                  강조 메시지
                </p>
                <p className="mt-1 text-xs leading-6 font-medium">
                  {comp.keyMessage}
                </p>
              </div>
            )}

            {/* 우리와의 차이 */}
            {comp.differentiation && (
              <div className="mt-3 rounded-xl bg-jm-light-gray p-3">
                <p className="text-[10px] font-black tracking-wider text-jm-gray">
                  우리와의 차이
                </p>
                <p className="mt-1 text-xs leading-6">
                  {comp.differentiation}
                </p>
              </div>
            )}

            {/* CTA 버튼 */}
            {comp.ctaTexts && comp.ctaTexts.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-black tracking-wider text-jm-gray">
                  CTA 버튼
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {comp.ctaTexts.map((cta, i) => (
                    <span
                      key={i}
                      className="inline-block rounded-full bg-jm-black px-2 py-0.5 text-[10px] font-bold text-white"
                    >
                      {cta}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {comp.fetchError && (
              <p className="mt-3 text-[10px] text-jm-gray italic">
                * 사이트 접근 제한 (검색 결과 기반 분석)
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 우리 사이트 비교 카드 */}
      <div className="mt-6 rounded-2xl border-2 border-jm-red p-5 bg-jm-red/[0.04]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-jm-red px-3 py-1 text-xs font-black text-white">
            우리 사이트
          </span>
          <span className="text-xs text-jm-gray">{ourDomain}</span>
        </div>
        <h4 className="mt-3 font-black text-base">
          {competitorAnalysis.competitors.length > 0 &&
          competitorAnalysis.competitors[0].metaTitle
            ? competitorAnalysis.competitors[0].metaTitle
            : ""}
        </h4>
      </div>

      {/* AI 포지셔닝 제안 */}
      {competitorAnalysis.ourPositioning && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-jm-black p-6 text-white">
          <p className="text-xs font-black tracking-wider text-jm-red">
            JINJJA MARKETING 포지셔닝 제안
          </p>
          <p className="mt-3 text-base leading-7 font-medium">
            {competitorAnalysis.ourPositioning}
          </p>
        </div>
      )}
    </div>
  );
}
