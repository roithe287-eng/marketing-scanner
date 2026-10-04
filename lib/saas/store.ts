import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { getRedisClient } from "../redisClient";
import { AccessError, digest, clientIp } from "../security/request";
import {
  Account,
  Inquiry,
  Principal,
  UsageAction,
  MULTIPLIER,
  isActive,
} from "./types";
export const SESSION_SECONDS = 7 * 24 * 3600;
export const INVITE_SECONDS = 48 * 3600;
export const INQUIRY_SECONDS = 90 * 24 * 3600;
export function prefix() {
  return `ms:saas:v1:${process.env.VERCEL_ENV === "preview" ? "preview" : "production"}:`;
}
export const key = (suffix: string) => prefix() + suffix;
export function db() {
  const r = getRedisClient();
  if (!r)
    throw new AccessError(
      503,
      "접근 권한을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
  return r;
}
export const token = () => randomBytes(32).toString("base64url");
export const tokenValid = (value: unknown): value is string =>
  typeof value === "string" && /^[\w-]{43}$/.test(value);
export const emailKey = (email: string) =>
  key("email:" + digest(email.trim().toLowerCase()));
export function decode<T>(raw: unknown): T | null {
  return !raw ? null : ((typeof raw === "string" ? JSON.parse(raw) : raw) as T);
}
export async function getAccount(id: string) {
  if (!/^[\w-]{36}$/.test(id)) return null;
  return decode<Account>(await db().get(key("account:" + id)));
}
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (err, result) => (err ? reject(err) : resolve(result)),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  const parts = stored?.split("$");
  const valid =
    parts?.length === 3 &&
    parts[0] === "scrypt" &&
    /^[a-f0-9]{32}$/.test(parts[1]) &&
    /^[a-f0-9]{128}$/.test(parts[2]);
  // Same work for a nonexistent or inactive account to limit enumeration by timing.
  const result = await derive(
    password,
    valid ? parts![1] : "00000000000000000000000000000000",
  );
  return !!valid && timingSafeEqual(result, Buffer.from(parts![2], "hex"));
}
export async function rateLimit(
  bucket: string,
  limit: number,
  seconds: number,
) {
  const count = await db().eval<unknown[], number>(
    `local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n`,
    [key("rate:" + bucket)],
    [seconds],
  );
  if (count > limit)
    throw new AccessError(429, "요청이 많습니다. 잠시 후 다시 시도해 주세요.");
}
export async function limitRequest(
  headers: Headers,
  bucket: string,
  limit: number,
  seconds: number,
) {
  await rateLimit(
    `${bucket}:${digest(clientIp(headers) || "unknown")}`,
    limit,
    seconds,
  );
}
export async function createSession(account: Account) {
  const value = token();
  await db().set(
    key("session:" + digest(value)),
    { userId: account.id, version: account.version },
    { ex: SESSION_SECONDS },
  );
  return value;
}
export async function sessionAccount(value: string | undefined) {
  if (!tokenValid(value)) return null;
  const session = decode<{ userId: string; version: number }>(
    await db().get(key("session:" + digest(value))),
  );
  if (!session) return null;
  const account = await getAccount(session.userId);
  return account &&
    account.version === session.version &&
    isActive(account) &&
    account.passwordHash
    ? account
    : null;
}
export async function deleteSession(value: string | undefined) {
  if (tokenValid(value)) await db().del(key("session:" + digest(value)));
}
export function monthBucket(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 7);
}
export async function usage(id: string) {
  return (
    (await db().hgetall<Record<UsageAction, number>>(
      key(`usage:${id}:${monthBucket()}`),
    )) || { analyze: 0, competitor: 0, deepdive: 0 }
  );
}
export const RESERVE_SCRIPT = `
local raw=redis.call('GET',KEYS[1]);if not raw then return -1 end
local u=cjson.decode(raw)
if u.status~='approved' or u.version~=tonumber(ARGV[1]) or u.expiresAt<=tonumber(ARGV[2]) then return -1 end
local action=ARGV[3]
if action~='analyze' and not u.features[action] then return -2 end
local cap=u.monthlyLimit*tonumber(ARGV[4]);local count=tonumber(redis.call('HGET',KEYS[2],action) or '0')
if count>=cap then return -3 end
if not redis.call('SET',KEYS[3],ARGV[5],'NX','EX',120) then return -4 end
redis.call('HINCRBY',KEYS[2],action,1);redis.call('EXPIRE',KEYS[2],6048000);return count+1`;
export const FINISH_SCRIPT = `if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
redis.call('DEL',KEYS[1]);if ARGV[2]=='refund' then local n=tonumber(redis.call('HGET',KEYS[2],ARGV[3]) or '0');if n>0 then redis.call('HINCRBY',KEYS[2],ARGV[3],-1) end end;return 1`;
export async function reserve(principal: Principal, action: UsageAction) {
  if (principal.kind === "internal" || principal.account.role === "admin")
    return async (_refund = false) => {};
  const user = principal.account;
  const reservation = token();
  const bucket = key(`usage:${user.id}:${monthBucket()}`);
  const lock = key(`active:${user.id}:${action}`);
  const result = await db().eval<unknown[], number>(
    RESERVE_SCRIPT,
    [key("account:" + user.id), bucket, lock],
    [user.version, Date.now(), action, MULTIPLIER[action], reservation],
  );
  if (result < 0)
    throw new AccessError(
      result === -1 || result === -2 ? 403 : 429,
      (
        {
          [-1]: "계정의 승인 상태 또는 이용 기간을 확인해 주세요.",
          [-2]: "승인되지 않은 기능입니다.",
          [-3]: "이번 달의 이용 한도를 모두 사용했습니다. 관리자에게 문의해 주세요.",
          [-4]: "같은 분석이 진행 중입니다. 완료 후 다시 시도해 주세요.",
        } as Record<number, string>
      )[result],
    );
  let finished = false;
  return async (refund = false) => {
    if (finished) return;
    await db().eval(
      FINISH_SCRIPT,
      [lock, bucket],
      [reservation, refund ? "refund" : "complete", action],
    );
    finished = true;
  };
}
export async function audit(actor: string, action: string, target: string) {
  const r = db();
  await r.lpush(
    key("audit"),
    JSON.stringify({ actor, action, target, at: Date.now() }),
  );
  await r.ltrim(key("audit"), 0, 1999);
  await r.expire(key("audit"), 180 * 24 * 3600);
}
export async function saveInquiry(
  data: Omit<Inquiry, "id" | "status" | "createdAt">,
) {
  const inquiry: Inquiry = {
    ...data,
    id: randomUUID(),
    createdAt: Date.now(),
    status: "pending",
  };
  const r = db();
  await r.set(key("inquiry:" + inquiry.id), inquiry, { ex: INQUIRY_SECONDS });
  await r.zadd(key("inquiries"), {
    score: inquiry.createdAt,
    member: inquiry.id,
  });
  return inquiry.id;
}
export async function listInquiries() {
  await db().zremrangebyscore(
    key("inquiries"),
    0,
    Date.now() - INQUIRY_SECONDS * 1000,
  );
  const ids = await db().zrange<string[]>(key("inquiries"), 0, 99, {
    rev: true,
  });
  return (await Promise.all(ids.map((id) => db().get(key("inquiry:" + id)))))
    .map((raw) => decode<Inquiry>(raw))
    .filter((x): x is Inquiry => !!x);
}
export async function listAccounts() {
  const ids = await db().zrange<string[]>(key("accounts"), 0, 199, {
    rev: true,
  });
  return (await Promise.all(ids.map(getAccount))).filter(
    (x): x is Account => !!x,
  );
}
export async function createAdmin(data: {
  email: string;
  name: string;
  password: string;
}) {
  const account: Account = {
    id: randomUUID(),
    email: data.email,
    name: data.name,
    company: "진짜마케팅",
    role: "admin",
    status: "approved",
    expiresAt: 0,
    monthlyLimit: 0,
    features: { competitor: true, deepdive: true, reports: true },
    passwordHash: await hashPassword(data.password),
    version: 1,
    createdAt: Date.now(),
  };
  const result = await db().eval<unknown[], number>(
    `if redis.call('EXISTS',KEYS[1])==1 or redis.call('EXISTS',KEYS[3])==1 then return 0 end;redis.call('SET',KEYS[1],ARGV[1]);redis.call('SET',KEYS[2],ARGV[2]);redis.call('SET',KEYS[3],ARGV[1]);redis.call('ZADD',KEYS[4],ARGV[3],ARGV[1]);return 1`,
    [
      key("admin-initialized"),
      key("account:" + account.id),
      emailKey(account.email),
      key("accounts"),
    ],
    [account.id, JSON.stringify(account), account.createdAt],
  );
  if (result !== 1)
    throw new AccessError(
      409,
      "관리자 등록이 이미 완료되었거나 사용할 수 없는 이메일입니다.",
    );
  return account;
}
export async function issueAccount(
  inquiryId: string,
  grant: Pick<Account, "expiresAt" | "monthlyLimit" | "features">,
  actor: string,
) {
  const inquiry = decode<Inquiry>(await db().get(key("inquiry:" + inquiryId)));
  if (!inquiry || inquiry.status === "closed")
    throw new AccessError(404, "문의를 찾을 수 없습니다.");
  const existingId = await db().get<string>(emailKey(inquiry.email));
  const previous = existingId ? await getAccount(existingId) : null;
  if (previous?.role === "admin")
    throw new AccessError(
      409,
      "관리자 이메일은 고객 계정으로 승인할 수 없습니다.",
    );
  const account: Account = {
    id: previous?.id || randomUUID(),
    email: inquiry.email,
    name: inquiry.name,
    company: inquiry.company,
    role: "customer",
    status: "approved",
    expiresAt: grant.expiresAt,
    monthlyLimit: grant.monthlyLimit,
    features: grant.features,
    passwordHash: previous?.passwordHash || null,
    version: (previous?.version || 0) + 1,
    createdAt: previous?.createdAt || Date.now(),
  };
  const invite = token();
  const updated = { ...inquiry, status: "approved", accountId: account.id };
  const ok = await db().eval<unknown[], number>(
    `
local inquiry=redis.call('GET',KEYS[4]);if not inquiry or cjson.decode(inquiry).status=='closed' then return 0 end
local id=redis.call('GET',KEYS[1]);if (id or '')~=ARGV[1] then return 0 end
local raw=redis.call('GET',KEYS[2]);if raw and cjson.decode(raw).version~=tonumber(ARGV[2]) then return 0 end
redis.call('SET',KEYS[1],ARGV[3]);redis.call('SET',KEYS[2],ARGV[4]);redis.call('SET',KEYS[3],ARGV[5],'EX',ARGV[6]);redis.call('SET',KEYS[4],ARGV[7],'KEEPTTL');redis.call('ZADD',KEYS[5],ARGV[8],ARGV[3]);return 1`,
    [
      emailKey(account.email),
      key("account:" + account.id),
      key("invite:" + digest(invite)),
      key("inquiry:" + inquiryId),
      key("accounts"),
    ],
    [
      previous?.id || "",
      previous?.version || 0,
      account.id,
      JSON.stringify(account),
      JSON.stringify({ userId: account.id, version: account.version }),
      INVITE_SECONDS,
      JSON.stringify(updated),
      account.createdAt,
    ],
  );
  if (ok !== 1)
    throw new AccessError(
      409,
      "다른 변경이 있었습니다. 목록을 새로고침해 주세요.",
    );
  await audit(actor, "approve", account.id);
  return { account, invite };
}
export async function activate(invite: string, password: string) {
  const k = key("invite:" + digest(invite));
  const record = decode<{ userId: string; version: number }>(await db().get(k));
  if (!record)
    throw new AccessError(
      400,
      "활성화 링크가 만료되었거나 사용되었습니다. 재발급을 문의해 주세요.",
    );
  const account = await getAccount(record.userId);
  if (!account || account.version !== record.version || !isActive(account))
    throw new AccessError(403, "현재 사용할 수 없는 링크입니다.");
  const hash = await hashPassword(password);
  const ok = await db().eval<unknown[], number>(
    `local raw=redis.call('GET',KEYS[1]);local user=redis.call('GET',KEYS[2]);if not raw or not user then return 0 end;local u=cjson.decode(user);local i=cjson.decode(raw);if u.version~=i.version or u.version~=tonumber(ARGV[1]) or u.status~='approved' or u.expiresAt<=tonumber(ARGV[3]) then return 0 end;u.passwordHash=ARGV[2];u.version=u.version+1;redis.call('SET',KEYS[2],cjson.encode(u));redis.call('DEL',KEYS[1]);return 1`,
    [k, key("account:" + account.id)],
    [record.version, hash, Date.now()],
  );
  if (ok !== 1)
    throw new AccessError(409, "링크가 만료되었거나 이미 사용되었습니다.");
  return { ...account, passwordHash: hash, version: account.version + 1 };
}
export async function updateAccount(
  id: string,
  version: number,
  patch: Pick<Account, "status" | "expiresAt" | "monthlyLimit" | "features">,
  actor: string,
) {
  const ok = await db().eval<unknown[], number>(
    `local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local u=cjson.decode(raw);if u.role~='customer' or u.version~=tonumber(ARGV[1]) then return 0 end;local p=cjson.decode(ARGV[2]);u.status=p.status;u.expiresAt=p.expiresAt;u.monthlyLimit=p.monthlyLimit;u.features=p.features;u.version=u.version+1;redis.call('SET',KEYS[1],cjson.encode(u));return 1`,
    [key("account:" + id)],
    [version, JSON.stringify(patch)],
  );
  if (ok !== 1)
    throw new AccessError(
      409,
      "계정이 변경되었습니다. 새로고침 후 다시 시도해 주세요.",
    );
  await audit(actor, "update-account", id);
}
export async function reissueInvite(id: string, actor: string) {
  const account = await getAccount(id);
  if (!account || account.role !== "customer" || !isActive(account))
    throw new AccessError(400, "이용 기간과 승인 상태를 먼저 확인해 주세요.");
  const invite = token();
  const updated = { ...account, version: account.version + 1 };
  const ok = await db().eval<unknown[], number>(
    `local raw=redis.call('GET',KEYS[1]);if not raw or cjson.decode(raw).version~=tonumber(ARGV[1]) then return 0 end;redis.call('SET',KEYS[1],ARGV[2]);redis.call('SET',KEYS[2],ARGV[3],'EX',ARGV[4]);return 1`,
    [key("account:" + id), key("invite:" + digest(invite))],
    [
      account.version,
      JSON.stringify(updated),
      JSON.stringify({ userId: id, version: updated.version }),
      INVITE_SECONDS,
    ],
  );
  if (!ok)
    throw new AccessError(409, "다른 변경이 있었습니다. 새로고침해 주세요.");
  await audit(actor, "reissue-invite", id);
  return invite;
}
export async function deleteAccount(
  id: string,
  version: number,
  actor: string,
) {
  const account = await getAccount(id);
  if (!account || account.role !== "customer")
    throw new AccessError(404, "고객 계정을 찾을 수 없습니다.");
  const ok = await db().eval<unknown[], number>(
    `local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local u=cjson.decode(raw);if u.role~='customer' or u.version~=tonumber(ARGV[1]) then return 0 end;redis.call('DEL',KEYS[1],KEYS[2]);redis.call('ZREM',KEYS[3],ARGV[2]);return 1`,
    [key("account:" + id), emailKey(account.email), key("accounts")],
    [version, id],
  );
  if (!ok)
    throw new AccessError(409, "계정이 변경되었습니다. 새로고침해 주세요.");
  await audit(actor, "delete-account", id);
}
