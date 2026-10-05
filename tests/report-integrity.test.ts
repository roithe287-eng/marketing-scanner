import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './fixtures/report';
import { calculateAdBudget } from '../lib/adBudgetScenario';
import { analyzeAdWaste } from '../lib/analyzeAdWaste';
import { benchmarkIdentity, benchmarkKeys, benchmarkStatistics, BENCHMARK_CAP, BENCHMARK_WINDOW_DAYS } from '../lib/benchmarkStore';
import { presentBenchmark, LEGACY_BENCHMARK_NOTE } from '../lib/benchmarkPresentation';
import { sameSite } from '../lib/siteIdentity';
import { aggregateCitation, brandMentioned } from '../lib/citationMeasurement';
import { reviewStoredCitation } from '../lib/storedCitation';
import { buildGeoComparison } from '../lib/geoComparison';
import { verifyReportEvidence, normalizeDiscoverability, DISCOVERY_KEYS } from '../lib/reportIntegrity';
import { buildReportInsights } from '../lib/reportInsights';
import { buildReportDocument } from '../lib/reportDocument';
import { DiscoverabilitySchema, MarketingReportSchema, type MarketingReport, type IndustryBenchmark } from '../lib/reportSchema';
import type { ExtractedWebsiteData } from '../lib/extractWebsite';
const scores = (n: number) => Object.fromEntries(Object.keys(fixture.diagnosis).map(k => [k, n]));
const now = Date.parse('2026-10-05T12:00:00Z'), method = 'unit-method';
const sample = (id: string, n: number, at = now) => ({ id, at, method, scores: scores(n) });
test('budget calculation needs actual inputs, preserves negative gaps, and never derives money from scores', () => {
    assert.equal(calculateAdBudget({ spend: '', conversions: '', targetCpa: '' }).cpa, null);
    assert.equal(calculateAdBudget({ spend: '1000000', conversions: '0', targetCpa: '10000' }).difference, null);
    const a = calculateAdBudget({ spend: '1000000', conversions: '100', targetCpa: '8000' });
    assert.deepEqual([a.cpa, a.targetSpend, a.difference], [10000, 800000, 200000]);
    assert.equal(calculateAdBudget({ spend: '1000000', conversions: '100', targetCpa: '12000' }).difference, -200000);
    for (const conversions of ['-1', '1.2', 'Infinity', 'NaN'])
        assert.ok(calculateAdBudget({ spend: '100', conversions, targetCpa: '50' }).errors.length);
    assert.ok(calculateAdBudget({ spend: '100', conversions: '1', targetCpa: '0' }).errors.length);
    const overflow = calculateAdBudget({ spend: '1000000000000', conversions: '1000000000000', targetCpa: '1000000000000' });
    assert.ok(overflow.errors.length);
    assert.equal(overflow.difference, null);
    assert.equal(analyzeAdWaste(fixture.diagnosis), null);
});
test('benchmark uses the latest unique site, excludes self, wrong methods, old, future and invalid samples', () => {
    const raw = [sample('self', 100), sample('a', 10, now - 100), JSON.stringify(sample('a', 80)), sample('b', 40), { ...sample('wrong', 0), method: 'other' }, sample('old', 0, now - BENCHMARK_WINDOW_DAYS * 86400000), sample('future', 0, now + 1), { ...sample('missing', 0), scores: { seo: 0 } }, '{broken'];
    const result = benchmarkStatistics(raw, 'self', method, now);
    assert.equal(result.sampleSize, 2);
    for (const metric of Object.values(result.metrics))
        assert.deepEqual(metric, { average: 60, topTen: 80 });
    assert.equal(benchmarkStatistics([], 'self', method, now).metrics.seo, null);
});
test('benchmark cap selects recent samples rather than low scores, with exact nearest-rank P90', () => {
    const raw = Array.from({ length: BENCHMARK_CAP + 1 }, (_, i) => sample(String(i), i === 0 ? 0 : 100, now - BENCHMARK_CAP + i));
    const result = benchmarkStatistics(raw, 'self', method, now);
    assert.equal(result.sampleSize, BENCHMARK_CAP);
    assert.equal(result.metrics.seo?.average, 100);
    assert.equal(benchmarkStatistics(Array.from({ length: 10 }, (_, i) => sample(String(i), i * 10)), 'self', method, now).metrics.seo?.topTen, 80);
});
test('benchmark identity deduplicates page paths and partitions shared tenants, methods and deployment environments', () => {
    assert.equal(benchmarkIdentity('https://www.example.com/a?x=1'), benchmarkIdentity('http://example.com/b'));
    assert.notEqual(benchmarkIdentity('https://smartstore.naver.com/shop-a'), benchmarkIdentity('https://smartstore.naver.com/shop-b'));
    assert.equal(benchmarkIdentity('https://smartstore.naver.com/'), null);
    const env = process.env.VERCEL_ENV;
    try {
        process.env.VERCEL_ENV = 'production';
        const production = benchmarkKeys('commerce', 'v3');
        process.env.VERCEL_ENV = 'preview';
        assert.notDeepEqual(benchmarkKeys('commerce', 'v3'), production);
        assert.notDeepEqual(benchmarkKeys('commerce', 'v2'), benchmarkKeys('commerce', 'v3'));
    }
    finally {
        if (env === undefined)
            delete process.env.VERCEL_ENV;
        else
            process.env.VERCEL_ENV = env;
    }
});
test('shared Naver domains cannot attribute one merchant or blog to another', () => {
    assert.equal(sameSite('https://smartstore.naver.com/shop-b/products/1', 'https://smartstore.naver.com/shop-a'), false);
    assert.equal(sameSite('https://smartstore.naver.com/shop-a/products/1', 'https://smartstore.naver.com/shop-a'), true);
    assert.equal(sameSite('https://m.blog.naver.com/PostView.naver?blogId=owner&logNo=1', 'https://blog.naver.com/owner'), true);
    assert.equal(sameSite('https://blog.naver.com/other', 'https://blog.naver.com/owner'), false);
    assert.equal(sameSite('https://smartstore.naver.com', 'https://smartstore.naver.com'), false);
    assert.equal(sameSite('https://docs.example.com/x', 'https://example.com'), true);
    assert.equal(sameSite('https://example.com.evil.test', 'https://example.com'), false);
    assert.equal(brandMentioned('notbrand and example.com.evil.test', 'brand', 'https://example.com'), false);
    assert.equal(brandMentioned('브랜드는 상세 조건을 공개합니다.', '브랜드', 'https://example.com'), true);
    assert.equal(brandMentioned('https://smartstore.naver.com/other', '자사이름', 'https://smartstore.naver.com/owner'), false);
});
test('unknown mentions and duplicate observations never become negative observations in denominators', () => {
    const base = fixture.llmCitationTest!.results[0];
    const missing = { ...base, brandMentioned: undefined };
    assert.equal(aggregateCitation([missing]).mentionRate, null);
    const duplicated = aggregateCitation([base, { ...base, cited: true }]);
    assert.equal(duplicated.ownedCitationRate, null);
    assert.equal(duplicated.mentionRate, null);
});
test('old stored citation attribution is rechecked from evidence without claiming a new measurement', () => {
    const base = fixture.llmCitationTest!;
    const old = { ...base, measurementProtocol: 'geo-compare-v1' as const, targetUrl: 'https://smartstore.naver.com/ours', brandName: '우리상점', results: [{ ...base.results[0], cited: true, brandMentioned: true, responseText: '다른상점 추천', sources: [{ url: 'https://smartstore.naver.com/other', title: '타사', ownership: 'own' as const }] }] };
    const checked = reviewStoredCitation(old, fixture.url)!;
    assert.equal(checked.results[0].cited, false);
    assert.equal(checked.results[0].brandMentioned, false);
    assert.equal(checked.results[0].sources![0].ownership, 'external');
    assert.equal(checked.ownedCitationRate, 0);
    assert.equal(checked.measurementProtocol, undefined);
    assert.match(checked.summary, /신규 API 측정이 아니/);
    const absent = reviewStoredCitation({ ...old, results: [{ ...old.results[0], sources: undefined, responseText: undefined }] }, fixture.url)!;
    assert.equal(absent.ownedCitationRate, null);
    assert.equal(absent.mentionRate, null);
    assert.equal(reviewStoredCitation({ ...old, measurementProtocol: 'geo-compare-v3' }, fixture.url)?.measurementProtocol, 'geo-compare-v3');
});
test('changing attribution protocol prevents a fabricated GEO gain', () => {
    const old = { ...fixture.llmCitationTest!, measurementProtocol: 'geo-compare-v1' as const, targetUrl: fixture.url, brandName: '브랜드', cacheHit: false, results: [{ ...fixture.llmCitationTest!.results[0], model: 'm', requestFingerprint: 'x', measuredAt: '2026-10-01T00:00:00Z' }] };
    const current = { ...old, measurementProtocol: 'geo-compare-v2' as const, results: [{ ...old.results[0], cited: true, measuredAt: '2026-10-02T00:00:00Z' }] };
    const result = buildGeoComparison({ ...fixture, geoBaseline: { reportId: 'abc123', url: fixture.url, citation: old }, llmCitationTest: current })!;
    assert.equal(result.matched, 0);
    assert.equal(result.gained, 0);
    assert.equal(result.pairs[0].reason, 'legacy');
});
const data = { url: fixture.url, finalUrl: fixture.url, title: '실제 검색 제목', description: '실제 메타 설명', ogTitle: '공유 전용 제목', ogDescription: '공유 전용 설명', h1: ['실제 대표 제목'], h2: [], buttons: ['상담 신청'], ctaButtons: ['상담 신청'], bodyText: '장문 설명을 원문 그대로 보존합니다.', imageCount: 2, imageWithoutAlt: 1, viewportMeta: 'width=device-width' } as unknown as ExtractedWebsiteData;
test('original quotes are grounded, unsupported examples and H1 contradictions are flagged, with an exact score mean', () => {
    const input: MarketingReport = { ...fixture, overallScore: 99, diagnosis: { ...fixture.diagnosis, seo: 10 }, criticalIssues: [{ title: 'H1 태그 부재', problem: 'H1이 없습니다.', reason: '구조', recommendation: '대표 제목을 확인하세요.', priority: 'high', badExample: '존재하지 않는 문구', goodExample: '제안은 그대로 보존' }], quickWinsDetailed: [{ title: '문구', steps: ['위치 확인'], beforeExample: '장문 설명을 원문 그대로 보존합니다.', afterExample: '개선 제안' }], checklist: [{ id: 'h1', label: 'H1', category: 'seo', status: 'fail', currentValue: '없음', diagnosis: 'AI 오류', guide: '실제 구조 확인' }] };
    const output = verifyReportEvidence(input, data);
    assert.equal(output.overallScore, 63);
    assert.equal(output.scoringMethod, 'ai-axes-mean-v1');
    assert.equal(output.criticalIssues[0].badExample, '실제 대표 제목');
    assert.equal(output.criticalIssues[0].title, 'H1 구조 재확인');
    assert.equal(output.criticalIssues[0].evidenceStatus, 'review');
    assert.match(output.criticalIssues[0].evidenceNote!, /일치하지 않습니다/);
    assert.equal(output.criticalIssues[0].goodExample, undefined);
    const ungrounded=verifyReportEvidence({...input,criticalIssues:[{...input.criticalIssues[0],title:'문구 확인',problem:'현재 문구를 확인'}]},data);
    assert.match(ungrounded.criticalIssues[0].badExample!,/원문 미확인/);
    assert.equal(ungrounded.criticalIssues[0].goodExample,'제안은 그대로 보존');
    assert.equal(output.quickWinsDetailed![0].beforeExample, input.quickWinsDetailed![0].beforeExample);
    assert.equal(output.checklist![0].currentValue, '실제 대표 제목');
    assert.equal(output.checklist![0].status, 'pass');
    assert.equal(output.exampleCopy.currentHeroHeadline, '실제 대표 제목');
    assert.equal(output.exampleCopy.currentCtaText, '상담 신청');
    assert.equal(output.integrity!.warnings.length, 2);
    assert.equal(buildReportInsights(output).tasks.find(t => t.id === 'critical-0')?.status, 'review');
    assert.ok(MarketingReportSchema.safeParse(output).success);
});
test('discoverability arithmetic and status agree with original axes without replacing AI evidence', () => {
    const value = DiscoverabilitySchema.parse({ overallScore: 100, summary: 'AI 판단', ...Object.fromEntries(DISCOVERY_KEYS.map((k, i) => [k, { id: 'wrong', label: k, score: i === 0 ? 0 : 80, status: 'fail', currentValue: '보존할 원문', diagnosis: '해석', guide: '실행' }])) });
    const result = normalizeDiscoverability(value);
    assert.equal(result.overallScore, 70);
    assert.equal(result.grade, 'C');
    assert.equal(result.seoFoundation.status, 'fail');
    assert.equal(result.geo.status, 'pass');
    assert.equal(result.geo.currentValue, '보존할 원문');
    assert.equal(result.geo.score, 80);
});
test('competitor message matrix compares actual title/meta on both sides, ignoring OG and search summaries', () => {
    const report: MarketingReport = { ...fixture, meta: { ogTitle: '무료 상담 후기 전문' }, competitorAnalysis: { searchKeyword: '서비스', ourSite: { url: fixture.url, domain: 'example.com', title: '서비스', metaDescription: '제공 범위', h1: '서비스' }, competitors: [{ rank: 1, title: '검색 요약만 있음', description: '무료', domain: 'other.example', link: 'https://other.example', metaTitle: '서비스', metaDescription: '실제 무료 상담' }] } };
    const insight = buildReportInsights(report);
    assert.equal(insight.messageRows[0].title, '서비스');
    assert.equal(insight.messageRows[0].description, '제공 범위');
    assert.equal(insight.messageRows[0].cells[0].match, null);
    assert.equal(insight.messageRows[1].cells[0].match, '무료');
    report.competitorAnalysis!.ourSite!.metaDescription = '';
    assert.equal(buildReportInsights(report).messageRows[0].available, false);
});
test('old benchmark and score-derived advertising estimates are withheld from downloadable reports', () => {
    const legacy: IndustryBenchmark = { category: 'commerce', categoryLabel: '커머스', sampleSize: 500, hasSufficientSample: true, summary: 'LEGACY_UNVERIFIED_BENCHMARK' };
    assert.equal(presentBenchmark(legacy)?.hasSufficientSample, false);
    assert.equal(presentBenchmark(legacy)?.sampleSize, 0);
    const report = { ...fixture, industryBenchmark: legacy, adWasteSimulation: { baseWasteRate: 39, summary: 'LEGACY_UNVERIFIED_SAVINGS' } } as MarketingReport;
    const text = buildReportDocument(report).map(b => b.text).join('\n');
    assert.ok(text.includes(LEGACY_BENCHMARK_NOTE));
    assert.ok(text.includes('직접 입력'));
    assert.ok(!text.includes('LEGACY_UNVERIFIED'));
    assert.ok(!text.includes('추정 낭비율'));
});
