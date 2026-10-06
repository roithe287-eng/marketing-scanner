# 마케팅스캐너 개발 인수인계

최신 관리자 변경(2026-10-06): [소유자 관리자·사용자 활동 기록 인계](OWNER_ADMIN_ACTIVITY_HANDOVER_2026-10-06.md)를 참고하세요. 운영 관리자 등록 확인이 배포 선행 조건입니다.

최신 변경(2026-10-06): [레이더·7일 보관 정책·Gemini 제거 인계](RADAR_RETENTION_HANDOVER_2026-10-06.md)를 우선 참고하세요. 아래 9월 30일 기록의 공유 21일·Gemini 설정 설명은 현재 구현에 적용되지 않습니다.

확인일: 2026-09-30. 앞으로는 ZIP 대신 최신 Git 브랜치에서 작업합니다.

## 저장소와 운영 환경

- 저장소: https://github.com/roithe287-eng/marketing-scanner
- 운영 도메인: https://www.mktscanner.com/ (`mktscanner.com`에서 이동)
- Vercel: `jinjjamarketing-s-projects / marketing-scanner`
- 프로젝트 ID: `prj_2BHTgMJZACOiHsbp5ptGF5Z6NJm3`
- 운영 브랜치: `main`. 병합하면 Vercel이 자동 배포합니다.
- 변경 PR 및 최종 배포 상태: https://github.com/roithe287-eng/marketing-scanner/pull/6
- Vercel Node.js: `24.x`. 로컬 검증: Node.js `24.19.0`, npm `11.9.0`.
- 인수인계 ZIP의 소스 64개는 이전 main `5856af7897c26e3ab9345f549bcbc3b5e9036ef8`과 바이트 단위로 일치했습니다. 기능 기준은 `v46-W2-1`입니다.

`marketingscanner.com`, `marketing-scanner-beta.vercel.app`은 현재 운영 주소로 사용하지 않습니다. Vercel 관리 화면에서 운영 도메인을 직접 확인했습니다. 연결된 Vercel API는 다른 프로젝트만 반환하지만, 사용자 로그인한 Vercel 브라우저에서는 대상 프로젝트를 정상 조회했습니다.

## 이번 업데이트

- Next.js `14.2.5` → `15.5.26`, React/React DOM `19.3.0`, jsPDF `4.2.1`.
- 공유 페이지의 비동기 `params`, 서버 `cookies()`를 Next.js 15 API에 맞춤.
- PostCSS `8.5.28`로 통일. Next.js의 이전 고정 의존성에 남는 보안 경고 때문에 npm `overrides`를 적용했습니다. 향후 Next.js 업데이트 시 이 override의 필요성을 재검토합니다.
- OpenAI 클라이언트를 실제 호출 시 초기화. 키 없이도 설치·빌드·화면 및 입력 검증이 가능합니다.
- Redis의 Upstash/KV 별칭을 공유·벤치마크·인용 캐시 모두에 적용. 서로 다른 공급자의 불완전한 URL/토큰을 조합하지 않습니다.
- 구조화 데이터(JSON-LD)와 지도 iframe을 읽기 전에 삭제하던 추출 순서 오류 수정. 본문 분석에서는 계속 제외합니다.
- 공유 메타데이터 기본 주소를 실제 운영 도메인으로 정정. 누락된 `og-default.png` 대신 기존 브랜드 로고 사용.
- `SCANNER_CONTACT_URL`을 수집기 User-Agent에 실제 적용.
- 잠금 파일 동기화, 비밀값 없는 환경변수 예시, 자동 회귀 검사 8개 추가.

