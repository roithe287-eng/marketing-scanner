import { headers } from "next/headers";
import AccessShell from "@/components/access/AccessShell";
import AuthForm from "@/components/access/AuthForm";
import { isInternal } from "@/lib/security/request";
import { remoteRecoveryWindow } from "@/lib/saas/remoteOwnerRecovery";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function RecoverPage() {
  const internal = isInternal(await headers());
  const available = process.env.VERCEL_ENV === "production" && (internal || !!remoteRecoveryWindow());
  return (
    <AccessShell
      eyebrow="ADMIN RECOVERY"
      title="관리자 비밀번호 재설정"
      description="등록된 관리자 이메일로 15분 동안 유효한 재설정 링크를 보냅니다."
    >
      {available ? (
        <AuthForm mode="recover" remoteOnly={!internal} />
      ) : (
        <div className="access-notice">
          <p>관리자 접근이 등록된 사무실 네트워크에서 다시 열어 주세요.</p>
          <a className="jm-button" href="/login">로그인으로 돌아가기</a>
        </div>
      )}
    </AccessShell>
  );
}
