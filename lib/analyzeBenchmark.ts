import type { ExtractedWebsiteData } from './extractWebsite';
import type { IndustryBenchmark, IndustryCategory } from './reportSchema';
import { industryLabel } from './industryClassifier';
import { saveBenchmarkSample, getBenchmarkStats, BENCHMARK_METRICS, METRIC_LABELS, BENCHMARK_NOTE, BENCHMARK_WINDOW_DAYS, type DiagnosisScores } from './benchmarkStore';
export async function analyzeBenchmark(data: ExtractedWebsiteData, ourScores: DiagnosisScores, category: IndustryCategory, method: string): Promise<IndustryBenchmark | null> {
    if (category === 'etc')
        return { methodVersion: 2, category, categoryLabel: '업종 미확정', sampleSize: 0, hasSufficientSample: false, summary: '명확한 업종을 확인하지 못해 서로 다른 업종의 점수를 합산하지 않았습니다.', scopeNote: BENCHMARK_NOTE };
    const [, stats] = await Promise.all([saveBenchmarkSample(category, ourScores, data.finalUrl || data.url, method), getBenchmarkStats(category, data.finalUrl || data.url, method)]);
    if (!stats)
        return null;
    const base = { methodVersion: 2 as const, category, categoryLabel: industryLabel(category), sampleSize: stats.sampleSize, windowDays: BENCHMARK_WINDOW_DAYS, scoringMethod: method, scopeNote: BENCHMARK_NOTE };
    if (stats.sampleSize < 10)
        return { ...base, hasSufficientSample: false, summary: `자사를 제외한 비교 가능한 표본 ${stats.sampleSize}개. 최소 10개가 쌓인 뒤 참고 분포를 표시합니다. 10개 확보가 통계적 대표성이나 정밀도를 보장하지 않습니다.` };
    const metrics = BENCHMARK_METRICS.flatMap(key => { const stat = stats.metrics[key]; if (!stat)
        return []; const ours = ourScores[key]; return [{ key, label: METRIC_LABELS[key], ours, ...stat, gapVsAverage: Math.round((ours - stat.average) * 10) / 10, gapVsTopTen: Math.round((ours - stat.topTen) * 10) / 10, status: ours >= stat.topTen ? 'above_top' as const : ours >= stat.average ? 'above_avg' as const : 'below_avg' as const }]; });
    return { ...base, hasSufficientSample: true, metrics, summary: `자동 분류된 ${industryLabel(category)} 수집 표본 ${stats.sampleSize}개와 같은 8개 AI 평가 항목을 비교했습니다. 업계 순위나 실적의 우열이 아닙니다.` };
}
