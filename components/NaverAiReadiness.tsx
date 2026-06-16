import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  readiness: NonNullable<MarketingReport["naverAiReadiness"]>;
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  schema: { label: "schema.org 구조화 데이터", color: "bg-emerald-500" },
  tracking: { label: "전환 추적 스크립트", color: "bg-amber-500" },
  site_name: { label: "사이트 이름 (비즈채널)", color: "bg-sky-500" },
  content: { label: "콘텐츠 정비", color: "bg-violet-500" },
  mobile: { label: "모바일 / 크롤러 접근성", color: "bg-rose-500" },
};

const STATUS_STYLE: Record<
  "pass" | "warning" | "fail",
  { bg: string; border: string; text: string; icon: string; label: string }
> = {
  pass: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "✓",
    label: "통과",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "!",
    label: "보완 필요",
  },
  fail: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    icon: "✕",
    label: "미설정",
  },
};

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-lime-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-rose-600",
};

export default function NaverAiReadiness({ readiness }: Props) {
  const score = readiness.overallScore ?? 0;
  const grade =
    readiness.grade ||
    (score >= 85
      ? "A"
      : score >= 70
      ? "B"
      : score >= 50
      ? "C"
      : score >= 30
      ? "D"
      : "F");
  const gradeColor = GRADE_STYLE[grade] || "bg-jm-gray";

  // 카테고리별 그룹핑
  const checksByCategory: Record<string, typeof readiness.checks> = {};
  for (const c of readiness.checks || []) {
    const cat = c.category || "content";
    if (!checksByCategory[cat]) checksByCategory[cat] = [];
    checksByCategory[cat].push(c);
  }

  return (
    <div className="jm-card mt-8 p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-jm-red px-3 py-1 text-[10px] font-black tracking-wider text-white">
          NEW · 2026.7 정식 오픈
        </span>
        <p className="text-xs font-black tracking-wider text-jm-red">
          NAVER AI AD READINESS
        </p>
      </div>
      <h3 className="mt-2 text-2xl md:text-3xl font-black leading-tight">
        네이버 AI 광고 준비도 점검
      </h3>
      <p className="mt-2 text-sm text-jm-gray leading-6">
        네이버 AI 브리핑(월 3,000만 명) 지면에 노출되는 신규 광고 상품을 위한
        랜딩페이지·콘텐츠 준비도입니다. AI 에이전트가 광고 소재를 자동
        생성하므로 schema.org, 사이트 이름, 전환 스크립트가 핵심입니다.
      </p>

      {/* 점수 카드 */}
      <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border-2 border-jm-border p-5 md:p-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-end gap-2">
            <span className="text-6xl font-black text-jm-red">{score}</span>
            <span className="mb-2 text-lg font-bold text-jm-gray">/ 100</span>
          </div>
          <div
            className={`mt-3 inline-flex items-center justify-center rounded-full ${gradeColor} px-4 py-1.5 text-sm font-black text-white tracking-wider`}
          >
            등급 {grade}
          </div>
          <p className="mt-3 text-[11px] text-jm-gray leading-5">
            A 85~ · B 70~ · C 50~ · D 30~ · F 0~
          </p>
        </div>

        <div className="rounded-2xl bg-jm-light-gray p-5 md:p-6">
          <p className="text-xs font-black tracking-wider text-jm-gray">
            요약
          </p>
          <p className="mt-2 text-sm md:text-base leading-7 font-medium">
            {readiness.summary || "준비도 요약 정보가 제공되지 않았습니다."}
          </p>
          {readiness.notes && readiness.notes.length > 0 && (
            <div className="mt-4 space-y-1">
              {readiness.notes.map((n, i) => (
                <p key={i} className="text-xs text-jm-gray leading-6">
                  · {n}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 카테고리별 체크리스트 */}
      <div className="mt-6 space-y-4">
        {Object.entries(checksByCategory).map(([cat, checks]) => {
          const catMeta =
            CATEGORY_LABELS[cat] || { label: cat, color: "bg-jm-gray" };
          return (
            <div
              key={cat}
              className="rounded-2xl border-2 border-jm-border p-4 md:p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${catMeta.color}`}
                />
                <p className="text-xs font-black tracking-wider text-jm-charcoal">
                  {catMeta.label.toUpperCase()}
                </p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {checks.map((c) => {
                  const style = STATUS_STYLE[c.status] || STATUS_STYLE.warning;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl border ${style.border} ${style.bg} p-4`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-sm leading-5">
                          {c.label}
                        </p>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-black ${style.text}`}
                        >
                          <span>{style.icon}</span>
                          <span>{style.label}</span>
                        </span>
                      </div>
                      {c.weight && (
                        <p className="mt-1 text-[10px] text-jm-gray">
                          가중치 {c.weight}점
                        </p>
                      )}
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[10px] font-black tracking-wider text-jm-gray">
                            현재 값
                          </p>
                          <p className="mt-0.5 text-xs leading-5 break-words">
                            {c.currentValue || "(없음)"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black tracking-wider text-jm-gray">
                            진단
                          </p>
                          <p className="mt-0.5 text-xs leading-5">
                            {c.diagnosis}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black tracking-wider text-jm-red">
                            개선 가이드
                          </p>
                          <p className="mt-0.5 text-xs leading-5 font-medium">
                            {c.guide}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 출처 표기 */}
      <p className="mt-5 text-[10px] text-jm-gray leading-5">
        ※ 본 점검 기준은 네이버 검색광고 공지(ads.naver.com/notice/31888)의 AI
        광고 가이드라인을 기반으로 작성되었으며, 진짜마케팅의 분석 기준이
        혼합되어 있습니다.
      </p>
    </div>
  );
}
