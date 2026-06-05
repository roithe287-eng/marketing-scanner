# 마케팅스캐너 (Marketing Scanner) - MVP

> URL 하나로 확인하는 우리 사이트의 마케팅 약점
> Powered by **진짜마케팅 (prorealmkt.com)**

URL을 입력하면 AI가 웹사이트를 분석해 마케팅/전환 관점 8개 항목으로 진단 리포트를 생성하고, PDF로 다운로드할 수 있는 MVP입니다.

---

## ✨ 기능

- ✅ URL 입력 → HTML/메타/CTA/카피 자동 수집 (Cheerio)
- ✅ OpenAI(`gpt-4o-mini` 기본)로 8개 항목 진단
  - 첫 화면, CTA, 카피, 신뢰, 전환, 광고 랜딩, 모바일, SEO
- ✅ 레이더 차트 + 항목별 점수 막대
- ✅ 핵심 이슈 카드 (문제·근거·개선안·우선순위)
- ✅ 즉시/이번 주/이번 달 개선 로드맵
- ✅ 카피 개선 예시 (헤드라인/서브/CTA)
- ✅ 리드 수집 모달 (PDF 다운로드 전 이름·연락처 입력)
- ✅ PDF 리포트 다운로드 (html2canvas + jsPDF)
- ✅ 진짜마케팅 상담 CTA
- ✅ (선택) Slack Webhook으로 리드 자동 알림

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local.example` 을 복사해서 `.env.local` 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 편집:

```env
OPENAI_API_KEY=sk-your-actual-key
OPENAI_MODEL=gpt-4o-mini

NEXT_PUBLIC_CONSULT_URL=https://prorealmkt.com/contact
NEXT_PUBLIC_BRAND_URL=https://prorealmkt.com

# (선택) 리드를 슬랙으로 자동 알림
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
```

### 3. 로컬 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

---

## ☁️ Vercel 배포

1. GitHub에 이 폴더를 push
2. [vercel.com](https://vercel.com) → Import Project
3. **Environment Variables** 에 다음 추가:
   - `OPENAI_API_KEY` (필수)
   - `OPENAI_MODEL` (선택, 기본 `gpt-4o-mini`)
   - `NEXT_PUBLIC_CONSULT_URL` (선택)
   - `NEXT_PUBLIC_BRAND_URL` (선택)
   - `SLACK_WEBHOOK_URL` (선택)
4. Deploy 클릭

> ⚠️ Vercel 무료 플랜은 함수 실행시간이 10초로 짧습니다. AI 분석이 종종 30초를 넘기 때문에 **Pro 플랜(60초)** 사용을 권장합니다. `app/api/analyze/route.ts` 에 `maxDuration = 60` 으로 설정되어 있습니다.

---

## 📁 파일 구조

```
marketing-scanner/
├─ app/
│  ├─ page.tsx                  # 메인 화면 (히어로 + 결과 화면)
│  ├─ layout.tsx
│  ├─ globals.css
│  └─ api/
│     ├─ analyze/route.ts       # URL → 진단 리포트
│     └─ lead/route.ts          # 리드 수집 (Slack/DB 확장 포인트)
├─ components/
│  ├─ BrandHeader.tsx
│  ├─ UrlForm.tsx
│  ├─ ScoreRadar.tsx            # Recharts 레이더 차트
│  ├─ DiagnosisCard.tsx         # 핵심 이슈 카드
│  ├─ PriorityMatrix.tsx        # 개선 로드맵
│  ├─ FinalCTA.tsx              # 진짜마케팅 상담 CTA
│  ├─ LeadModal.tsx             # PDF 다운로드 전 리드 모달
│  └─ DownloadReportButton.tsx  # PDF 생성
├─ lib/
│  ├─ extractWebsite.ts         # Cheerio 기반 HTML 분석
│  ├─ analyzeMarketing.ts       # OpenAI 호출 + 프롬프트
│  └─ reportSchema.ts           # Zod 스키마
├─ tailwind.config.ts
├─ postcss.config.js
├─ tsconfig.json
├─ next.config.js
├─ package.json
└─ .env.local.example
```

---

## 🔧 커스터마이징 포인트

### 1. AI 모델 변경 (비용/품질 조절)

`.env.local`:

```env
OPENAI_MODEL=gpt-4o-mini    # 빠르고 저렴 (MVP 기본)
# OPENAI_MODEL=gpt-4o       # 더 정밀한 분석 (10배 비쌈)
# OPENAI_MODEL=gpt-4.1-mini # 대안
```

### 2. 진짜마케팅 톤/프롬프트 수정

`lib/analyzeMarketing.ts` 의 `SYSTEM_PROMPT` 와 `USER_PROMPT_TEMPLATE` 에서 진단 톤, 항목, JSON 구조를 자유롭게 수정 가능.

### 3. 리드 저장소 연동

`app/api/lead/route.ts`:

- **Slack 알림**: `SLACK_WEBHOOK_URL` 환경변수 설정만으로 자동 동작
- **Supabase**: `@supabase/supabase-js` 추가 후 insert 코드 작성
- **Google Sheets**: `googleapis` 패키지로 append

### 4. 진짜마케팅 로고

현재는 동그란 빨간 점 + 텍스트 로고. 실제 로고 SVG가 있다면 `public/logo.svg` 로 저장 후 `components/BrandHeader.tsx` 에서 `<Image>` 로 교체.

---

## ⚠️ 알려진 제약 (MVP 한계)

1. **SPA 사이트**: Cheerio는 정적 HTML만 읽습니다. React/Vue로 만든 사이트는 분석 정확도가 낮을 수 있습니다.
   - 해결: 추후 Playwright로 교체 (`/api/analyze/route.ts` 에서 `extractWebsite` 함수만 교체하면 됨)
2. **모바일 UX 점수**: 실제 모바일 렌더링이 아닌 viewport meta 태그 유무로 판단합니다.
3. **속도 점수 없음**: 페이지 속도(LCP, CLS) 측정은 별도 구현 필요 (PageSpeed Insights API 연동 권장)
4. **PDF 한글**: html2canvas는 화면을 이미지로 변환하므로 한글이 깨지지 않습니다. 다만 페이지 잘림이 발생할 수 있어, 향후 서버사이드 Puppeteer로 업그레이드 권장.

---

## 🛣️ 다음 확장 단계

1. **Playwright 도입** → SPA 사이트 정확도 향상 + 모바일 스크린샷
2. **경쟁사 비교** → URL 2~3개 동시 분석
3. **PageSpeed Insights 연동** → 실제 속도 점수
4. **유료 플랜** → Stripe/TossPayments로 상세 리포트 결제
5. **리포트 저장/공유 URL** → Supabase + 공유 가능한 영구 링크
6. **대행사용 화이트라벨** → 로고/도메인 커스터마이징

---

## 📞 문의

진짜마케팅 — [prorealmkt.com](https://prorealmkt.com)
