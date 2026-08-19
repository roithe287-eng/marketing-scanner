"use client";

/**
 * v46-W2-1: 키워드 분포 리포트 카드 (독자 디자인 — 저작권 리스크 제거)
 * - 표 컬럼·용어를 자체 표현으로 작성 (네이버 '키워드 요약'과 무관한 독자 구성)
 * - 비중 막대그래프로 시각 차별화 · 단어/연속어구 탭 구조
 * - 규칙 기반 결과 표시 (keywordFrequency 필드) · 데이터 없으면 자동 숨김
 */

import { useState } from "react";
import type { KeywordFrequency } from "../lib/reportSchema";

type Props = {
  frequency?: KeywordFrequency | null;
};

function IncludeDot({ on }: { on: boolean }) {
  return on ? (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"
      title="포함됨"
    />
  ) : (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full bg-neutral-200"
      title="없음"
    />
  );
}

function FreqTable({
  items,
  totalLabel,
}: {
  items: any[];
  totalLabel: string;
}) {
  if (!items || items.length === 0) {
    return (
      <p className="text-[13px] text-neutral-400 py-4 text-center">
        두 번 이상 반복되는 표현이 없습니다.
      </p>
    );
  }
  const max = items[0].count;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="px-3 py-2 text-[11px] md:text-[12px] font-bold text-neutral-500 w-8">
              순위
            </th>
            <th className="px-3 py-2 text-[11px] md:text-[12px] font-bold text-neutral-500 min-w-[140px]">
              표현 · 비중
            </th>
            <th className="px-3 py-2 text-[11px] md:text-[12px] font-bold text-neutral-500 text-right">
              등장 횟수
            </th>
            <th className="px-3 py-2 text-[11px] md:text-[12px] font-bold text-neutral-500 text-center">
              제목
            </th>
            <th className="px-3 py-2 text-[11px] md:text-[12px] font-bold text-neutral-500 text-center">
              요약문
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((k, i) => (
            <tr
              key={k.keyword}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/60"
            >
              <td className="px-3 py-2 text-[11px] md:text-[12px] text-neutral-400 tabular-nums">
                {i + 1}
              </td>
              <td className="px-3 py-2">
                <div className="text-[13px] md:text-[14px] font-semibold text-neutral-900 break-all mb-1">
                  {k.keyword}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-700"
                      style={{ width: `${Math.max(6, (k.count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] md:text-[11px] text-neutral-400 tabular-nums">
                    {k.density.toFixed(2)}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-[12px] md:text-[13px] text-neutral-700 text-right tabular-nums">
                {k.count}회
              </td>
              <td className="px-3 py-2 text-center">
                <IncludeDot on={k.inTitle} />
              </td>
              <td className="px-3 py-2 text-center">
                <IncludeDot on={k.inMetaDescription} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[10px] md:text-[11px] text-neutral-400 bg-neutral-50 border-t border-neutral-200">
        상위 {items.length}개 · {totalLabel} · ● 제목·요약문 포함 / ○ 미포함
      </p>
    </div>
  );
}

export default function KeywordFrequencyCard({ frequency }: Props) {
  const [tab, setTab] = useState<"singles" | "phrases">("singles");
  if (!frequency) return null;

  const { totalTokens, uniqueSingles, uniquePhrases, singles, phrases } =
    frequency;

  const titleMissing = singles.filter((k) => !k.inTitle).slice(0, 5);
  const metaMissing = singles.filter((k) => !k.inMetaDescription).slice(0, 5);

  return (
    <section className="jm-card p-5 md:p-7 lg:p-8">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[20px] md:text-[22px]">📊</span>
          <h3 className="text-[20px] md:text-[24px] lg:text-[26px] font-extrabold text-neutral-900 leading-tight">
            키워드 분포 리포트
          </h3>
        </div>
        <p className="text-[13px] md:text-[15px] text-neutral-500 leading-relaxed">
          이 페이지가 실제로 어떤 말을 반복해서 말하고 있는지 집계했습니다.
          자주 나오는 표현이 제목·요약문에도 담겨 있어야 검색엔진이 페이지
          주제를 정확히 짚어냅니다.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5 md:mb-6">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 md:p-5 text-center">
          <div className="text-[22px] md:text-[30px] font-extrabold text-neutral-900 leading-none tabular-nums">
            {totalTokens.toLocaleString()}
          </div>
          <div className="text-[11px] md:text-[13px] font-semibold text-neutral-500 mt-1.5">
            분석한 단어 수
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 md:p-5 text-center">
          <div className="text-[22px] md:text-[30px] font-extrabold text-neutral-900 leading-none tabular-nums">
            {uniqueSingles.toLocaleString()}
          </div>
          <div className="text-[11px] md:text-[13px] font-semibold text-neutral-500 mt-1.5">
            서로 다른 단어
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 md:p-5 text-center">
          <div className="text-[22px] md:text-[30px] font-extrabold text-neutral-900 leading-none tabular-nums">
            {uniquePhrases.toLocaleString()}
          </div>
          <div className="text-[11px] md:text-[13px] font-semibold text-neutral-500 mt-1.5">
            서로 다른 연속어구
          </div>
        </div>
      </div>

      {/* 인사이트 */}
      {(titleMissing.length > 0 || metaMissing.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 md:p-4 mb-5 md:mb-6">
          <p className="text-[13px] md:text-[14px] font-bold text-amber-800 mb-1">
            💬 자주 말하는데 제목엔 없는 표현이 있습니다
          </p>
          <p className="text-[12px] md:text-[13px] text-amber-700 leading-relaxed break-words">
            {titleMissing.length > 0 && (
              <>
                본문엔 반복되는데 제목엔 없음:{" "}
                <strong>{titleMissing.map((k) => k.keyword).join(", ")}</strong>
                {" · "}
              </>
            )}
            {metaMissing.length > 0 && (
              <>
                요약문에도 없음:{" "}
                <strong>{metaMissing.map((k) => k.keyword).join(", ")}</strong>
              </>
            )}
          </p>
          <p className="text-[11px] md:text-[12px] text-amber-600 mt-1 leading-relaxed">
            위 표현 중 사업의 핵심인 것을 골라 제목과 요약문에 자연스럽게
            녹여보세요. 본문 주제와 검색 노출 키워드가 일치해집니다.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-3 md:mb-4">
        <button
          type="button"
          onClick={() => setTab("singles")}
          className={`px-4 py-2 rounded-full text-[13px] md:text-[14px] font-bold border transition-colors ${
            tab === "singles"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
          }`}
        >
          단어 단위
        </button>
        <button
          type="button"
          onClick={() => setTab("phrases")}
          className={`px-4 py-2 rounded-full text-[13px] md:text-[14px] font-bold border transition-colors ${
            tab === "phrases"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
          }`}
        >
          연속어구 단위
        </button>
      </div>

      {tab === "singles" ? (
        <FreqTable
          items={singles}
          totalLabel={`전체 ${uniqueSingles.toLocaleString()}종`}
        />
      ) : (
        <FreqTable
          items={phrases}
          totalLabel={`전체 ${uniquePhrases.toLocaleString()}종`}
        />
      )}

      <p className="mt-4 text-[11px] md:text-[12px] text-neutral-400 leading-relaxed">
        * 진짜마케팅이 자체 개발한 집계 도구의 결과입니다. 단어를 규칙 기반으로
        나눈 근사치라 전문 형태소 분석과는 다를 수 있으며, 특정 포털의 분석
        서비스와 무관합니다.
      </p>
    </section>
  );
}
