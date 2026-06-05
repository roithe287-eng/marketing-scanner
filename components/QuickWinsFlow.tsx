import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  quickWins: NonNullable<MarketingReport["quickWinsDetailed"]>;
};

export default function QuickWinsFlow({ quickWins }: Props) {
  if (!quickWins || quickWins.length === 0) return null;

  return (
    <div className="jm-card mt-8 p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        QUICK WINS
      </p>
      <h3 className="mt-2 text-2xl font-black">오늘 바로 적용 가능한 개선</h3>
      <p className="mt-2 text-sm text-jm-gray">
        각 항목별로 단계별 실행 플로우와 Before/After 예시를 함께 제공합니다.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {quickWins.map((win, idx) => (
          <div
            key={idx}
            className="rounded-2xl border-2 border-jm-border p-5 flex flex-col"
          >
            {/* 제목 */}
            <div className="flex items-start gap-3">
              <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-red text-white text-sm font-black">
                {idx + 1}
              </span>
              <h4 className="font-black text-base leading-snug">{win.title}</h4>
            </div>

            {/* 단계별 플로우 */}
            {win.steps && win.steps.length > 0 && (
              <div className="mt-4 pl-2">
                <p className="text-[10px] font-black tracking-wider text-jm-gray mb-2">
                  STEP BY STEP
                </p>
                <ol className="space-y-2.5">
                  {win.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex gap-2 text-xs leading-6">
                      <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-jm-black text-white text-[10px] font-bold">
                        {sIdx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Before / After */}
            {(win.beforeExample || win.afterExample) && (
              <div className="mt-auto pt-4">
                <div className="grid grid-cols-1 gap-2">
                  {win.beforeExample && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 border-l-4 border-jm-red">
                      <p className="text-[10px] font-black tracking-wider text-jm-red">
                        BEFORE
                      </p>
                      <p className="mt-1 text-xs leading-5">
                        {win.beforeExample}
                      </p>
                    </div>
                  )}
                  {win.afterExample && (
                    <div className="rounded-xl bg-green-50 px-3 py-2 border-l-4 border-green-500">
                      <p className="text-[10px] font-black tracking-wider text-green-700">
                        AFTER
                      </p>
                      <p className="mt-1 text-xs leading-5 font-medium">
                        {win.afterExample}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
