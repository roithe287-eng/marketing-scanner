[COMPETITIVE_LANDSCAPE_DATA_LOGIC.md](https://github.com/user-attachments/files/29329141/COMPETITIVE_LANDSCAPE_DATA_LOGIC.md)
# COMPETITIVE LANDSCAPE — 데이터 구조 & 렌더링 로직

**버전**: v29
**대상**: `lib/competitorAnalysis.ts` (수집) + `components/CompetitorComparison.tsx` (렌더)

---

## 1. 데이터 파이프라인 개요

```
[광고주 사이트 URL]
     ↓
① extractWebsite()  ← 광고주 사이트 크롤링·키워드 추출
     ↓
② extractKeyword()  ← AI/룰베이스로 검색 키워드 1개 추출
     ↓
③ Naver 검색 API  ← 동종업종 상위 5개 검색
     ↓
④ pickCompetitors()  ← 대형몰·SNS·블로그 38개 도메인 제외 필터
     ↓
⑤ fetchCompetitorMeta() × 5  ← 각 경쟁사 사이트 메타·H1·CTA 수집
     ↓
⑥ AI 강조 메시지/차이 분석  ← gpt-4.1-mini로 keyMessage·differentiation 생성
     ↓
[CompetitorAnalysisResult] → 보고서 schema에 포함
     ↓
⑦ CompetitorComparison 컴포넌트  ← 클라이언트에서 시각화
   ├ ① 헤더
   ├ ② 포지셔닝 맵 (좌표 계산)
   ├ ③ 메시지 클러스터 (카테고리 분류)
   ├ ④ 강약점 비교표 (자동 평가)
   ├ ⑤ 경쟁사 카드 그리드
   ├ ⑥ 빈출 키워드 추출
   └ ⑦ AI 포지셔닝 제안
```

---

## 2. 데이터 타입 정의

### 2.1 입력 데이터 (서버 → 클라이언트)

```typescript
type CompetitorAnalysisResult = {
  searchKeyword: string;        // 예: "단체복 과잠바"
  keywordSource: "ai" | "fallback";
  competitors: Array<{
    rank: number;               // 1~5
    title: string;              // 검색 결과 제목
    link: string;               // 사이트 URL
    description: string;        // 검색 결과 설명
    domain: string;             // www. 제거된 도메인
    metaTitle?: string;
    metaDescription?: string;
    h1?: string;
    ctaTexts?: string[];        // 감지된 CTA 버튼들
    fetchError?: string;        // 사이트 접근 실패 시
    keyMessage?: string;        // AI 분석: 핵심 강조 메시지
    differentiation?: string;   // AI 분석: 우리와의 차이
  }>;
  overallComparison?: string;   // AI 분석: 경쟁 환경 한 줄
  ourPositioning?: string;      // AI 분석: 우리에게 권하는 포지셔닝
};
```

### 2.2 클라이언트 파생 데이터 (컴포넌트 내부)

```typescript
// ③ 메시지 클러스터용
type ToneSummary = {
  key: "price" | "quality" | "speed" | "emotion" | "trust" | "benefit";
  cat: CategoryMeta;
  count: number;    // 해당 카테고리 사용 경쟁사 수
  pct: number;      // 백분율
};

// ② 포지셔닝 맵용
type Position = {
  x: number;  // 8~92 (가격강조←→프리미엄강조)
  y: number;  // 8~92 (감성위 ←→ 이성아래)
};

// ④ 강약점 비교표용
type EvalResult = {
  domain: string;
  rank: number;
  rows: ("pass" | "warning" | "fail")[];  // EVAL_ROWS 순서대로
};
```

---

## 3. 자동 산정 알고리즘

### 3.1 메시지 카테고리 분류

```typescript
const MESSAGE_CATEGORIES = {
  price:   { keywords: [최저가, 할인, 특가, 세일, %, OFF, ...] },
  quality: { keywords: [프리미엄, 전문, 명품, 최고, 장인, ...] },
  speed:   { keywords: [당일, 즉시, 빠른, 24시간, 신속, ...] },
  emotion: { keywords: [감성, 스타일, 트렌드, 라이프, ...] },
  trust:   { keywords: [후기, 리뷰, 인증, 1위, 추천, ...] },
  benefit: { keywords: [무료, 증정, 사은품, 체험, ...] },
};

// 한 사이트의 텍스트에서 카테고리 키워드 등장 횟수
function countKeywordsInText(text: string, keywords: string[]): number;
```

### 3.2 포지셔닝 맵 좌표

```
X축 = (quality_count - price_count) / (quality + price + 1)  → -1 ~ +1
   매핑: -1 → 화면 8%, +1 → 화면 92%

Y축 = (emotion_count - trust - speed) / (emotion + trust + speed + 1)  → -1 ~ +1
   매핑: +1(감성) → 화면 8% (위쪽), -1(이성) → 화면 92% (아래쪽)
```

**4분면 의미**

| Y \ X | 가격 강조 (좌) | 프리미엄 강조 (우) |
|---|---|---|
| 감성 (상) | **감성 가성비형** | **프리미엄 감성형** |
| 이성 (하) | **저가 실용형** | **고급 실용형** |

### 3.3 강약점 자동 평가

| 평가 항목 | pass 조건 | warning 조건 | fail 조건 |
|---|---|---|---|
| 헤드라인 명확도 | H1 길이 8~50자 | title 8자 이상 | H1·title 둘 다 짧음 |
| 가격·혜택 노출 | price 키워드 3회 이상 | 1~2회 | 0회 |
| 신뢰 요소 | trust 키워드 2회 이상 | 1회 | 0회 |
| CTA 다양성 | ctaTexts ≥3개 | 1~2개 | 0개 |
| 감성·차별화 | emotion+quality ≥2회 | 1회 | 0회 |

**평균 행 산정**: 각 사이트 점수(pass=2, warning=1, fail=0) 합산 / N
- 평균 ≥ 1.5 → pass
- 평균 ≥ 0.8 → warning
- 그 외 → fail

### 3.4 빈출 키워드 추출 (v24 기반)

1. 모든 경쟁사 텍스트 합치기 (metaTitle + metaDescription + h1 + ctaTexts)
2. 한글·영문·숫자 토큰화: `split(/[^가-힣a-zA-Z0-9]+/)`
3. 한국어 불용어 60여개 + 영문 불용어 20여개 제외
4. 한글 2자 이상, 영문 3자 이상 필터
5. 등장 횟수 ≥ 2회만 유지
6. 내림차순 정렬, 상위 15개
7. 빈도 비율로 5단계 폰트 크기 결정 (text-2xl ~ text-xs)

---

## 4. 반응형 렌더링 규칙

### 4.1 grid 컬럼 매핑

| 섹션 | 모바일 | 태블릿 (md:) | 데스크톱 (lg:) |
|---|---|---|---|
| 메시지 클러스터 | `grid-cols-2` | `grid-cols-3` | `grid-cols-6` |
| 경쟁사 카드 | `grid-cols-1` | `grid-cols-2` | `grid-cols-3` |
| 강약점 비교표 | `overflow-x-auto` + sticky | 전체 표시 | 전체 표시 |
| 헤더 키워드 | `flex-wrap` | `flex-wrap` | `flex-wrap` |

### 4.2 폰트 매핑

| 요소 | 모바일 | 데스크톱 |
|---|---|---|
| h3 (섹션 제목) | `text-base` | `text-lg md:text-xl` |
| 본문 | `text-xs` ~ `text-sm` | `text-sm` ~ `text-base` |
| 4분면 라벨 | `text-[9px]` | `text-[10px]` |
| 캡션 | `text-[10px]` | `text-[10px]` |

### 4.3 포지셔닝 맵 모바일 대응

- 데스크톱/태블릿: `aspect-[16/11]`
- 모바일: `aspect-[4/3]` (세로 더 길게)
- 점(dot) 크기: 모바일 24px / 태블릿 28px / 데스크톱 32px
- favicon: 모바일 12px / 태블릿 14px / 데스크톱 16px
- 호버 툴팁: 모바일에선 탭 가능하도록 `onTouchStart` 처리

### 4.4 비교표 모바일 가로 스크롤

```tsx
<div className="overflow-x-auto -mx-1 md:mx-0">
  <table className="min-w-[640px] md:min-w-0">
    <thead>
      <tr>
        <th className="sticky left-0 bg-white z-10 md:relative">평가 항목</th>
        {/* ... */}
      </tr>
    </thead>
  </table>
</div>
```

---

## 5. 렌더링 성능 고려

- `extractTopKeywords()`: 메모이제이션 없음, 매 렌더마다 재계산 (경쟁사 ≤5, 빠름)
- `calculatePosition()`: O(키워드수) × 경쟁사수, 부담 없음
- favicon: Google s2 외부 CDN, `loading="lazy"` 추가 권장
- 포지셔닝 맵: SVG 아닌 absolute 포지션 div (단순화, 모바일 호환성↑)

---

## 6. 디버그·테스트 시나리오

| 케이스 | 기대 동작 |
|---|---|
| 경쟁사 0명 (네이버 API 미설정) | 전체 섹션 미표시 (null 반환) |
| 경쟁사 1~2명 | 모든 섹션 표시, 카드 그리드도 1~2개만 |
| 모든 사이트 fetchError | 카드 하단 "사이트 접근 제한" 안내, 키 메시지 빈칸 |
| keyMessage·differentiation 없음 | 해당 박스 미표시 (조건부 렌더링) |
| 키워드 모두 부족 (count <2) | ⑥ 영역 미표시 |
| ourPositioning 없음 | ⑦ 영역 미표시 |
| 모든 경쟁사 같은 카테고리만 사용 | ② 맵 점이 한 모서리에 몰림 (정상) |

---

## 7. 향후 확장 포인트

| 우선순위 | 확장 항목 | 작업량 |
|---|---|---|
| 🔴 높음 | 포지셔닝 맵에 **우리 사이트 빨간 별** 표시 | extractWebsite 결과를 컴포넌트에 prop 추가 |
| 🟡 중간 | 강약점 비교표에 **우리 열** 추가 | ourSiteData prop 전달 + EVAL_ROWS 재사용 |
| 🟡 중간 | 카테고리 키워드 6개 → 8개 (안전·인증 / ESG·친환경) | MESSAGE_CATEGORIES 객체 확장 |
| 🟢 낮음 | 포지셔닝 맵 SVG 변환 (PDF 품질↑) | 현재 div → react-svg로 마이그레이션 |
| 🟢 낮음 | 메시지 클러스터에 d3-cloud 적용 | 의존성 추가, 번들 +30KB |
