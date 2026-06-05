import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  roadmap: MarketingReport["priorityRoadmap"];
};

export default function PriorityMatrix({ roadmap }: Props) {
  const columns = [
    {
      title: "즉시 개선",
      desc: "오늘 바로 바꿀 수 있는 항목",
      items: roadmap.immediately,
      accent: "border-jm-red",
      badge: "bg-jm-red",
    },
    {
      title: "이번 주 개선",
      desc: "기획과 수정이 필요한 항목",
      items: roadmap.thisWeek,
      accent: "border-jm-black",
      badge: "bg-jm-black",
    },
    {
      title: "이번 달 개선",
      desc: "성과 개선을 위해 누적 관리할 항목",
      items: roadmap.thisMonth,
      accent: "border-jm-border",
      badge: "bg-jm-gray",
    },
  ];

  return (
    <div className="jm-card p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        PRIORITY ROADMAP
      </p>
      <h3 className="mt-2 text-2xl font-black">개선 우선순위</h3>
      <p className="mt-2 text-sm text-jm-gray">
        효과 크기와 작업 난이도를 기준으로 정리한 실행 로드맵입니다.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.title}
            className={`rounded-2xl border-2 ${column.accent} p-5`}
          >
            <h4 className="text-lg font-black">{column.title}</h4>
            <p className="mt-1 text-xs text-jm-gray">{column.desc}</p>
            <ul className="mt-5 space-y-3">
              {column.items?.map((item, index) => (
                <li key={index} className="flex gap-2 leading-7 text-sm">
                  <span
                    className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${column.badge} text-[10px] font-bold text-white`}
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
              {(!column.items || column.items.length === 0) && (
                <li className="text-sm text-jm-gray">해당 항목 없음</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
