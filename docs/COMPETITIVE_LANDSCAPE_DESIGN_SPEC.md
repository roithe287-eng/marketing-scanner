[Uploading COMPETITIVE_LANDSCAPE_DESIGN_SPEC.md…]()
# COMPETITIVE LANDSCAPE — Figma 스타일 디자인 명세서

**버전**: v29
**대상 컴포넌트**: `components/CompetitorComparison.tsx`
**작성일**: 2026.06

---

## 1. 디자인 토큰

### 1.1 컬러 토큰

| 토큰명 | HEX | Tailwind | 용도 |
|---|---|---|---|
| `color/brand/primary` | `#e31b23` | `jm-red` | 메인 액센트, 섹션 라벨, 자사 강조 |
| `color/brand/black` | `#111111` | `jm-black` | 헤더 배경, 본문 텍스트 |
| `color/brand/charcoal` | `#1f2937` | `jm-charcoal` | 그라데이션 중간색 |
| `color/text/primary` | `#111111` | `jm-black` | 본문 |
| `color/text/secondary` | `#6b7280` | `jm-gray` | 캡션, 보조 |
| `color/surface/base` | `#ffffff` | `white` | 카드 배경 |
| `color/surface/muted` | `#f5f5f5` | `jm-light-gray` | 보조 배경 |
| `color/border/default` | `#e5e7eb` | `jm-border` | 카드 테두리 |

### 1.2 카테고리 컬러 (메시지 클러스터)

| 카테고리 | HEX | Tailwind | 이모지 |
|---|---|---|---|
| 가격·할인 | `#f43f5e` | `bg-rose-500` | 💰 |
| 품질·전문성 | `#8b5cf6` | `bg-violet-500` | 👑 |
| 속도·당일 | `#f59e0b` | `bg-amber-500` | ⚡ |
| 감성·라이프 | `#ec4899` | `bg-pink-500` | 🌸 |
| 신뢰·후기 | `#10b981` | `bg-emerald-500` | ✅ |
| 혜택·증정 | `#0ea5e9` | `bg-sky-500` | 🎁 |

### 1.3 상태 컬러 (강약점 배지)

