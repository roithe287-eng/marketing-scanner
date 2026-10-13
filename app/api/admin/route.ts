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
import { grantSchema, emailSchema } from "@/lib/saas/validation";
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
  rateLimit,
  audit,
  createCustomer,
  getAccount,
  usage,
} from "@/lib/saas/store";
import { safeAccount } from "@/lib/saas/types";
import { inquiryEmailSettings, notifyInquiry } from '@/lib/saas/inquiryNotification';
import { activityDetail, activityTotals, captureActivity } from '@/lib/saas/activity';
import { adminOverview } from '@/lib/saas/adminOverview';
import { NETWORK_ACTIVITY_ID } from '@/lib/saas/activityTypes';
import { listReportsForOwner } from '@/lib/shareStore';
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const admin=await requireAdmin(req);
    await limitRequest(req.headers,'admin-read',60,60);
    if(req.nextUrl.searchParams.get('view')==='overview')return privateJson(await adminOverview(admin.id));
    const id=req.nextUrl.searchParams.get('id');
    if(id===NETWORK_ACTIVITY_ID){
      const [activity,totals]=await Promise.all([activityDetail(id),activityTotals([id])]);
      return privateJson({network:true,account:null,activity,totals:totals[0],usage:{},reports:[]});
    }
    if(id){
      z.string().uuid().parse(id);
      const account=await getAccount(id);
      if(!account)throw new AccessError(404,'계정을 찾을 수 없습니다.');
      const [activity, totals, monthlyUsage, reports]=await Promise.all([
        activityDetail(id),activityTotals([id]),usage(id),listReportsForOwner(id,{kind:'account',account:admin})
      ]);
      await captureActivity(admin.id,'admin_view',req.headers,{subjectId:id});
      return privateJson({account:safeAccount(account),activity,totals:totals[0],usage:monthlyUsage,reports});
    }
    const offset=z.coerce.number().int().min(0).max(100000).parse(req.nextUrl.searchParams.get('offset')||0);
    const [accounts, inquiries] = await Promise.all([
      listAccounts(offset,50),
      listInquiries(),
    ]);
    const [totals,total]=await Promise.all([activityTotals(accounts.map(a=>a.id)),db().zcard(key('accounts'))]);
    return privateJson({owner:safeAccount(admin),accounts:accounts.map((a,i)=>({...safeAccount(a),activity:totals[i]})),inquiries,total,offset,pageSize:50,inquiryEmail:inquiryEmailSettings(admin.email)});
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
        z.object({ action: z.literal('notify-inquiry'), inquiryId: z.string().uuid() }).strict(),
        grantSchema.extend({action:z.literal('create'),email:emailSchema,name:z.string().trim().min(1).max(80),company:z.string().trim().max(120).default(''),contactVerified:z.literal(true)}).strict(),
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
    if (body.action === 'notify-inquiry') {
      await rateLimit('inquiry-email-retry:' + body.inquiryId, 3, 3600);
      const status = await notifyInquiry(body.inquiryId);
      const message = { sent: '알림 메일 발송 요청을 완료했습니다.', pending: '다른 발송 요청이 처리 중입니다. 잠시 후 목록을 새로고침해 주세요.', failed: '메일 발송에 실패했습니다. 문의는 보관되어 있으며 다시 시도할 수 있습니다.', unconfigured: '메일 발송 서비스 연결이 필요합니다.', disabled: '운영 사이트에서만 알림 메일을 발송합니다.' }[status];
      return privateJson({ ok: status === 'sent', message });
    }
    if(body.action==='create'){
      if(body.expiresAt<=Date.now())throw new AccessError(400,'이용 종료일을 미래 날짜로 지정해 주세요.');
      const {account,invite}=await createCustomer(body,admin.id);
      await captureActivity(admin.id,'account_created',req.headers,{subjectId:account.id});
      return privateJson({account:safeAccount(account),activationPath:'/activate#'+invite,expiresInHours:48});
    }
    if (body.action === "approve") {
      if (body.expiresAt <= Date.now())
        throw new AccessError(400, "이용 종료일을 미래 날짜로 지정해 주세요.");
      const { account, invite } = await issueAccount(
        body.inquiryId,
        body,
        admin.id,
      );
      await captureActivity(admin.id,'account_approved',req.headers,{subjectId:account.id});
      // Fragment tokens are absent from HTTP request URLs, referrers and server access logs.
      return privateJson({
        account: safeAccount(account),
        activationPath: "/activate#" + invite,
        expiresInHours: 48,
      });
    }
    if (body.action === "reissue") {
      const invite = await reissueInvite(body.id, admin.id);
      await captureActivity(admin.id,'invite_reissued',req.headers,{subjectId:body.id});
      return privateJson({
        activationPath: "/activate#" + invite,
        expiresInHours: 48,
      });
    }
    if (body.action === "delete") {
      await deleteAccount(body.id, body.version, admin.id);
      await captureActivity(admin.id,'account_deleted',req.headers,{subjectId:body.id});
    }
    if (body.action === "update") {
      await updateAccount(body.id, body.version, body, admin.id);
      await captureActivity(admin.id,'account_updated',req.headers,{subjectId:body.id});
    }
    if (body.action === "close") {
      const ok = await db().eval<unknown[], number>(
        `local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local i=cjson.decode(raw);i.status='closed';redis.call('SET',KEYS[1],cjson.encode(i),'KEEPTTL');return 1`,
        [key("inquiry:" + body.inquiryId)],
        [],
      );
      if (!ok) throw new AccessError(404, "문의를 찾을 수 없습니다.");
      await audit(admin.id, "close-inquiry", body.inquiryId);
      await captureActivity(admin.id,'inquiry_closed',req.headers,{subjectId:body.inquiryId});
    }
    return privateJson({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
