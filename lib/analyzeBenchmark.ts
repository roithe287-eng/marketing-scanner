import { ExtractedWebsiteData } from "./extractWebsite";
import {
  IndustryBenchmark,
  IndustryCategory,
  IndustryMetric,
} from "./reportSchema";
import { classifyIndustry, industryLabel } from "./industryClassifier";
import {
  saveBenchmarkSample,
  getBenchmarkStats,
  BENCHMARK_METRICS,
  METRIC_LABELS,
  BenchmarkMetric,
  DiagnosisScores,
} from "./benchmarkStore";

/**
 * v45-W3: 업종별 벤치마크 분석
 * - 1) AI가 사이트 업종 자동 분류
 * - 2) 우리 점수를 익명 집계에 저장 (URL·회사명 저장 X)
 * - 3) 카테고리 통계 조회 (평균·상위 10%)
 * - 4) 표본 10개 이상이면 결과 반환, 아니면 hasSufficientSample=false
 *
 * 실패 시 null 반환 (기존 흐름 방해 X)
 */

const MIN_SAMPLE = 10; // 표본 최소 개수 (Q4 결정)

/**
 * 지표 상태 판정
 */
function determineStatus(
  ours: number,
  average: number,
  topTen: number
): IndustryMetric["status"] {
  if (ours >= topTen) return "above_top";
  if (ours >= average) return "above_avg";
  if (ours >= average - 15) return "below_avg";
  return "critical";
}

/**
 * 업종별 벤치마크 분석 메인 함수
 */
export async function analyzeBenchmark(
  data: ExtractedWebsiteData,
  ourScores: DiagnosisScores
): Promise<IndustryBenchmark | null> {
  try {
    // 1. AI 업종 분류
    const category = await classifyIndustry(data);
    const categoryLabel = industryLabel(category);

    // 2. 익명 집계에 우리 점수 저장 (비동기, 실패해도 무시)
    saveBenchmarkSample(category, ourScores).catch((e) =>
      console.warn("[benchmark] 저장 실패:", e)
    );

    // 3. 카테고리 통계 조회
    const stats = await getBenchmarkStats(category);
    if (!stats) {
      return {
        category,
        categoryLabel,
        sampleSize: 0,
        hasSufficientSample: false,
        summary: "벤치마크 데이터 조회 실패",
      };
    }

    const sampleSize = stats.sampleSize;

    // 표본 부족 시 결과만 반환 (UI에서 안내)
    if (sampleSize < MIN_SAMPLE) {
      return {
        category,
        categoryLabel,
        sampleSize,
        hasSufficientSample: false,
        summary: `${categoryLabel} 업종 표본 부족 (현재 N=${sampleSize}, 최소 ${MIN_SAMPLE} 필요). 데이터가 쌓이면 벤치마크가 활성화됩니다.`,
      };
    }

    // 4. 지표별 비교 metrics 배열 구성
    const metrics: IndustryMetric[] = [];

    for (const key of BENCHMARK_METRICS) {
      const stat = stats.metrics[key];
      if (!stat) continue;

      const ours = Math.max(0, Math.min(100, ourScores[key] || 0));
      const { average, topTen } = stat;

      metrics.push({
        key,
        label: METRIC_LABELS[key],
        ours,
        average,
        topTen,
        gapVsAverage: Math.round((ours - average) * 10) / 10,
        gapVsTopTen: Math.round((ours - topTen) * 10) / 10,
        status: determineStatus(ours, average, topTen),
      });
    }

    if (metrics.length === 0) {
      return {
        category,
        categoryLabel,
        sampleSize,
        hasSufficientSample: false,
        summary: "지표 통계 계산 실패",
      };
    }

    // 5. 최강/최약 영역 도출
    const sortedByGap = [...metrics].sort(
      (a, b) => b.gapVsTopTen - a.gapVsTopTen
    );
    const strongest = sortedByGap[0]; // 상위 10% 대비 격차가 가장 작거나 초과한 영역
    const weakest = sortedByGap[sortedByGap.length - 1];

    const strongestArea =
      strongest.gapVsTopTen >= 0
        ? `${strongest.label} · 상위 10% 도달 ✅`
        : `${strongest.label} · 상위 10%까지 ${Math.abs(strongest.gapVsTopTen)}점 차이`;

    const weakestArea = `${weakest.label} · 상위 10% 대비 ${Math.abs(
      weakest.gapVsTopTen
    )}점 격차`;

    // 6. 우선 액션
    const criticalMetrics = metrics.filter((m) => m.status === "critical");
    const priorityActions: string[] = [];

    if (criticalMetrics.length > 0) {
      const top3 = criticalMetrics.slice(0, 3);
      priorityActions.push(
        `업계 평균 대비 심각 격차 영역 ${top3.length}개 우선 개선: ${top3
          .map((m) => m.label)
          .join(", ")}`
      );
    }

    const belowAvg = metrics.filter((m) => m.status === "below_avg");
    if (belowAvg.length > 0) {
      priorityActions.push(
        `업계 평균 미달 영역 ${belowAvg.length}개 (${belowAvg
          .map((m) => m.label)
          .slice(0, 3)
          .join(", ")}) 개선 여지`
      );
    }

    const aboveTop = metrics.filter((m) => m.status === "above_top");
    if (aboveTop.length > 0) {
      priorityActions.push(
        `이미 상위 10% 도달 영역 ${aboveTop.length}개 강점 유지·차별화 소재로 활용`
      );
    }

    if (priorityActions.length === 0) {
      priorityActions.push(
        `대부분 영역이 업계 평균 근처. 최약 영역 ${weakest.label} 우선 개선 권장`
      );
    }

    // 7. 총평
    const aboveAvgCount = metrics.filter(
      (m) => m.status === "above_avg" || m.status === "above_top"
    ).length;
    const criticalCount = criticalMetrics.length;

    let summary: string;
    if (aboveAvgCount >= metrics.length * 0.7) {
      summary = `${categoryLabel} 업종 상위권. ${metrics.length}개 지표 중 ${aboveAvgCount}개가 업계 평균 이상. (표본 N=${sampleSize})`;
    } else if (criticalCount >= 3) {
      summary = `${categoryLabel} 업종 대비 개선 여지 큼. 심각 격차 ${criticalCount}개 영역 우선 대응 필요. (표본 N=${sampleSize})`;
    } else {
      summary = `${categoryLabel} 업종 평균 수준. ${aboveAvgCount}개 영역 평균 이상, ${criticalCount}개 영역 심각. (표본 N=${sampleSize})`;
    }

    return {
      category,
      categoryLabel,
      sampleSize,
      hasSufficientSample: true,
      summary,
      metrics,
      strongestArea,
      weakestArea,
      priorityActions: priorityActions.slice(0, 3),
    };
  } catch (e: any) {
    console.warn("[benchmark] 실행 실패:", e?.message || e);
    return null;
  }
}
