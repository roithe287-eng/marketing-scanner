"use client";

/**
 * v45-W1: AI 인용 시뮬레이션 결과 카드
 * - ChatGPT + Gemini 2엔진 × 4질문 = 8회 테스트 결과 표시
 * - 매트릭스 뷰 + 엔진별 점수 + 개선 액션
 * - 데이터 없으면 자동 숨김
 */

import type { LlmCitationTest } from "../lib/reportSchema";

type Props = {
  citation?: LlmCitationTest | null;
};

function gradeColor(grade?: string) {
  switch (grade) {
    case "A":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "B":
      return "text-sky-600 bg-sky-50 border-sky-200";
    case "C":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "D":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "F":
    default:
      return "text-rose-600 bg-rose-50 border-rose-200";
  }
}

function engineLabel(engine: "chatgpt" | "gemini") {
  return engine === "chatgpt" ? "ChatGPT" : "Gemini";
}

function engineIcon(engine: "chatgpt" | "gemini") {
  return engine === "chatgpt" ? "🤖" : "✨";
}

function questionTypeLabel(t: "brand" | "industry" | "service" | "local") {
  switch (t) {
    case "brand":
      return "브랜드 인지";
    case "industry":
      return "업종 추천";
    case "service":
      return "서비스 문의";
    case "local":
      return "지역/특성";
  }
}

function CitationCell({
  cited,
  rank,
}: {
  cited: boolean;
  rank: number | null | undefined;
}) {
  if (!cited) {
    return (
      <div className="flex items-center justify-center py-2 px-2 md:px-3 rounded-lg bg-rose-50 border border-rose-100">
        <span className="text-[13px] md:text-[14px] font-semibold text-rose-600">
          ❌ 없음
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-2 px-2 md:px-3 rounded-lg bg-emerald-50 border border-emerald-100">
      <span className="text-[13px] md:text-[14px] font-semibold text-emerald-700 whitespace-nowrap">
        ✅ {rank ? `${rank}번째` : "인용됨"}
      </span>
    </div>
  );
}

export default function LlmCitationCard({ citation }: Props) {
  if (!citation) return null;

  const {
    overallScore,
    grade,
    citationRate,
    totalTests,
    totalCited,
    summary,
    results,
    engineScores,
    priorityActions,
  } = citation;

  // 질문 유니크 리스트 (순서 유지)
  const questionsMap = new Map<
    string,
    { question: string; type: "brand" | "industry" | "service" | "local" }
  >();
  for (const r of results) {
    if (!questionsMap.has(r.question)) {
      questionsMap.set(r.question, { question: r.question, type: r.questionType });
    }
  }
  const questions = Array.from(questionsMap.values());

  // 질문 × 엔진 조회 함수
  const findResult = (question: string, engine: "chatgpt" | "gemini") =>
    results.find((r) => r.question === question && r.engine === engine);

  const gColor = gradeColor(grade);

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">🤖</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            AI 답변 인용 시뮬레이션
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          ChatGPT · Gemini 2개 AI 엔진에 실제 질문을 던져 사이트가 답변에
          인용되는지 실증 테스트합니다. 총 {totalTests}회 테스트.
        </p>
      </div>

      {/* Summary strip: 종합점수 / 인용률 / 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5 md:mb-6">
        <div
          className={`rounded-2xl border p-4 md:p-5 ${gColor} flex items-center justify-between`}
        >
          <div>
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide opacity-80">
              종합 점수
            </div>
            <div className="text-[13px] md:text-[14px] mt-0.5 opacity-80">
              등급 {grade || "-"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[34px] md:text-[40px] font-extrabold leading-none tabular-nums">
              {overallScore}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:p-5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
              인용률
            </div>
            <div className="text-[13px] md:text-[14px] mt-0.5 text-neutral-500">
              {totalCited} / {totalTests} 성공
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[28px] md:text-[34px] font-extrabold text-neutral-900 leading-none tabular-nums">
              {citationRate}%
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
          <div className="text-[12px] md:text-[13px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
            AI 총평
          </div>
          <p className="text-[14px] md:text-[15px] text-neutral-900 font-semibold leading-snug break-words">
            {summary}
          </p>
        </div>
      </div>

      {/* 엔진별 점수 */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[18px]">🤖</span>
            <span className="text-[14px] md:text-[15px] font-bold text-neutral-900">
              ChatGPT
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[24px] md:text-[28px] font-extrabold text-neutral-900 tabular-nums">
              {engineScores.chatgpt}
            </span>
            <span className="text-[12px] md:text-[13px] text-neutral-500 pb-1">
              /100
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, engineScores.chatgpt))}%`,
              }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[18px]">✨</span>
            <span className="text-[14px] md:text-[15px] font-bold text-neutral-900">
              Gemini
            </span>
            <span className="text-[10px] md:text-[11px] text-neutral-500 border border-neutral-200 rounded-full px-1.5 py-0.5">
              Google Search
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[24px] md:text-[28px] font-extrabold text-neutral-900 tabular-nums">
              {engineScores.gemini}
            </span>
            <span className="text-[12px] md:text-[13px] text-neutral-500 pb-1">
              /100
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, engineScores.gemini))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 매트릭스: 질문 × 엔진 */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden mb-5 md:mb-6">
        <div className="p-4 md:p-5 border-b border-neutral-100">
          <h4 className="text-[15px] md:text-[17px] font-bold text-neutral-900">
            질문별 인용 결과
          </h4>
        </div>
        <div className="divide-y divide-neutral-100">
          {questions.map((q, idx) => {
            const chatgptResult = findResult(q.question, "chatgpt");
            const geminiResult = findResult(q.question, "gemini");
            return (
              <div key={idx} className="p-3 md:p-4">
                <div className="mb-2">
                  <span className="inline-block text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                    Q{idx + 1} · {questionTypeLabel(q.type)}
                  </span>
                  <p className="text-[14px] md:text-[15px] text-neutral-900 font-semibold break-words leading-snug">
                    {q.question}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div>
                    <div className="flex items-center gap-1 mb-1 text-[11px] md:text-[12px] font-semibold text-neutral-500">
                      <span>🤖</span>
                      <span>ChatGPT</span>
                    </div>
                    <CitationCell
                      cited={!!chatgptResult?.cited}
                      rank={chatgptResult?.citationRank}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1 text-[11px] md:text-[12px] font-semibold text-neutral-500">
                      <span>✨</span>
                      <span>Gemini</span>
                    </div>
                    <CitationCell
                      cited={!!geminiResult?.cited}
                      rank={geminiResult?.citationRank}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우선 액션 */}
      {priorityActions && priorityActions.length > 0 && (
        <div className="rounded-2xl border border-neutral-900 bg-neutral-900 text-white p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">💡</span>
            <h4 className="text-[16px] md:text-[18px] font-extrabold">
              AI 인용률 개선 액션
            </h4>
          </div>
          <ol className="space-y-2">
            {priorityActions.slice(0, 5).map((action, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-[14px] md:text-[15px] leading-relaxed"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-white text-neutral-900 font-bold flex items-center justify-center text-[13px] tabular-nums">
                  {idx + 1}
                </span>
                <span className="break-words">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
