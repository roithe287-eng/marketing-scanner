"use client";

import { useState } from "react";
import LeadModal, { LeadFormData } from "./LeadModal";
import { MarketingReport } from "@/lib/reportSchema";

type Props = {
  targetId: string;
  report: MarketingReport;
};

// PDF 캡처에 사용할 데스크탑 너비
const PDF_CAPTURE_WIDTH = 1120;
// wrapper 좌우 안전 padding (총 너비 안에 포함)
const SAFE_PADDING = 32;

export default function DownloadReportButton({ targetId, report }: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function runDownload() {
    setDownloading(true);

    const element = document.getElementById(targetId);
    if (!element) {
      alert("다운로드할 리포트를 찾지 못했습니다.");
      setDownloading(false);
      return;
    }

    let pdfWrapper: HTMLDivElement | null = null;
    let originalStyles: { [key: string]: string } = {};

    try {
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

      // 2) 항상 PDF 전용 wrapper로 복제 (모바일/데스크탑 둘 다)
      //    이렇게 하면 화면 표시에 영향 없이 안전하게 캡처 가능
      pdfWrapper = document.createElement("div");
      pdfWrapper.id = "pdf-export-wrapper";
      pdfWrapper.style.position = "fixed";
      pdfWrapper.style.left = "-99999px";
      pdfWrapper.style.top = "0";
      pdfWrapper.style.width = `${PDF_CAPTURE_WIDTH}px`;
      pdfWrapper.style.background = "#ffffff";
      pdfWrapper.style.padding = `${SAFE_PADDING}px`;
      pdfWrapper.style.boxSizing = "border-box";
      pdfWrapper.style.fontFamily =
        "Pretendard, -apple-system, system-ui, sans-serif";

      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      clone.style.maxWidth = "none";
      clone.style.padding = "0";
      clone.style.boxSizing = "border-box";

      // 클론 안의 hide-on-export 숨김
      clone
        .querySelectorAll<HTMLElement>("[data-hide-on-export]")
        .forEach((el) => (el.style.display = "none"));

      pdfWrapper.appendChild(clone);
      document.body.appendChild(pdfWrapper);

      // 3) 폰트 로드 대기
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 4) 실제 캡처될 영역 너비 계산
      const captureWidth = pdfWrapper.offsetWidth;

      // 5) html2canvas 캡처
      const canvas = await html2canvas(pdfWrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: captureWidth,
        windowWidth: captureWidth,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        onclone: (clonedDoc: Document) => {
          // 복제된 문서에 강력한 PDF 친화 스타일 주입
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              box-sizing: border-box !important;
            }
            /* 모든 카드/박스 페이지 잘림 방지 */
            .jm-card {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              overflow: visible !important;
              box-shadow: 0 8px 24px rgba(17, 17, 17, 0.06) !important;
            }
            /* 박스 안에 내용물이 안 튀어나가도록 강제 */
            .jm-card, .jm-card * {
              max-width: 100% !important;
            }
            /* 우선순위 라벨 같은 우측 정렬 요소도 카드 안에 들어가도록 */
            .jm-card .shrink-0 {
              flex-shrink: 0;
            }
            /* 텍스트 줄바꿈 (한글 단어 보호) */
            p, span, h1, h2, h3, h4, h5, li, div {
              word-break: keep-all;
              overflow-wrap: break-word;
            }
            /* hide-on-export 한 번 더 */
            [data-hide-on-export] {
              display: none !important;
            }
            /* 모바일 전용 클래스 무시 (PDF는 데스크탑 레이아웃) */
            .md\\:hidden {
              display: none !important;
            }
            /* 데스크탑 전용 클래스 항상 활성화 */
            .hidden.md\\:block { display: block !important; }
            .hidden.md\\:flex { display: flex !important; }
            .hidden.md\\:inline-flex { display: inline-flex !important; }
            .hidden.md\\:grid { display: grid !important; }
            /* md: 미디어쿼리 강제 적용 (PDF는 1120px 너비 기준) */
            @media (max-width: 9999px) {
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              .md\\:grid-cols-\\[360px_1fr\\] { grid-template-columns: 360px 1fr !important; }
              .md\\:text-xl { font-size: 1.25rem !important; }
              .md\\:text-2xl { font-size: 1.5rem !important; }
              .md\\:text-3xl { font-size: 1.875rem !important; }
              .md\\:text-4xl { font-size: 2.25rem !important; }
              .md\\:p-4 { padding: 1rem !important; }
              .md\\:p-6 { padding: 1.5rem !important; }
              .md\\:p-8 { padding: 2rem !important; }
              .md\\:p-12 { padding: 3rem !important; }
              .md\\:gap-6 { gap: 1.5rem !important; }
              .md\\:flex-row { flex-direction: row !important; }
              .md\\:items-end { align-items: flex-end !important; }
              .md\\:h-20 { height: 5rem !important; }
              .md\\:h-10 { height: 2.5rem !important; }
            }
          `;
          clonedDoc.head.appendChild(style);

          const hidden = clonedDoc.querySelectorAll("[data-hide-on-export]");
          hidden.forEach((el) => {
            (el as HTMLElement).style.display = "none";
          });
        },
      });

      // 6) wrapper 제거
      if (pdfWrapper && pdfWrapper.parentNode) {
        pdfWrapper.parentNode.removeChild(pdfWrapper);
        pdfWrapper = null;
      }

      // 7) hide 요소 복원
      hideTargets.forEach((el, idx) => {
        el.style.display = hidePrevDisplay[idx] || "";
      });

      // 8) PDF 생성
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 6;
      const usableWidth = pageWidth - margin * 2;

      const imgAspectRatio = canvas.height / canvas.width;
      const imgWidth = usableWidth;
      const imgHeight = imgWidth * imgAspectRatio;

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

      // 추가 페이지
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

      // 페이지 번호 푸터
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(180, 180, 180);
        pdf.text(
          `진짜마케팅 - 마케팅스캐너 | ${i} / ${totalPages}`,
          pageWidth / 2,
          pageHeight - 2,
          { align: "center" }
        );
      }

      let domainName = "report";
      try {
        domainName = new URL(report.url).hostname
          .replace(/^www\./, "")
          .replace(/\./g, "_");
      } catch {}
      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`진짜마케팅_진단_${domainName}_${today}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert("PDF 생성 중 오류가 발생했습니다: " + (err?.message || "unknown"));
      // 에러 시에도 wrapper 정리
      if (pdfWrapper && pdfWrapper.parentNode) {
        pdfWrapper.parentNode.removeChild(pdfWrapper);
      }
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
