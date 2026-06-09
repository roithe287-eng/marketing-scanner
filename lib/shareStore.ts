import { Redis } from "@upstash/redis";
import { MarketingReport } from "./reportSchema";

// Upstash Redis 클라이언트 (환경변수 자동 인식)
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    "";
  if (!url || !token) {
    console.warn("[shareStore] Upstash Redis 환경변수 미설정");
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * 6글자 짧은 ID 생성 (URL-safe)
 * 약 568억 개 조합. 충돌 가능성 매우 낮음 + 재시도 로직.
 */
function generateShortId(length = 6): string {
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0,o,l,1 제외
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const KEY_PREFIX = "ms:report:";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30일

/**
 * 분석 결과 저장 → 짧은 ID 반환
 */
export async function saveSharedReport(
  report: MarketingReport
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  // 최대 5번 ID 충돌 재시도
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateShortId(6);
    const key = KEY_PREFIX + id;
    // NX = key가 없을 때만 set (충돌 방지)
    const result = await redis.set(key, JSON.stringify(report), {
      nx: true,
      ex: TTL_SECONDS,
    });
    if (result === "OK") {
      console.log(`[shareStore] 저장 성공: ${id}`);
      return id;
    }
  }
  console.error("[shareStore] 5회 시도 후 ID 발급 실패");
  return null;
}

/**
 * 짧은 ID로 분석 결과 조회
 */
export async function getSharedReport(
  id: string
): Promise<MarketingReport | null> {
  const redis = getRedis();
  if (!redis) return null;

  // ID 유효성 검증 (영숫자만, 4~12자)
  if (!/^[A-Za-z0-9]{4,12}$/.test(id)) return null;

  const key = KEY_PREFIX + id;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    // Upstash는 자동으로 JSON 파싱하기도 함
    if (typeof raw === "string") {
      return JSON.parse(raw) as MarketingReport;
    }
    return raw as MarketingReport;
  } catch (e) {
    console.error("[shareStore] 조회 실패:", e);
    return null;
  }
}

/**
 * Redis 사용 가능 여부 (UI 표시용)
 */
export function isShareStoreAvailable(): boolean {
  return !!(
    (process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );
}
