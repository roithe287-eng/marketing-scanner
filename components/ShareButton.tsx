"use client";

import { useState } from "react";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  report: MarketingReport;
};

export default function ShareButton({ report }: Props) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (shareUrl) {
      // 이미 생성된 링크면 복사만
      await copyToClipboard(shareUrl);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError("공유 링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.id) {
        setError(data?.message || "공유 링크 생성에 실패했습니다.");
        return;
      }
      const url = `${window.location.origin}/r/${data.id}`;
      setShareUrl(url);
      await copyToClipboard(url);

      // Web Share API 지원 시 네이티브 공유 시트 띄우기
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${report.meta?.siteName || "마케팅 진단"} 결과`,
            text:
              report.oneLineSummary ||
              `${report.meta?.siteName || ""} 마케팅 진단 결과 (${report.overallScore}점/100)`,
            url,
          });
        } catch {
          // 사용자가 공유 시트 닫음 - 무시
        }
      }
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 무시
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        onClick={handleShare}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-jm-border bg-white px-5 py-3 text-sm font-bold text-jm-black hover:bg-jm-light-gray transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-jm-light-gray border-t-jm-red" />
            <span>공유 링크 생성 중...</span>
          </>
        ) : copied ? (
          <>
            <span>✓</span>
            <span>링크가 복사되었습니다!</span>
          </>
        ) : shareUrl ? (
          <>
            <span>🔗</span>
            <span>링크 다시 복사</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>결과 공유하기</span>
          </>
        )}
      </button>

      {shareUrl && (
        <div className="text-xs text-jm-gray break-all rounded-lg bg-jm-light-gray p-3">
          <p className="font-bold mb-1">공유 URL (카톡·문자·SNS에 붙여넣기)</p>
          <p className="break-all">{shareUrl}</p>
          <p className="mt-2 text-jm-gray">
            ※ 링크는 30일 후 자동 만료됩니다.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-jm-red font-bold">{error}</p>
      )}
    </div>
  );
}
