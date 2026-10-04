import AccessShell from "@/components/access/AccessShell";
import AuthForm from "@/components/access/AuthForm";
export default function LoginPage() {
  return (
    <AccessShell
      eyebrow="WELCOME BACK"
      title="마케팅스캐너 로그인"
      description="승인된 계정으로 진단을 시작하고 보관한 결과를 확인하세요."
    >
      <AuthForm mode="login" />
    </AccessShell>
  );
}
