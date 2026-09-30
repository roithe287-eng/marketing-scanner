# 마케팅스캐너 개발 준비 기록

확인일: 2026-09-30 (KST)

## 기준 코드

- 저장소: https://github.com/roithe287-eng/marketing-scanner
- 기준 브랜치: `main`
- 기준 커밋: `5856af7897c26e3ab9345f549bcbc3b5e9036ef8`
- 인수인계 문서의 기능 버전: `v46-W2-1` (package.json의 `1.0.0`과 별도)
- 첨부 소스 64개 파일은 기준 커밋과 바이트 단위로 모두 일치했습니다.
- 저장소에는 첨부에서 빠진 7개 파일도 있습니다: `package-lock.json`, `vercel.json`, `README.md`, `public/logo-jinjja.png`, `public/logo.svg`, `docs/COMPETITIVE_LANDSCAPE_DATA_LOGIC.md`, `docs/COMPETITIVE_LANDSCAPE_DESIGN_SPEC.md`.
- 이후 작업은 ZIP을 다시 덮어쓰지 말고 최신 Git 브랜치를 기준으로 진행합니다.

## 개발 환경

이번 점검 환경은 Node.js `24.19.0`, npm `11.9.0`입니다. 운영 Vercel의 Node.js 버전은 아직 확인하지 못했습니다.

```bash
npm ci
cp .env.local.example .env.local
# .env.local에 개발용 API 키를 설정합니다.
npm run typecheck
npm run build
npm run dev -- --hostname 127.0.0.1
```

`npm ci`가 실패하던 원인은 잠금 파일에 `@upstash/redis`가 빠져 있었기 때문입니다. 현재 package.json에 선언된 의존성에 맞춰 잠금 파일을 동기화했습니다. Next.js나 React의 버전은 바꾸지 않았습니다.

실제 키 없이 구조적 빌드만 확인할 경우 아래 명령을 사용할 수 있습니다. 이 값은 인증용 키가 아니며 분석 API를 실행할 수 없습니다. 운영·미리보기 환경에 저장하지 마세요.

```bash
OPENAI_API_KEY=build-check-placeholder-not-a-real-key NEXT_TELEMETRY_DISABLED=1 npm run build
```

여러 분석 모듈이 import 시점에 OpenAI 클라이언트를 생성하므로, 키를 완전히 비운 상태에서는 빌드의 페이지 데이터 수집 단계가 실패합니다. 이는 키 없이도 화면 개발이 가능한지와 별개의 제약입니다.

## 환경변수와 실제 코드의 차이

| 설정 | 실제 동작 |
| --- | --- |
| `OPENAI_API_KEY` | 메인 분석 및 보조 AI 분석에 필요. 현재 빌드 시에도 존재해야 함 |
| `OPENAI_MODEL` | 메인·발견성·경쟁사 분석의 기본값은 `gpt-4.1-mini` |
| 보조 AI 모델 | 인용·키워드·업종분류·딥다이브 일부는 `gpt-4o-mini`로 고정 |
| `GEMINI_API_KEY` | 인용 모듈의 Gemini 호출에 필요. 코드의 모델명은 `gemini-2.5-flash` |
| `ENABLE_LLM_CITATION` | 문자열 `false`일 때 비활성화. 미설정 시 활성화 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 경쟁사 검색 및 키워드 조회 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 공유 저장소·벤치마크·인용 캐시에서 인식하는 공통 변수명 |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | 공유 저장소만 대체 이름으로 인식. 다른 두 모듈에는 대체 이름 지원이 없음 |
| `NEXT_PUBLIC_SITE_URL` | 공유 메타 URL 및 수집기 User-Agent 연락처 URL에 사용 |
| `SCANNER_CONTACT_URL` | 주석에만 언급되어 있고 현재 구현에서는 읽지 않음 |
| `ALLOWED_IPS` | 비어 있으면 IP 제한 해제. 운영 값을 확인한 뒤 유지해야 함 |
| `INTERNAL_ACCESS_KEY` | 코드에 남아 있으며 설정하면 쿠키 제한도 활성화됨. 인수인계서상 운영에서는 삭제한 상태 |
| `SLACK_WEBHOOK_URL` | 리드 API가 실제 알림을 보내므로 로컬 점검에는 설정하지 않음 |

API 키와 허용 IP의 운영 값은 조회·복사하지 않았습니다. `.env.local.example`에는 비밀값이 없습니다.

## 수정 위치

