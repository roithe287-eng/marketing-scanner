import { ExtractedWebsiteData } from "./extractWebsite";

/**
 * v46-W1: 네이버 생태계 연동 진단
 *  A) 플레이스 AI 브리핑 준비도 (로컬 업종 대상 · 8개 체크)
 *  B) 서치어드바이저 연동 체크 (4개 체크)
 *
 * 설계 원칙 (법적 리스크 0):
 *  - 네이버 플레이스 페이지에 접근하지 않음 — 사업주 자체 홈페이지만 검사
 *  - 스마트플레이스 설정 여부는 사용자 직접 확인 안내로 처리
 *  - 전부 규칙 기반 (AI 호출 없음) → 비용 $0 · 속도 +1초 이내
 */

export type EcoCheckStatus = "pass" | "warning" | "fail";

export interface EcoCheck {
  id: string;
  label: string;
  group: "place" | "advisor";
  status: EcoCheckStatus;
  currentValue: string;
  diagnosis: string;
  guide: string;
}

export interface NaverEcosystemReadiness {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  isLocalBusiness: boolean; // 로컬 업종 신호 감지 여부
  placeScore: number; // 플레이스 준비도 소점수
  advisorScore: number; // 서치어드바이저 소점수
  summary: string;
  checks: EcoCheck[];
  priorityActions: string[];
}

function gradeFromScore(s: number): "A" | "B" | "C" | "D" | "F" {
  if (s >= 90) return "A";
  if (s >= 80) return "B";
  if (s >= 70) return "C";
  if (s >= 60) return "D";
  return "F";
}

function scoreOf(s: EcoCheckStatus): number {
  return s === "pass" ? 100 : s === "warning" ? 60 : 20;
}

