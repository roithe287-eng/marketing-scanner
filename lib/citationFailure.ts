/** Fixed public messages only: provider messages can contain credentials or project details. */
export const citationFailureCodes = ['API_KEY_MISSING','AUTHENTICATION','PERMISSION_DENIED','PRECONDITION_FAILED','MODEL_NOT_FOUND','RATE_LIMITED','UPSTREAM_UNAVAILABLE','INVALID_REQUEST','OUTPUT_LIMIT','CONTENT_BLOCKED','INCOMPLETE_RESPONSE','EMPTY_RESPONSE','INVALID_RESPONSE','TIMEOUT','CANCELLED','NETWORK','UNKNOWN'] as const;
export type CitationFailureCode = typeof citationFailureCodes[number];
const guidance: Record<CitationFailureCode, [string, string]> = {
  API_KEY_MISSING: ['API 키가 설정되지 않았습니다.', '운영자가 해당 AI 엔진의 서버 API 키 설정을 확인해야 합니다.'],
  AUTHENTICATION: ['AI 제공자가 API 키 인증을 거절했습니다.', '운영자가 키의 유효성·만료·차단 여부와 배포 환경 설정을 확인해야 합니다.'],
  PERMISSION_DENIED: ['AI 제공자가 API 접근 권한을 거절했습니다.', '운영자가 키의 API 제한, 서비스 활성화 여부와 프로젝트 권한을 확인해야 합니다.'],
  PRECONDITION_FAILED: ['AI API 이용 전제 조건을 충족하지 못했습니다.', '운영자가 연결된 프로젝트의 결제·잔액·이용 가능 지역 등 계정 조건을 확인해야 합니다.'],
  MODEL_NOT_FOUND: ['요청한 AI 모델 또는 API 경로를 찾지 못했습니다.', '운영자가 측정 모델명과 API 버전, 해당 프로젝트의 모델 접근 가능 여부를 확인해야 합니다.'],
  RATE_LIMITED: ['API 할당량 또는 요청 한도에 도달했습니다.', '운영자가 분당·일일 한도와 사용량·결제 상태를 확인해야 합니다. 한도 초기화 또는 설정 조정 후 다시 진단하세요.'],
  UPSTREAM_UNAVAILABLE: ['AI 제공자 서버에서 요청을 처리하지 못했습니다.', '잠시 후 다시 진단하세요. 반복되면 운영자가 제공자 서비스 상태와 오류 코드를 확인해야 합니다.'],
  INVALID_REQUEST: ['AI 제공자가 요청 형식 또는 설정을 거절했습니다.', '운영자가 현재 모델의 검색 도구 지원 여부와 요청 매개변수를 확인해야 합니다.'],
  OUTPUT_LIMIT: ['응답이 출력 토큰 한도에 도달해 중단됐습니다.', '운영자가 출력·추론 토큰 설정을 확인해야 합니다. 완료되지 않은 답변은 인용률 계산에 사용하지 않습니다.'],
  CONTENT_BLOCKED: ['AI 제공자의 콘텐츠 정책에 따라 답변 생성이 중단됐습니다.', '선택한 질문의 표현과 내용을 검토해 주세요. 차단된 답변은 인용 여부를 판정할 수 없습니다.'],
  INCOMPLETE_RESPONSE: ['AI 답변이 정상 완료되지 않았습니다.', '운영자가 기록된 종료 사유를 확인해야 합니다. 완료되지 않은 응답은 미인용으로 판정하지 않습니다.'],
  EMPTY_RESPONSE: ['AI 응답에 확인 가능한 답변 본문이 없습니다.', '잠시 후 다시 진단하세요. 반복되면 운영자가 응답 형식과 모델 설정을 확인해야 합니다.'],
  INVALID_RESPONSE: ['AI 응답 형식을 읽을 수 없습니다.', '운영자가 제공자 응답 형식과 연동 코드를 확인해야 합니다.'],
  TIMEOUT: ['응답 대기 제한 시간이 초과됐습니다.', '잠시 후 다시 진단하세요. 반복되면 운영자가 AI 응답 지연과 진단 제한 시간을 확인해야 합니다.'],
  CANCELLED: ['진단 요청이 취소되어 관측을 완료하지 못했습니다.', '진단을 다시 시작해 주세요. 취소된 관측은 인용률에 반영하지 않습니다.'],
  NETWORK: ['AI 제공자와의 네트워크 연결에 실패했습니다.', '잠시 후 다시 진단하세요. 반복되면 운영자가 서버의 외부 API 연결 상태를 확인해야 합니다.'],
  UNKNOWN: ['상세 원인이 확인되지 않은 측정 오류입니다.', '운영자에게 오류 식별 번호를 전달해 주세요. 이전 리포트에 상세 사유가 없다면 다시 진단해야 원인을 확인할 수 있습니다.'],
};
export type CitationFailure = {
  status: 'error'|'timeout'|'unavailable'; errorCode: CitationFailureCode;
  errorMessage: string; errorAction: string; httpStatus?: number; providerCode?: string;
};
const allowedProviderCodes = new Set([
  'INVALID_ARGUMENT','UNAUTHENTICATED','PERMISSION_DENIED','FAILED_PRECONDITION','NOT_FOUND','RESOURCE_EXHAUSTED','INTERNAL','UNAVAILABLE','DEADLINE_EXCEEDED',
  'API_KEY_INVALID','API_KEY_EXPIRED','API_KEY_SERVICE_BLOCKED','API_KEY_HTTP_REFERRER_BLOCKED','API_KEY_IP_ADDRESS_BLOCKED','SERVICE_DISABLED','BILLING_DISABLED','CONSUMER_INVALID',
  'invalid_api_key','insufficient_quota','rate_limit_exceeded','model_not_found','billing_hard_limit_reached',
  'MAX_TOKENS','max_output_tokens','SAFETY','RECITATION','LANGUAGE','BLOCKLIST','PROHIBITED_CONTENT','SPII','IMAGE_SAFETY','OTHER','content_filter',
  'MALFORMED_FUNCTION_CALL','UNEXPECTED_TOOL_CALL','TOO_MANY_TOOL_CALLS','MISSING_THOUGHT_SIGNATURE','MALFORMED_RESPONSE','ESCALATION','PUP_LIMITED_DISABLED',
]);
export function citationFailure(errorCode: CitationFailureCode, httpStatus?: number, providerCode?: unknown): CitationFailure {
  const [errorMessage,errorAction] = guidance[errorCode];
  return {status:errorCode==='API_KEY_MISSING'?'unavailable':errorCode==='TIMEOUT'?'timeout':'error',errorCode,errorMessage,errorAction,
    ...(httpStatus && Number.isInteger(httpStatus) && httpStatus>=400 && httpStatus<=599 ? {httpStatus}:{}),
    ...(typeof providerCode==='string' && allowedProviderCodes.has(providerCode) ? {providerCode}:{}),
  };
}
const object = (value: unknown): Record<string,unknown> => value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
export function httpCitationFailure(status: number, payload: unknown): CitationFailure {
  const error=object(object(payload).error);
  const reasons=(Array.isArray(error.details)?error.details:[]).map(detail=>object(detail).reason);
  const knownReason=reasons.find(r=>typeof r==='string'&&allowedProviderCodes.has(r));
  const code=knownReason || error.status || error.code || error.type;
  if (['API_KEY_INVALID','API_KEY_EXPIRED','invalid_api_key','UNAUTHENTICATED'].includes(String(code)) || status===401) return citationFailure('AUTHENTICATION',status,code);
  if (code==='FAILED_PRECONDITION'||code==='BILLING_DISABLED'||status===402) return citationFailure('PRECONDITION_FAILED',status,code);
  if (status===403) return citationFailure('PERMISSION_DENIED',status,code);
  if (status===404) return citationFailure('MODEL_NOT_FOUND',status,code);
  if (status===429) return citationFailure('RATE_LIMITED',status,code);
  if (status===408||status===504) return citationFailure('TIMEOUT',status,code);
  if (status>=500) return citationFailure('UPSTREAM_UNAVAILABLE',status,code);
  return citationFailure('INVALID_REQUEST',status,code);
}
export function incompleteCitationFailure(reason: unknown): CitationFailure {
  if (reason==='MAX_TOKENS'||reason==='max_output_tokens') return citationFailure('OUTPUT_LIMIT',undefined,reason);
  if (['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII','IMAGE_SAFETY','content_filter','ESCALATION','PUP_LIMITED_DISABLED'].includes(String(reason))) return citationFailure('CONTENT_BLOCKED',undefined,reason);
  return citationFailure('INCOMPLETE_RESPONSE',undefined,reason);
}
export class CitationRequestError extends Error {
  constructor(readonly failure: CitationFailure) {super(failure.errorCode);this.name='CitationRequestError';}
}
/** Read a bounded error body without ever exposing the raw text in results or logs. */
export async function readCitationError(response: Response): Promise<unknown> {
  const reader=response.body?.getReader();if(!reader)return null;
  let size=0;const chunks:Uint8Array[]=[];
  try {
    while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16_384)return null;chunks.push(value);}
    const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder().decode(body));
  } catch {return null;} finally {try{await reader.cancel();}catch{/* preserve HTTP status */}reader.releaseLock();}
}
