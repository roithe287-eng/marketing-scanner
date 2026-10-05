import type { IndustryBenchmark } from './reportSchema';
export const LEGACY_BENCHMARK_NOTE = '이전 비교값은 중복 사이트·측정 방식·집계 기간을 확인할 수 없어 제공을 보류했습니다. 재진단하면 새 표본 기준을 적용합니다.';
export function presentBenchmark(value?: IndustryBenchmark | null): IndustryBenchmark | null {
    if (!value)
        return null;
    if (value.methodVersion === 2)
        return value;
    return { category: value.category, categoryLabel: value.categoryLabel, sampleSize: 0, hasSufficientSample: false, summary: LEGACY_BENCHMARK_NOTE };
}
