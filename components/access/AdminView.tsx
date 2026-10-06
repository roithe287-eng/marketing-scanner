"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import type { Account, Inquiry, Features } from "@/lib/saas/types";
import { DEFAULT_FEATURES } from "@/lib/saas/types";
import UserActivityView, {koreanTime} from './UserActivityView';
import type {ActivityStats} from '@/lib/saas/activityTypes';
type SafeAccount = Omit<Account, "passwordHash"> & {activity?:ActivityStats};
const formatDate = (value: number) =>
  new Date(value+9*3600000).toISOString().slice(0, 10);
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
  const [owner,setOwner]=useState<SafeAccount|null>(null);
  const [offset,setOffset]=useState(0),[total,setTotal]=useState(0);
  const [search,setSearch]=useState(''),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
  const activeLoad=useRef<AbortController|null>(null);
  const load = useCallback(async () => {
    activeLoad.current?.abort();const controller=new AbortController();activeLoad.current=controller;
    try {
      setLoading(true);setError('');
      const r = await fetch("/api/admin?offset="+offset, { cache: "no-store",signal:controller.signal });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      if(controller.signal.aborted)return;
      setInquiries(data.inquiries);
      setAccounts(data.accounts);
      setOwner(data.owner);setTotal(data.total);setRevision(v=>v+1);
    } catch (err) {
      if(controller.signal.aborted)return;
      setError(
        err instanceof Error ? err.message : "목록을 불러오지 못했습니다.",
      );
    } finally {
      if(!controller.signal.aborted)setLoading(false);
    }
  }, [offset]);
  useEffect(() => {
    void load();
    return()=>activeLoad.current?.abort();
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
        <div><p><strong>{owner?.name||'소유자'} 관리자</strong> · {owner?.email}</p><p className="access-muted">계정 발급·승인은 이 관리자 한 명만 가능합니다. 등록 네트워크와 관리자 로그인을 함께 확인합니다.</p></div>
        <button
          className="access-secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          목록 새로고침
        </button>
      </div>
      <nav className="admin-jump-nav" aria-label="관리자 메뉴"><a href="#admin-users">사용자·활동 기록</a><a href="#admin-create">계정 직접 생성</a><a href="#admin-inquiries">이용 문의·승인</a><button onClick={async()=>{const r=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)window.location.assign('/login');}}>로그아웃</button></nav>
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
          <span>현재 목록의 승인 계정</span>
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
          <span>현재 목록의 중지·종료</span>
        </article>
      </div>
      <section id="admin-create">
        <h2>계정 직접 생성</h2>
        <p className="access-muted">문의 접수 없이도 관리자가 고객 계정을 생성할 수 있습니다. 생성 즉시 승인되며, 고객이 48시간 내 전용 링크에서 비밀번호를 설정해야 로그인할 수 있습니다.</p>
        <details className="access-admin-card"><summary><strong>새 고객 계정 만들기</strong><span>관리자 전용</span></summary><div>
          <form className="access-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void action({action:'create',name:f.get('name'),email:f.get('email'),company:f.get('company'),contactVerified:f.has('contactVerified'),...grant(f)});}}>
            <div className="access-form-grid"><label>고객 이름<input name="name" required maxLength={80}/></label><label>로그인 이메일<input name="email" type="email" required maxLength={254}/></label></div>
            <label>회사명<input name="company" maxLength={120}/></label><GrantFields/>
            <label className="access-checkbox"><input name="contactVerified" type="checkbox" required/>계정 소유자와 이메일을 확인했고 이용을 승인합니다.</label>
            <button className="jm-button" disabled={busy}>계정 생성·활성화 링크 발급</button>
          </form>
        </div></details>
      </section>
      <section id="admin-inquiries">
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
      <section id="admin-users">
        <h2>사용자·활동 기록</h2>
        <p className="access-muted">
          전체 {total}개 계정 중 {total?offset+1:0}~{Math.min(offset+50,total)}번째 계정. 이용 조건을 변경하면 기존 로그인 세션이 종료되고 다시
          로그인해야 합니다.
        </p>
        <label className="admin-search">현재 목록 검색<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 · 회사 · 로그인 이메일 · UUID"/></label>
        {owner&&<details className="access-admin-card" onToggle={e=>{if(e.currentTarget.open)setSelected(owner.id);}}><summary><strong>{owner.name} · 내 관리자 기록</strong><span>소유자</span></summary><div>{selected===owner.id&&<UserActivityView id={owner.id} revision={revision}/>}</div></details>}
        {accounts
          .filter((a) => a.role === "customer"&&[a.name,a.company,a.email,a.id].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
          .map((account) => (
            <details
              className="access-admin-card"
              key={`${account.id}:${account.version}`}
              onToggle={e=>{if(e.currentTarget.open)setSelected(account.id);}}
            >
              <summary>
                <span>
                  <strong>{account.name}</strong> {account.email}<small className="admin-account-summary">진단 완료 {account.activity?.analyze_success||0} · PDF 저장 클릭 {account.activity?.pdf_save||0} · 링크 생성 {account.activity?.share_created||0}<br/>최근 기록 {koreanTime(account.activity?.lastSeenAt)}</small>
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
                {selected===account.id&&<UserActivityView id={account.id} revision={revision}/>}
                <h3 className="admin-settings-title">이용 조건 관리</h3>
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
                        "고객 계정과 사용자별 접속 기록·누적 횟수를 삭제하고 로그인을 즉시 차단할까요? 기존 보고서는 원래 보관 기간(최대 7일)까지 남으며 관리자만 열람할 수 있습니다.",
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
        <div className="admin-pagination"><button className="access-secondary" disabled={!offset||loading} onClick={()=>{setSelected('');setOffset(Math.max(0,offset-50));}}>이전 50개</button><span>{total}개 계정</span><button className="access-secondary" disabled={offset+50>=total||loading} onClick={()=>{setSelected('');setOffset(offset+50);}}>다음 50개</button></div>
      </section>
    </div>
  );
}
