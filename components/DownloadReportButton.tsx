"use client";

import { useState } from "react";
import LeadModal, { LeadFormData } from "./LeadModal";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  targetId: string;
  report: MarketingReport;
};

// PDF 캡처에 사용할 데스크탑 너비 (A4 가로 비율과 잘 맞는 값)
const PDF_CAPTURE_WIDTH = 1120;

export default function DownloadReportButton({ targetId, report }: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function runDownload() {
    setDownloading(true);

    // 임시 wrapper로 폰트 로딩 보장
    let originalStyles: { [key: string]: string } = {};
    const element = document.getElementById(targetId);
    if (!element) {
      alert("다운로드할 리포트를 찾지 못했습니다.");
      setDownloading(false);
      return;
    }

    try {
      // 동적 import (SSR 회피)
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      // 1) 다운로드 버튼 같은 export 제외 요소들 숨기기
      const hideTargets = document.querySelectorAll<HTMLElement>(
        "[data-hide-on-export]"
      );
      const hidePrevDisplay: string[] = [];
      hideTargets.forEach((el) => {
        hidePrevDisplay.push(el.style.display);
        el.style.display = "none";
      });

      // 2) 모바일에서도 데스크탑 레이아웃으로 캡처되도록
      //    element와 부모의 너비를 임시로 데스크탑 너비로 강제
      const isMobile = window.innerWidth < PDF_CAPTURE_WIDTH;
      let pdfWrapper: HTMLDivElement | null = null;

      if (isMobile) {
        // 모바일이면 element를 임시 wrapper에 복제해서 데스크탑 너비로 렌더링
        pdfWrapper = document.createElement("div");
        pdfWrapper.style.position = "fixed";
        pdfWrapper.style.left = "-99999px"; // 화면 밖
        pdfWrapper.style.top = "0";
        pdfWrapper.style.width = `${PDF_CAPTURE_WIDTH}px`;
        pdfWrapper.style.background = "#ffffff";
        pdfWrapper.style.padding = "24px";

        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.width = "100%";
        clone.style.maxWidth = "none";

        // 클론 안의 data-hide-on-export도 숨김
        clone
          .querySelectorAll<HTMLElement>("[data-hide-on-export]")
          .forEach((el) => (el.style.display = "none"));

        pdfWrapper.appendChild(clone);
        document.body.appendChild(pdfWrapper);
      } else {
        // 데스크탑이면 element 자체의 너비 고정
        originalStyles["width"] = element.style.width;
        originalStyles["maxWidth"] = element.style.maxWidth;
        element.style.width = `${PDF_CAPTURE_WIDTH}px`;
        element.style.maxWidth = "none";
      }

      const captureTarget = pdfWrapper || element;

      // 3) 폰트 로드 대기 (한글 폰트 깨짐 방지)
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 4) html2canvas로 캡처
      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: PDF_CAPTURE_WIDTH,
        width: PDF_CAPTURE_WIDTH,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        onclone: (clonedDoc: Document) => {
          // 복제된 문서에서 export 제외 요소 한 번 더 숨김
          const hidden = clonedDoc.querySelectorAll("[data-hide-on-export]");
          hidden.forEach((el) => {
            (el as HTMLElement).style.display = "none";
          });
        },
      });

      // 5) 임시 요소 정리
      if (pdfWrapper) {
        document.body.removeChild(pdfWrapper);
      } else {
        element.style.width = originalStyles["width"] || "";
        element.style.maxWidth = originalStyles["maxWidth"] || "";
      }

      hideTargets.forEach((el, idx) => {
        el.style.display = hidePrevDisplay[idx] || "";
      });

      // 6) PDF 생성 - 페이지 잘림 방지 로직 강화
      const imgData = canvas.toDataURL("image/jpeg", 0.92); // JPEG 압축으로 용량 감소
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 0; // 여백 (원하면 8 정도로 조정)
      const usableWidth = pageWidth - margin * 2;

      // 이미지 비율 유지
      const imgAspectRatio = canvas.height / canvas.width;
      const imgWidth = usableWidth;
      const imgHeight = imgWidth * imgAspectRatio;

      // 페이지 수 계산
      const usableHeightPerPage = pageHeight - margin * 2;
      let remainingHeight = imgHeight;
      let position = margin;

      // 첫 페이지
      pdf.addImage(
        imgData,
        "JPEG",
        margin,
        position,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      remainingHeight -= usableHeightPerPage;

      // 추가 페이지 (이미지를 위로 이동시켜 다음 페이지에 다음 부분 표시)
      while (remainingHeight > 0) {
        position -= usableHeightPerPage;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          margin,
          position,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
        remainingHeight -= usableHeightPerPage;
      }

      // 푸터에 페이지 번호 + 진짜마케팅 워터마크
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text(
          `진짜마케팅 - 마케팅스캐너 | ${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 4,
          { align: "center" }
        );
      }

      // 파일명에 도메인 + 날짜 포함
      let domainName = "report";
      try {
        domainName = new URL(report.url).hostname.replace(/^www\./, "").replace(/\./g, "_");
      } catch {}
      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`진짜마케팅_진단_${domainName}_${today}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다: " + (err?.message || "unknown"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleLeadSubmit(form: LeadFormData) {
    try {
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
      // 모달 닫힘 애니메이션 + 폰트 로드 위해 약간 대기
      await new Promise((r) => setTimeout(r, 200));
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
