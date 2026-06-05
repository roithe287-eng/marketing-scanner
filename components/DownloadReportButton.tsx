"use client";

import { useState } from "react";
import LeadModal, { LeadFormData } from "./LeadModal";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  targetId: string;
  report: MarketingReport;
};

export default function DownloadReportButton({ targetId, report }: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function runDownload() {
    setDownloading(true);
    try {
      // 동적 import (SSR 회피)
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const element = document.getElementById(targetId);
      if (!element) {
        alert("다운로드할 리포트를 찾지 못했습니다.");
        return;
      }

      // 다운로드 버튼 자체는 캡처에서 숨기기
      const hideTargets = document.querySelectorAll<HTMLElement>(
        "[data-hide-on-export]"
      );
      hideTargets.forEach((el) => (el.style.visibility = "hidden"));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
      });

      hideTargets.forEach((el) => (el.style.visibility = ""));

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`진짜마케팅_웹사이트_진단_${today}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다: " + (err?.message || "unknown"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleLeadSubmit(form: LeadFormData) {
    try {
      // 리드 저장 (실패해도 다운로드는 진행)
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          url: report.url,
          overallScore: report.overallScore,
        }),
      }).catch(() => {});

      setOpen(false);
      await runDownload();
    } catch (e) {
      console.error(e);
      setOpen(false);
      await runDownload();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={downloading}
        className="jm-button"
        data-hide-on-export
      >
        {downloading ? "PDF 생성 중..." : "📄 PDF 리포트 다운로드"}
      </button>

      <LeadModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleLeadSubmit}
        title="PDF 리포트를 받아보세요"
        description="간단한 정보를 입력하시면 진단 리포트 PDF를 바로 다운로드해 드리고, 필요한 경우 진짜마케팅 컨설턴트가 추가 안내를 도와드립니다."
        submitLabel="PDF 다운로드 받기"
      />
    </>
  );
}
