import { createHash } from 'node:crypto';
import { getRedisClient } from './redisClient';
import { DiagnosisScoresSchema, type IndustryCategory } from './reportSchema';
import { siteIdentity } from './siteIdentity';
export const BENCHMARK_METRICS = ['firstView', 'cta', 'copywriting', 'trust', 'conversionFlow', 'adLanding', 'mobileUx', 'seo'] as const;
export type BenchmarkMetric = typeof BENCHMARK_METRICS[number];
export type DiagnosisScores = Record<BenchmarkMetric, number>;
export const METRIC_LABELS: Record<BenchmarkMetric, string> = { firstView: '첫 화면', cta: 'CTA', copywriting: '카피', trust: '신뢰', conversionFlow: '전환 흐름', adLanding: '광고 랜딩', mobileUx: '모바일 UX', seo: 'SEO' };
export const BENCHMARK_WINDOW_DAYS = 90;
export const BENCHMARK_CAP = 2000;
export const BENCHMARK_NOTE = '최근 90일 동안 같은 진단 방식으로 수집한 사이트 호스트·플랫폼 계정별 최신 1건을 비교합니다. 업종·진단 방식별 최신 최대 2,000개를 보관하며 자사 표본은 제외합니다. 자동 업종 분류는 추정이며, 이 표본은 업계 전체·매출·실제 전환율을 대표하지 않습니다. 서로 다른 호스트가 같은 사업자일 수 있습니다.';
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export function benchmarkIdentity(url: string) { const id = siteIdentity(url); return id && (!id.shared || id.tenant) ? digest(JSON.stringify([id.host, id.tenant])) : null; }
export function benchmarkKeys(category: IndustryCategory, method: string) {
    const root = `ms:${process.env.VERCEL_ENV === 'preview' ? 'preview:' : ''}bench:v2:${digest(method).slice(0, 24)}:${category}`;
    return [root + ':records', root + ':time'];
}
export const SAVE_BENCHMARK_SCRIPT = `
redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]);redis.call('ZADD',KEYS[2],ARGV[3],ARGV[1]);
local expired=redis.call('ZRANGEBYSCORE',KEYS[2],'-inf',ARGV[4]);
for _,id in ipairs(expired) do redis.call('HDEL',KEYS[1],id);redis.call('ZREM',KEYS[2],id) end;
local surplus=redis.call('ZCARD',KEYS[2])-tonumber(ARGV[5]);
if surplus>0 then local old=redis.call('ZRANGE',KEYS[2],0,surplus-1);for _,id in ipairs(old) do redis.call('HDEL',KEYS[1],id);redis.call('ZREM',KEYS[2],id) end end;
redis.call('EXPIRE',KEYS[1],ARGV[6]);redis.call('EXPIRE',KEYS[2],ARGV[6]);return 1`;
export type BenchmarkSample = {
    id: string;
    at: number;
    method: string;
    scores: DiagnosisScores;
};
export function benchmarkStatistics(raw: unknown[], excludeId: string, method: string, now = Date.now()) {
    const recent = new Map<string, BenchmarkSample>();
    for (const item of raw) {
        try {
            const r = typeof item === 'string' ? JSON.parse(item) : item;
            const scores = DiagnosisScoresSchema.safeParse(r?.scores);
            if (!scores.success || typeof r.id !== 'string' || r.id === excludeId || r.method !== method || !Number.isFinite(r.at) || r.at > now || r.at <= now - BENCHMARK_WINDOW_DAYS * 86400000)
                continue;
            if (!recent.has(r.id) || recent.get(r.id)!.at < r.at)
                recent.set(r.id, { id: r.id, at: r.at, method, scores: scores.data });
        }
        catch { /* Invalid records never become zero-valued samples. */ }
    }
    const samples = [...recent.values()].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id)).slice(0, BENCHMARK_CAP);
    const metrics = Object.fromEntries(BENCHMARK_METRICS.map(key => {
        const scores = samples.map(r => r.scores[key]).sort((a, b) => a - b);
        return [key, scores.length ? { average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10, topTen: scores[Math.ceil(scores.length * .9) - 1] } : null];
    })) as Record<BenchmarkMetric, {
        average: number;
        topTen: number;
    } | null>;
    return { sampleSize: samples.length, metrics };
}
export async function saveBenchmarkSample(category: IndustryCategory, scores: DiagnosisScores, url: string, method: string, now = Date.now()) {
    const redis = getRedisClient(), id = benchmarkIdentity(url);
    if (!redis || !id)
        return;
    const checked = DiagnosisScoresSchema.parse(scores);
    await redis.eval(SAVE_BENCHMARK_SCRIPT, benchmarkKeys(category, method), [id, JSON.stringify({ id, at: now, method, scores: checked }), now, now - BENCHMARK_WINDOW_DAYS * 86400000, BENCHMARK_CAP, BENCHMARK_WINDOW_DAYS * 86400]);
}
export async function getBenchmarkStats(category: IndustryCategory, url: string, method: string) {
    const redis = getRedisClient(), id = benchmarkIdentity(url);
    if (!redis || !id)
        return null;
    const raw = await redis.hvals(benchmarkKeys(category, method)[0]);
    return benchmarkStatistics(raw, id, method);
}
