import AccessShell from "@/components/access/AccessShell";
import AccountView from "@/components/access/AccountView";
export default function AccountPage() {
  return (
    <AccessShell
      wide
      eyebrow="MY SCANNER"
      title="보관함·이용 현황"
      description="승인 범위와 사용량, 보관한 보고서를 한곳에서 확인하세요."
    >
      <AccountView />
    </AccessShell>
  );
}
