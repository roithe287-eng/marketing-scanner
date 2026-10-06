# Gemini 반복 호출 실패 조사

## 확인된 근거와 범위

- 기존 운영 검증 기록(`GEO_COMPETITOR_LIVE_VERIFICATION_20261001.md`, `GEO_COMPARISON_20261002.md`)에 10월 1일과 2일 Gemini 각 5건 모두 HTTP 429, OpenAI 5건 정상 응답이 기록되어 있다. 계정의 할당량 또는 요청 제한이 기존 실패의 확인된 원인이다. 분당·일일·토큰·지출 한도 중 무엇이 걸렸는지는 당시 기록으로 판별할 수 없다.
- 10월 6일 Vercel 환경변수 **메타데이터만** 확인했다. `GEMINI_API_KEY`와 `ENABLE_LLM_CITATION`은 production/preview에 등록되어 있으며, `GEMINI_CITATION_MODEL` 재정의 항목은 없다. 키 값과 키의 유효성·결제 상태는 조회하지 않았다.
- 코드의 기본 모델 `gemini-3.5-flash-lite`와 `google_search` 도구는 Google 공식 문서에 지원 대상으로 기재되어 있다. 미지원 모델이라고 추정해서 모델을 변경하지 않았다.
- 기존 코드는 HTTP 오류 본문을 버렸고, `MAX_TOKENS`·정책 차단·미완료 응답을 일반 실패로 합쳤다. 질문 선택 전 요약에서는 구체적 원인이 보이지 않았다.
- 실제 운영 요청의 최신 오류 응답, Google 프로젝트의 현재 quota 수치·결제 상태, Gemini 정상 실응답은 이번에 확인하지 못했다. 이 변경은 오류 식별과 안내 개선이며, 계정 제한 해제나 Gemini 복구 완료를 의미하지 않는다.

## 반영

- API 오류를 인증, 권한, 이용 전제 조건, 모델/경로 없음, 할당량, 제공자 장애, 요청 형식으로 구분한다. 완료되지 않은 답변의 출력 한도·콘텐츠 제한·빈 응답·형식 오류·시간 초과도 분리한다.
- 결과와 공유/PDF에 오류 분류·HTTP 상태·제공자 코드·조치 안내·오류 UUID를 보존한다. 결과의 질문 선택 전에도 엔진/사유별로 묶어 안내한다. 기존 HTTP 429 문구가 있는 리포트도 한도 확인 안내를 표시한다.
- 제공자 오류 본문은 최대 16 KiB만 읽고 고정 코드만 사용한다. 원문 오류, API 키, 프로젝트 상세, 질문, 사이트 URL은 오류 로그에 남기지 않는다. `[geo-provider-failure]` 로그에는 오류 UUID, 엔진, 모델, 고정 오류 코드, 상태 코드, 소요 시간만 기록한다.
- 실패·미완료 응답을 미인용으로 계산하지 않는다. 모델·질문 생성·동시 호출 수·토큰/시간 예산·정상 응답의 집계/비교 기준은 유지한다. 반복 재시도로 추가 호출을 늘리지 않는다.
- 운영 인증/IP 정책, API 키, Google 결제/한도 설정, 보류된 소비자 앱은 변경하지 않았다.

## 검증

- 자동 테스트 190개 통과: HTTP 400/403/404/429/503, 토큰 한도, 정책 차단, 빈/비정상 응답, 타임아웃/네트워크 오류, 성공 응답, 비밀정보 노출 방지, 저장/PDF/화면 표시와 기존 GEO 회귀 검증 포함.
- TypeScript 검사 및 Next.js 프로덕션 빌드 통과.
- 로컬 프로덕션 빌드 + 합성 API 응답으로 결과 화면 확인: 질문 선택 전 사유 표시, 5건 묶음, 운영자 정보 확장, 320/390/768/1440px 가로 넘침 없음, 브라우저 실행 오류 없음. `tests/browser/citation-failure.cjs`로 재현 가능.
- `agent-browser` CLI는 데몬 기동 실패로 검증하지 못해 Playwright Chromium으로 동일 로컬 화면을 검증했다. 실제 Gemini 성공 호출로 해석해서는 안 된다.

## 운영자가 확인할 항목

1. Google AI Studio에서 운영 `GEMINI_API_KEY`에 연결된 **동일 프로젝트**를 선택한다. 실제 키는 채팅/리포트에 공유하지 않는다.
2. Usage / Rate limits에서 `gemini-3.5-flash-lite`의 활성 한도와 사용량을 확인한다. 한도는 API 키별이 아닌 프로젝트별이다. 키만 다시 발급해도 같은 프로젝트 한도는 유지된다.
3. 프로젝트의 결제 연결·이용 등급·잔액 및 표시된 제한 유형을 확인한다. 한도 증액 또는 유료 이용 변경은 계정 소유자가 결정해야 한다.
4. 제한 해제/초기화 후 승인된 진단 접근 경로에서 다시 진단하고, 새 결과의 오류 코드·UUID 또는 정상 Gemini 답변/검색 출처를 확인한다. 예전 저장 결과는 당시 관측을 보존하므로 자동으로 성공 값으로 바꾸지 않는다.

## 공식 문서 (2026-10-06 확인)

- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- https://ai.google.dev/gemini-api/docs/generate-content/google-search
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://ai.google.dev/api/generate-content#FinishReason
