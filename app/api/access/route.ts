import { NextRequest } from "next/server";
import { getPrincipal } from "@/lib/saas/auth";
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
      return privateJson({
        kind: "internal",
        admin: false,
        ...(req.nextUrl.searchParams.get("reports") === "1"
          ? { reports: await listOwnReports(principal) }
          : {}),
      });
    }
    return privateJson({
      kind: "account",
      admin: principal.account.role === 'admin',
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
