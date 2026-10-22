# URL별 네이버 대응 콘텐츠 개선안

URL을 새로 진단하면 GEO 장 첫 카드에 대표 키워드 후보, 추천 질문 3개, 원문 답변 초안, 확인할 정보와 수정 위치를 표시합니다. 기존 보고서는 재진단 안내를 표시합니다. 공유 보고서와 전체 PDF에도 새 선택적 필드 `answerContentPlan`이 보존됩니다.

## 데이터 범위

- 이미 수집된 입력 페이지의 제목·설명·본문만 사용합니다. 추가 크롤링이나 추적 요청은 없습니다.
- 네이버 검색 결과·자동완성·AI 브리핑을 새 분석의 AI 입력으로 전달하지 않습니다. 자동완성 순위와 실제 AI 인용은 미측정으로 명시합니다.
- 모델은 키워드·질문·본문 근거 ID·확인할 정보 항목만 제안합니다. 답변 문구는 검증된 본문 ID의 원문 전체 단위로 구성합니다. 가격·기간·수량을 모델이 작성할 수 없습니다.
- 본문 근거가 없으면 대괄호를 채우는 작성 형식을 제공합니다. 사이트 전체의 FAQ 부재를 단정하지 않습니다.
- 24초 AI 호출 제한, 분석 단계 26초 제한과 기본 가이드 fallback을 사용합니다. 수집 제한·동적 페이지·모델 오류가 메인 보고서 생성을 막지 않습니다.
- Smartstore/Brandstore 제한 보고서는 기존 조기 반환 경로를 따릅니다.

## 구현 위치

- `lib/answerContent.ts`, `lib/answerContentSchema.ts`: 출처 검증·기본 질문·스키마
- `lib/analyzeAnswerContent.ts`: 입력 페이지 전용 AI 호출
- `components/report/AnswerContentPanel.tsx`, `app/answer-content.css`: 화면·복사
- `lib/answerContentDocument.ts`: 전체 문서·PDF 텍스트
- `tests/answer-content.test.ts`: 원문 조건 보존, 허위 근거 차단, 오류·레거시·공유·PDF 검증
- 미리보기의 `/review/report?frame=1#answer-content`: 과잠바 가상 데이터로 화면 점검. 실제 업체 분석이 아니며 운영에서는 이 검수 경로를 제공하지 않습니다.

## 로컬 검증

`npm test` 278개 통과, `npm run typecheck`, `npm run build`, `git diff --check` 통과. 실제 모델 응답 및 브라우저 검증은 배포 검수에서 별도로 확인합니다.
