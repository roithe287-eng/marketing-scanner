import AccessShell from "@/components/access/AccessShell";
import AuthForm from "@/components/access/AuthForm";
export default function SetupPage() {
  return (
    <AccessShell
      eyebrow="ADMIN SETUP"
      title="최초 관리자 등록"
      description="등록된 네트워크에서 관리자 등록 코드를 입력해 주세요. 최초 한 번만 등록할 수 있습니다."
    >
      <AuthForm mode="setup" />
    </AccessShell>
  );
}
