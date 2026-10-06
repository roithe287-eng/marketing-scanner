import { NextRequest } from "next/server";
import {
  requireSameOrigin,
  privateJson,
  failure,
} from "@/lib/security/request";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
import { deleteSession, sessionAccount } from "@/lib/saas/store";
import { captureActivity } from "@/lib/saas/activity";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const account=await sessionAccount(req.cookies.get(SESSION_COOKIE)?.value);
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    if(account) await captureActivity(account.id,'logout',req.headers);
    return setSession(privateJson({ ok: true }), "", 0);
  } catch (error) {
    return failure(error);
  }
}
