import { NextRequest } from "next/server";
import {
  requireSameOrigin,
  privateJson,
  failure,
} from "@/lib/security/request";
import { SESSION_COOKIE, setSession } from "@/lib/saas/auth";
import { deleteSession } from "@/lib/saas/store";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    await deleteSession(req.cookies.get(SESSION_COOKIE)?.value);
    return setSession(privateJson({ ok: true }), "", 0);
  } catch (error) {
    return failure(error);
  }
}
