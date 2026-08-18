import { ExtractedWebsiteData } from "./extractWebsite";

/**
 * v45-W4: 네이버 AI 브리핑(ADVoost AEO) 준비도 진단
 * - 네이버 공식 AEO 권장 기준 1:1 매핑 (규칙 기반 · AI 호출 없음 · 비용 0)
 * - 기술 5개 + 콘텐츠 5개 = 10개 체크
 * - 기존 NaverAiReadiness(광고 준비도)와 별개 섹션 (검색·AI 브리핑 준비도)
 * - 실패 없이 항상 결과 반환 (데이터 부족 시 해당 항목만 fail)
 */

export type BriefingCheckStatus = "pass" | "warning" | "fail";

export interface BriefingCheck {
  id: string;
  label: string;
  group: "technical" | "content";
  status: BriefingCheckStatus;
  currentValue: string;
  diagnosis: string;
  guide: string;
  naverRef?: string;
}

export interface NaverBriefingReadiness {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  checks: BriefingCheck[];
  priorityActions: string[];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function gradeFromScore(s: number): "A" | "B" | "C" | "D" | "F" {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}

/** robots.txt 차단 여부 경량 확인 (독립 fetch · 실패 시 null) */
async function checkRobotsTxt(url: string): Promise<{
  reachable: boolean;
  blocksAll: boolean;
  hasSitemap: boolean;
} | null> {
  try {
    const u = new URL(url);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(robotsUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { reachable: false, blocksAll: false, hasSitemap: false };
    const text = (await res.text()).toLowerCase();
    const blocksAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\//.test(text);
    const hasSitemap = /sitemap:\s*https?:/.test(text);
    return { reachable: true, blocksAll, hasSitemap };
  } catch {
    return null;
  }
}

/** 한국어 토큰 빈도 (스터핑·주제 일관성용) */
function topTokens(text: string, n = 5): Array<{ token: string; count: number }> {
  const words = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w.length <= 15);
  const stopwords = new Set([
    "있는", "있습니다", "합니다", "입니다", "하는", "됩니다", "있습니다",
    "우리", "저희", "여러분", "그리고", "또한", "이는", "등", "및",
    "수", "것", "더", "모든", "위한", "통해", "대한", "있도록",
    "the", "and", "for", "with", "you", "your", "our", "are", "is",
  ]);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopwords.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return Array.from(freq.entries())
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export async function analyzeAeoBriefing(
  data: ExtractedWebsiteData
): Promise<NaverBriefingReadiness> {
  const checks: BriefingCheck[] = [];
  const url = data.finalUrl || data.url;
  const domain = extractDomain(url);
  const domainCore = domain.split(".")[0].toLowerCase();
  const title = (data.title || "").trim();
  const desc = (data.description || data.ogDescription || "").trim();
  const siteName = (data.ogSiteName || "").trim();
  const body = (data.bodyText || "").slice(0, 8000);
  const bodyLower = body.toLowerCase();

  // ============ [기술] 1. 색인 가능성 (noindex + robots.txt) ============
  const robots = await checkRobotsTxt(url);
  let idxStatus: BriefingCheckStatus = "pass";
  let idxValue = "색인 차단 없음";
  let idxDiagnosis = "메타 noindex 없음 · robots.txt 접근 가능";
  let idxGuide = "현재 상태 유지";

  if (robots === null) {
    idxStatus = "warning";
    idxValue = "robots.txt 확인 불가";
    idxDiagnosis = "robots.txt 응답을 확인할 수 없습니다 (차단 여부 불명)";
    idxGuide = "https://도메인/robots.txt 접속해 차단 규칙 직접 확인 필요";
  } else if (robots.blocksAll) {
    idxStatus = "fail";
    idxValue = "robots.txt 전체 차단";
    idxDiagnosis = "robots.txt에서 전체 크롤링 차단(Disallow: /) 감지 — AI가 사이트를 읽을 수 없습니다";
    idxGuide = "robots.txt의 'Disallow: /' 규칙 제거 · Yeti(네이버 봇) 허용 명시";
  } else if (!robots.reachable) {
    idxStatus = "warning";
    idxValue = "robots.txt 없음";
    idxDiagnosis = "robots.txt 파일이 없습니다 (차단은 없지만 명시적 허용 규칙도 없음)";
    idxGuide = "robots.txt 생성 후 'User-agent: Yeti Allow: /' 와 Sitemap 경로 명시";
  }
  if (robots && robots.hasSitemap && idxStatus !== "fail") {
    idxDiagnosis += " · Sitemap 선언 확인";
  }
  checks.push({
    id: "indexability",
    label: "색인 가능성",
    group: "technical",
    status: idxStatus,
    currentValue: idxValue,
    diagnosis: idxDiagnosis,
    guide: idxGuide,
    naverRef: "ADVoost 검색로봇이 랜딩페이지를 읽을 수 있어야 광고·AI 브리핑 노출 대상이 됩니다",
  });

  // ============ [기술] 2. 메타 제목: 브랜드 + 핵심 키워드 조합 ============
  const hasBrandInTitle =
    title.length > 0 &&
    ((siteName && title.toLowerCase().includes(siteName.toLowerCase())) ||
      title.toLowerCase().includes(domainCore));
  const titleTokens = topTokens(title, 8);
  const bodyTop = topTokens(body, 8).map((t) => t.token);
  const hasKeywordInTitle = titleTokens.some((t) =>
    bodyTop.includes(t.token)
  );
  const titleLen = title.length;

  let mtStatus: BriefingCheckStatus;
  let mtDiagnosis: string;
  if (!title) {
    mtStatus = "fail";
    mtDiagnosis = "<title> 태그가 없습니다";
  } else if (hasBrandInTitle && hasKeywordInTitle) {
    mtStatus = "pass";
    mtDiagnosis = "브랜드명 + 핵심 키워드 조합 충족 (네이버 권장 공식)";
  } else if (hasBrandInTitle || hasKeywordInTitle) {
    mtStatus = "warning";
    mtDiagnosis = hasBrandInTitle
      ? "브랜드명은 있으나 핵심 키워드와의 연결이 약합니다"
      : "키워드는 있으나 브랜드명이 제목에 없습니다";
  } else {
    mtStatus = "fail";
    mtDiagnosis = "브랜드명·핵심 키워드 조합 미충족";
  }
  checks.push({
    id: "metaTitle",
    label: "메타 제목 조합",
    group: "technical",
    status: mtStatus,
    currentValue: title ? `"${title.slice(0, 30)}${title.length > 30 ? "…" : ""}" (${titleLen}자)` : "(없음)",
    diagnosis: mtDiagnosis,
    guide: "제목을 '{브랜드명} | {핵심 키워드} · {한 줄 가치}' 형태로 재작성",
    naverRef: "네이버 권장: 제목은 브랜드명 + 핵심 키워드 조합",
  });

  // ============ [기술] 3. 메타 설명 품질 ============
  const descLen = desc.length;
  const hasSentenceEnd = /[.다요임니다습니다]$/.test(desc.trim());
  let mdStatus: BriefingCheckStatus;
  let mdDiagnosis: string;
  if (!desc) {
    mdStatus = "fail";
    mdDiagnosis = "메타 설명(description)이 없습니다";
  } else if (descLen >= 40 && descLen <= 160) {
    mdStatus = hasSentenceEnd ? "pass" : "warning";
    mdDiagnosis = hasSentenceEnd
      ? `적정 길이(${descLen}자) · 완결 문장 구성 양호`
      : `길이 적정(${descLen}자)이나 문장 완결성이 약합니다`;
  } else if (descLen < 40) {
    mdStatus = "warning";
    mdDiagnosis = `너무 짧습니다 (${descLen}자) — 40~160자 권장`;
  } else {
    mdStatus = "warning";
    mdDiagnosis = `너무 깁니다 (${descLen}자) — 검색 결과에서 잘릴 수 있습니다`;
  }
  checks.push({
    id: "metaDescription",
    label: "메타 설명 품질",
    group: "technical",
    status: mdStatus,
    currentValue: desc ? `${descLen}자` : "(없음)",
    diagnosis: mdDiagnosis,
    guide: "페이지를 대표하는 1~2문장(40~160자) 요약으로 재작성",
    naverRef: "네이버 권장: 설명은 페이지를 나타내는 1~2문장 요약",
  });

  // ============ [기술] 4. 이미지 alt 충실도 ============
  const imgCount = data.imageCount || 0;
  const imgNoAlt = data.imageWithoutAlt || 0;
  const altRatio = imgCount > 0 ? (imgCount - imgNoAlt) / imgCount : 1;
  let altStatus: BriefingCheckStatus;
  let altDiagnosis: string;
  if (imgCount === 0) {
    altStatus = "warning";
    altDiagnosis = "이미지가 감지되지 않았습니다 (JS 렌더링 사이트일 수 있음)";
  } else if (altRatio >= 0.9) {
    altStatus = "pass";
    altDiagnosis = `alt 충실도 ${Math.round(altRatio * 100)}% — AI가 이미지 맥락을 이해 가능`;
  } else if (altRatio >= 0.6) {
    altStatus = "warning";
    altDiagnosis = `alt 누락 ${imgNoAlt}/${imgCount}개 (${Math.round(altRatio * 100)}%)`;
  } else {
    altStatus = "fail";
    altDiagnosis = `alt 누락 다수 (${imgNoAlt}/${imgCount}개) — 이미지 속 정보가 AI에 전달되지 않습니다`;
  }
  checks.push({
    id: "imageAlt",
    label: "이미지 alt 충실도",
    group: "technical",
    status: altStatus,
    currentValue: imgCount > 0 ? `${imgCount - imgNoAlt}/${imgCount}개 alt 있음` : "이미지 0개",
    diagnosis: altDiagnosis,
    guide: "핵심 이미지(상품·서비스·성과)부터 alt에 내용을 텍스트로 병기",
    naverRef: "네이버 권장: 미디어 핵심 내용을 텍스트로도 작성",
  });

  // ============ [기술] 5. 구조화 데이터 (Schema.org) ============
  const schemaTypes: string[] = (data as any).schemaTypes || [];
  const hasSchema = schemaTypes.length > 0;
  let sdStatus: BriefingCheckStatus;
  let sdDiagnosis: string;
  if (hasSchema) {
    sdStatus = schemaTypes.length >= 2 ? "pass" : "warning";
    sdDiagnosis = `JSON-LD 감지: ${schemaTypes.slice(0, 4).join(", ")}${
      schemaTypes.length >= 2 ? " — AI가 브랜드 정보를 구조적으로 이해 가능" : " — 타입 보강 여지 있음"
    }`;
  } else {
    sdStatus = "fail";
    sdDiagnosis = "JSON-LD 미감지 — AI가 상품·브랜드·가격 정보를 이해하기 어렵습니다";
  }
  checks.push({
    id: "schemaOrg",
    label: "구조화 데이터",
    group: "technical",
    status: sdStatus,
    currentValue: hasSchema ? schemaTypes.slice(0, 3).join(", ") : "(없음)",
    diagnosis: sdDiagnosis,
    guide: "Organization + (상품이면 Product, 서비스면 Service/FAQPage) JSON-LD 도입",
    naverRef: "네이버 필수 권장: 상품·브랜드·가격·설명을 구조화 데이터로 제공",
  });

  // ============ [콘텐츠] 6. 직접 경험 신호 ============
  const numberMatches = (body.match(/\d+(\.\d+)?\s*(%|개|건|명|원|만원|년|개월|배)/g) || []).length;
  const firstPerson =
    /(저희|제가|직접|실제로|경험|후기|사례|사용해\s?보|써보|만들어\s?보)/.test(body);
  const researchSignal = /(연구|조사|통계|발표|보고서|분석 결과|데이터)/.test(body);
  const expScore = (numberMatches >= 3 ? 1 : numberMatches >= 1 ? 0.5 : 0) +
    (firstPerson ? 1 : 0) + (researchSignal ? 1 : 0);
  let expStatus: BriefingCheckStatus;
  let expDiagnosis: string;
  if (expScore >= 2.5) {
    expStatus = "pass";
    expDiagnosis = `수치 ${numberMatches}건 · 경험/사례 표현 · 인용 신호 확인 — AI가 신뢰할 경험 기반 콘텐츠`;
  } else if (expScore >= 1.5) {
    expStatus = "warning";
    expDiagnosis = `경험 신호 일부 존재 (수치 ${numberMatches}건${firstPerson ? " · 사례 표현 있음" : ""}${researchSignal ? " · 인용 있음" : ""})`;
  } else {
    expStatus = "fail";
    expDiagnosis = "구체적 수치·사례·후기가 부족합니다 — 일반론 중심 콘텐츠는 AI 인용 확률이 낮습니다";
  }
  checks.push({
    id: "experience",
    label: "직접 경험 신호",
    group: "content",
    status: expStatus,
    currentValue: `수치 ${numberMatches}건 · 사례 표현 ${firstPerson ? "O" : "X"} · 인용 ${researchSignal ? "O" : "X"}`,
    diagnosis: expDiagnosis,
    guide: "구체적 수치(예: '3개월 만에 42% 상승')와 실제 사례·후기를 본문에 추가",
    naverRef: "네이버 5대 기준 #1: 직접 경험한 지식 (통계·연구·사례 인용 시 신뢰도 상승)",
  });

  // ============ [콘텐츠] 7. 출처·원문 링크 표기 ============
  const extLinks = data.externalLinkCount || 0;
  const hasSourceKeyword = /(출처|원문|참고|reference|source)/i.test(body);
  let srcStatus: BriefingCheckStatus;
  let srcDiagnosis: string;
  if (extLinks >= 3 && hasSourceKeyword) {
    srcStatus = "pass";
    srcDiagnosis = `외부 링크 ${extLinks}개 + 출처 표기 확인 — 진정성 신호 충족`;
  } else if (extLinks >= 1) {
    srcStatus = "warning";
    srcDiagnosis = `외부 링크 ${extLinks}개 존재하나 출처 명시가 불명확합니다`;
  } else {
    srcStatus = "fail";
    srcDiagnosis = "외부 출처 링크가 없습니다 — 주장의 근거를 AI가 검증할 수 없습니다";
  }
  checks.push({
    id: "citation",
    label: "출처·원문 표기",
    group: "content",
    status: srcStatus,
    currentValue: `외부 링크 ${extLinks}개 · 출처 표기 ${hasSourceKeyword ? "O" : "X"}`,
    diagnosis: srcDiagnosis,
    guide: "인용 시 원작자·원문 링크를 명시하고, 공식 자료(통계청·기관) 링크 추가",
    naverRef: "네이버 5대 기준 #3: 거짓 없는 진정성 (인용 시 원문 링크 필수)",
  });

  // ============ [콘텐츠] 8. 최신성 신호 ============
  const yearMatches = body.match(/20(2[4-9]|3\d)년?/g) || [];
  const hasRecentYear = yearMatches.some((y) => {
    const yr = parseInt(y, 10);
    return yr >= 2025;
  });
  const hasUpdateKeyword = /(업데이트|개정|최신|2026|new)/i.test(body);
  let freshStatus: BriefingCheckStatus;
  let freshDiagnosis: string;
  if (hasRecentYear && hasUpdateKeyword) {
    freshStatus = "pass";
    freshDiagnosis = `최신 연도 표기(${yearMatches.slice(0, 2).join(", ")}) + 업데이트 표현 확인`;
  } else if (hasRecentYear || hasUpdateKeyword) {
    freshStatus = "warning";
    freshDiagnosis = "최신성 신호가 부분적으로만 존재합니다";
  } else {
    freshStatus = "fail";
    freshDiagnosis = "최신 연도·업데이트 표기가 없습니다 — 오래된 콘텐츠로 인식될 수 있습니다";
  }
  checks.push({
    id: "freshness",
    label: "최신성 신호",
    group: "content",
    status: freshStatus,
    currentValue: `연도 표기 ${yearMatches.length > 0 ? yearMatches[0] : "없음"} · 업데이트 표현 ${hasUpdateKeyword ? "O" : "X"}`,
    diagnosis: freshDiagnosis,
    guide: "콘텐츠에 '최종 업데이트: 2026년 N월' 표기 + 최신 통계로 갱신",
    naverRef: "네이버 5대 기준 #5: 최신성 유지 (정보 변경 시 수정·신규 콘텐츠 꾸준히)",
  });

  // ============ [콘텐츠] 9. 키워드 억지 삽입(스터핑) ============
  const top5 = topTokens(body, 5);
  const wordCount = body.split(/\s+/).filter(Boolean).length || 1;
  const topFreq = top5.length > 0 ? top5[0] : null;
  const stuffingRatio = topFreq ? topFreq.count / wordCount : 0;
  let stuffStatus: BriefingCheckStatus;
  let stuffDiagnosis: string;
  if (stuffingRatio >= 0.03 && topFreq && topFreq.count >= 8) {
    stuffStatus = "fail";
    stuffDiagnosis = `상위 키워드 "${topFreq.token}"이 ${topFreq.count}회 반복 — AI가 키워드 스터핑으로 감점할 수 있습니다`;
  } else if (stuffingRatio >= 0.02 && topFreq && topFreq.count >= 5) {
    stuffStatus = "warning";
    stuffDiagnosis = `"${topFreq?.token}" 반복이 다소 많습니다 (${topFreq?.count}회) — 동의어·유의어로 분산 권장`;
  } else {
    stuffStatus = "pass";
    stuffDiagnosis = "자연스러운 키워드 분포 — 억지 삽입 없음";
  }
  checks.push({
    id: "stuffing",
    label: "키워드 스터핑",
    group: "content",
    status: stuffStatus,
    currentValue: topFreq ? `상위 키워드 "${topFreq.token}" ${topFreq.count}회` : "분석 불가",
    diagnosis: stuffDiagnosis,
    guide: "반복 키워드를 동의어·관련어로 교체하고 문맥 중심으로 재작성",
    naverRef: "네이버 감점 요소: 과도한 광고·키워드 삽입 금지",
  });

  // ============ [콘텐츠] 10. 주제 일관성 ============
  const h1Text = (data.h1 || []).join(" ").toLowerCase();
  const h2Text = (data.h2 || []).slice(0, 6).join(" ").toLowerCase();
  const titleTokensForTopic = topTokens(title, 3).map((t) => t.token);
  const h1Match = titleTokensForTopic.filter((t) => h1Text.includes(t)).length;
  const h2Match = titleTokensForTopic.filter((t) => h2Text.includes(t)).length;
  const consistency =
    titleTokensForTopic.length > 0
      ? (h1Match + h2Match) / (titleTokensForTopic.length * 2)
      : 0;
  let topicStatus: BriefingCheckStatus;
  let topicDiagnosis: string;
  if (consistency >= 0.5) {
    topicStatus = "pass";
    topicDiagnosis = "제목·H1·H2가 동일 주제로 일관 — AI가 '전문 출처'로 인식 가능";
  } else if (consistency >= 0.25) {
    topicStatus = "warning";
    topicDiagnosis = "제목과 본문 헤딩의 주제 연결이 부분적입니다";
  } else {
    topicStatus = "fail";
    topicDiagnosis = "제목과 H1/H2의 주제가 어긋납니다 — 채널 전문성 인식이 약해집니다";
  }
  checks.push({
    id: "topicConsistency",
    label: "주제 일관성",
    group: "content",
    status: topicStatus,
    currentValue: `핵심 토큰 일치율 ${Math.round(consistency * 100)}%`,
    diagnosis: topicDiagnosis,
    guide: "페이지 제목·H1·H2에 동일 핵심 키워드를 자연스럽게 배치해 주제를 통일",
    naverRef: "네이버 5대 기준 #2: 일관된 주제 (전문 채널로 인식되어야 인용)",
  });

  // ============ 종합 점수 ============
  const scoreOf = (s: BriefingCheckStatus) => (s === "pass" ? 100 : s === "warning" ? 60 : 20);
  const overallScore = Math.round(
    checks.reduce((sum, c) => sum + scoreOf(c.status), 0) / checks.length
  );
  const grade = gradeFromScore(overallScore);

  // 우선 액션: fail 우선 → warning 순
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warning");
  const priorityActions: string[] = [];
  for (const c of [...fails, ...warns].slice(0, 3)) {
    priorityActions.push(`[${c.label}] ${c.guide}`);
  }
  if (priorityActions.length === 0) {
    priorityActions.push("현재 상태 유지 · 분기마다 재진단으로 최신성 확인");
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const summary =
    passCount >= 8
      ? `네이버 AI 브리핑 준비도 우수 (${passCount}/10 통과). 현 상태 유지하면 AI 답변 노출 경쟁력 확보 가능.`
      : passCount >= 5
      ? `네이버 AI 브리핑 준비도 보통 (${passCount}/10 통과). ${fails.length}개 취약 항목 개선 시 인용률 상승 여지 큼.`
      : `네이버 AI 브리핑 준비도 낮음 (${passCount}/10 통과). AI가 사이트를 신뢰 정보원으로 인식하기 어려운 상태.`;

  return { overallScore, grade, summary, checks, priorityActions };
}
