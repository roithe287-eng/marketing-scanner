"use client";

import { useState } from "react";

type Props = {
  onSubmit: (url: string) => void;
  loading: boolean;
};

export default function UrlForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      alert("분석할 URL을 입력해주세요.");
      return;
    }
    onSubmit(url.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-3xl flex-col gap-3 rounded-3xl md:rounded-full border border-jm-border bg-white p-2 shadow-xl md:flex-row"
    >
      <input
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
      </button>
    </form>
  );
}
