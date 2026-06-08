type Issue = {
  title: string;
  problem: string;
  reason: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
  badExample?: string;
  goodExample?: string;
  exampleNote?: string;
};

type Props = {
  issue: Issue;
  index: number;
};

const priorityLabel: Record<Issue["priority"], string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

const priorityColor: Record<Issue["priority"], string> = {
  high: "bg-jm-red text-white",
  medium: "bg-jm-black text-white",
  low: "bg-jm-light-gray text-jm-black",
};

export default function DiagnosisCard({ issue, index }: Props) {
  const hasExample = !!(issue.badExample || issue.goodExample);

  return (
    <div
      className="jm-card p-5 md:p-6"
      style={{
        breakInside: "avoid",
        pageBreakInside: "avoid",
        overflow: "hidden",
      }}
    >
      {/* 헤더: 좌측 타이틀 + 우측 우선순위 라벨 */}
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-wider text-jm-red">
            ISSUE {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-base md:text-xl font-black leading-snug break-keep pr-2">
            {issue.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] md:text-xs font-bold whitespace-nowrap ${
            priorityColor[issue.priority]
          }`}
        >
          우선순위 {priorityLabel[issue.priority]}
        </span>
      </div>

      {/* 문제점/판단근거/개선방향 */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            문제점
          </p>
          <p className="mt-2 text-sm leading-7 break-keep">{issue.problem}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            판단 근거
          </p>
          <p className="mt-2 text-sm leading-7 break-keep">{issue.reason}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            개선 방향
          </p>
          <p className="mt-2 text-sm leading-7 font-medium break-keep">
            {issue.recommendation}
          </p>
        </div>
      </div>

      {/* 안된 예시 / 잘된 예시 비교 */}
      {hasExample && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {issue.badExample && (
            <div
              className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 min-w-0"
              style={{ overflow: "hidden", boxSizing: "border-box" }}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-jm-red text-white text-xs font-black">
                  ✕
                </span>
                <span className="text-xs font-black tracking-wider text-jm-red">
                  현재 (개선 전)
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 font-medium text-jm-charcoal break-words break-keep">
                {issue.badExample}
              </p>
            </div>
          )}

          {issue.goodExample && (
            <div
              className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-4 min-w-0"
              style={{ overflow: "hidden", boxSizing: "border-box" }}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-black">
                  ✓
                </span>
                <span className="text-xs font-black tracking-wider text-green-700">
                  추천 (개선 후)
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 font-bold text-jm-charcoal break-words break-keep">
                {issue.goodExample}
              </p>
            </div>
          )}
        </div>
      )}

      {issue.exampleNote && hasExample && (
        <p className="mt-3 text-xs text-jm-gray italic leading-6 break-keep">
          💡 {issue.exampleNote}
        </p>
      )}
    </div>
  );
}
