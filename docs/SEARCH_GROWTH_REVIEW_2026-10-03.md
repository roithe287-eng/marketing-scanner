# SEO · GEO · AEO 공식 문서 재검증과 실행·KPI 개발

확인 기준일: 2026-10-03 (KST). 공개 공식 문서를 직접 조회했다. 계정 내부 설정·실적을 조회한 작업은 아니다.

## 적용 목적

진단 점수와 긴 설명에서 끝나지 않고, 입력 URL의 근거를 바탕으로 담당자가 실행하고 완료 여부를 확인하게 한다. 사이트 변화는 작업 후 지향하는 상태와 사용자 경험으로 설명한다. 노출·인용·매출 상승률을 만들어 내지 않는다.

## 이번에 바로잡은 해석

| 주제 | 공식 문서에서 확인한 범위 | 제품 반영 |
|---|---|---|
| SEO·GEO·AEO | Google AI 검색도 SEO 기본기와 사용자에게 유용한 콘텐츠가 기반 | 세 관점의 목적·확인 지표를 연결해 설명 |
| AI 전용 파일/마크업 | Google Search는 llms.txt를 특별한 최적화 신호로 사용하지 않으며 AI 전용 필수 스키마가 없음 | 필수 항목·자동 가점으로 제안하지 않도록 생성 지침 보완 |
| Google FAQ 리치 결과 | 2026-05-07 표시 종료, 2026-06-15 관련 문서 제거 | FAQPage로 특수 노출을 얻는다는 제안 제외. 고객에게 유용한 문답은 유지 |
| Google AI 참여 제어 | Search Console의 Search generative AI 설정과 상위 속성 상속을 확인할 수 있음 | 계정에서 직접 확인할 작업으로 표시. 자동 성공/실패 판정 금지 |
| Google AI 성과 | 새 생성형 AI 성과 리포트는 AI Overviews·AI Mode 링크 노출을 제공하며 순차 제공·노출량 조건이 있음 | 계정 메뉴와 범위 확인 안내. Gemini API 답변과 검색 AI 실적을 구분 |
| 네이버 검색 성과 | 서치어드바이저의 웹 검색 관련 노출·클릭·CTR. 블로그·광고 등 전체 네이버 실적과 다름 | 동일 영역·업데이트 기준일·비교 기간 안내 |
| 네이버 검색 API | 웹문서 검색 응답을 반환하는 API | 응답 순서를 실제 통합검색 순위·전체 노출 실적으로 해석하지 않음 |
| 네이버 수집 요청 API | 제휴·소유확인·별도 인증 조건 | 일반 검색 API와 구분. API 요청만으로 색인·노출 성공을 선언하지 않음 |
| SPA | 네이버도 SPA 수집·색인을 지원, 주요 콘텐츠 서버 렌더링을 권장 | 실제 렌더 결과를 확인하도록 안내. JS 존재 자체를 미노출 원인으로 단정하지 않음 |
| 제목/H1 | 대표 제목의 명료성, 정확한 주제와 화면 위계가 중요 | 고정 글자 수·H1 개수만으로 패널티 판정 금지 |
| 구조화 데이터 | 현재 지원 기능과 화면에 보이는 실제 내용 일치가 중요 | 유형 개수·문법 통과를 노출 보장으로 취급하지 않음 |
| OpenAI 봇 | OAI-SearchBot의 검색과 GPTBot의 학습은 독립 설정 | 검색 참여를 위해 학습 봇 허용을 요구하지 않음 |
| 성능 | Core Web Vitals의 실사용자·실험실 데이터를 구분 | HTML 응답 시간·viewport 태그로 실제 성능을 통과 처리하지 않음 |
| 광고 | Ads-Naver 수집/색인 정상은 광고 노출 보장이 아님 | 자연 검색·AI 출처·유료 AI 광고를 분리하고 실제 전환 수신 확인 |

## 기능

- 세 관점의 설명 카드와 ‘읽기 → 선택 → 답변 → 완료 행동’ 관계 도식.
- URL별 14개 실행 가이드. 우선 3개, 관점별 필터, 전체 펼치기.
- 각 가이드에 현재 근거, 수정 위치, 담당자, 순서, TO-BE, 기대하는 사이트 변화, KPI, 완료 확인, 공식 출처 포함.
- 담당자용 작업 지시서 복사. 클립보드 사용 불가 시 직접 복사 필드 제공.
- 기존 정적 HTML·robots 관측을 재사용해 Googlebot/Yeti/OAI-SearchBot 경로별 규칙과 Google 메타/헤더 지시를 저장. 추가 네트워크·AI 요청 없음.
- 기술 원본이 없는 이전 보고서는 미관측으로 처리. 다른 URL의 근거를 이 보고서의 사실로 사용하지 않음.
- 상세 PDF에 모든 실행 가이드·측정 안내·출처 포함.

