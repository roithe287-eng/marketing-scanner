import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  exampleCopy: MarketingReport["exampleCopy"];
  competitorAnalysis?: MarketingReport["competitorAnalysis"];
};

export default function CopyImprovement({
  exampleCopy,
  competitorAnalysis,
}: Props) {
  const hasCompetitors =
    competitorAnalysis &&
    competitorAnalysis.competitors &&
    competitorAnalysis.competitors.length > 0;

  // 경쟁사 카피 인사이트 자료 (메타 description, 검색결과 description, h1)
  const competitorCopies = hasCompetitors
    ? competitorAnalysis!.competitors
        .map((c) => ({
          domain: c.domain,
          metaDesc:
            c.metaDescription ||
            c.description ||
            "",
          h1: c.h1 || "",
        }))
        .filter((c) => c.metaDesc || c.h1)
    : [];

  return (
    <div className="jm-card mt-8 p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        COPY IMPROVEMENT
      </p>
      <h3 className="mt-2 text-2xl font-black">카피 개선 비교 분석</h3>
      <p className="mt-2 text-sm text-jm-gray">
        현재 사이트의 카피와 경쟁사 카피를 비교하고 개선된 예시를 제안합니다.
      </p>

      {/* 현재 vs 개선 카피 비교 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* 현재 카피 */}
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-jm-red text-white text-xs font-black">
              ✕
            </span>
            <span className="text-xs font-black tracking-wider text-jm-red">
              현재 우리 사이트
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                메인 헤드라인 (H1/Title)
              </p>
              <p className="mt-1 text-sm font-bold leading-7 break-words">
                {exampleCopy.currentHeroHeadline || "(추출 실패)"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                대표 CTA
              </p>
              <p className="mt-1 text-sm font-bold leading-7">
                {exampleCopy.currentCtaText || "(CTA 감지 안 됨)"}
              </p>
            </div>
          </div>
        </div>

        {/* 개선 카피 */}
        <div className="rounded-2xl border-2 border-green-300 bg-green-50/40 p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-black">
              ✓
            </span>
            <span className="text-xs font-black tracking-wider text-green-700">
              진짜마케팅 추천 카피
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                메인 헤드라인
              </p>
              <p className="mt-1 text-sm font-black leading-7">
                {exampleCopy.heroHeadline}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                서브 문구
              </p>
              <p className="mt-1 text-sm leading-7">
                {exampleCopy.subHeadline}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                CTA 버튼
              </p>
              <span className="mt-2 inline-block rounded-full bg-jm-red px-4 py-2 text-sm font-black text-white">
                {exampleCopy.ctaText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 경쟁사 카피 인사이트 */}
      {competitorCopies.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black">
              📊
            </span>
            <p className="text-xs font-black tracking-wider text-jm-charcoal">
              경쟁사 카피 비교 (네이버 파워링크/메타 설명)
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {competitorCopies.map((c, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-jm-border bg-white p-4"
              >
                <p className="text-[10px] font-bold tracking-wider text-jm-gray">
                  경쟁사 {idx + 1} · {c.domain}
                </p>
                {c.h1 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-jm-gray">H1</p>
                    <p className="mt-1 text-xs leading-6 font-bold line-clamp-2">
                      {c.h1}
                    </p>
                  </div>
                )}
                {c.metaDesc && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-jm-gray">
                      파워링크/메타 설명
                    </p>
                    <p className="mt-1 text-xs leading-6 line-clamp-3">
                      {c.metaDesc}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI 인사이트 */}
          {exampleCopy.competitorCopyInsight && (
            <div className="mt-4 rounded-2xl bg-jm-black p-5 text-white">
              <p className="text-[10px] font-black tracking-wider text-jm-red">
                JINJJA MARKETING INSIGHT
              </p>
              <p className="mt-2 text-sm leading-7">
                {exampleCopy.competitorCopyInsight}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
