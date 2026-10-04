"use client";
import { useCallback, useEffect, useState } from "react";
import type { Account, Inquiry, Features } from "@/lib/saas/types";
import { DEFAULT_FEATURES } from "@/lib/saas/types";
type SafeAccount = Omit<Account, "passwordHash">;
const formatDate = (value: number) =>
  new Date(value).toISOString().slice(0, 10);
function GrantFields({ account }: { account?: SafeAccount }) {
  const features = account?.features || DEFAULT_FEATURES;
  return (
    <>
      <div className="access-form-grid">
        <label>
          이용 종료일
          <input
            name="date"
            type="date"
            required
            defaultValue={formatDate(
              account?.expiresAt || Date.now() + 30 * 86400000,
            )}
          />
        </label>
        <label>
          월 사이트 진단 한도
          <input
            name="monthlyLimit"
            type="number"
            min={1}
            max={1000}
            required
            defaultValue={account?.monthlyLimit || 10}
          />
        </label>
      </div>
      <fieldset className="access-features">
        <legend>허용 기능</legend>
        {(
          [
            ["competitor", "경쟁사 비교"],
            ["deepdive", "경쟁사 상세 분석"],
            ["reports", "보고서 보관·조회"],
          ] as [keyof Features, string][]
        ).map(([key, label]) => (
          <label key={key}>
            <input name={key} type="checkbox" defaultChecked={features[key]} />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="access-muted">
        경쟁사 비교 한도 = 사이트 진단 한도 / 상세 분석 한도 = 사이트 진단
        한도의 5배. PDF는 열람 가능한 결과에서 생성합니다.
      </p>
    </>
  );
}
function grant(form: FormData) {
  return {
    expiresAt: new Date(String(form.get("date")) + "T23:59:59+09:00").getTime(),
    monthlyLimit: Number(form.get("monthlyLimit")),
    features: {
      competitor: form.has("competitor"),
      deepdive: form.has("deepdive"),
      reports: form.has("reports"),
    },
  };
}
export default function AdminView() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [accounts, setAccounts] = useState<SafeAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      setInquiries(data.inquiries);
      setAccounts(data.accounts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(body: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setLink("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      if (data.activationPath)
        setLink(window.location.origin + data.activationPath);
      else setNotice("변경 사항을 저장했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-admin">
      <div className="access-account-head">
        <p>등록 네트워크 + 관리자 계정 인증</p>
        <button
          className="access-secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          목록 새로고침
        </button>
      </div>
      {error && (
        <p role="alert" className="access-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="access-notice">
          {notice}
        </p>
      )}
      {link && (
        <section className="access-invite" role="status">
          <h2>활성화 링크가 준비되었습니다</h2>
          <p>
            본인 확인을 마친 고객에게 별도로 전달해 주세요. 48시간·1회 사용
            가능하며, 재발급 시 이전 링크와 로그인 세션은 무효화됩니다. 이
            화면을 닫으면 다시 표시되지 않습니다.
          </p>
          <label>
            고객 전달용 링크
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button
            className="access-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setNotice("활성화 링크를 복사했습니다.");
              } catch {
                setNotice("링크를 선택해 직접 복사해 주세요.");
              }
            }}
          >
            링크 복사
          </button>
        </section>
      )}
      <div className="access-admin-stats">
        <article>
          <strong>
            {inquiries.filter((i) => i.status === "pending").length}
          </strong>
          <span>검토 대기</span>
        </article>
        <article>
          <strong>
            {
              accounts.filter(
                (a) =>
                  a.role === "customer" &&
                  a.status === "approved" &&
                  a.expiresAt > Date.now(),
              ).length
            }
          </strong>
          <span>이용 승인</span>
        </article>
        <article>
          <strong>
            {
              accounts.filter(
                (a) =>
                  a.role === "customer" &&
                  (a.status === "suspended" || a.expiresAt <= Date.now()),
              ).length
            }
          </strong>
          <span>중지·기간 종료</span>
        </article>
      </div>
      <section>
        <h2>이용 문의</h2>
        <p className="access-muted">
          최근 90일 내 문의 중 최신 100건. 연락처와 이메일을 확인한 뒤 승인해
          주세요. 알림은 자동 발송되지 않습니다.
        </p>
        {loading ? (
          <p>불러오는 중…</p>
        ) : !inquiries.length ? (
          <p className="access-empty">아직 접수된 문의가 없습니다.</p>
        ) : (
          inquiries.map((item) => (
            <details className="access-admin-card" key={item.id}>
              <summary>
                <span>
                  <strong>{item.name}</strong> {item.company}
                </span>
                <span>
                  {
                    {
                      pending: "검토 대기",
                      approved: "승인 완료",
                      closed: "종료",
                    }[item.status]
                  }
                </span>
              </summary>
              <div>
                <p className="access-detail">
                  {item.email} · {item.contact}
                  <br />
                  {item.url}
                  <br />
                  {new Date(item.createdAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                  })}
                </p>
                {item.message && (
                  <p className="access-message">{item.message}</p>
                )}
                {item.status === "pending" && (
                  <form
                    className="access-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void action({
                        action: "approve",
                        inquiryId: item.id,
                        contactVerified: f.has("contactVerified"),
                        ...grant(f),
                      });
                    }}
                  >
                    <GrantFields />
                    <label className="access-checkbox">
                      <input type="checkbox" name="contactVerified" required />{" "}
                      연락처·이메일의 본인 확인과 이용 조건 협의를 마쳤습니다.
                    </label>
                    <button className="jm-button" disabled={busy}>
                      승인하고 활성화 링크 발급
                    </button>
                    <button
                      className="access-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void action({ action: "close", inquiryId: item.id })
                      }
                    >
                      문의 종료
                    </button>
                  </form>
                )}
              </div>
            </details>
          ))
        )}
      </section>
      <section>
        <h2>고객 이용 관리</h2>
        <p className="access-muted">
          최신 200개 계정. 이용 조건을 변경하면 기존 로그인 세션이 종료되고 다시
          로그인해야 합니다.
        </p>
        {accounts
          .filter((a) => a.role === "customer")
          .map((account) => (
            <details
              className="access-admin-card"
              key={`${account.id}:${account.version}`}
            >
              <summary>
                <span>
                  <strong>{account.name}</strong> {account.email}
                </span>
                <span>
                  {account.status === "suspended"
                    ? "이용 중지"
                    : account.expiresAt <= Date.now()
                      ? "기간 종료"
                      : "승인됨"}
                </span>
              </summary>
              <div>
                <form
                  className="access-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action({
                      action: "update",
                      id: account.id,
                      version: account.version,
                      status: f.get("status"),
                      ...grant(f),
                    });
                  }}
                >
                  <GrantFields account={account} />
                  <label>
                    이용 상태
                    <select name="status" defaultValue={account.status}>
                      <option value="approved">승인</option>
                      <option value="suspended">중지</option>
                    </select>
                  </label>
                  <button className="jm-button" disabled={busy}>
                    이용 조건 저장
                  </button>
                </form>
                <form
                  className="access-form access-recovery"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action({
                      action: "reissue",
                      id: account.id,
                      contactVerified: true,
                    });
                  }}
                >
                  <label className="access-checkbox">
                    <input type="checkbox" required /> 계정 소유자를 별도로
                    확인했습니다.
                  </label>
                  <button className="access-secondary" disabled={busy}>
                    비밀번호 설정 링크 재발급
                  </button>
                </form>
                <button
                  className="access-delete"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "고객 계정 정보를 삭제하고 로그인을 즉시 차단할까요? 기존 보고서는 원래 보관 기간(21일)까지 남습니다.",
                      )
                    )
                      void action({
                        action: "delete",
                        id: account.id,
                        version: account.version,
                      });
                  }}
                >
                  계정 삭제
                </button>
              </div>
            </details>
          ))}
      </section>
    </div>
  );
}