| 작업 | 주요 파일 |
| --- | --- |
| 메인 화면 및 결과 카드 배치 | `app/page.tsx`, `components/` |
| 분석 순서 및 오류 처리 | `app/api/analyze/route.ts` |
| 웹사이트 수집·robots·인코딩 | `lib/extractWebsite.ts` |
| AI 진단 문구·점수 생성 | `lib/analyzeMarketing.ts` |
| 리포트 데이터 구조 | `lib/reportSchema.ts` |
| 기술 SEO·키워드 빈도 | `lib/analyzeTechnicalSeo.ts`, `lib/analyzeKeywordFreq.ts` |
| 경쟁사 조회·딥다이브 | `lib/competitorAnalysis.ts`, `lib/analyzeDeepDive.ts` |
| 공유 저장 및 공개 리포트 | `lib/shareStore.ts`, `app/api/share/route.ts`, `app/r/[id]/page.tsx`, `components/SharedReportView.tsx` |
| 접근 제한 | `middleware.ts`, `lib/internalAuth.ts` |

메인 흐름은 URL 검증 → 페이지 수집 → 병렬 AI 분석 → 규칙 기반 분석 → 응답입니다. 경쟁사 비교는 화면에서 별도 API를 호출합니다.

새 리포트 필드는 기존 공유 데이터와 호환되도록 `nullable().optional()`로 추가합니다. 보조 분석 실패 시 null로 처리하고 해당 UI는 생략합니다. 기존 수집기 식별자, robots 처리, 공유 리포트 보관 기간 21일은 유지합니다. 관련 파일은 하나의 브랜치에 모아 PR로 검토하고 Vercel 미리보기 확인 후 병합합니다.

## 배포 연결 확인 범위

GitHub 기준 커밋에는 Vercel의 `success / Deployment has completed` 상태가 있습니다. 당시 배포 링크:

https://vercel.com/jinjjamarketing-s-projects/marketing-scanner/6dVztbgJhdhVkMcCijBLAEgJ9xZW

그러나 이번 연결의 Vercel 프로젝트 목록에는 `marketing-scanner`가 없고, 프로젝트 및 배포 직접 조회도 404였습니다. 현재 프로젝트 존재 여부, 연결 권한 범위, 다른 계정으로 이동했는지는 확정하지 못했습니다. GitHub의 과거 성공 상태만으로 현재 서비스가 정상이라고 판단하면 안 됩니다.

공개 주소 접근도 점검 환경에서 `marketingscanner.com`은 502, `marketing-scanner-beta.vercel.app`은 404를 반환했습니다. 접근 환경의 영향과 실제 서비스 상태를 구분할 수 없으므로 서비스 장애로 단정하지 않습니다. 대상 Vercel 프로젝트를 조회할 수 있게 된 뒤 운영 도메인, 배포 커밋, 환경변수 이름 및 적용 환경을 확인해야 합니다.

## 우선 수정 후보

1. Next.js `14.2.5`의 보안 업데이트. 설치 경고 및 [공식 보안 공지](https://nextjs.org/blog/security-update-2025-12-11) 확인. 최소 해당 공지의 14.x 수정 버전은 `14.2.35`이며, 실제 업그레이드 시점의 추가 공지도 확인합니다. 이번 준비 브랜치에는 프레임워크 업그레이드를 포함하지 않았습니다.
2. OpenAI 클라이언트 초기화를 호출 시점으로 이동하여 실제 키 없이도 빌드·입력 검증 경로를 확인할 수 있게 개선.
3. Redis 환경변수 처리 통일. `KV_*`만 설정되어 있으면 벤치마크·인용 캐시가 조용히 비활성화될 수 있음.
4. 공유 페이지의 베타 도메인 fallback 정리. `NEXT_PUBLIC_SITE_URL` 참조는 이미 구현되어 있으므로 참조 자체가 없는 것은 아님.
5. 공유 메타 fallback이 참조하는 `public/og-default.png` 누락 확인. ZIP과 Git 저장소 모두에 없음.

인수인계서의 `html2canvas/jspdf` 타입 오류는 이번 `npm run typecheck`에서는 재현되지 않았습니다. 불필요한 타입 패키지를 추가하지 않았습니다.

## 검증 기록

- 기준 코드 64개 일치 확인: 통과.
- 설치: 동기화 후 의존성 설치 성공, `npm ci --dry-run` 성공.
- `npm run typecheck`: 통과.
- 비밀키 없는 빌드: OpenAI 초기화 단계 실패 확인.
- 임시 비인증 문자열을 사용한 `npm run build`: 통과. 실제 AI 요청은 하지 않음.
- 로컬 프로덕션 서버 HTTP 검사 7개: 통과. 메인·접근 제한 안내·로고 200, 존재하지 않는 공유 링크 404, 빈 입력·잘못된 URL 400, Redis 미설정 시 공유 API 503 확인.
- 브라우저 시각 검수: 실행 도구 시작 실패 및 대체 브라우저 실행 파일 다운로드 실패로 미완료. HTTP 검사 결과를 시각 검수 결과로 대체하지 않음.
- 실제 OpenAI·Gemini·네이버·Redis 연동 및 분석 결과 품질: 유효한 개발용 설정이 없어 미검증.

이번 변경은 개발 설정과 문서만 포함하며, 분석 로직·UI·운영 접근 제한은 변경하지 않습니다.