| 상태 | 배경 | 보더 | 텍스트 | 아이콘 |
|---|---|---|---|---|
| pass | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` | `✓` |
| warning | `bg-amber-50` | `border-amber-200` | `text-amber-700` | `!` |
| fail | `bg-rose-50` | `border-rose-200` | `text-rose-700` | `✕` |

---

## 2. 타이포그래피

| 토큰 | 데스크톱 | 모바일 | weight | letter-spacing | 용도 |
|---|---|---|---|---|---|
| `text/section-tag` | 12px | 12px | 900 | 0.1em | "COMPETITIVE LANDSCAPE" |
| `text/h2` | 30px | 24px | 900 | -0.02em | 섹션 제목 |
| `text/h3` | 20px | 18px | 900 | -0.01em | 카드 제목 |
| `text/h4` | 16px | 14px | 900 | normal | 카드 부제 |
| `text/body` | 14px | 14px | 400 | normal | 본문 |
| `text/caption` | 12px | 11px | 400 | normal | 보조 |
| `text/micro` | 10px | 10px | 700 | 0.1em | 라벨 배지 |
| `text/data-large` | 24px | 20px | 900 | normal | 점수, 카운트 |

---

## 3. 간격 시스템

| 토큰 | px | Tailwind |
|---|---|---|
| `space/xs` | 4 | `gap-1, p-1` |
| `space/sm` | 8 | `gap-2, p-2` |
| `space/md` | 12 | `gap-3, p-3` |
| `space/lg` | 16 | `gap-4, p-4` |
| `space/xl` | 20 | `gap-5, p-5` |
| `space/2xl` | 24 | `gap-6, p-6` |
| `space/3xl` | 32 | `gap-8, p-8` |

**섹션 내 카드 간 간격**: `space/2xl` (24px)
**카드 내 요소 간 간격**: `space/md~lg` (12~16px)
**섹션 끝-끝 간격**: `space/3xl` (32px)

---

## 4. 반응형 브레이크포인트

| 디바이스 | 너비 | Tailwind | 컨테이너 max-width |
|---|---|---|---|
| 모바일 | 375 ~ 767px | (default) | 100% |
| 태블릿 | 768 ~ 1023px | `md:` | 768px |
| 데스크톱 | 1024px ~ | `lg:` | 1120px |
| 대화면 | 1280px ~ | `xl:` | 1200px |

---

## 5. 컴포넌트 규격 (섹션별)

### 5.1 ① HEADER

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 높이 | 120px | 100px | 88px |
| padding | `p-8` | `p-6` | `p-5` |
| 배경 | `bg-gradient-to-br from-jm-black via-jm-charcoal to-jm-black` | 동일 | 동일 |
| h3 폰트 | 30px / 900 | 24px / 900 | 22px / 900 |
| #키워드 배지 폰트 | 14px / 900 | 13px / 900 | 12px / 900 |

### 5.2 ② POSITIONING MAP

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 비율 | 16:11 | 16:11 | **4:3** (세로 더 길게) |
| padding | `p-6` | `p-5` | `p-4` |
| 점(dot) 크기 | 32px | 28px | 24px |
| favicon 크기 | 16px | 14px | 12px |
| 4분면 라벨 폰트 | 11px / 900 | 10px / 900 | 9px / 900 |
| 축 라벨 폰트 | 11px | 10px | 9px |

### 5.3 ③ MESSAGE CLUSTER

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 컨테이너 grid | `grid-cols-6` | `grid-cols-3` | `grid-cols-2` |
| 줄 수 | 1행 | 2행 | 3행 |
| 버블 크기 (count=0) | 48px | 44px | 40px |
| 버블 크기 (count=max) | 120px | 100px | 80px |
| 카테고리 라벨 폰트 | 12px / 900 | 11px / 900 | 10px / 900 |
| 행간 (gap-y) | `gap-3` | `gap-3` | `gap-3` |

### 5.4 ④ STRENGTH × WEAKNESS

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 행 padding | `p-3` | `p-3` | `p-2` |
| 가로 스크롤 | 없음 | 없음 | **있음 (`overflow-x-auto`)** |
| 첫 열 sticky | 불필요 | 불필요 | **`sticky left-0 bg-white z-10`** |
| 배지 크기 | 28px | 26px | 24px |
| 도메인 텍스트 | 12px | 11px | 10px |
| favicon | 16px | 14px | 12px |

### 5.5 ⑤ COMPETITOR CARDS

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| grid | `lg:grid-cols-3` | `md:grid-cols-2` | `grid-cols-1` |
| 카드 padding | `p-5` | `p-5` | `p-4` |
| 카드 border-radius | `rounded-2xl` | 동일 | 동일 |
| 카드 border | `border-2 border-jm-border` | 동일 | 동일 |
| 카드 hover | `hover:border-jm-red` | 동일 | 동일 |
| 카드 간 gap | `gap-4` | `gap-4` | `gap-3` |
| 카드 내 섹션 간 gap | `mt-3` | 동일 | `mt-2.5` |
| 강조 메시지 박스 | `bg-gradient-to-br from-jm-red/[0.08] to-jm-red/[0.04]` + `border-l-4 border-jm-red` | 동일 | 동일 |

### 5.6 ⑥ TOP KEYWORDS

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 컨테이너 padding | `p-6` | `p-5` | `p-4` |
| 워드 max폰트 | 24px / 900 | 22px / 900 | 18px / 900 |
| 워드 min폰트 | 12px / 700 | 12px / 700 | 11px / 700 |
| 워드 간 gap | `gap-x-4 gap-y-3` | 동일 | `gap-x-3 gap-y-2` |
| 횟수 라벨 폰트 | 10px / 700 | 동일 | 동일 |

### 5.7 ⑦ JM 포지셔닝 제안

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|---|---|---|---|
| 배경 | `bg-gradient-to-br from-jm-black via-jm-charcoal to-jm-black` | 동일 | 동일 |
| padding | `p-7` | `p-6` | `p-5` |
| 본문 폰트 | 18px / 500 | 16px / 500 | 14px / 500 |
| 행간 | `leading-8` | `leading-7` | `leading-7` |
| JM 배지 | 32px 원형 | 30px | 28px |

---

## 6. 아이콘 배치 규칙

| 위치 | 아이콘 | 크기 | 색상 |
|---|---|---|---|
| 섹션 번호 (①~⑦) | 텍스트 숫자 | 12px / 900 | `text-jm-red` |
| 강조 메시지 | 💬 | 12px (이모지) | inherit |
| 우리와의 차이 | ⚖️ | 12px | inherit |
| CTA 버튼 | 🎯 | 12px | inherit |
| H1 박스 | 라벨만 | — | — |
| favicon (도메인) | Google s2 favicons API | 16~20px | (이미지) |
| 상태 배지 | ✓ ! ✕ | 14px / 900 | 상태색 |
| JM 로고 배지 | "JM" 텍스트 | 12px / 900 | 흰색 / 빨강 배경 |

---

## 7. 모션 / 인터랙션

| 요소 | 효과 | duration |
|---|---|---|
| 경쟁사 카드 hover | border 색 변경 + scale 없음 | 150ms |
| 포지셔닝 맵 점 hover | scale 110% + 툴팁 등장 | 150ms |
| 메시지 클러스터 버블 hover | scale 105% | 150ms |
| 전체 트랜지션 | `transition-colors` / `transition-transform` | 기본값 |

---

## 8. 접근성 (A11y) 가이드

- 모든 favicon `<img>`에 `alt=""` (장식 이미지)
- 외부 링크 `target="_blank"` 시 `rel="noopener noreferrer"` 필수
- 상태 배지(✓!✕)는 색상 + 모양 + 텍스트 3중 표현
- 호버 툴팁은 모바일에서도 탭 가능하도록 (필요 시 클릭 핸들러 추가)
- `aria-label` 추가 권장 항목:
  - 포지셔닝 맵 점: `aria-label="경쟁사 {rank}위 {domain}"`
  - 상태 배지: `aria-label="{label} {상태명}"`
