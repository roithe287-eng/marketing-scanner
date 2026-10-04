import { NextRequest } from "next/server";
import { z } from "zod";
import {
  requireSameOrigin,
  readJson,
  failure,
  privateJson,
  AccessError,
} from "@/lib/security/request";
import { requireAdmin } from "@/lib/saas/auth";
import { grantSchema } from "@/lib/saas/validation";
import {
  db,
  key,
  reissueInvite,
  deleteAccount,
  issueAccount,
  updateAccount,
  listAccounts,
  listInquiries,
  limitRequest,
  audit,
} from "@/lib/saas/store";
import { safeAccount } from "@/lib/saas/types";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [accounts, inquiries] = await Promise.all([
      listAccounts(),
      listInquiries(),
    ]);
    return privateJson({ accounts: accounts.map(safeAccount), inquiries });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const admin = await requireAdmin(req);
    await limitRequest(req.headers, "admin", 30, 60);
    const body = z
      .discriminatedUnion("action", [
        grantSchema.extend({
          action: z.literal("approve"),
          inquiryId: z.string().uuid(),
          contactVerified: z.literal(true),
        }),
        grantSchema.extend({
          action: z.literal("update"),
          id: z.string().uuid(),
          version: z.number().int().positive(),
          status: z.enum(["approved", "suspended"]),
        }),
        z.object({
          action: z.literal("reissue"),
          id: z.string().uuid(),
          contactVerified: z.literal(true),
        }),
        z.object({
          action: z.literal("delete"),
          id: z.string().uuid(),
          version: z.number().int().positive(),
        }),
        z.object({ action: z.literal("close"), inquiryId: z.string().uuid() }),
      ])
      .parse(await readJson(req));
    if (body.action === "approve") {
      if (body.expiresAt <= Date.now())
        throw new AccessError(400, "이용 종료일을 미래 날짜로 지정해 주세요.");
      const { account, invite } = await issueAccount(
        body.inquiryId,
        body,
        admin.id,
      );
      // Fragment tokens are absent from HTTP request URLs, referrers and server access logs.
      return privateJson({
        account: safeAccount(account),
        activationPath: "/activate#" + invite,
        expiresInHours: 48,
      });
    }
    if (body.action === "reissue") {
      const invite = await reissueInvite(body.id, admin.id);
      return privateJson({
        activationPath: "/activate#" + invite,
        expiresInHours: 48,
      });
    }
    if (body.action === "delete")
      await deleteAccount(body.id, body.version, admin.id);
    if (body.action === "update")
      await updateAccount(body.id, body.version, body, admin.id);
    if (body.action === "close") {
      const ok = await db().eval<unknown[], number>(
        `local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local i=cjson.decode(raw);i.status='closed';redis.call('SET',KEYS[1],cjson.encode(i),'KEEPTTL');return 1`,
        [key("inquiry:" + body.inquiryId)],
        [],
      );
      if (!ok) throw new AccessError(404, "문의를 찾을 수 없습니다.");
      await audit(admin.id, "close-inquiry", body.inquiryId);
    }
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
