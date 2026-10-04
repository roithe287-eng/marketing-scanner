"use client";
import type { AccessState } from "./useAccess";
export default function AccessBar({ access }: { access: AccessState }) {
  async function logout() {
    const r = await fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (r.ok) window.location.assign("/");
  }
  return (
    <div className="access-bar">
      <div className="jm-container">
        <span>
          {access.kind === "internal"
            ? "등록 네트워크 · 기존 진단 이용 가능"
            : access.kind === "account"
              ? `${access.account?.name}님 · 승인된 계정`
              : access.kind === "loading"
                ? "이용 상태 확인 중…"
                : "사이트의 다음 변화를 찾으세요"}
        </span>
        <nav aria-label="계정 메뉴">
          {access.admin && <a href="/manage">이용 관리</a>}
          {(access.kind === "account" || access.kind === "internal") && (
            <a href="/account">보관함·이용 현황</a>
          )}
          {access.kind === "account" || access.admin ? (
            <button onClick={logout}>로그아웃</button>
          ) : (
            <a href="/login">로그인</a>
          )}
        </nav>
      </div>
    </div>
  );
}
