"use client";
import {useId, useState} from 'react';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';

const views = [{key:'overview',label:'결과 한눈에'}, {key:'ai',label:'검색·AI'}, {key:'competition',label:'경쟁사'}, {key:'rewrite',label:'수정·실행'}] as const;
type PreviewView = typeof views[number]['key'];

function ReportPreview() {
  return <div className="scanner-report-preview">
    <div className="scanner-story-grid">
      <article className="scanner-story" data-tone="blue"><div className="scanner-story-top"><span>01 · 발견</span><DiagnosisIcon axis="seo"/></div><h3>검색·AI 노출</h3><div className="scanner-story-search" aria-hidden="true"><span>SEO</span><span>GEO</span><span>AEO</span></div><p>페이지 준비도 · 답변 언급 · 출처</p></article>
      <article className="scanner-story" data-tone="purple"><div className="scanner-story-top"><span>02 · 비교</span><DiagnosisIcon axis="trust"/></div><h3>경쟁사 속 우리</h3><div className="scanner-story-compare" aria-hidden="true"><span/><span/><span/></div><p>검색어 연결 · 메시지 · 선택 정보</p></article>
      <article className="scanner-story" data-tone="green"><div className="scanner-story-top"><span>03 · 수정</span><DiagnosisIcon axis="copywriting"/></div><h3>바꿀 문구와 근거</h3><div className="scanner-story-rewrite" aria-hidden="true"><span>원문</span><b>→</b><strong>TO-BE</strong></div><p>반복 표현 · 수정 위치 · 작성 틀</p></article>
      <article className="scanner-story" data-tone="orange"><div className="scanner-story-top"><span>04 · 실행</span><DiagnosisIcon axis="conversionFlow"/></div><h3>실행 순서와 KPI</h3><div className="scanner-story-action" aria-hidden="true"><span>먼저</span><i/><span>다음</span><i/><span>KPI</span></div><p>우선순위 · 실행 일정 · 재측정</p></article>
    </div>
    <div className="scanner-preview-output"><span>보고서에 담기는 것</span><p><strong>확인한 근거</strong><b aria-hidden="true">→</b><strong>구체적인 개선안</strong><b aria-hidden="true">→</b><strong>다음 행동</strong></p></div>
  </div>;
}

function AiPreview() {
  return <div className="scanner-ai-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">GEO / AEO · AI 답변 속 우리 브랜드</p>
    <h3>언급됐는지, 출처로 쓰였는지.</h3>
    <p className="scanner-panel-description">페이지 준비도와 실제 답변 관측을 구분합니다.</p>
    <div className="scanner-ai-question"><span>고객의 질문 예시</span><p>“우리 업종에 맞는 서비스를 추천해 줘.”</p></div>
    <div className="scanner-ai-observations">
      <div><span className="scanner-ai-symbol" aria-hidden="true">Aa</span><div><div className="scanner-ai-observation-title"><strong>브랜드 언급</strong><b>언급 예시</b></div><p>답변에 이름이 등장했는가</p></div></div>
      <div><span className="scanner-ai-symbol" aria-hidden="true">↗</span><div><div className="scanner-ai-observation-title"><strong>자사 출처 인용</strong><b data-state="missing">미확인 예시</b></div><p>우리 URL이 근거로 연결됐는가</p></div></div>
    </div>
    <div className="scanner-panel-takeaway"><span>다음 행동</span><p>질문에 바로 답하는 문장과 확인 가능한 근거를 보강합니다.</p></div>
    <p className="scanner-demo-note">실제 관측은 질문·시점·AI 응답과 연결 상태에 따라 달라집니다.</p>
  </div>;
}

function CompetitionPreview() {
  return <div className="scanner-competition-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">COMPETITION · 같은 검색어, 다른 강점</p>
    <h3>경쟁사 사이, 우리 위치는?</h3>
    <p className="scanner-panel-description">대표 검색어의 네이버 API 검색 결과에서 대형몰 등을 제외한 비교 후보를 살펴봅니다.</p>
    <div className="scanner-mini-map" role="img" aria-label="경쟁사 포지셔닝 예시. 가로축은 검색어 연결도, 세로축은 선택 정보 범위, 원의 크기는 확인된 정보 단서 수입니다. 예시 A, B와 우리 사이트를 비교합니다.">
      <div className="scanner-map-y" aria-hidden="true">선택 정보 범위 <span>↑</span></div>
      <div className="scanner-map-field" aria-hidden="true"><span className="scanner-map-bubble" data-site="a">예시 A</span><span className="scanner-map-bubble" data-site="own">우리 사이트</span><span className="scanner-map-bubble" data-site="b">예시 B</span></div>
      <div className="scanner-map-x" aria-hidden="true">검색어 연결도 <span>→</span></div>
    </div>
    <p className="scanner-map-legend"><i aria-hidden="true"/> 원이 클수록 확인된 정보 단서가 많음</p>
    <p className="scanner-demo-note">배치와 크기는 예시입니다. 검색어 연결도는 제목·설명과의 연결, 선택 정보 범위는 확인된 정보의 종류를 뜻합니다. 검색 순위·매출·시장점유율이 아닙니다.</p>
  </div>;
}

function RewritePreview() {
  return <div className="scanner-copy-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">TO-BE · 원문에서 실행까지</p>
    <h3>무엇을, 어디서, 어떻게 바꿀지.</h3>
    <div className="scanner-demo-before"><span>AS-IS · 추상적인 표현</span><p>최고의 서비스로 성공을 함께합니다.</p></div>
    <div className="scanner-demo-flow"><span>고객</span><span>제공 범위</span><span>확인 가능한 근거</span></div>
    <div className="scanner-demo-after"><span>TO-BE · 사실을 채울 작성 틀</span><p><mark>[고객 유형]</mark>을 위한 <mark>[서비스 범위]</mark>를 제공합니다. <mark>[확인 가능한 사례]</mark>에서 진행 내용을 확인하세요.</p></div>
    <div className="scanner-rewrite-location"><span>수정 위치</span><strong>첫 화면의 제목 아래 소개 문장</strong></div>
    <p className="scanner-demo-note">실제 결과에는 수집된 URL의 원문 근거와 단계별 실행 안내가 함께 나옵니다. 확인되지 않은 사실은 직접 채워 주세요.</p>
  </div>;
}

/** All panels are illustrative, not a diagnosis or a live integration status. */
export default function LivePreviewCard() {
  const [view,setView] = useState<PreviewView>('overview');
  const panelId = useId();
  return <aside className="scanner-preview" aria-label="진단 결과 미리보기 · 예시 데이터">
    <div className="scanner-preview-heading"><div><p>EXPLORE YOUR REPORT</p><h2>이런 결과를 만나게 됩니다</h2></div><span>미리보기</span></div>
    <div className="scanner-preview-tabs" role="group" aria-label="결과 미리보기 선택">
      {views.map(item => <button key={item.key} type="button" aria-pressed={view===item.key} aria-controls={panelId} onClick={() => setView(item.key)}>{item.label}</button>)}
    </div>
    <div className="scanner-preview-content" id={panelId} aria-label={`${views.find(item=>item.key===view)?.label} 미리보기`}>
      {view==='overview'?<ReportPreview/>:view==='ai'?<AiPreview/>:view==='competition'?<CompetitionPreview/>:<RewritePreview/>}
    </div>
    <div className="scanner-preview-footer"><small>실제 분석 결과가 아닌 구성·데이터 예시입니다.</small></div>
  </aside>;
}