보안 수정 버전 근거: [Next.js 보안 공지](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Next.js 15 마이그레이션](https://nextjs.org/docs/app/guides/upgrading/version-15). 버전은 현재 잠금 파일을 기준으로 재현합니다.

## 개발·검증

```bash
npm ci
cp .env.local.example .env.local
npm run test
npm run typecheck
npm run build
npm run dev -- --hostname 127.0.0.1
```

실제 분석에는 유효한 개발용 API 키가 필요합니다. 빌드를 위해 임시 가짜 키를 설정할 필요는 없습니다. 키를 Git에 저장하지 않습니다.

## 환경변수

| 설정 | 용도 및 확인 내용 |
| --- | --- |
| `OPENAI_API_KEY` | AI 분석 호출에 필요. 운영·미리보기에 이름 존재 확인 |
| `OPENAI_MODEL` | 메인·발견성·경쟁사 기본 `gpt-4.1-mini`. 운영·미리보기 설정 존재 |
| `GEMINI_API_KEY`, `ENABLE_LLM_CITATION` | 인용 분석. 운영·미리보기에 존재. 문자열 `false`일 때 인용 비활성화 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 경쟁사·키워드 검색. 현재 **운영에만** 존재하므로 미리보기에서 네이버 연동을 확인할 수 없음 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Redis 기본 이름. 완전한 쌍이면 우선 사용 |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | 세 저장소 모두 지원하는 대체 이름. 현재 운영·미리보기에는 이 이름으로 설정됨 |
| `NEXT_PUBLIC_SITE_URL` | 공유 리포트 절대 주소. 미설정 시 `https://www.mktscanner.com` |
| `SCANNER_CONTACT_URL` | 수집기 연락처 URL. 미설정 시 위 사이트 주소 |
| `ALLOWED_IPS` | 회사 IP 제한. 현재 운영·미리보기에 설정 존재. 유지함 |
| `INTERNAL_ACCESS_KEY` | 선택적 쿠키 제한. 현재 Vercel 목록에 없음. 사용 시 4자 이상 |
| `NEXT_PUBLIC_BRAND_URL`, `NEXT_PUBLIC_CONSULT_URL` | 브랜드·상담 링크. 운영·미리보기 설정 존재 |
| `SLACK_WEBHOOK_URL` | 리드 알림. 로컬 검증에 설정하지 않음 |

운영 환경변수는 이름·적용 환경만 확인했으며 비밀값을 추출하거나 복사하지 않았습니다. 운영 접근 제한과 기존 데이터 보관 기간(공유 21일, 인용 캐시 24시간)을 유지합니다.

## 수정 위치

| 작업 | 주요 파일 |
| --- | --- |
| 화면 및 결과 카드 | `app/page.tsx`, `components/` |
| 분석 실행·오류 처리 | `app/api/analyze/route.ts` |
| 수집·인코딩·robots | `lib/extractWebsite.ts` |
| AI 진단 및 클라이언트 | `lib/analyzeMarketing.ts`, `lib/openaiClient.ts` |
| 데이터 구조 | `lib/reportSchema.ts` |
| 기술 SEO·키워드 빈도 | `lib/analyzeNaverOptimization.ts`, `lib/analyzeKeywordFreq.ts` |
| Redis 공통 설정 | `lib/redisClient.ts` |
| 공유 저장·공개 화면 | `lib/shareStore.ts`, `app/api/share/route.ts`, `app/r/[id]/page.tsx` |
| 도메인·수집기 연락처 | `lib/siteConfig.ts` |
| 접근 제한 | `middleware.ts`, `lib/internalAuth.ts` |

새 리포트 필드는 기존 공유 결과와 호환되도록 선택적 필드로 추가합니다. 보조 분석 실패 시 메인 결과를 막지 않고 null 처리합니다. 작업 브랜치 → 검사 → Vercel 미리보기 → main 병합 → 운영 배포 확인 순서로 진행합니다.

## 검증 결과와 경계

- 깨끗한 `npm ci`: 성공.
- `npm audit`: 취약 패키지 10개 → **0개** (확인 시점 기준이며 모든 보안 위험이 없다는 뜻은 아님).
- 자동 테스트 8개: 성공. UTF-8/EUC-KR 한글 추출, JSON-LD·지도 감지, SEO 11개 점검 생성, 키워드 빈도, robots 차단, 무키 모듈 로드, Redis 별칭, 도메인 fallback, IP/쿠키 제한, PDF 이미지·페이지 생성 경로 포함.
- `npm run typecheck`, API 키 없는 `npm run build`: 성공.
- 로컬 프로덕션 HTTP 검사: 메인·제한 안내·로고, 공유 404, 입력 오류, 키 미설정 안내, Redis 미설정 안내 및 공유 보안 헤더 확인.
- 운영 브라우저는 정상 도메인으로 이동한 뒤 기존 IP 제한 안내를 표시함. 이는 접근 정책 적용 확인이며 분석 성공 확인은 아님.
- 실서비스 분석·외부 AI/네이버 호출·Redis 실제 저장·PDF 화면 다운로드는 회사 IP 밖의 점검 브라우저에서 실행할 수 없었습니다. 허용된 회사 네트워크에서 URL 분석 → 경쟁사 분석 → 공유 링크 → PDF 다운로드 흐름 확인이 필요합니다.
- 이번 변경으로 IP 제한을 해제하거나 비밀값을 노출하지 않았습니다. 신규 보조 테스트를 실제 서비스 연동 검증으로 표기하지 않습니다.
# Latest owner administration and activity work

See [OWNER_ADMIN_ACTIVITY_HANDOVER_2026-10-06.md](./OWNER_ADMIN_ACTIVITY_HANDOVER_2026-10-06.md) for the single-owner approval workflow, per-user activity records and production setup prerequisite.
