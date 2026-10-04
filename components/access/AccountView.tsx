"use client";
import { useAccess } from "./useAccess";
import AccessBar from "./AccessBar";
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
  return (
    <>
      <AccessBar access={access} />
      <div className="access-account-head">
        <h2>
          {account ? `${account.name}님의 이용 현황` : "등록 네트워크 이용 중"}
        </h2>
        <a href="/" className="jm-button">
          새 진단 시작
        </a>
      </div>
      {account ? (
        <>
          <p className="access-muted">
            이용 종료:{" "}
            {new Date(account.expiresAt).toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
            })}{" "}
            · 사용량은 매월 1일 00:00 UTC(한국 09:00)에 초기화됩니다.
          </p>
          <div className="access-usage">
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
                    / {row.enabled ? account.monthlyLimit * row.multiple : 0}회
                  </span>
                </p>
                <span>{row.enabled ? "이번 달 사용량" : "현재 미승인"}</span>
              </article>
            ))}
          </div>
          <p className="access-muted">
            요청이 시작되면 1회가 차감됩니다. 서버에서 실패가 확인되면 복원되며,
            연결 중단·시간 초과로 확인하지 못한 요청은 차감될 수 있습니다.
          </p>
        </>
      ) : (
        <p className="access-muted">
          등록된 IP에서는 기존 진단을 계속 이용할 수 있습니다. 고객용 승인과 월
          한도는 적용되지 않습니다.
        </p>
      )}
      <section className="access-reports">
        <h2>보관한 진단 결과</h2>
        <p>
          결과 화면의 ‘결과 보관·링크 복사’를 누른 보고서입니다. 보관 기간은
          21일이며, 해당 계정 또는 등록 네트워크에서 열람할 수 있습니다.
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
      </section>
    </>
  );
}
