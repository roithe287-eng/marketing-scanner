import type { ExtractedWebsiteData } from './extractWebsite';
import type { MarketingReport, Discoverability } from './reportSchema';
export const SCORE_METHOD = 'ai-axes-mean-v1';
export const INTEGRITY_NOTE = '수집 원문·AI 평가·개선 제안을 구분합니다. 원문 대조는 인용 문구의 일치를 확인하며, 페이지가 주장하는 사실이나 AI 해석의 정확성까지 검증한 것은 아닙니다. 순위·성과·실제 모바일 동작은 별도 측정이 필요합니다.';
const normalized = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').replace(/^[“”"'‘’]+|[“”"'‘’]+$/g, '').trim();
export function verifyReportEvidence(report: MarketingReport, data: ExtractedWebsiteData): MarketingReport {
    const warnings: {
        field: string;
        message: string;
    }[] = [];
    const sources = [data.title, data.description, data.ogTitle, data.ogDescription, ...data.h1, ...data.h2, ...data.buttons, ...data.ctaButtons, data.bodyText, ...(data.siteEditing?.elements || []).map(e => e.text)].map(normalized).filter(Boolean);
    const quote = (value: string | undefined, field: string) => {
        if (!value?.trim())
            return value;
        if (sources.some(source => source.includes(normalized(value))))
            return value;
        if (!/^(?:\(?없음\)?|미확인|원문 미확인)$/.test(value.trim()))
            warnings.push({ field, message: 'AI가 현재 문구로 제시한 텍스트를 수집 원문에서 확인하지 못했습니다. 실제 페이지에서 확인하세요.' });
        return '원문 미확인 · 실제 페이지에서 확인 필요';
    };
    const criticalIssues = report.criticalIssues.map((issue, index) => {
        const badExample = quote(issue.badExample, `criticalIssues.${index}.badExample`);
        const claim = issue.title + ' ' + issue.problem;
        const contradiction = /H1/i.test(claim) && /없|부재|누락/.test(claim) && data.h1.length > 0;
        if (contradiction)
            warnings.push({ field: `criticalIssues.${index}`, message: `H1 부재 주장과 달리 정적 HTML에서 H1 텍스트 ${data.h1.length}개를 수집했습니다. 이 이슈는 적용 전 재검토하세요.` });
        return { ...issue, badExample, ...(contradiction || badExample !== issue.badExample ? { evidenceStatus: 'review' as const } : {}), ...(contradiction ? {
            title:'H1 구조 재확인',
            problem:`정적 HTML에서 H1 텍스트 ${data.h1.length}개를 수집했습니다. H1이 없다는 AI 판단은 수집 결과와 일치하지 않아 보류했습니다.`,
            reason:'제목의 존재와 화면에서의 대표성·위계는 구분해서 확인해야 합니다.',
            recommendation:'아래 수집한 H1을 실제 화면의 대표 제목과 대조하세요. 유효한 대표 제목이 있다면 부재를 이유로 H1을 추가하지 마세요. 제목이 페이지 주제를 잘 설명하는지와 제목 간 위계를 확인하세요.',
            badExample:data.h1.join('\n'),goodExample:undefined,exampleNote:'H1 부재를 전제로 한 개선 예시는 보류했습니다.',
            evidenceNote: '수집된 H1과 AI의 부재 주장이 일치하지 않습니다. 확인 후 적용하세요.'
        } : {}) };
    });
    const observed: Record<string, {
        value: string;
        present: boolean;
        note: string;
    }> = {
        title: { value: data.title || '정적 HTML에서 title 텍스트 미감지', present: !!data.title && (!data.seoEvidence || data.seoEvidence.titleCount === 1), note: '수집된 검색 제목 기준입니다. 표시 제목과 검색 반영 여부는 별도 확인합니다.' },
        meta_description: { value: data.description || '정적 HTML에서 meta description 미감지', present: !!data.description && (!data.seoEvidence || data.seoEvidence.descriptionCount === 1), note: '수집된 메타 설명 기준입니다. 실제 검색 스니펫 채택을 뜻하지 않습니다.' },
        og_tags: { value: `og:title: ${data.ogTitle || '미감지'} / og:description: ${data.ogDescription || '미감지'}`, present: !!data.ogTitle && !!data.ogDescription, note: '공유용 메타데이터 관측입니다. 검색 제목·설명과 구분합니다.' },
        h1: { value: data.h1.length ? data.h1.join('\n') : '정적 HTML에서 H1 텍스트 미감지', present: data.h1.length > 0, note: '수집한 HTML에서의 관측입니다. 렌더링 후 제목 구조·대표성은 실제 화면에서 확인하며 H1 개수만으로 패널티를 판단하지 않습니다.' },
        image_alt: { value: `이미지 ${data.imageCount}개 / alt 속성 누락 ${data.imageWithoutAlt}개 / 빈 alt ${data.seoEvidence?.imagesEmptyAlt ?? '미확인'}개`, present: data.imageWithoutAlt === 0, note: 'alt 존재 여부 관측입니다. 장식 이미지의 빈 alt는 적절할 수 있으며 내용의 정확성은 이미지와 대조해야 합니다.' },
        viewport: { value: data.viewportMeta || '정적 HTML에서 viewport 메타 미감지', present: !!data.viewportMeta, note: '태그 존재 관측입니다. 모바일 레이아웃·속도·터치 동작을 실측한 결과가 아닙니다.' },
    };
    const checklist = report.checklist?.map(item => {
        const fact = observed[item.id];
        if (!fact)
            return item;
        return { ...item, currentValue: fact.value, status: fact.present ? 'pass' as const : 'warning' as const, diagnosis: fact.note,
            guide:fact.present?'수집된 값을 실제 화면·관리자 설정과 대조하세요. '+fact.note:item.guide };
    });
    const overallScore = Math.round(Object.values(report.diagnosis).reduce((sum, n) => sum + n, 0) / 8);
    const summaryContradictsH1=data.h1.length>0&&/H1/i.test(report.oneLineSummary)&&/없|부재|누락/.test(report.oneLineSummary);
    return { ...report, overallScore, scoringMethod: SCORE_METHOD, checklist, criticalIssues,
        oneLineSummary:summaryContradictsH1?'수집된 H1과 AI의 부재 판단이 달라 제목 구조를 재확인해야 합니다. 상세 진단의 관측 근거를 먼저 확인하세요.':report.oneLineSummary,
        quickWinsDetailed: report.quickWinsDetailed?.map((r, i) => ({ ...r, beforeExample: quote(r.beforeExample, `quickWinsDetailed.${i}.beforeExample`) })),
        exampleCopy: { ...report.exampleCopy, currentHeroHeadline: data.h1.join('\n') || '정적 HTML에서 H1 텍스트 미감지', currentCtaText: data.ctaButtons.join('\n') || '수집 범위에서 CTA 문구 미감지' },
        integrity: { version: 1, checkedAt: new Date().toISOString(), warnings, note: INTEGRITY_NOTE },
    };
}
export const DISCOVERY_KEYS = ['seoFoundation', 'contentStructure', 'redundancy', 'geo', 'structuredData', 'eeat', 'localBrand', 'aiAnswerability'] as const;
export function normalizeDiscoverability(value: Discoverability): Discoverability {
    const result = { ...value };
    for (const key of DISCOVERY_KEYS) {
        const score = result[key].score;
        result[key] = { ...result[key], id: key, status: score >= 80 ? 'pass' : score >= 50 ? 'warning' : 'fail' };
    }
    const average = Math.round(DISCOVERY_KEYS.reduce((sum, key) => sum + result[key].score, 0) / 8);
    return { ...result, overallScore: average, grade: average >= 90 ? 'A' : average >= 80 ? 'B' : average >= 70 ? 'C' : average >= 60 ? 'D' : 'F' };
}
