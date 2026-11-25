"use client";
import { useEffect, useState } from "react";
import {ACTIVITY_POLICY} from '@/lib/saas/activityTypes';
export default function AuthForm({
  mode,
}: {
  mode: "login" | "activate" | "setup" | "recover";
}) {
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  useEffect(() => {
    if (mode !== "activate" && mode !== "recover") return;
    function readInvite() {
      const token = window.location.hash.slice(1);
      if (!token) return;
      setInvite(/^[\w-]{43}$/.test(token) ? token : "");
      setError("");
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    readInvite();
    window.addEventListener("hashchange", readInvite);
    return () => window.removeEventListener("hashchange", readInvite);
  }, [mode]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const values = Object.fromEntries(f);
    try {
      const requestingRecovery = mode === "recover" && !invite;
      if (mode !== "login" && !requestingRecovery && values.password !== values.confirm)
        throw new Error("비밀번호 확인이 일치하지 않습니다.");
      const payload = mode === "recover"
        ? requestingRecovery
          ? { action: "request" }
          : { action: "reset", token: invite, password: values.password }
        : {
            ...values,
            consent: f.get("consent") === "on",
            ...(mode === "activate" ? { token: invite } : {}),
          };
      const r = await fetch("/api/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      if (mode === "recover") {
        if (requestingRecovery) setRecoverySent(true);
        else {
          setInvite("");
          setPasswordReset(true);
        }
        return;
      }
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
  if (mode === "recover" && passwordReset) {
    return (
      <div className="access-notice">
        <p role="status">새 비밀번호가 저장되었습니다. 관리자 이메일과 새 비밀번호로 로그인해 주세요.</p>
        <a className="jm-button" href="/login">로그인</a>
      </div>
    );
  }
  if (mode === "recover" && !invite) {
    return (
      <form onSubmit={submit} className="access-form">
        {recoverySent ? (
          <p role="status" className="access-muted">
            등록된 관리자 이메일로 링크를 보냈습니다. 15분 이내에 등록된 네트워크에서 열어 주세요.
          </p>
        ) : (
          <button className="jm-button" disabled={busy}>
            {busy ? "보내는 중…" : "재설정 링크 보내기"}
          </button>
        )}
        {error && <p className="access-error" role="alert">{error}</p>}
        <a href="/login">로그인으로 돌아가기</a>
      </form>
    );
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
      {(mode === "login" || mode === "setup") && (
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
            이용 문의로 요청할 수 있습니다. {ACTIVITY_POLICY}
          </p>
          <label>
            <input type="checkbox" name="consent" required /> 계정 정보
            수집·이용 및{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              개인정보·이용 기록 안내
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
      {mode==='activate'&&<p className="access-muted">비밀번호를 이미 설정했다면 <a href="/login">로그인</a>해 주세요.</p>}
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
              : mode === "recover"
                ? "새 비밀번호 저장"
                : "비밀번호 설정하고 시작"}
      </button>
      {mode === "recover" && <a href="/recover">새 링크 요청하기</a>}
      {mode === "login" && (
        <div className="access-muted"><p>
          승인·계정 복구가 필요하다면 <a href="/inquiry">이용 문의</a>를 남겨
          주세요. 담당자가 본인 확인 후 안내합니다.
        </p><p><a href="/recover">관리자 비밀번호 재설정</a></p>
        <p>보안과 사용량 관리를 위해 접속 IP와 이용 기록이 수집됩니다. <a href="/privacy">수집 항목·보관기간 확인</a></p></div>
      )}
    </form>
  );
}
