export const AD_BUDGET_NOTE = '광고 계정 실적은 미연동입니다. 직접 입력한 동일 기간·전환 정의의 수치로만 계산합니다. 진단 점수를 손실액·절감률로 환산하지 않습니다.';
export function calculateAdBudget(input: {
    spend: string;
    conversions: string;
    targetCpa: string;
}) {
    const values = {} as Record<keyof typeof input, number | null>;
    const fieldErrors: Partial<Record<keyof typeof input,string>> = {};
    for (const key of ['spend','conversions','targetCpa'] as const) {
        const raw=input[key];
        const value = raw.trim() ? Number(raw) : null;
        if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1e12 || (key === 'conversions' && !Number.isInteger(value)))) {
            fieldErrors[key]=key==='conversions'?'전환 수는 0 이상 1조 이하의 정수로 입력하세요.':'금액은 0 이상 1조 이하로 입력하세요.';
        } else if(key==='targetCpa'&&value===0) {
            fieldErrors[key]='목표 CPA는 0보다 큰 금액으로 입력하세요.';
        }
        values[key] = fieldErrors[key] ? null : value;
    }
    const { spend, conversions, targetCpa } = values;
    const cpa = spend !== null && conversions !== null && conversions > 0 ? spend / conversions : null;
    let targetSpend = conversions !== null && conversions > 0 && targetCpa !== null ? targetCpa * conversions : null;
    if (targetSpend !== null && targetSpend > Number.MAX_SAFE_INTEGER) {
        fieldErrors.targetCpa='목표 예산이 계산 가능한 범위를 초과합니다. 입력값을 확인하세요.';
        targetSpend=null;
    }
    return {values,fieldErrors,errors:[...new Set(Object.values(fieldErrors))],cpa,targetSpend,
        difference:spend!==null&&targetSpend!==null?spend-targetSpend:null};
}
