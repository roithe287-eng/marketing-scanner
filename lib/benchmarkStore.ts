import { Redis } from "@upstash/redis";
import { IndustryCategory } from "./reportSchema";

/**
 * v45-W3: 업종별 벤치마크 익명 집계 시스템
 * - URL·회사명 절대 저장 안 함
 * - 점수 8개 지표만 카테고리별로 익명 집계
 * - Redis Sorted Set 활용 (각 지표별)
 *
 * Redis 키 구조:
 *   ms:bench:{category}:{metric}     (Sorted Set, member=random_id, score=metric_value)
 *   ms:bench:{category}:count        (String, 표본 개수)
 *   ms:bench:{category}:updated_at   (String, 마지막 업데이트 시각)
 *
 * TTL 없음 (영구 누적) · 매우 안전한 익명 데이터
 */

let redis: Redis | null = null;
try {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn("[benchmark] Redis 초기화 실패:", e);
}

// 집계할 8개 지표 (기존 diagnosis 필드와 매칭)
export const BENCHMARK_METRICS = [
  "firstView",
  "cta",
  "copywriting",
  "trust",
  "conversionFlow",
  "adLanding",
  "mobileUx",
  "seo",
] as const;

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number];

export const METRIC_LABELS: Record<BenchmarkMetric, string> = {
  firstView: "첫 화면",
  cta: "CTA",
  copywriting: "카피",
  trust: "신뢰",
  conversionFlow: "전환 흐름",
  adLanding: "광고 랜딩",
  mobileUx: "모바일 UX",
  seo: "SEO",
};

export type DiagnosisScores = Record<BenchmarkMetric, number>;

/**
 * 랜덤 익명 ID 생성 (URL·회사명 저장 안 함)
 */
function randomAnonymousId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}-${r}`;
}

/**
 * 특정 카테고리에 점수 익명 저장
 * - 각 지표를 Sorted Set에 추가 (score=지표값, member=랜덤 ID)
 * - 표본 개수 카운트 +1
 */
export async function saveBenchmarkSample(
  category: IndustryCategory,
  scores: DiagnosisScores
): Promise<void> {
  if (!redis) return;

  try {
    const anonId = randomAnonymousId();
    const now = Date.now();

    // 각 지표를 개별 Sorted Set에 저장
    // Sorted Set을 쓰는 이유: 백분위 계산·통계 쿼리에 유리
    const promises: Promise<any>[] = [];

    for (const metric of BENCHMARK_METRICS) {
      const key = `ms:bench:${category}:${metric}`;
      const score = Math.max(0, Math.min(100, scores[metric] || 0));
      promises.push(redis.zadd(key, { score, member: anonId }));
    }

    // 표본 개수 증가
    promises.push(redis.incr(`ms:bench:${category}:count`));

    // 마지막 업데이트 시각
    promises.push(redis.set(`ms:bench:${category}:updated_at`, String(now)));

    await Promise.all(promises);
  } catch (e) {
    console.warn("[benchmark] 저장 실패:", e);
    // 실패해도 사용자 리포트 흐름 방해 X
  }
}

/**
 * 특정 카테고리의 통계 조회
 * - 지표별 평균 (mean) · 상위 10% 컷 · 표본 개수
 */
export async function getBenchmarkStats(
  category: IndustryCategory
): Promise<{
  sampleSize: number;
  metrics: Record<
    BenchmarkMetric,
    { average: number; topTen: number } | null
  >;
} | null> {
  if (!redis) return null;

  try {
    // 표본 개수
    const countRaw = await redis.get<string>(`ms:bench:${category}:count`);
    const sampleSize = Number(countRaw || 0);

    if (sampleSize === 0) {
      return {
        sampleSize: 0,
        metrics: BENCHMARK_METRICS.reduce((acc, m) => {
          acc[m] = null;
          return acc;
        }, {} as Record<BenchmarkMetric, { average: number; topTen: number } | null>),
      };
    }

    // 각 지표별 평균·상위 10% 컷 계산
    const metricStats: Record<
      BenchmarkMetric,
      { average: number; topTen: number } | null
    > = {} as any;

    const promises = BENCHMARK_METRICS.map(async (metric) => {
      const key = `ms:bench:${category}:${metric}`;
      try {
        // 전체 개수 확인
        const total = await redis!.zcard(key);
        if (total === 0) {
          metricStats[metric] = null;
          return;
        }

        // 전체 스코어 배열 조회 (Sorted Set — 낮은 점수부터)
        // 표본이 크면 offset 사용, 여기선 최대 10,000개까지 안전하게 조회
        const cap = Math.min(10000, total);
        const items = (await redis!.zrange(key, 0, cap - 1, {
          withScores: true,
        })) as Array<string | number>;

        // withScores → [member, score, member, score, ...]
        const scores: number[] = [];
        for (let i = 1; i < items.length; i += 2) {
          const v = Number(items[i]);
          if (!isNaN(v)) scores.push(v);
        }

        if (scores.length === 0) {
          metricStats[metric] = null;
          return;
        }

        // 평균
        const sum = scores.reduce((s, v) => s + v, 0);
        const average = Math.round((sum / scores.length) * 10) / 10;

        // 상위 10% 컷 (90th percentile)
        const sorted = [...scores].sort((a, b) => a - b);
        const p90Index = Math.floor(sorted.length * 0.9);
        const topTen =
          Math.round(sorted[Math.min(p90Index, sorted.length - 1)] * 10) / 10;

        metricStats[metric] = { average, topTen };
      } catch (e) {
        console.warn(`[benchmark] ${category}:${metric} 통계 실패:`, e);
        metricStats[metric] = null;
      }
    });

    await Promise.all(promises);

    return {
      sampleSize,
      metrics: metricStats,
    };
  } catch (e) {
    console.warn("[benchmark] 통계 조회 실패:", e);
    return null;
  }
}
