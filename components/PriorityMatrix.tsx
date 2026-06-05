import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  roadmap: MarketingReport["priorityRoadmap"];
};

export default function PriorityMatrix({ roadmap }: Props) {
  const phases = [
    {
      title: "즉시",
      subtitle: "Day 0",
      desc: "오늘 바로",
      items: roadmap.immediately,
      color: "bg-jm-red",
      bgLight: "bg-red-50",
      border: "border-jm-red",
    },
    {
      title: "이번 주",
      subtitle: "Week 1",
      desc: "7일 안에",
      items: roadmap.thisWeek,
      color: "bg-jm-black",
      bgLight: "bg-gray-50",
      border: "border-jm-black",
    },
    {
      title: "이번 달",
      subtitle: "Month 1",
      desc: "30일 안에",
      items: roadmap.thisMonth,
      color: "bg-jm-gray",
      bgLight: "bg-gray-50",
      border: "border-jm-gray",
    },
  ];

  return (
    <div className="jm-card mt-8 p-8">
      <p className="text-xs font-black tracking-wider text-jm-red">
        PRIORITY ROADMAP
      </p>
      <h3 className="mt-2 text-2xl font-black">개선 우선순위 로드맵</h3>
      <p className="mt-2 text-sm text-jm-gray">
        시점별로 추진해야 할 핵심 액션입니다.
      </p>

      {/* 타임라인 도식화 */}
      <div className="mt-8 relative">
        {/* 가로 라인 (데스크탑) */}
        <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-1 bg-gradient-to-r from-jm-red via-jm-black to-jm-gray rounded-full" />

        <div className="grid gap-6 md:grid-cols-3 relative">
          {phases.map((phase, idx) => (
            <div key={phase.title} className="flex flex-col items-center">
              {/* 동그란 마커 */}
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${phase.color} text-white font-black text-sm shadow-lg`}
                >
                  {idx + 1}
                </div>
                <span className="mt-2 text-[10px] font-black tracking-wider text-jm-gray">
                  {phase.subtitle}
                </span>
              </div>

              {/* 카드 */}
              <div
                className={`mt-4 w-full rounded-2xl border-2 ${phase.border} ${phase.bgLight} p-5`}
              >
                <div className="flex items-baseline justify-between">
                  <h4 className="text-lg font-black">{phase.title}</h4>
                  <span className="text-xs font-bold text-jm-gray">
                    {phase.desc}
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {phase.items?.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-6"
                    >
                      <span className="shrink-0 mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-jm-black" />
                      <span>{item}</span>
                    </li>
                  ))}
                  {(!phase.items || phase.items.length === 0) && (
                    <li className="text-sm text-jm-gray italic">
                      해당 시점 액션 없음
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
