type Issue = {
  title: string;
  problem: string;
  reason: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
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
  return (
    <div className="jm-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red">
            ISSUE {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-2 text-xl font-black leading-snug">
            {issue.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            priorityColor[issue.priority]
          }`}
        >
          우선순위 {priorityLabel[issue.priority]}
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            문제점
          </p>
          <p className="mt-2 text-sm leading-7">{issue.problem}</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            판단 근거
          </p>
          <p className="mt-2 text-sm leading-7">{issue.reason}</p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-wider text-jm-gray">
            개선 방향
          </p>
          <p className="mt-2 text-sm leading-7 font-medium">
            {issue.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
