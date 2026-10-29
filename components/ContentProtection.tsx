"use client";

import { useEffect } from "react";

/**
 * v25: 공유 페이지(/r/[id]) 전용 콘텐츠 보호
 * - F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P 차단
 * - 우클릭 컨텍스트 메뉴 차단
 * - 텍스트 선택/드래그 제한
 * - 브라우저 배율·창 크기와 무관하게 보고서 열람 유지
 * - 콘솔 메시지 무력화
 *
 * ⚠️ 완벽한 차단은 불가능. 일반 사용자(광고주)의 진입장벽 높이는 용도.
 */
export default function ContentProtection() {
  useEffect(() => {
    // User-entered form values must remain editable; report content stays protected.
    const isTextEntry=(target:EventTarget|null)=>target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement;
    // ===== 1. 콘솔 경고 + 무력화 =====
    try {
      const warningStyle =
        "color:#e31b23;font-size:24px;font-weight:900;text-shadow:1px 1px 0 #000;";
      // eslint-disable-next-line no-console
      console.log(
        "%c⚠️ 경고 — 진짜마케팅 마케팅스캐너 진단 리포트",
        warningStyle
      );
      // eslint-disable-next-line no-console
      console.log(
        "%c본 리포트는 진짜마케팅 내부 컨설팅 자료입니다. 외부 임의 공개·재배포·코드 추출은 권하지 않습니다.",
        "color:#666;font-size:14px;"
      );
    } catch {
      // 무시
    }

    // 콘솔 무력화 (개발자도구로 데이터 추출 어렵게)
    try {
      const noop = () => undefined;
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.log = noop;
        // eslint-disable-next-line no-console
        console.info = noop;
        // eslint-disable-next-line no-console
        console.warn = noop;
        // eslint-disable-next-line no-console
        console.debug = noop;
        // console.error는 디버깅 흔적 남기지 않도록 무력화
        // eslint-disable-next-line no-console
        console.error = noop;
      }
    } catch {
      // 무시
    }

    // ===== 2. 우클릭 차단 =====
    const handleContextMenu = (e: MouseEvent) => {
      if(isTextEntry(e.target))return;
      e.preventDefault();
      return false;
    };

    // ===== 3. 키보드 단축키 차단 =====
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + Shift + I/J/C (개발자도구)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const k = e.key.toUpperCase();
        if (k === "I" || k === "J" || k === "C") {
          e.preventDefault();
          return false;
        }
      }
      // Ctrl/Cmd + U (소스 보기)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + S (저장)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + P (인쇄 — PDF는 자체 다운로드 버튼 사용)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        return false;
      }
      // Ctrl/Cmd + A (전체 선택 차단)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !isTextEntry(e.target)) {
        e.preventDefault();
        return false;
      }
    };

    // ===== 4. 드래그 / 복사 / 자르기 차단 =====
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };
    const handleCopy = (e: ClipboardEvent) => {
      if(isTextEntry(e.target))return;
      e.preventDefault();
      return false;
    };
    const handleCut = (e: ClipboardEvent) => {
      if(isTextEntry(e.target))return;
      e.preventDefault();
      return false;
    };

    // Window dimensions also change with zoom, browser chrome and side panels.
    // They cannot establish whether DevTools is open and must never gate report access.
    // Authentication, ownership and retention are enforced by the shared-report route.

    // ===== 5. 이벤트 리스너 등록 =====
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);

    // ===== 6. 정리 =====
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
    };
  }, []);

  // 전역 CSS — 텍스트 선택/이미지 드래그 차단
  return (
    <style jsx global>{`
      body {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      img {
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        pointer-events: none;
      }
      /* 입력창은 예외 (필요할 경우) */
      input,
      textarea {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
      /* 인쇄 방지 — Ctrl+P 차단 우회 시도 시 빈 페이지 */
      @media print {
        body {
          display: none !important;
        }
        html::before {
          content: "본 리포트는 인쇄 출력이 제한됩니다. PDF 다운로드 버튼을 이용해 주세요.";
          display: block;
          padding: 40px;
          font-family: system-ui, sans-serif;
          font-size: 14px;
        }
      }
    `}</style>
  );
}
