# 페이지·기술 정밀 점검 보완

2026-11-03 공개 기능과 현재 구현을 비교하고 독립적으로 개발했다. 기존 5개 보고서 장, 8개 진단 축, 계정·네트워크 접근 제어, PDF 생성·저장 기록은 유지한다. 추가 관측은 기존 점수에 합산하지 않는다.

## 공개 비교 범위

검토한 페이지는 [SchemaWorks 소개](https://schemaworks.thevuemedia.com/)와 [공개 도움말](https://schemaworks.thevuemedia.com/help)이다. 소개와 도움말의 점검 항목 수가 달라 숫자를 복제하거나 동등성을 주장하지 않았다. 로그인 이후 화면·리포트, 비공개 API, 소스코드, 디자인 자산은 열람·수집하지 않았다.

| 공개적으로 설명된 목적 | 기존 마케팅스캐너 | 보완 결과 |
| --- | --- | --- |
| 메타·canonical·robots·구조화 데이터 | 공식 검색 기준, 원문 근거, 개선안 구현 | 기존 기능 유지, 다중 페이지 표본 비교 추가 |
| 여러 페이지의 메타 중복 | 입력 HTML 중심 검사 | 입력 페이지 + 최대 3개 공개 HTML의 제목·설명 중복, 누락, canonical·noindex 관측 |
| 의료기관·의료진 정보 | 일반 구조화 데이터 점검 | MedicalClinic, Hospital, Dentist, Physician, IndividualPhysician, PhysiciansOffice, 관련 Person의 식별 정보와 @id 연결 점검 |
| 사이트맵·변경일 | robots 선언 등 중심 | XML URL 목록/인덱스, 하위 문서 1개, URL 최대 1,500개, lastmod 유효 날짜·미래 날짜 점검 |
| AI 접근 관련 파일·정책 | 기본 크롤러 점검 | 검색·학습·사용자 요청 10개 봇 정책을 독립 표시, llms.txt는 선택 관측 |
| 레거시 스크립트·분석 태그·배경 이미지 | 일반 스크립트 감지 | 선언된 jQuery 버전, UA·GA4·GTM 구분, 인라인 배경 이미지의 정보 전달 검토 후보 |
| 다운로드 | 상세·한 장 요약 PDF | 기존 PDF 유지, 같은 의미 블록에서 HTML·Markdown 전체 보고서 생성 |
| 공개 공유·화이트라벨·BYOK | 승인 계정·네트워크, 기한 있는 보고서 공유 | 브랜드·접근 제어 유지. 비공개 기능이나 자격증명 처리 방식을 따라 만들지 않음 |

## 독립 구현과 근거

기능 목적만 비교했으며 화면 구성·문구·코드·평가 가중치·로고는 복제하지 않았다. 기존 자체 보고서 구성 요소를 재사용했고 외부 페이지에 코드를 주입하거나 변경하지 않는다. 아래 공개 표준·운영자 문서에서 의미를 확인하고 자체 진단 문구와 로직을 작성했다. 이는 특정 사이트의 검색 성과나 포괄적 법률 검토 완료를 뜻하지 않는다.

- [Schema.org MedicalClinic](https://schema.org/MedicalClinic), [Physician](https://schema.org/Physician), [IndividualPhysician](https://schema.org/IndividualPhysician), [PhysiciansOffice](https://schema.org/PhysiciansOffice)
- [Google 사이트맵](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): lastmod는 실제 주요 변경일을 뜻하며 일정 일수 이상 오래됐다는 이유로 결함 판정하지 않는다.
- [Google AI 검색 안내](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): llms.txt 등 특별 파일이나 특별한 구조화 데이터가 Google AI 검색의 필수 요건이 아니다.
- [Google 크롤러](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers): Google-Extended는 Google 검색 포함·순위 신호와 구분한다.
- [OpenAI 크롤러](https://developers.openai.com/api/docs/bots): OAI-SearchBot, GPTBot, ChatGPT-User의 목적을 분리한다.
- [Anthropic 크롤러](https://privacy.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): 검색·학습·사용자 요청을 분리한다.
- [Perplexity 크롤러](https://docs.perplexity.ai/docs/resources/perplexity-crawlers): 검색 봇과 사용자 요청 방문을 분리한다.

## 관측 경계

- 동일 사이트 공개 경로만 수집한다. 로그인·계정·결제·삭제 등 경로와 외부 리다이렉트는 제외한다. 모든 요청은 기존 DNS 고정·사설 IP 차단 전송 계층과 식별 가능한 JinjjaScanner UA를 사용한다. 리다이렉트마다 robots 정책을 확인한다.
- 보조 수집 전체 6초, 추가 HTML 최대 3개, 사이트맵 최대 2개, 선택 llms 파일 1개. 요청 실패·시간 초과·접근 제한을 태그 부재나 0점으로 치환하지 않는다. 완료된 표본만 보존한다.
- 의료기관 속성은 사실 연결의 검토 후보다. 모든 속성을 Schema.org 필수값으로 표시하지 않으며 미국 NPI·면허·리뷰·치료 효과를 생성하지 않는다. 해소되지 않은 @id 참조는 누락과 구분한다.
- 구조화 데이터는 JSON-LD 표본이며 전체 유효성 검증을 대신하지 않는다. 의료진 자격·의료광고 심의·실제 진료 사실을 판정하지 않는다.
- jQuery는 선언 URL만, 분석 태그는 HTML 내 식별 신호만 관측한다. 실제 실행 버전·CVE·전환 전송 성공·동의 이행을 확정하지 않는다. 외부 CSS와 브라우저 렌더링은 추가 실행하지 않는다.
- head 밖에 스트리밍된 제목·설명은 원문 그대로 보존하고 위치를 명시한다. SVG 접근성 title은 페이지 제목에서 제외한다. Next.js 신호가 있는 HTML에 메타 값이 없을 때는 렌더링 확인으로 분류해 실제 누락을 단정하지 않는다.
- 학습 차단은 운영자 선택이다. 사용자 요청 봇은 robots 적용 방식이 달라, 정책 선언과 실제 접근 가능 여부를 구분한다. WAF·색인·인용 성공을 보장하지 않는다.
- HTML 출력은 외부 자원·스크립트를 허용하지 않는 CSP와 텍스트 이스케이프를 사용한다. Markdown도 원문 HTML·문법을 이스케이프한다. 출처와 자체 브랜드, 기한·보관 안내를 유지한다. 다운로드는 기존 승인 세션·동일 출처 검사 후 요청 형식을 기록한다.

## 검증

`tests/site-diagnostics.test.ts`는 엔터티별 참조 해소, 일반 사이트 오적용 방지, 중복과 공백 분리, 봇 목적 분리, 정적 신호 해석, URL·robots·리다이렉트 경계, 사이트맵 날짜, 타임아웃 취소와 스냅샷 보존, 저장·출처·내보내기·XSS 방어, 구버전·제한 보고서 표시를 검증한다. 기존 호주 4개 사업 여정 테스트와 전체 회귀 검증을 함께 실행한다.
