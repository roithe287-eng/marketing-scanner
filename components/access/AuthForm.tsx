"use client";
import { useEffect, useState } from "react";
export default function AuthForm({
  mode,
}: {
  mode: "login" | "activate" | "setup";
}) {
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (mode === "activate") {
      setInvite(window.location.hash.slice(1));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [mode]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const values = Object.fromEntries(f);
    try {
      if (mode !== "login" && values.password !== values.confirm)
        throw new Error("비밀번호 확인이 일치하지 않습니다.");
      const r = await fetch("/api/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          consent: f.get("consent") === "on",
          ...(mode === "activate" ? { token: invite } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      const next =
        new URLSearchParams(window.location.search).get("next") || "";
      window.location.assign(
        mode === "setup" || data.admin
          ? "/manage"
          : /^\/r\/[A-Za-z0-9]{4,12}$/.test(next)
            ? next
            : "/account",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="access-form">
      {mode === "setup" && (
        <>
          <label>
            관리자 등록 코드
            <input
              name="token"
              required
              autoComplete="off"
              type="password"
              minLength={43}
              maxLength={43}
            />
          </label>
          <label>
            관리자 이름
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        </>
      )}
      {mode !== "activate" && (
        <label>
          이메일
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="username"
          />
        </label>
      )}
      <label>
        {mode === "login" ? "비밀번호" : "새 비밀번호"}
        <input
          name="password"
          type="password"
          required
          minLength={mode === "login" ? 1 : 12}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </label>
      {mode !== "login" && (
        <>
          <p className="access-muted">
            12자 이상으로 설정해 주세요. 다른 사이트와 다른 비밀번호를
            권장합니다.
          </p>
          <label>
            비밀번호 확인
            <input
              name="confirm"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
        </>
      )}
      {mode === "activate" && (
        <div className="access-consent">
          <p>
            이름·회사명·이메일은 계정 제공과 이용 관리에 사용됩니다. 탈퇴·삭제는
            이용 문의로 요청할 수 있습니다. 보관된 보고서는 저장 후 21일에
            만료됩니다.
          </p>
          <label>
            <input type="checkbox" name="consent" required /> 계정 정보
            수집·이용 및{" "}
            <a href="/notice" target="_blank" rel="noopener noreferrer">
              진단 이용 안내
            </a>
            에 동의합니다.
          </label>
        </div>
      )}
      {mode === "activate" && !invite && (
        <p className="access-error">
          담당자가 전달한 전체 활성화 링크로 접속해 주세요.
        </p>
      )}
      {error && (
        <p className="access-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="jm-button"
        disabled={busy || (mode === "activate" && !invite)}
      >
        {busy
          ? "확인 중…"
          : mode === "login"
            ? "로그인"
            : mode === "setup"
              ? "관리자 등록 완료"
              : "비밀번호 설정하고 시작"}
      </button>
      {mode === "login" && (
        <p className="access-muted">
          승인·계정 복구가 필요하다면 <a href="/inquiry">이용 문의</a>를 남겨
          주세요. 담당자가 본인 확인 후 안내합니다.
        </p>
      )}
    </form>
  );
}
