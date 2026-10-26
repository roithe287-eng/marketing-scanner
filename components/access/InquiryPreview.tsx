import React from 'react';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';

/** Public, illustrative content only. Never read or expose a customer's report here. */
export default function InquiryPreview() {
  return <aside className="inquiry-preview" aria-labelledby="inquiry-preview-title">
    <header className="inquiry-preview-header">
      <div className="inquiry-preview-kicker"><span>REPORT PREVIEW</span><b>진단 결과 예시</b></div>
      <h2 id="inquiry-preview-title">무엇이 부족한지,<br />어떻게 바꿀지까지.</h2>
      <p>긴 분석을 읽기 전에 핵심부터.<br />근거와 실행안이 이어지는 보고서를 만나보세요.</p>
      <a href="#inquiry-request">우리 사이트도 진단 문의 <span aria-hidden="true">↗</span></a>
    </header>

    <div className="inquiry-preview-body">
      <div className="inquiry-example-label"><span aria-hidden="true">✦</span> 가상 서비스 사이트 · 핵심 요약</div>
      <h3>서비스는 보이지만,<br />상담의 다음 단계가 모호합니다.</h3>
      <ol className="inquiry-signal-map" aria-label="예시 사이트의 발견부터 문의까지 진단">
        <li data-tone="violet"><DiagnosisIcon axis="seo" /><span>01 · 검색·AI</span><strong>출처 인용 미확인</strong><small>고객 질문별 답변 보강</small></li>
        <li data-tone="green"><DiagnosisIcon axis="trust" /><span>02 · 홈페이지</span><strong>서비스 설명 확인</strong><small>선택 근거로 활용</small></li>
        <li data-tone="amber"><DiagnosisIcon axis="cta" /><span>03 · 문의 동선</span><strong>상담 절차 부족</strong><small>다음 단계 안내 필요</small></li>
      </ol>

      <section className="inquiry-copy-example" aria-labelledby="inquiry-copy-title">
        <div className="inquiry-preview-section-title"><DiagnosisIcon axis="copywriting" /><h4 id="inquiry-copy-title">진단을 실제 문장으로 바꾸면</h4></div>
        <div className="inquiry-copy-grid">
          <div data-state="before"><span>AS-IS <b>현재 문구 예시</b></span><p>“맞춤 상담으로<br />함께합니다.”</p><small>무엇을 남길지, 이후 과정이 모호함</small></div>
          <div data-state="after"><span>TO-BE <b>개선 문구 예시</b></span><p>“목적·예산·시기를 남겨 주세요. 상담 절차와 준비 항목을 안내합니다.”</p></div>
        </div>
      </section>

      <section className="inquiry-priorities" aria-labelledby="inquiry-priorities-title">
        <div className="inquiry-preview-section-title"><DiagnosisIcon axis="conversionFlow" /><h4 id="inquiry-priorities-title">어디부터 바꿀지, 우선순위까지</h4></div>
        <ol>
          <li><b>01</b><span><strong>문의 전 망설임 줄이기</strong><small>상담 순서·준비 항목을 버튼 가까이에</small></span><em>먼저</em></li>
          <li><b>02</b><span><strong>선택할 이유 보강하기</strong><small>확인 가능한 사례·조건을 소개 옆에</small></span></li>
          <li><b>03</b><span><strong>검색·AI가 읽을 답변 만들기</strong><small>고객 질문별 FAQ와 근거 정리</small></span></li>
        </ol>
      </section>

      <div className="inquiry-report-scope"><strong>전체 보고서에서 더 깊게</strong><p><span>검색·AI 관측</span><span>경쟁사 비교</span><span>개선 문구</span><span>실행·KPI</span></p></div>
      <p className="inquiry-example-note">이해를 돕기 위한 가상 예시입니다. 실제 결과와 제공 범위는 사이트·수집 근거·이용 조건에 따라 달라지며, 승인 후 진단됩니다.</p>
    </div>
  </aside>;
}
