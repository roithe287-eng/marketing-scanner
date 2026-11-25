"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import type { Account, AccountPlan, Inquiry, Features } from "@/lib/saas/types";
import { DEFAULT_FEATURES, accountPlan } from "@/lib/saas/types";
import { inquiryServiceLabels } from '@/lib/inquiry';
import { getScannerPlan, inquiryPlanLabel } from '@/lib/pricing';
import AdminActivityDashboard from './AdminActivityDashboard';
import ActivationInvite, { type Activation } from './ActivationInvite';
import { NETWORK_ACTIVITY_ID } from '@/lib/saas/activityTypes';
import UserActivityView, {koreanTime} from './UserActivityView';
import type {ActivityStats} from '@/lib/saas/activityTypes';
type SafeAccount = Omit<Account, "passwordHash"> & {activity?:ActivityStats;activationRequired?:boolean};
const formatDate = (value: number) =>
  new Date(value+9*3600000).toISOString().slice(0, 10);
const planLabels: Record<AccountPlan,string>={monthly:'월간 이용권',single:'1회 진단권 (PDF 미포함)','single-pdf':'1회 진단권 (PDF 포함)'};
export function GrantFields({ account, planId }: { account?: SafeAccount; planId?:string }) {
  const [plan,setPlan]=useState<AccountPlan>(()=>account?accountPlan(account):planId==='single'||planId==='single-pdf'?planId:'monthly');
  const requestedPlan = getScannerPlan(planId);
  const monthlyLimit = account && accountPlan(account) === 'monthly'
    ? account.monthlyLimit
    : requestedPlan?.monthly ? requestedPlan.count : 10;
  const features = account?.features || DEFAULT_FEATURES;
  return (
    <>
      <div className="access-form-grid">
        <label>
          이용권
          <select name="plan" value={plan} onChange={e=>setPlan(e.target.value as AccountPlan)}>
            {Object.entries(planLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          이용 종료일
          <input
            name="date"
            type="date"
            required
            min={account ? undefined : formatDate(Date.now())}
            defaultValue={formatDate(
              account?.expiresAt || Date.now() + 30 * 86400000,
            )}
          />
        </label>
        {plan==='monthly'&&<label>
          월 사이트 진단 한도
          <input
            name="monthlyLimit"
            type="number"
            min={1}
            max={1000}
            required
            defaultValue={monthlyLimit}
          />
        </label>}
      </div>
      <label className="access-checkbox"><input name="paid" type="checkbox" defaultChecked={account?.paid === true}/>유료 결제 확인 · PDF 포함 이용권의 워터마크 제거</label>
      {plan==='monthly'?<><fieldset className="access-features">
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
      </p></>:<p className="access-muted">종합 진단 1회가 제공됩니다. 이용 기간 변경이나 활성화 링크 재발급 후에도 사용 횟수는 유지됩니다. {plan==='single-pdf'&&'완료한 결과는 내 계정에 자동 보관되며 최대 7일 안에 PDF로 다시 받을 수 있습니다.'}</p>}
    </>
  );
}
function grant(form: FormData) {
  return {
    plan: form.get('plan'),
    paid: form.has('paid'),
    expiresAt: new Date(String(form.get("date")) + "T23:59:59+09:00").getTime(),
    monthlyLimit: Number(form.get("monthlyLimit") ?? 1),
    features: {
      competitor: form.has("competitor"),
      deepdive: form.has("deepdive"),
      reports: form.has("reports"),
    },
  };
}
export default function AdminView() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryEmail, setInquiryEmail] = useState<{configured:boolean;enabled:boolean;recipient:string}|null>(null);
  const [accounts, setAccounts] = useState<SafeAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activation, setActivation] = useState<Activation|null>(null);
  const [owner,setOwner]=useState<SafeAccount|null>(null);
  const [offset,setOffset]=useState(0),[total,setTotal]=useState(0);
  const [search,setSearch]=useState(''),[selected,setSelected]=useState(''),[revision,setRevision]=useState(0);
  const [overviewSelected,setOverviewSelected]=useState('');
  const overviewDetailRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{if(overviewSelected)overviewDetailRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});},[overviewSelected]);
  const activeLoad=useRef<AbortController|null>(null);
  const load = useCallback(async () => {
    activeLoad.current?.abort();const controller=new AbortController();activeLoad.current=controller;
    try {
      setLoading(true);setError('');
      const r = await fetch("/api/admin?offset="+offset, { cache: "no-store",signal:controller.signal });
      const data = await r.json();
      if (!r.ok) {if(r.status===401||r.status===403){setAccounts([]);setInquiries([]);setOwner(null);setSelected('');setOverviewSelected('');setActivation(null);window.location.replace('/login');}throw new Error(data.message);}
      if(controller.signal.aborted)return;
      setInquiries(data.inquiries);
      setInquiryEmail(data.inquiryEmail);
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
  useEffect(()=>{
    const check=()=>{if(document.visibilityState==='visible')void load();};
    const restore=(event:PageTransitionEvent)=>{if(event.persisted)window.location.reload();};
    document.addEventListener('visibilitychange',check);window.addEventListener('pageshow',restore);
    return()=>{document.removeEventListener('visibilitychange',check);window.removeEventListener('pageshow',restore);};
  },[load]);
  async function action(body: unknown) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setActivation(null);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {if(r.status===401||r.status===403){setAccounts([]);setInquiries([]);setOwner(null);setSelected('');setOverviewSelected('');setActivation(null);window.location.replace('/login');}throw new Error(data.message);}
      if (data.activationPath) {
        setActivation({
          link: window.location.origin + data.activationPath,
          expiresAt: data.activationExpiresAt,
          plan: data.account?.plan ?? data.activationPlan ?? 'monthly',
        });
      }
      else if (data.ok !== false) setNotice(data.message || "변경 사항을 저장했습니다.");
      await load();
      if (data.ok === false) setError(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리하지 못했습니다.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="access-admin">
      <div className="access-account-head">
        <div><p><strong>{owner?.name||'소유자'} 관리자</strong> · {owner?.email}</p><p className="access-muted">계정 발급·승인은 로그인한 소유자 관리자만 할 수 있습니다.</p></div>
        <button
          className="access-secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          목록 새로고침
        </button>
      </div>
      <nav className="admin-jump-nav" aria-label="관리자 메뉴"><a href="#admin-dashboard">이용 현황</a><a href="#admin-users">사용자·활동 기록</a><a href="#admin-create">계정 직접 생성</a><a href="#admin-inquiries">이용 문의·승인</a><button onClick={async()=>{const r=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok){setAccounts([]);setInquiries([]);setOwner(null);setSelected('');setOverviewSelected('');setActivation(null);window.location.replace('/login');}}}>로그아웃</button></nav>
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
      {activation && <ActivationInvite key={activation.link} {...activation}/>}
      {owner&&<AdminActivityDashboard revision={revision} pending={inquiries.filter(i=>i.status==='pending').length} onSelect={setOverviewSelected}/>}
      {owner&&overviewSelected&&<section ref={overviewDetailRef} className="admin-overview-detail"><div className="admin-section-head"><h2>{overviewSelected===NETWORK_ACTIVITY_ID?'허용 네트워크 이용 상세':'고객별 이용 상세'}</h2><button className="access-secondary" onClick={()=>setOverviewSelected('')}>닫기</button></div><UserActivityView id={overviewSelected} revision={revision}/></section>}
      <section id="admin-create">
        <h2>계정 직접 생성</h2>
        <p className="access-muted">문의 접수 없이도 고객 계정을 만들 수 있습니다. 신규 고객은 발급 후 최대 48시간 동안 유효한 전용 링크에서 비밀번호를 설정해야 로그인할 수 있습니다.</p>
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
          최근 90일 내 문의 중 최신 100건입니다. 연락처와 이메일을 확인한 뒤 승인해 주세요. 이미 활성화한 고객은 기존 비밀번호로 다시 로그인할 수 있습니다.
        </p>
        {inquiryEmail && <div className="admin-inquiry-email">
          <strong>이메일 알림 · {inquiryEmail.enabled ? '발송 설정됨' : inquiryEmail.configured ? '운영 환경에서만 발송' : '설정 필요'}</strong>
          <p>수신 주소: {inquiryEmail.recipient}</p>
          <p>{inquiryEmail.enabled ? '새 문의가 저장되면 이 주소로 알림 메일을 요청합니다. 실제 수신 여부는 메일함과 스팸함에서 확인해 주세요.' : '현재 문의는 관리자 화면에 저장됩니다. 자동 알림을 시작하려면 메일 발송 서비스 연결이 필요합니다.'}</p>
        </div>}
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
                  {!!item.services?.length && <span className="admin-inquiry-services">{inquiryServiceLabels(item.services).map(label => <span key={label}>{label}</span>)}</span>}
                </span>
                <span className="admin-inquiry-status" data-status={item.status}>
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
                <div className="admin-inquiry-mail-status">
                  <p>이메일 알림: {item.notification ? {pending:'발송 처리 중',sent:'발송 요청 완료',failed:'발송 실패',unconfigured:'메일 연결 대기',disabled:'운영 환경에서만 발송'}[item.notification.status] : '발송 기록 없음'}
                    {item.notification?.sentAt ? ` · ${koreanTime(item.notification.sentAt)}` : ''}
                  </p>
                  {item.notification?.status !== 'sent' && <button type="button" className="access-secondary" disabled={busy || !inquiryEmail?.enabled} onClick={() => void action({action:'notify-inquiry',inquiryId:item.id})}>{item.notification?.attempts ? '알림 재시도' : '알림 보내기'}</button>}
                </div>
                {(item.planId || !!item.services?.length) && <dl className="admin-inquiry-selections">
                  {inquiryPlanLabel(item.planId) && <div><dt>선택한 이용 안내</dt><dd>{inquiryPlanLabel(item.planId)}</dd></div>}
                  {!!item.services?.length && <div><dt>광고대행 상담 선택</dt><dd>{inquiryServiceLabels(item.services).join(' · ')}</dd></div>}
                </dl>}
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
                    <GrantFields planId={item.planId}/>
                    <label className="access-checkbox">
                      <input type="checkbox" name="contactVerified" required />{" "}
                      연락처·이메일의 본인 확인과 이용 조건 협의를 마쳤습니다.
                    </label>
                    <button className="jm-button" disabled={busy}>
                      승인하고 이용권 부여
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
          로그인해야 합니다. 활성화 대기 중인 계정은 승인 상태로 저장하면 새 링크가 발급됩니다.
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
                  <strong>{account.name}</strong> {account.email}<small className="admin-customer-account-id">{planLabels[accountPlan(account)]} · 고객 ID {account.id}</small><small className="admin-account-summary">진단 완료 {account.activity?.analyze_success||0} · PDF 생성 {account.activity?.pdf_ready||0} · 다운로드 요청 {account.activity?.pdf_save||0} · 저장 완료 {account.activity?.pdf_saved||0} · 링크 생성 {account.activity?.share_created||0}<br/>최근 기록 {koreanTime(account.activity?.lastSeenAt)}</small>
                </span>
                <span>
                  {account.status === "suspended"
                    ? "이용 중지"
                    : account.expiresAt <= Date.now()
                      ? "기간 종료"
                      : account.activationRequired ? "활성화 대기" : "승인됨"}
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
                      version: account.version,
                      contactVerified: true,
                    });
                  }}
                >
                  <label className="access-checkbox">
                    <input type="checkbox" required /> 계정 소유자를 별도로
                    확인했습니다.
                  </label>
                  <button className="access-secondary" disabled={busy || account.status !== 'approved' || account.expiresAt <= Date.now()}>
                    비밀번호 설정 링크 재발급
                  </button>
                </form>
                <button
                  className="access-delete"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "고객 계정과 사용자별 접속 기록·누적 횟수를 삭제하고 로그인을 즉시 차단할까요? 기존 공유 보고서는 원래 보관 기간(최대 7일)까지 남으며 공유 링크를 가진 사람은 로그인 없이 열람할 수 있습니다.",
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
