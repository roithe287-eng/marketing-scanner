export const AD_BUDGET_NOTE = '광고 계정 실적은 미연동입니다. 직접 입력한 동일 기간·전환 정의의 수치로만 계산합니다. 진단 점수를 손실액·절감률로 환산하지 않습니다.';
export function calculateAdBudget(input: {
    spend: string;
    conversions: string;
    targetCpa: string;
}) {
    const values = {} as Record<keyof typeof input, number | null>;
    const errors: string[] = [];
    for (const [key, raw] of Object.entries(input)) {
        const value = raw.trim() ? Number(raw) : null;
        if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1e12 || (key === 'conversions' && !Number.isInteger(value))))
            errors.push('금액은 0~1조, 전환 수는 0 이상인 정수로 입력하세요.');
        values[key as keyof typeof input] = value;
    }
    if (values.targetCpa === 0)
        errors.push('목표 CPA는 0보다 큰 금액으로 입력하세요.');
    const { spend, conversions, targetCpa } = values;
    const cpa = !errors.length && spend !== null && conversions !== null && conversions > 0 ? spend / conversions : null;
    const targetSpend = cpa !== null && targetCpa !== null ? targetCpa * conversions! : null;
    if (targetSpend !== null && targetSpend > Number.MAX_SAFE_INTEGER)
        errors.push('목표 예산이 계산 가능한 범위를 초과합니다. 입력값을 확인하세요.');
    return { values, errors: [...new Set(errors)], cpa: errors.length ? null : cpa, targetSpend: errors.length ? null : targetSpend, difference: !errors.length && targetSpend !== null ? spend! - targetSpend : null };
}
