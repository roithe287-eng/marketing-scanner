import { ChecklistItem } from "@/lib/reportSchema";

type Props = {
  checklist: ChecklistItem[];
};

const statusConfig = {
  pass: {
    icon: "✓",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    label: "양호",
  },
  warning: {
    icon: "!",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    label: "주의",
  },
  fail: {
    icon: "✕",
    color: "text-jm-red",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "보강 필요",
  },
};

const categoryLabel: Record<ChecklistItem["category"], string> = {
  seo: "SEO 기본",
  content: "콘텐츠",
  trust: "신뢰",
  conversion: "전환/CTA",
};

const categoryColor: Record<ChecklistItem["category"], string> = {
  seo: "bg-blue-100 text-blue-700",
  content: "bg-purple-100 text-purple-700",
  trust: "bg-amber-100 text-amber-700",
  conversion: "bg-emerald-100 text-emerald-700",
};

export default function DiagnosisChecklist({ checklist }: Props) {
  if (!checklist || checklist.length === 0) return null;

  const passCount = checklist.filter((c) => c.status === "pass").length;
  const warnCount = checklist.filter((c) => c.status === "warning").length;
  const failCount = checklist.filter((c) => c.status === "fail").length;

  return (
    <div className="jm-card mt-8 p-6 md:p-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red">
            DIAGNOSIS CHECKLIST
          </p>
          <h3 className="mt-2 text-xl md:text-2xl font-black">
            마케팅 관점 12가지 진단 체크리스트
          </h3>
          <p className="mt-2 text-sm text-jm-gray">
            항목별로 사이트의 실제 값과 진단 결과를 정리했습니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-bold text-green-700">
            ✓ 양호 {passCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 font-bold text-yellow-700">
            ! 주의 {warnCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 font-bold text-jm-red">
            ✕ 보강 {failCount}
          </span>
        </div>
      </div>

      {/* 데스크탑: 테이블 형태 (md 이상) */}
      <div className="hidden md:block mt-6 overflow-hidden rounded-2xl border border-jm-border">
        <div className="grid grid-cols-[140px_60px_1fr_1fr_1fr] gap-4 bg-jm-light-gray px-5 py-3 text-xs font-black tracking-wider text-jm-gray">
          <div>항목</div>
          <div className="text-center">상태</div>
          <div>현재 값</div>
          <div>진단</div>
          <div>가이드</div>
        </div>

        <div className="divide-y divide-jm-border">
          {checklist.map((item) => {
            const cfg = statusConfig[item.status] || statusConfig.warning;
            return (
              <div
                key={item.id}
                className="grid grid-cols-[140px_60px_1fr_1fr_1fr] gap-4 px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">{item.label}</span>
                  <span
                    className={`inline-block self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      categoryColor[item.category]
                    }`}
                  >
                    {categoryLabel[item.category]}
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${cfg.bg} ${cfg.color} text-base font-black`}
                    title={cfg.label}
                  >
                    {cfg.icon}
                  </span>
                </div>

                <div>
                  <p className="text-xs leading-6 text-jm-charcoal break-all line-clamp-3">
                    {item.currentValue || "(없음)"}
                  </p>
                </div>

                <div>
                  <p className="text-xs leading-6">{item.diagnosis}</p>
                </div>

                <div>
                  <p className="text-xs leading-6 font-medium">{item.guide}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모바일: 카드 형태 (md 미만) */}
      <div className="md:hidden mt-6 space-y-3">
        {checklist.map((item) => {
          const cfg = statusConfig[item.status] || statusConfig.warning;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-4`}
            >
              {/* 상단: 상태 아이콘 + 항목명 + 카테고리 */}
              <div className="flex items-start gap-3">
                <span
                  className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white ${cfg.color} text-lg font-black shadow-sm`}
                  title={cfg.label}
                >
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-black text-sm">{item.label}</h4>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        categoryColor[item.category]
                      }`}
                    >
                      {categoryLabel[item.category]}
                    </span>
                  </div>
                  <p className={`mt-1 text-[10px] font-bold ${cfg.color}`}>
                    {cfg.label}
                  </p>
                </div>
              </div>

              {/* 본문: 현재값/진단/가이드 (세로로 stacked) */}
              <div className="mt-4 space-y-3 bg-white rounded-xl p-3">
                <div>
                  <p className="text-[10px] font-black tracking-wider text-jm-gray">
                    현재 값
                  </p>
                  <p className="mt-1 text-xs leading-6 text-jm-charcoal break-all">
                    {item.currentValue || "(없음)"}
                  </p>
                </div>
                <div className="pt-2 border-t border-jm-border">
                  <p className="text-[10px] font-black tracking-wider text-jm-gray">
                    진단
                  </p>
                  <p className="mt-1 text-xs leading-6">{item.diagnosis}</p>
                </div>
                <div className="pt-2 border-t border-jm-border">
                  <p className="text-[10px] font-black tracking-wider text-jm-gray">
                    가이드
                  </p>
                  <p className="mt-1 text-xs leading-6 font-medium">
                    {item.guide}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
