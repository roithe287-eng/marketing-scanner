import { AccessError, digest } from "../security/request";
import { auditAdminAction, db, decode, getAccount, hashPassword, key, rateLimit, token } from "./store";
import { scannerEmailConfigured, sendScannerEmail } from "./scannerEmail";
import { emailSchema } from "./validation";

const RECOVERY_SECONDS = 15 * 60;
const ownerKey = () => key("admin-initialized");
const recoveryKey = (value: string) => key("owner-recovery:" + digest(value));
const invalidLink = () => new AccessError(400, "복구 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 요청해 주세요.");

type Recovery = { id: string; version: number; email: string };

export async function requestOwnerRecovery() {
  if (!scannerEmailConfigured()) {
    throw new AccessError(503, "복구 메일을 보낼 수 없습니다. 운영 메일 설정을 확인해 주세요.");
  }
  await rateLimit("owner-recovery-email", 1, 90);
  const redis = db();
  const id = await redis.get<string>(ownerKey());
  const owner = id ? await getAccount(id) : null;
  if (!owner || owner.role !== "admin" || owner.status !== "approved" ||
      !emailSchema.safeParse(owner.email).success) {
    throw new AccessError(503, "등록된 관리자 계정으로 복구 메일을 보낼 수 없습니다.");
  }
  const value = token();
  const record: Recovery = { id: owner.id, version: owner.version, email: owner.email };
  await redis.set(recoveryKey(value), record, { ex: RECOVERY_SECONDS });
  const delivered = await sendScannerEmail(owner.email, {
    subject: "[마케팅스캐너] 관리자 비밀번호 재설정",
    text: [
      "마케팅스캐너 관리자 비밀번호 재설정이 요청되었습니다.",
      "",
      "등록된 네트워크에서 아래 링크를 열어 새 비밀번호를 설정해 주세요.",
      `https://www.mktscanner.com/recover#${value}`,
      "",
      "링크는 발급 후 15분 동안 한 번만 사용할 수 있습니다.",
      "직접 요청한 경우에만 링크를 사용해 주세요.",
    ].join("\n"),
  }, "scanner-owner-recovery/" + digest(value));
  if (!delivered) {
    throw new AccessError(503, "메일 발송을 확인하지 못했습니다. 90초 뒤 다시 요청해 주세요.");
  }
}

export async function completeOwnerRecovery(value: string, password: string) {
  const redis = db();
  const resetKey = recoveryKey(value);
  const record = decode<Recovery>(await redis.get(resetKey));
  if (!record) throw invalidLink();
  const hash = await hashPassword(password);
  const changed = await redis.eval<unknown[], number>(
    `
      local link = redis.call('GET', KEYS[1])
      local raw = redis.call('GET', KEYS[3])
      if not link or not raw then return 0 end
      local reset = cjson.decode(link)
      local account = cjson.decode(raw)
      if redis.call('GET', KEYS[2]) ~= reset.id or account.id ~= reset.id or
          account.role ~= 'admin' or account.status ~= 'approved' or
          account.version ~= reset.version or account.email ~= reset.email then return 0 end
      account.passwordHash = ARGV[1]
      account.version = account.version + 1
      redis.call('SET', KEYS[3], cjson.encode(account), 'KEEPTTL')
      redis.call('DEL', KEYS[1])
      return 1
    `,
    [resetKey, ownerKey(), key("account:" + record.id)],
    [hash],
  );
  if (changed !== 1) throw invalidLink();
  await auditAdminAction(record.id, "owner-password-reset", record.id);
}