## KPI 정의와 제한

1. 목표 검색 클릭 = 목표 노출수 × 목표 CTR / 100.
2. 목표 전환 세션 = 목표 세션 수 × 목표 세션 전환율 / 100.
3. 검색 클릭과 GA4 세션을 자동으로 같다고 보지 않으며 두 계산은 독립적이다.
4. 전환 세션은 핵심 이벤트를 발생시킨 세션 수이다. 반복 이벤트 횟수나 실제 계약 건수와 구분한다.
5. 빈 값은 미입력, 0인 분모는 비율 미측정, 비율 범위·음수·불가능한 집계는 오류로 처리한다.
6. 목표를 충족할 때의 산술 규모이지 효과 예측이나 달성 가능성 평가가 아니다. 점수에서 성장률을 만들지 않는다.
7. 기본값은 공란. 가상 예시는 명시적으로 선택하며 실제 실적이 아니라는 상태를 유지한다.
8. 입력 값은 화면 내에서만 유지하고 공유/PDF에는 저장하지 않는다. 별도 복사 기능으로 보관한다.
9. 28일 비교는 제안하는 운영 주기일 뿐 효과 반영 기한이 아니다. 검색 도구의 업데이트·시간대·계절성·광고 집행도 함께 검토한다.

## 공식 출처

| 발행 주체 | 문서 |
|---|---|
| Google Search Central | https://developers.google.com/search/docs/fundamentals/ai-optimization-guide |
| Google Search Central | https://developers.google.com/search/updates |
| Search Console | https://support.google.com/webmasters/answer/16908024 |
| Search Console | https://support.google.com/webmasters/answer/16984139 |
| Google Search Central | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag |
| Google Search Central | https://developers.google.com/search/docs/appearance/title-link |
| Google Search Central | https://developers.google.com/search/docs/appearance/featured-snippets |
| Google Search Central | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls |
| Google Search Central | https://developers.google.com/search/docs/appearance/structured-data/sd-policies |
| Google Search Central | https://developers.google.com/search/docs/appearance/core-web-vitals |
| Google web.dev | https://web.dev/articles/vitals |
| Google Analytics | https://support.google.com/analytics/answer/12923437 |
| 네이버 서치어드바이저 | https://searchadvisor.naver.com/guide/report-expose-ctr |
| 네이버 서치어드바이저 | https://searchadvisor.naver.com/guide/report-seo |
| 네이버 서치어드바이저 | https://searchadvisor.naver.com/guide/markup-content |
| 네이버 서치어드바이저 | https://searchadvisor.naver.com/guide/seo-advanced-javascript |
| 네이버 서치어드바이저 | https://searchadvisor.naver.com/guide/crawl-request-api |
| 네이버 디벨로퍼스 | https://developers.naver.com/docs/serviceapi/search/web/web.md |
| 네이버 검색 고객센터 | https://help.naver.com/service/5626/contents/24120 |
| 네이버 광고주센터 | https://ads.naver.com/help/faq/1452 |
| 네이버 광고주센터 | https://ads.naver.com/notice/31888 |
| OpenAI Developers | https://developers.openai.com/api/docs/bots |

## 검증 항목

- 원본 수집 → 기술 신호 저장 → 공유 스키마 → URL별 실행 가이드 → PDF의 연결.
- 봇별 정책 분리, scoped X-Robots-Tag, max-snippet:0, robots 429의 미확인 처리.
- 이전 보고서 호환성, 다른 URL 근거 제외, H1/FAQ 개수로 잘못된 실패 판정 방지.
- KPI 공란·0·범위 오류·이벤트/세션 혼동 방지·감소 시나리오·부분 입력.
- 전체 기존 회귀 테스트, production build, 실제 PDF의 경계 검사 및 시각 확인.
- 배포된 공개 보고서에서 필터·펼치기·계산기·복사·본문/제목 위계를 확인한다. 계정 내부 지표와 자동 상승 효과는 검증 대상 데이터가 없다.
