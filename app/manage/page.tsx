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
      title="문의·이용 관리"
      description="문의 검토부터 계정 승인, 이용 기간과 한도 관리까지."
    >
      <AdminView />
    </AccessShell>
  );
}
