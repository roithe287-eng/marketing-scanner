import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import LandingReportFeatures from '@/components/LandingReportFeatures';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean };

export default function LandingHero({ onSubmit, loading, allowed = false, checking = false }: Props) {
  return <section className="scanner-landing" aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-hero-grid">
        <div className="scanner-hero-copy">
          <p className="scanner-kicker"><span aria-hidden="true" />URL 하나로 찾는 개선의 시작</p>
          <h1 id="scanner-heading">우리 사이트,<br /><em>선택받고</em> 있나요?</h1>
          <p className="scanner-hero-description">검색·AI 노출, 경쟁사, 문구 개선까지.<br />우리 사이트가 바뀔 다음 순서를 찾으세요.</p>
          <div className="scanner-capabilities" aria-label="주요 진단 기능">
            <span>검색·AI 노출</span><span>경쟁사 비교</span><span>문구·실행안</span>
          </div>
          <a className="scanner-explore-link" href="#scanner-report-features">어떤 결과를 볼 수 있나요? <span aria-hidden="true">↓</span></a>
          <div className="scanner-hero-entry">
          {allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-url-form scanner-gated-form">
            <p className="scanner-url-label">우리 사이트의 개선점 찾기</p>
            <div className="scanner-url-row">
              <a href="/inquiry" className="scanner-url-input scanner-gated-input" aria-label="URL 입력 전 이용 문의하기"><span aria-hidden="true">↗</span> 웹사이트 URL로 시작</a>
              <a href="/inquiry" className="jm-button scanner-submit">{checking ? '확인 중…' : '진단 이용 문의'}<span aria-hidden="true">↗</span></a>
            </div>
            <ol className="scanner-access-steps" aria-label="이용 절차"><li>이용 문의</li><li>계정 승인</li><li>진단 시작</li></ol>
          </div>}
          <p className="scanner-before-notice">공개 정보 기반 참고용 진단 · 정확성·성과 보장 없음. <a href="/notice" target="_blank" rel="noopener noreferrer">이용 안내 ↗</a></p>
          </div>
        </div>
        <LivePreviewCard />
      </div>
      <LandingReportFeatures />
      <details className="scanner-scope-details"><summary>진단 범위와 확인할 점</summary><p>수집 가능한 공개 정보에 따라 결과 항목이 달라집니다. 경쟁사 비교·AI 답변 관측은 연결 상태와 응답에 따라 제공되지 않을 수 있습니다. 결과와 실행안은 참고용이며 실제 적용 전 사실과 적합성을 확인해 주세요.</p></details>
    </div>
  </section>;
}
