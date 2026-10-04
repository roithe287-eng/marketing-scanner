"use client";
import { useEffect, useState, useCallback } from "react";
import type { Account } from "@/lib/saas/types";
export type AccessState = {
  kind: "loading" | "guest" | "internal" | "account" | "error";
  admin?: boolean;
  account?: Omit<Account, "passwordHash">;
  usage?: Record<string, number>;
  reports?: { id: string; url: string; title: string }[];
  message?: string;
};
export function useAccess(withReports = false) {
  const [access, setAccess] = useState<AccessState>({ kind: "loading" });
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/access" + (withReports ? "?reports=1" : ""),
        { cache: "no-store" },
      );
      const data = await response.json();
      setAccess(response.ok ? data : { kind: "error", message: data.message });
    } catch {
      setAccess({
        kind: "error",
        message: "접근 권한을 확인하지 못했습니다. 새로고침해 주세요.",
      });
    }
  }, [withReports]);
  useEffect(() => {
    void refresh();
    const update = () => void refresh();
    window.addEventListener("focus", update);
    window.addEventListener("scanner-usage", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("scanner-usage", update);
    };
  }, [refresh]);
  return { access, refresh };
}
