"use client";

import { useState } from "react";

type Props = {
  onSubmit: (url: string, geoQuestions?: string[]) => void;
  loading: boolean;
};

export default function UrlForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [questions, setQuestions] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      alert("분석할 URL을 입력해주세요.");
      return;
    }
    const rows = questions.split("\n").map(s => s.trim()).filter(Boolean);
    if (rows.length > 5 || rows.some(s => s.length < 5 || s.length > 250)) {
      alert("질문은 한 줄에 하나씩 최대 5개, 각 5~250자로 입력해주세요."); return;
    }
    onSubmit(url.trim(), rows.length ? rows : undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl rounded-3xl border border-jm-border bg-white p-3 shadow-xl"
    >
      <div className="flex flex-col gap-3 md:flex-row"><input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="예: https://prorealmkt.com"
        className="min-h-[56px] flex-1 rounded-full px-6 text-base outline-none placeholder:text-jm-gray"
        disabled={loading}
        inputMode="url"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={loading}
        className="jm-button min-h-[56px] px-8"
      >
        {loading ? "분석 중..." : "무료 진단하기"}
      </button></div>
      <details className="px-4 py-2 text-left text-sm">
        <summary className="cursor-pointer text-jm-gray">GEO 고객 질문 직접 입력 (선택)</summary>
        <label htmlFor="geo-questions" className="block my-2 text-xs text-jm-gray">한 줄에 질문 하나씩 최대 5개. 비워두면 사이트에 맞춰 생성합니다.</label>
        <textarea id="geo-questions" value={questions} onChange={e => setQuestions(e.target.value)} disabled={loading} rows={4} maxLength={1254} className="w-full rounded-xl border p-3" placeholder="고객이 실제 상담에서 물어보는 질문을 입력하세요." />
      </details>
    </form>
  );
}