export async function analyzePlaceAdvisor(
  data: ExtractedWebsiteData
): Promise<NaverEcosystemReadiness> {
  const checks: EcoCheck[] = [];
  const body = (data.bodyText || "").slice(0, 10000);
  const schemaTypes: string[] = ((data as any).schemaTypes || []).map((t: any) =>
    String(t)
  );
  const schemas: any[] = (data as any).jsonLdSchemas || [];

  // ============ 로컬 업종 신호 감지 ============
  const hasPhone = /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/.test(body);
  const hasAddress =
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n]{0,30}(로|길)\s*\d+/.test(
      body
    ) || /(시|도)\s+[가-힣]{1,10}(구|군|시)\s+[가-힣]/.test(body);
  const hasLocalSchema =
    schemaTypes.some((t) => /localbusiness|restaurant|store|cafe|lodging/i.test(t)) ||
    schemas.some((s) => {
      const t = String(s?.["@type"] || "");
      return /localbusiness|restaurant|store|cafe/i.test(t);
    });
  const hasPlaceKeywords = /(예약|영업시간|오시는 길|오시는길|매장|지점|방문)/.test(body);
  const isLocalBusiness =
    (hasPhone && hasAddress) || hasLocalSchema || (data as any).hasNaverPlaceLink || data.hasMapEmbed;

  // ============ [플레이스] 1. NAP 존재성 ============
  checks.push({
    id: "napPresence",
    label: "연락처·주소(NAP) 존재",
    group: "place",
    status: hasPhone && hasAddress ? "pass" : hasPhone || hasAddress ? "warning" : "fail",
    currentValue: `전화 ${hasPhone ? "O" : "X"} · 주소 ${hasAddress ? "O" : "X"}`,
    diagnosis:
      hasPhone && hasAddress
        ? "전화번호와 주소가 본문에 모두 표기되어 있습니다"
        : hasPhone || hasAddress
        ? `둘 중 하나만 감지됨 (전화 ${hasPhone ? "O" : "X"}, 주소 ${hasAddress ? "O" : "X"})`
        : "전화번호·주소가 본문에서 감지되지 않습니다",
    guide: "푸터·문의 페이지에 전화번호와 전체 주소(도로명 포함)를 텍스트로 표기",
  });

  // ============ [플레이스] 2. LocalBusiness 구조화 ============
  const lbSchema = schemas.find((s) => {
    const t = String(s?.["@type"] || "");
    return /localbusiness|restaurant|store|cafe|organization/i.test(t);
  });
  const hasLbFields =
    !!lbSchema && (!!lbSchema.address || !!lbSchema.geo || !!lbSchema.telephone);
  checks.push({
    id: "localSchema",
    label: "LocalBusiness 구조화",
    group: "place",
    status: hasLbFields ? "pass" : hasLocalSchema ? "warning" : "fail",
    currentValue: hasLbFields
      ? `${String(lbSchema["@type"])} + 필드 있음`
      : hasLocalSchema
      ? "타입만 존재 (필드 부족)"
      : "(없음)",
    diagnosis: hasLbFields
      ? "AI가 업체 정보(주소·좌표·전화)를 구조적으로 이해 가능"
      : hasLocalSchema
      ? "스키마 타입은 있으나 address/geo/telephone 필드가 비어 있습니다"
      : "LocalBusiness JSON-LD가 없어 AI가 업체 정보를 읽기 어렵습니다",
    guide: "LocalBusiness 스키마에 name·address·telephone·geo·openingHours 필드 채우기",
  });

  // ============ [플레이스] 3. 영업시간 ============
  const hasHoursSchema = schemas.some((s) => !!s?.openingHours || !!s?.openingHoursSpecification);
  const hasHoursText = /(영업시간|운영시간|오픈|마감|평일|주말|\d{1,2}:\d{2}\s*[~-])/i.test(body);
  checks.push({
    id: "openingHours",
    label: "영업시간 정보",
    group: "place",
    status: hasHoursSchema ? "pass" : hasHoursText ? "warning" : "fail",
    currentValue: hasHoursSchema
      ? "스키마 + 텍스트"
      : hasHoursText
      ? "텍스트만"
      : "(없음)",
    diagnosis: hasHoursSchema
      ? "openingHours 구조화 완료 — AI가 정확히 인용 가능"
      : hasHoursText
      ? "텍스트 표기는 있으나 구조화되어 있지 않습니다"
      : "영업시간 정보가 없습니다",
    guide: "openingHoursSpecification 스키마 추가 + 본문에 요일별 영업시간 표기",
  });

  // ============ [플레이스] 4. 메뉴/서비스 텍스트화 ============
  const hasMenuText = /(메뉴|가격표|요금|서비스 안내|진료 과목|시술|코스)/i.test(body);
  const menuInAlt = (data.imageAlts || []).some((a) => /메뉴|가격|요금/i.test(a));
  checks.push({
    id: "menuText",
    label: "메뉴·서비스 텍스트화",
    group: "place",
    status: hasMenuText ? "pass" : menuInAlt ? "warning" : "fail",
    currentValue: hasMenuText ? "텍스트 존재" : menuInAlt ? "이미지 alt만" : "(없음)",
    diagnosis: hasMenuText
      ? "메뉴·서비스 정보가 텍스트로 존재 — AI 브리핑 인용 가능"
      : menuInAlt
      ? "이미지에만 있는 정보는 AI가 읽기 어렵습니다"
      : "메뉴·서비스 정보가 텍스트로 감지되지 않습니다",
    guide: "메뉴판 이미지 대신 텍스트 목록으로 병기 (품목명 + 가격)",
  });

  // ============ [플레이스] 5. 지도·오시는 길 ============
  const hasDirections = /(오시는 길|오시는길|찾아오시는|교통|주차)/i.test(body);
  checks.push({
    id: "directions",
    label: "지도·오시는 길",
    group: "place",
    status: data.hasMapEmbed ? "pass" : hasDirections ? "warning" : "fail",
    currentValue: data.hasMapEmbed
      ? "지도 임베드 있음"
      : hasDirections
      ? "텍스트 안내만"
      : "(없음)",
    diagnosis: data.hasMapEmbed
      ? "지도 임베드 확인 — 방문 동선이 명확합니다"
      : hasDirections
      ? "텍스트 안내만 있고 지도 임베드가 없습니다"
      : "지도·교통 안내가 없습니다",
    guide: "네이버 지도 공유 기능으로 iframe 임베드 + 주차·대중교통 안내 텍스트",
  });

  // ============ [플레이스] 6. 예약·리뷰 동선 ============
  const hasReserve = /(예약|방문 신청|상담 예약)/i.test(body);
  const hasReviewCta = /(리뷰|후기|체험단)/i.test(body);
  checks.push({
    id: "reserveReview",
    label: "예약·리뷰 유도 동선",
    group: "place",
    status: hasReserve && hasReviewCta ? "pass" : hasReserve || hasReviewCta ? "warning" : "fail",
    currentValue: `예약 ${hasReserve ? "O" : "X"} · 리뷰 ${hasReviewCta ? "O" : "X"}`,
    diagnosis:
      hasReserve && hasReviewCta
        ? "예약과 리뷰 유도 동선이 모두 있습니다"
        : "방문 후 액션(예약/리뷰) 동선이 부족합니다",
    guide: "예약 CTA + '방문 후 리뷰 남겨주세요' 안내 배치 — 플레이스 리뷰가 AI 브리핑의 핵심 재료",
  });

  // ============ [플레이스] 7. 플레이스 연결 신호 ============
  checks.push({
    id: "placeLink",
    label: "플레이스 연결",
    group: "place",
    status: (data as any).hasNaverPlaceLink ? "pass" : "fail",
    currentValue: (data as any).hasNaverPlaceLink ? "플레이스 링크 존재" : "(없음)",
    diagnosis: (data as any).hasNaverPlaceLink
      ? "홈페이지에 네이버 플레이스 링크가 있어 채널이 연결됩니다"
      : "홈페이지와 플레이스 간 연결 링크가 없습니다",
    guide: "홈페이지 푸터에 네이버 플레이스 업체 페이지 링크 추가 (양방향 연결)",
  });

  // ============ [플레이스] 8. 스마트플레이스 설정 안내 ============
  checks.push({
    id: "smartplaceGuide",
    label: "스마트플레이스 AI 설정",
    group: "place",
    status: "warning", // 확인 불가 항목 — 안내형
    currentValue: "사용자 직접 확인 필요",
    diagnosis: "스마트플레이스 관리 페이지의 설정은 외부에서 확인할 수 없습니다",
    guide: "스마트플레이스 > 업체정보 > AI 정보 > 'AI 브리핑 노출하기' ON 여부를 직접 확인하세요",
  });

  // ============ [서치어드바이저] 1. 소유 확인 ============
  checks.push({
    id: "saVerification",
    label: "서치어드바이저 소유 확인",
    group: "advisor",
    status: data.naverSiteVerification ? "pass" : "fail",
    currentValue: data.naverSiteVerification ? "메타태그 감지됨" : "(없음)",
    diagnosis: data.naverSiteVerification
      ? "서치어드바이저 소유 확인 메타태그가 있습니다"
      : "naver-site-verification 메타태그가 없습니다",
    guide: "searchadvisor.naver.com 에서 사이트 등록 후 발급되는 메타태그를 <head>에 추가",
  });

  // ============ [서치어드바이저] 2. Sitemap ============
  const sitemapSchemas = false; // 본문에서 확인 불가 — robots.txt 선언만 근사치로 사용
  checks.push({
    id: "sitemap",
    label: "사이트맵 제출",
    group: "advisor",
    status: "warning", // 정확한 확인은 서치어드바이저 계정 내에서만 가능
    currentValue: "계정 내 확인 필요",
    diagnosis: "사이트맵 제출 여부는 서치어드바이저 계정에서만 정확히 확인 가능합니다",
    guide: "서치어드바이저 > 요청 > 사이트맵 제출에서 /sitemap.xml 등록 여부 확인",
  });

  // ============ [서치어드바이저] 3. RSS 피드 ============
  checks.push({
    id: "rss",
    label: "RSS 피드",
    group: "advisor",
    status: data.rssLink ? "pass" : "warning",
    currentValue: data.rssLink ? "RSS 링크 감지됨" : "(없음)",
    diagnosis: data.rssLink
      ? "RSS 피드가 감지되었습니다 — 신규 콘텐츠 색인 속도 향상"
      : "RSS 피드가 없습니다 — 콘텐츠형 사이트라면 색인 속도에 불리",
    guide: "블로그·뉴스 콘텐츠가 있다면 RSS 피드 생성 후 서치어드바이저에 제출",
  });

  // ============ [서치어드바이저] 4. robots.txt 허용 ============
  // v45-W5에서 이미 추출 전 robots 차단을 거부하므로, 여기 도달했다면 차단 아님
  checks.push({
    id: "robotsAllow",
    label: "크롤링 허용 설정",
    group: "advisor",
    status: "pass", // 이 시점 도달 = 전체 차단 아님
    currentValue: "차단 없음",
    diagnosis: "robots.txt 전체 차단이 감지되지 않았습니다 (추출 성공 = 크롤링 허용 상태)",
    guide: "현 상태 유지 · Yeti(네이버 봇) 명시 허용 시 더 안전",
  });

  // ============ 점수 계산 ============
  const placeChecks = checks.filter((c) => c.group === "place");
  const advisorChecks = checks.filter((c) => c.group === "advisor");
  const placeScore = Math.round(
    placeChecks.reduce((s, c) => s + scoreOf(c.status), 0) / placeChecks.length
  );
  const advisorScore = Math.round(
    advisorChecks.reduce((s, c) => s + scoreOf(c.status), 0) / advisorChecks.length
  );
  // 로컬 업종이면 place 70% · advisor 30%, 비로컬이면 반대
  const overallScore = isLocalBusiness
    ? Math.round(placeScore * 0.7 + advisorScore * 0.3)
    : Math.round(placeScore * 0.3 + advisorScore * 0.7);
  const grade = gradeFromScore(overallScore);

  // 우선 액션 (fail → warning 순, 안내형 제외)
  const actionable = checks.filter((c) => c.status !== "pass" && c.id !== "smartplaceGuide");
  const sorted = [...actionable].sort(
    (a, b) => scoreOf(a.status) - scoreOf(b.status)
  );
  const priorityActions = sorted.slice(0, 3).map((c) => `[${c.label}] ${c.guide}`);
  if (priorityActions.length === 0) {
    priorityActions.push("현 상태 유지 · 스마트플레이스 AI 정보 설정을 주기적으로 점검하세요");
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const summary = isLocalBusiness
    ? `로컬 업종으로 감지됨. 플레이스 AI 브리핑 준비도 ${placeScore}점 · 서치어드바이저 ${advisorScore}점. (${passCount}/12 통과)`
    : `로컬 업종 신호 약함. 서치어드바이저 연동 위주로 점검 (${advisorScore}점). 플레이스 항목은 오프라인 매장이 있다면 해당. (${passCount}/12 통과)`;

  return {
    overallScore,
    grade,
    isLocalBusiness,
    placeScore,
    advisorScore,
    summary,
    checks,
    priorityActions,
  };
}
