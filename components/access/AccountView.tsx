"use client";
import { useAccess } from "./useAccess";
import AccessBar from "./AccessBar";
import { accountPlan } from '@/lib/saas/types';
export default function AccountView() {
  const { access } = useAccess(true);
  if (access.kind === "loading")
    return <p role="status">이용 정보를 확인하고 있습니다…</p>;
  if (access.kind === "guest" || access.kind === "error")
    return (
      <div className="access-notice">
        <p>{access.message || "승인된 계정으로 로그인해 주세요."}</p>
        <a className="jm-button" href="/login">
          로그인
        </a>
        <a href="/inquiry">이용 문의</a>
      </div>
    );
  const account = access.account;
  const plan=accountPlan(account);
  const single=plan!=='monthly';
  const used=access.usage?.analyze||0;
  return (
    <>
      <AccessBar access={access} />
      <div className="access-account-head">
        <h2>
          {account ? `${account.name}님의 이용 현황` : "등록 네트워크 이용 중"}
        </h2>
        {(!single||!used)&&<a href="/" className="jm-button">
          새 진단 시작
        </a>}
      </div>
      {account ? (
        <>
          <p className="access-muted">
            이용 종료:{" "}
            {account.role==='admin'?'관리자 · 기간 제한 없음':new Date(account.expiresAt).toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}{" "}
            · {single?(plan==='single-pdf'?'1회 진단권 (PDF 포함)':'1회 진단권 (PDF 미포함)'):'사용량은 매월 1일 00:00 UTC(한국 09:00)에 초기화됩니다.'}
          </p>
          {single?<div className="access-usage"><article><h3>사이트 진단</h3><p><strong>{used}</strong><span> / 1회</span></p><span>{used?'사용 완료':'1회 이용 가능'}</span></article></div>:<div className="access-usage">
            {[
              {
                key: "analyze",
                label: "사이트 진단",
                multiple: 1,
                enabled: true,
              },
              {
                key: "competitor",
                label: "경쟁사 비교",
                multiple: 1,
                enabled: account.features.competitor,
              },
              {
                key: "deepdive",
                label: "경쟁사 상세 분석",
                multiple: 5,
                enabled: account.features.deepdive,
              },
            ].map((row) => (
              <article key={row.key}>
                <h3>{row.label}</h3>
                <p>
                  <strong>{access.usage?.[row.key] || 0}</strong>
                  <span>
                    {" "}
                    / {account.role==='admin'?'제한 없음':(row.enabled ? account.monthlyLimit * row.multiple : 0)+'회'}
                  </span>
                </p>
                <span>{row.enabled ? "이번 달 사용량" : "현재 미승인"}</span>
              </article>
            ))}
          </div>}
          <p className="access-muted">
            {single?'종합 진단이 완료되면 1회가 차감됩니다. 월이 바뀌어도 사용 횟수는 초기화되지 않습니다.':'요청이 시작되면 1회가 차감됩니다. 서버에서 실패가 확인되면 복원되며, 연결 중단·시간 초과로 확인하지 못한 요청은 차감될 수 있습니다.'}
          </p>
        </>
      ) : (
        <p className="access-muted">
          등록된 네트워크에서는 로그인 없이 진단·PDF·결과 보관을 이용할 수 있습니다.
          보관함은 같은 네트워크에서 공동으로 사용합니다. 개인 계정에 이용 기록을 남기려면 로그인해 주세요.
        </p>
      )}
      {plan!=='single'&&<section className="access-reports">
        <h2>보관한 진단 결과</h2>
        <p>
          {single?'완료한 결과는 내 계정에 최대 7일간 보관되며, 이용 기간 내에 열어 PDF를 다시 받을 수 있습니다.':'결과 화면에서 보관한 보고서입니다. 공유 링크는 최대 7일 동안 열람할 수 있습니다.'}
        </p>
        {access.reports?.length ? (
          <ul>
            {access.reports.map((report) => (
              <li key={report.id}>
                <div>
                  <h3>{report.title}</h3>
                  <p>{report.url}</p>
                </div>
                <a href={"/r/" + report.id}>결과 열기 →</a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="access-empty">
            아직 보관한 보고서가 없습니다. 진단 후 결과를 보관해 주세요.
          </div>
        )}
      </section>}
    </>
  );
}
