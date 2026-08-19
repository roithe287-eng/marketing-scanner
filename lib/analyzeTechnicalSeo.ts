/**
 * v46-W2-1: 페이지 기술 상태 점검 (독자 문구·분류로 재작성 — 저작권 리스크 제거)
 * - AI 호출 없이 extractWebsite 추출 데이터만으로 판정 (비용 0 · 지연 0)
 * - 11개 체크: 화면 구성 7 + 검색엔진 인식 3 + 주소 연결 1
 * - 판정: pass(양호) / warning(보통) / fail(취약) — 기존 앱 컴포넌트 언어와 통일
 * - 기준 수치(응답 3초·용량 4MB·제목 15~45자)는 업계 일반 권장값을 참고한 사실 정보
 *   ※ 네이버 진단보고서의 문구·항목명·표현을 사용하지 않음 (독립 재작성)
 */

import type { ExtractedWebsiteData } from "./extractWebsite";
import type { TechnicalSeo, TechnicalSeoCheck } from "./reportSchema";

type Status = "pass" | "warning" | "fail";
const SCORE: Record<Status, number> = { pass: 100, warning: 60, fail: 20 };

function gradeOf(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function analyzeTechnicalSeo(data: ExtractedWebsiteData): TechnicalSeo {
  const checks: TechnicalSeoCheck[] = [];

  // ─────────────────────────────────────────────
  // 화면 구성 (7개)
  // ─────────────────────────────────────────────

  // 1. 페이지 제목 길이
  {
    const len = data.title.length;
    const status: Status =
      len === 0 ? "fail" : len >= 15 && len <= 45 ? "pass" : "warning";
    checks.push({
      id: "titleLength",
      label: "페이지 제목 길이",
      group: "aeo",
      status,
      currentValue:
        len > 0
          ? `"${data.title.slice(0, 30)}${len > 30 ? "…" : ""}" · ${len}자`
          : "제목 없음",
      diagnosis:
        status === "pass"
          ? "제목 길이가 검색 결과 노출에 적합한 범위입니다."
          : status === "warning"
            ? `제목이 ${len}자로, 일반적으로 권장되는 15~45자 범위를 벗어났습니다.`
            : "페이지 제목이 비어 있습니다. 검색엔진이 이 페이지가 무엇인지 알 수 없습니다.",
      guide:
        "제목 앞쪽에 핵심 키워드, 뒤쪽에 브랜드명을 배치해 15~45자로 맞춰보세요. 짧으면 주제가 흐려지고, 길면 검색 결과에서 뒷부분이 잘려 보입니다.",
    });
  }

  // 2. 본문 대표 제목(H1) 구성
  {
    const n = data.h1Count;
    const status: Status = n === 1 ? "pass" : "warning";
    checks.push({
      id: "h1Count",
      label: "본문 대표 제목(H1) 구성",
      group: "aeo",
      status,
      currentValue:
        n === 0
          ? "H1 없음"
          : `H1 ${n}개${data.h1[0] ? ` · "${data.h1[0].slice(0, 20)}${data.h1[0].length > 20 ? "…" : ""}"` : ""}`,
      diagnosis:
        n === 1
          ? "페이지를 대표하는 제목이 하나로 명확합니다."
          : n === 0
            ? "대표 제목(H1)이 없어 검색엔진이 페이지의 핵심 주제를 놓칠 수 있습니다."
            : `대표 제목이 ${n}개로 나뉘어 있어, 페이지 주제가 흩어져 보일 수 있습니다.`,
      guide:
        "한 페이지의 대표 제목(H1)은 하나만 두는 것이 좋습니다. 나머지 소제목은 H2·H3를 사용하면 주제 계층이 분명해집니다.",
    });
  }

  // 3. 보안 연결(http) 링크 혼재
  {
    const isHttps = (data.finalUrl || data.url).startsWith("https://");
    const httpLinks = data.anchorHrefs.filter((h) => h.startsWith("http://"));
    const status: Status = !isHttps
      ? "warning"
      : httpLinks.length === 0
        ? "pass"
        : httpLinks.length <= 5
          ? "warning"
          : "fail";
    checks.push({
      id: "mixedProtocol",
      label: "보안 연결(http) 링크 혼재",
      group: "aeo",
      status,
      currentValue: isHttps
        ? `http 링크 ${httpLinks.length}개 발견`
        : "사이트가 보안 연결(https)이 아님",
      diagnosis:
        status === "pass"
          ? "모든 링크가 보안 연결(https)로 일치합니다."
          : !isHttps
            ? "사이트 자체가 https로 제공되지 않고 있습니다. 브라우저가 '주의 요함'으로 표시할 수 있습니다."
            : `보안되지 않은 http 주소로 연결된 링크가 ${httpLinks.length}개 섞여 있습니다.`,
      guide:
        "링크 주소를 모두 https로 바꿔주세요. http 링크가 섞여 있으면 방문자에게 보안 경고가 뜨거나, 검색엔진의 신뢰 평가에 불리하게 작용할 수 있습니다.",
      evidence: httpLinks.slice(0, 5),
    });
  }

  // 4. 이동 불가 링크 (# · javascript:)
  {
    const restricted = data.anchorHrefs.filter(
      (h) => h === "#" || h.toLowerCase().startsWith("javascript:")
    );
    const status: Status =
      restricted.length === 0 ? "pass" : restricted.length <= 5 ? "warning" : "fail";
    checks.push({
      id: "restrictedLinks",
      label: "이동 불가 링크 (#·자바스크립트)",
      group: "aeo",
      status,
      currentValue: `${restricted.length}개`,
      diagnosis:
        status === "pass"
          ? "모든 링크가 실제 주소로 연결됩니다."
          : `주소 없이 동작만 하는 링크(# 또는 자바스크립트)가 ${restricted.length}개 있습니다. 검색엔진은 이 링크를 따라가지 못합니다.`,
      guide:
        "버튼 역할의 링크라도 실제 이동이 필요하다면 유효한 주소를 넣어주세요. 그래야 검색엔진이 연결된 페이지까지 찾아가 색인할 수 있습니다.",
      evidence: restricted.slice(0, 5),
    });
  }

  // 5. 화면 표시 지연 요소
  {
    const jsCount = data.headSyncScripts.length;
    const cssCount = data.headStylesheets.length;
    const total = jsCount + cssCount;
    const status: Status = total <= 3 ? "pass" : total <= 10 ? "warning" : "fail";
    checks.push({
      id: "renderBlocking",
      label: "화면 표시 지연 요소",
      group: "aeo",
      status,
      currentValue: `스크립트 ${jsCount}개 · 스타일 ${cssCount}개`,
      diagnosis:
        status === "pass"
          ? "첫 화면을 가로막는 파일이 적어 빠르게 표시됩니다."
          : `화면이 그려지기 전에 기다려야 하는 파일이 ${total}개 있습니다. 방문자가 백지 화면을 보는 시간이 길어집니다.`,
      guide:
        "스크립트 태그에 async 또는 defer 속성을 추가하고, 꼭 필요한 스타일만 먼저 불러오도록 정리해보세요. 첫 화면 표시가 빨라지면 이탈도 줄어듭니다.",
      evidence: [...data.headSyncScripts, ...data.headStylesheets].slice(0, 8),
    });
  }

  // 6. 서버 응답 속도
  {
    const ms = data.responseTimeMs;
    const status: Status = ms < 1500 ? "pass" : ms <= 3000 ? "warning" : "fail";
    checks.push({
      id: "responseTime",
      label: "서버 응답 속도",
      group: "aeo",
      status,
      currentValue: `${(ms / 1000).toFixed(2)}초`,
      diagnosis:
        status === "pass"
          ? "페이지가 빠르게 열립니다."
          : status === "warning"
            ? "열리는 데 다소 시간이 걸립니다. 3초를 넘기면 방문자 이탈이 눈에 띄게 늘어납니다."
            : "3초 이상 걸려 검색엔진 수집 효율과 방문자 경험 모두에 불리한 상태입니다.",
      guide:
        "서버 응답을 빠르게 만드는 방법은 캐시 적용, 이미지 용량 줄이기, 불필요한 플러그인 정리가 대표적입니다. 호스팅 성능 자체도 점검해볼 만합니다.",
    });
  }

  // 7. 문서 용량
  {
    const b = data.pageSizeBytes;
    const status: Status =
      b < 1024 * 1024 ? "pass" : b <= 4 * 1024 * 1024 ? "warning" : "fail";
    checks.push({
      id: "pageSize",
      label: "문서 용량",
      group: "aeo",
      status,
      currentValue: fmtBytes(b),
      diagnosis:
        status === "pass"
          ? "문서 크기가 가벼워 부담 없이 열립니다."
          : status === "warning"
            ? "문서가 다소 무겁습니다. 4MB를 넘어가면 검색엔진이 내용을 일부만 읽고 중단할 수 있습니다."
            : "4MB를 초과하는 무거운 문서입니다. 검색엔진이 내용 전부를 가져가지 못할 가능성이 높습니다.",
      guide:
        "HTML 안에 직접 박아 넣은 대용량 코드나 base64 이미지가 있다면 외부 파일로 분리하고, 서버 압축(gzip·brotli)이 켜져 있는지 확인해보세요.",
    });
  }

  // ─────────────────────────────────────────────
  // 검색엔진 인식 (3개)
  // ─────────────────────────────────────────────

  // 8. 본문 텍스트 분량
  {
    const len = data.bodyTextLength;
    const status: Status = len >= 500 ? "pass" : len >= 200 ? "warning" : "fail";
    checks.push({
      id: "thinContent",
      label: "본문 텍스트 분량",
      group: "index",
      status,
      currentValue: `약 ${len.toLocaleString()}자`,
      diagnosis:
        status === "pass"
          ? "검색엔진이 읽을 만한 텍스트가 충분히 담겨 있습니다."
          : status === "warning"
            ? "텍스트가 부족한 편입니다. 이미지나 화면 효과 중심 페이지는 검색엔진이 내용을 파악하기 어렵습니다."
            : "텍스트가 거의 없어 검색엔진이 '정보가 없는 페이지'로 판단할 수 있습니다.",
      guide:
        "핵심 안내 문구는 그림이 아닌 텍스트로 작성해주세요. 이미지 속 글자는 검색엔진이 읽지 못하므로, 중요한 메시지일수록 HTML 텍스트로 남기는 것이 안전합니다.",
    });
  }

  // 9. 오류 안내 문구 노출
  {
    const probe =
      `${data.title} ${data.h1.join(" ")} ${data.bodyText.slice(0, 500)}`;
    const hit =
      /404|not\s*found|찾을 수 없|존재하지 않|접근할 수 없|오류가 발생|page error/i.test(
        probe
      );
    checks.push({
      id: "soft404",
      label: "오류 안내 문구 노출",
      group: "index",
      status: hit ? "fail" : "pass",
      currentValue: hit ? "오류 문구 감지됨" : "정상",
      diagnosis: hit
        ? "제목이나 본문에 '찾을 수 없음' 같은 오류성 문구가 보입니다. 멀쩡한 페이지라도 검색엔진이 오류 페이지로 오해해 색인에서 뺄 수 있습니다."
        : "오류성 문구 없이 정상적인 내용으로 구성되어 있습니다.",
      guide:
        "실제 오류 페이지가 아니라면 해당 문구를 제거하거나 표현을 다듬어주세요. 정상 페이지가 오류 페이지로 분류되면 검색 노출 자체가 사라집니다.",
    });
  }

  // 10. 문서 형식 응답
  {
    checks.push({
      id: "contentType",
      label: "문서 형식 응답",
      group: "index",
      status: data.contentTypeOk ? "pass" : "fail",
      currentValue: data.contentTypeOk ? "HTML 문서로 응답" : "HTML 형식 아님",
      diagnosis: data.contentTypeOk
        ? "서버가 이 주소를 HTML 문서로 올바르게 알려주고 있습니다."
        : "서버가 이 페이지를 HTML 문서로 인식시켜 주지 않고 있어, 검색엔진이 읽기를 거부할 수 있습니다.",
      guide:
        "서버(또는 호스팅·빌더 설정)에서 이 주소의 응답 형식이 text/html인지 확인해주세요. 보통 서버 설정 문제이며 개발자에게 전달하면 빠르게 해결됩니다.",
    });
  }

  // ─────────────────────────────────────────────
  // 주소 연결 (1개)
  // ─────────────────────────────────────────────

  // 11. 주소 이동 경로 (리다이렉트)
  {
    const hops = data.redirectChain.length;
    const status: Status =
      data.selfRedirect || hops >= 5 ? "fail" : hops === 0 ? "pass" : "warning";
    checks.push({
      id: "redirectChain",
      label: "주소 이동 경로",
      group: "crawl",
      status,
      currentValue: data.selfRedirect
        ? "같은 주소로 되돌아오는 설정 감지"
        : hops === 0
          ? "이동 없이 바로 연결"
          : `${hops}단계 거침`,
      diagnosis: data.selfRedirect
        ? "주소가 자기 자신으로 다시 연결되는 설정이 있어, 검색엔진이 무한 순환으로 판단해 접근을 멈출 수 있습니다."
        : hops === 0
          ? "입력한 주소에서 바로 페이지가 열립니다."
          : hops >= 5
            ? `${hops}단계의 이동을 거치고 있어 검색엔진이 중간에 추적을 포기할 수 있는 수준입니다.`
            : `${hops}단계 이동 후 최종 페이지에 도달합니다. 이동은 1단계 이내가 가장 안전합니다.`,
      guide:
        "광고·SNS·명함 등에 쓰는 주소는 최종 도착 주소로 통일해주세요. 이동 단계가 늘어날수록 방문자 이탈과 검색엔진 추적 실패 확률이 함께 올라갑니다.",
      evidence: data.redirectChain.slice(0, 6),
    });
  }

  // ─────────────────────────────────────────────
  // 종합 점수·우선 액션
  // ─────────────────────────────────────────────
  const counts = {
    pass: checks.filter((c) => c.status === "pass").length,
    warning: checks.filter((c) => c.status === "warning").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
  const overallScore = Math.round(
    checks.reduce((sum, c) => sum + SCORE[c.status], 0) / checks.length
  );

  const priorityActions = [
    ...checks.filter((c) => c.status === "fail"),
    ...checks.filter((c) => c.status === "warning"),
  ]
    .slice(0, 5)
    .map((c) => `[${c.label}] ${c.guide}`);

  const summary =
    counts.fail > 0
      ? `양호 ${counts.pass} · 보통 ${counts.warning} · 취약 ${counts.fail} — 취약 항목은 검색 노출에 직접 영향을 주므로 먼저 해결하는 것이 좋습니다.`
      : counts.warning > 0
        ? `양호 ${counts.pass} · 보통 ${counts.warning} — 보통 항목만 정리해도 검색엔진이 훨씬 수월하게 읽어갑니다.`
        : "기술 상태가 전반적으로 양호합니다. 지금 상태를 유지하세요.";

  return {
    overallScore,
    grade: gradeOf(overallScore),
    summary,
    counts,
    checks,
    priorityActions,
  };
}
