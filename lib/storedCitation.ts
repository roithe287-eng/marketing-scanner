import type { LlmCitationTest } from './reportSchema';
import { CURRENT_GEO_PROTOCOL, aggregateCitation, brandMentioned, buildActionPlan, normalizeSources } from './citationMeasurement';
/** Re-check old attribution against saved evidence; never pretend a fresh API observation occurred. */
export function reviewStoredCitation(value: LlmCitationTest | null | undefined, fallbackUrl: string) {
    if (!value || value.measurementVersion !== 2 || value.measurementProtocol === CURRENT_GEO_PROTOCOL)
        return value;
    const target = value.targetUrl || fallbackUrl;
    const results = value.results.map(row => {
        const sources = normalizeSources(row.sources || [], target);
        const verified = !!row.searchUsed && !!row.citationVerified && Array.isArray(row.sources);
        const mention = typeof row.responseText === 'string' && !!value.brandName ? brandMentioned(row.responseText, value.brandName, target) : undefined;
        return { ...row, sources, brandMentioned: mention, citationVerified: verified, cited: verified && sources.some(s => s.ownership === 'own'),
            status: row.status === 'ok' && !verified ? 'unverified' as const : row.status };
    });
    return { ...value, ...aggregateCitation(results), results, measurementProtocol: undefined,
        summary: '저장된 답변·출처를 현재 사이트 식별 기준으로 재검토했습니다. 신규 API 측정이 아니며, 원문이 없는 항목과 이전·현재 성과 비교는 보류합니다.',
        actionPlan: buildActionPlan(results, target, false) };
}
