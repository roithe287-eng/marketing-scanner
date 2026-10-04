import AccessShell from "@/components/access/AccessShell";
import AuthForm from "@/components/access/AuthForm";
export default function ActivatePage() {
  return (
    <AccessShell
      eyebrow="YOUR ACCOUNT"
      title="계정 활성화"
      description="비밀번호를 설정하면 승인된 기간과 한도 내에서 이용할 수 있습니다. 활성화 링크는 발급 후 48시간 동안 한 번만 사용할 수 있습니다."
    >
      <AuthForm mode="activate" />
    </AccessShell>
  );
}
