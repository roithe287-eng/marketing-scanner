"use client";

import { useEffect, useRef, useState } from "react";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  report: MarketingReport;
  // v43: 경쟁사 분석 진행 중 여부 (page.tsx 의 competitorLoading)
  competitorLoading?: boolean;
  // v43: 공유 링크 생성 직후 ID 콜백 (page.tsx 가 sharedId 저장)
  onShareCreated?: (id: string) => void;
};

export default function ShareButton({
  report,
  competitorLoading = false,
  onShareCreated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // v43: 사용자가 공유 버튼을 눌렀지만 경쟁사 분석이 미완료여서 대기 중인지
  const [waitingForCompetitor, setWaitingForCompetitor] = useState(false);
  const waitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 헬퍼: 현재 report 에 경쟁사 데이터가 있는지
  function hasCompetitor(r: MarketingReport) {
    return (
      !!r.competitorAnalysis &&
      Array.isArray(r.competitorAnalysis.competitors) &&
      r.competitorAnalysis.competitors.length > 0
    );
  }

  async function createShareLink(currentReport: MarketingReport) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: currentReport }),
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
      onShareCreated?.(data.id); // v43: 부모에게 ID 전달
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

  /**
   * v43: 경쟁사 데이터가 도착하면 자동으로 공유 링크 생성
   * (waitingForCompetitor 가 true 인 동안만)
   */
  useEffect(() => {
    if (!waitingForCompetitor) return;
    if (hasCompetitor(report)) {
      // 경쟁사 데이터 도착! 대기 해제 후 즉시 공유
      if (waitTimeoutRef.current) {
        clearTimeout(waitTimeoutRef.current);
        waitTimeoutRef.current = null;
      }
      setWaitingForCompetitor(false);
      createShareLink(report);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForCompetitor, report.competitorAnalysis]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    };
  }, []);

  async function handleShare() {
    if (shareUrl) {
      // 이미 생성된 링크면 복사만
      await copyToClipboard(shareUrl);
      return;
    }

    // v43: 이미 경쟁사 데이터 있으면 바로 공유
    if (hasCompetitor(report)) {
      await createShareLink(report);
      return;
    }

    // 경쟁사 분석이 진행 중이면 자동 대기
    if (competitorLoading) {
      setWaitingForCompetitor(true);
      setError(null);

      // 30초 안전 타임아웃 (그래도 안 도착하면 사용자에게 선택권)
      waitTimeoutRef.current = setTimeout(() => {
        setWaitingForCompetitor(false);
        const proceed = window.confirm(
          "⚠️ 경쟁사 분석이 예상보다 오래 걸리고 있습니다.\n\n" +
            "지금 공유하면 경쟁사 데이터 없이 링크가 생성되며,\n" +
            "분석 완료 후 자동으로 데이터가 보강됩니다.\n\n" +
            "그래도 지금 공유하시겠습니까?"
        );
        if (proceed) {
          createShareLink(report);
        }
      }, 30_000);
      return;
    }

    // 경쟁사 분석이 끝났거나, loading 도 아닌데 비어있는 경우 (실패 케이스)
    const proceed = window.confirm(
      "⚠️ 경쟁사 분석 데이터가 없습니다.\n\n" +
        "지금 공유하면 경쟁사 섹션 없이 링크가 생성됩니다.\n" +
        "그래도 공유하시겠습니까?"
    );
    if (!proceed) return;

    await createShareLink(report);
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

  // 버튼 라벨
  const buttonContent = (() => {
    if (waitingForCompetitor) {
      return (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-jm-light-gray border-t-jm-red" />
          <span>경쟁사 분석 완료 대기 중...</span>
        </>
      );
    }
    if (loading) {
      return (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-jm-light-gray border-t-jm-red" />
          <span>공유 링크 생성 중...</span>
        </>
      );
    }
    if (copied) {
      return (
        <>
          <span>✓</span>
          <span>링크가 복사되었습니다!</span>
        </>
      );
    }
    if (shareUrl) {
      return (
        <>
          <span>🔗</span>
          <span>링크 다시 복사</span>
        </>
      );
    }
    return (
      <>
        <span>🔗</span>
        <span>결과 공유하기</span>
      </>
    );
  })();

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        onClick={handleShare}
        disabled={loading || waitingForCompetitor}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-jm-border bg-white px-5 py-3 text-sm font-bold text-jm-black hover:bg-jm-light-gray transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {buttonContent}
      </button>

      {waitingForCompetitor && (
        <p className="text-xs text-jm-gray font-medium leading-relaxed">
          💡 경쟁사 분석이 완료되면 자동으로 공유 링크가 생성됩니다 (최대 30초).
        </p>
      )}

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
