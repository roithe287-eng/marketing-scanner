import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const COOKIE_NAME = "ms_internal";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

/**
 * 환경변수에 설정된 내부 접근 키
 * 없으면 차단 기능 비활성화 (개발 환경)
 */
export function getInternalKey(): string | null {
  const key = process.env.INTERNAL_ACCESS_KEY;
  if (!key || key.length < 4) return null;
  return key;
}

/**
 * 내부 접근 보호 활성화 여부
 */
export function isInternalGuardEnabled(): boolean {
  return getInternalKey() !== null;
}

/**
 * 서버 컴포넌트용: 쿠키로 내부 직원인지 확인
 */
export function isInternalUser(): boolean {
  if (!isInternalGuardEnabled()) return true; // 키 미설정 시 차단 안 함
  const key = getInternalKey();
  if (!key) return true;
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return token === key;
}

/**
 * API 라우트용: NextRequest에서 직접 쿠키 확인
 */
export function isInternalUserFromRequest(req: NextRequest): boolean {
  if (!isInternalGuardEnabled()) return true;
  const key = getInternalKey();
  if (!key) return true;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token === key;
}
