import { NextRequest } from "next/server";
import { getPrincipal, requireAdmin } from "@/lib/saas/auth";
import { privateJson, failure } from "@/lib/security/request";
import { usage } from "@/lib/saas/store";
import { safeAccount } from "@/lib/saas/types";
import { listOwnReports } from "@/lib/shareStore";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const principal = await getPrincipal(req);
    if (!principal) return privateJson({ kind: "guest" });
    if (principal.kind === "internal") {
      const admin = await requireAdmin(req).catch(() => null);
      return privateJson({
        kind: "internal",
        admin: !!admin,
        ...(req.nextUrl.searchParams.get("reports") === "1"
          ? { reports: await listOwnReports(principal) }
          : {}),
      });
    }
    return privateJson({
      kind: "account",
      account: safeAccount(principal.account),
      usage: await usage(principal.account.id),
      ...(req.nextUrl.searchParams.get("reports") === "1"
        ? { reports: await listOwnReports(principal) }
        : {}),
    });
  } catch (error) {
    return failure(error);
  }
}
