import { randomInt } from "node:crypto";
import { getRedisClient } from "./redisClient";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";
import { Principal, canReadOwner } from "./saas/types";
import { db, key, decode } from "./saas/store";
const TTL_SECONDS = 21 * 24 * 60 * 60;
const reportKey = (id: string) =>
  `${process.env.VERCEL_ENV === "preview" ? "ms:preview:report:" : "ms:report:"}${id}`;
const validId = (id: string) => /^[A-Za-z0-9]{4,12}$/.test(id);
type Stored = {
  version: 2;
  ownerId: string;
  createdAt: number;
  report: MarketingReport;
};
function generateId() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join(
    "",
  );
}
export async function saveSharedReport(
  report: MarketingReport,
  principal: Principal,
): Promise<string | null> {
  const ownerId =
    principal.kind === "internal" ? "internal" : principal.account.id;
  if (!canReadOwner(ownerId, principal)) return null;
  for (let i = 0; i < 5; i++) {
    const id = generateId();
    const stored: Stored = {
      version: 2,
      ownerId,
      createdAt: Date.now(),
      report,
    };
    const ok = await db().set(reportKey(id), stored, {
      nx: true,
      ex: TTL_SECONDS,
    });
    if (ok === "OK") {
      await db().zadd(key("reports:" + ownerId), {
        score: stored.createdAt,
        member: id,
      });
      return id;
    }
  }
  return null;
}
export async function getSharedReport(
  id: string,
  principal: Principal,
): Promise<MarketingReport | null> {
  if (!validId(id)) return null;
  const record = decode<Stored | MarketingReport>(
    await db().get(reportKey(id)),
  );
  if (!record) return null;
  const wrapped =
    "version" in record && record.version === 2 && "report" in record;
  if (
    !canReadOwner(wrapped ? (record as Stored).ownerId : undefined, principal)
  )
    return null;
  const parsed = MarketingReportSchema.safeParse(
    wrapped ? (record as Stored).report : record,
  );
  return parsed.success ? parsed.data : null;
}
export async function updateSharedReportCompetitor(
  id: string,
  competitorAnalysis: unknown,
  principal: Principal,
): Promise<boolean> {
  if (!validId(id)) return false;
  const privileged =
    principal.kind === "internal" || principal.account.role === "admin";
  if (!privileged && !principal.account.features.reports) return false;
  const result = await db().eval<unknown[], number>(
    `local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end;local data=cjson.decode(raw);local wrapped=data.version==2 and data.report;if ARGV[1]~='privileged' and (not wrapped or data.ownerId~=ARGV[1]) then return 0 end;if wrapped then data.report.competitorAnalysis=cjson.decode(ARGV[2]) else data.competitorAnalysis=cjson.decode(ARGV[2]) end;redis.call('SET',KEYS[1],cjson.encode(data),'KEEPTTL');return 1`,
    [reportKey(id)],
    [
      privileged ? "privileged" : principal.account.id,
      JSON.stringify(competitorAnalysis),
    ],
  );
  return result === 1;
}
export async function listOwnReports(principal: Principal) {
  const owner =
    principal.kind === "internal" ? "internal" : principal.account.id;
  await db().zremrangebyscore(
    key("reports:" + owner),
    0,
    Date.now() - TTL_SECONDS * 1000,
  );
  const ids = await db().zrange<string[]>(key("reports:" + owner), 0, 49, {
    rev: true,
  });
  const records = await Promise.all(
    ids.map(async (id) => {
      const report = await getSharedReport(id, principal);
      return report
        ? {
            id,
            url: report.url,
            title: report.meta?.siteName || report.meta?.domain || report.url,
          }
        : null;
    }),
  );
  return records.filter(Boolean);
}
export function isShareStoreAvailable() {
  return getRedisClient() !== null;
}
