import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/saas/auth";
import AccessShell from "@/components/access/AccessShell";
import AdminView from "@/components/access/AdminView";
export const dynamic = "force-dynamic";
export default async function ManagePage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login");
  return (
    <AccessShell
      wide
      eyebrow="SCANNER ADMIN"
      title="사용자·활동 관리"
      description="계정 승인과 사용 현황, 접속 기록, PDF와 공유 링크 이용을 한곳에서 확인하세요."
    >
      <AdminView />
    </AccessShell>
  );
}
