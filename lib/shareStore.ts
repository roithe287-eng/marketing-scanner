import {presentBenchmark} from './benchmarkPresentation';
import {reviewStoredCitation} from './storedCitation';
import { randomInt } from "node:crypto";
import { getRedisClient } from "./redisClient";
import { MarketingReport, MarketingReportSchema } from "./reportSchema";
import { Principal, canReadOwner } from "./saas/types";
import { db, key, decode } from "./saas/store";
import {REPORT_RETENTION_SECONDS as TTL_SECONDS} from './reportRetention';
import {reportKey,READ_REPORT_LUA,RETENTION_LUA,retentionArgs} from './reportRetentionStore';
import {AccessError} from './security/request';
const validId = (id: string) => /^[A-Za-z0-9]{4,12}$/.test(id);
type Stored = {
  version: 2;
  ownerId: string;
  createdAt: number;
  expiresAt: number;
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
  const createdAt=Date.now();
  let expiresAt=createdAt+TTL_SECONDS*1000;
  const references=[report.sharedRetention?.reportId,report.diagnosisBaseline?.reportId,report.geoBaseline?.reportId].filter((id):id is string=>!!id);
  for(const sourceId of new Set(references)) {
    const source=await getSharedReport(sourceId,principal);
    if(!source?.sharedRetention)throw new AccessError(410,'기준 보고서가 만료되었거나 열람 권한이 없습니다. 비교 연결을 해제하고 새로 진단해 주세요.');
    expiresAt=Math.min(expiresAt,source.sharedRetention.expiresAt);
  }
  if(expiresAt<=Date.now())throw new AccessError(410,'보고서의 보관 기간이 만료되었습니다. 새로 진단해 주세요.');
  const {sharedRetention:_retention,...snapshot}=report;
  for (let i = 0; i < 5; i++) {
    const id = generateId();
    const stored: Stored = {
      version: 2,
      ownerId,
      createdAt,
      expiresAt,
      report:snapshot,
    };
    const ok=await db().eval<unknown[],number>(
      `if redis.call('EXISTS',KEYS[1])==1 then return 0 end;redis.call('ZADD',KEYS[2],ARGV[3],ARGV[4]);redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[5]);redis.call('EXPIRE',KEYS[2],ARGV[6]);redis.call('SET',KEYS[1],ARGV[1],'PXAT',ARGV[2]);return 1`,
      [reportKey(id),key('reports:'+ownerId)],
      [JSON.stringify(stored),expiresAt,createdAt,id,createdAt-TTL_SECONDS*1000,TTL_SECONDS],
    );
    if(ok===1){
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
  const stored=await db().eval<unknown[],[unknown,number,number,string]|null>(READ_REPORT_LUA,[reportKey(id)],retentionArgs());
  if(!stored||!Array.isArray(stored)||!canReadOwner(stored[3],principal))return null;
  const record=decode<Stored>(stored[0]);if(!record)return null;
  const parsed=MarketingReportSchema.safeParse(record.report);
  if(!parsed.success)return null;
  const report=parsed.data;
  return {...report,sharedRetention:{reportId:id,createdAt:stored[1],expiresAt:stored[2]},adWasteSimulation:null,industryBenchmark:presentBenchmark(report.industryBenchmark),
    llmCitationTest:reviewStoredCitation(report.llmCitationTest,report.url),
    geoBaseline:report.geoBaseline?{...report.geoBaseline,citation:reviewStoredCitation(report.geoBaseline.citation,report.geoBaseline.url)!}:undefined};
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
  for(let attempt=0;attempt<3;attempt++) {
    const raw=await db().get<string|Stored>(reportKey(id));
    const record=decode<Stored>(raw);if(!record||record.version!==2)return false;
    // Keep JSON arrays intact: Lua cjson turns empty arrays into objects on re-encoding.
    const replacement=JSON.stringify({...record,report:{...record.report,competitorAnalysis}});
    const result=await db().eval<unknown[],number>(
      RETENTION_LUA+`if not data then return 0 end;if ARGV[3]~='privileged' and data.ownerId~=ARGV[3] then return 0 end;local current=cjson.decode(data.raw);if current.createdAt~=tonumber(ARGV[5]) then return 2 end;redis.call('SET',KEYS[1],ARGV[4],'KEEPTTL');return 1`,
      [reportKey(id)],
      [...retentionArgs(),privileged?'privileged':principal.account.id,replacement,record.createdAt],
    );
    if(result!==2)return result===1;
  }
  return false;
}
export async function listOwnReports(principal: Principal) {
  const owner =
    principal.kind === "internal" ? "internal" : principal.account.id;
  const own=await listReportsForOwner(owner,principal);
  if(principal.kind==='account'&&principal.account.role==='admin'){
    const legacy=await listReportsForOwner('internal',principal);
    return [...own,...legacy].sort((a,b)=>b.createdAt-a.createdAt).slice(0,50);
  }
  return own;
}
export async function listReportsForOwner(owner:string,principal:Principal) {
  if(principal.kind==='account'&&principal.account.role!=='admin'&&principal.account.id!==owner)throw new AccessError(403,'보고서 목록 접근 권한이 없습니다.');
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
      if(!report)await db().zrem(key("reports:"+owner),id);
      return report
        ? {
            id,
            createdAt:report.sharedRetention!.createdAt,
            expiresAt:report.sharedRetention!.expiresAt,
            url: report.url,
            title: report.meta?.siteName || report.meta?.domain || report.url,
          }
        : null;
    }),
  );
  return records.filter((record):record is NonNullable<typeof record>=>record!==null);
}
export function isShareStoreAvailable() {
  return getRedisClient() !== null;
}
