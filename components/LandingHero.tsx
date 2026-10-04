import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import LandingReportFeatures from '@/components/LandingReportFeatures';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean };
const questions = [
  {number:'01',title:'고객은 우리를 발견할 수 있을까?',detail:'검색·AI 답변에서 보이는 준비와 근거'},
  {number:'02',title:'비교 끝에 우리를 선택할 이유는?',detail:'경쟁사 메시지·신뢰 요소·전환 흐름'},
  {number:'03',title:'오늘, 어디부터 바꾸면 좋을까?',detail:'URL별 개선 문구·실행 순서·확인할 KPI'},
];
export default function LandingHero({ onSubmit, loading, allowed = false, checking = false }: Props) {
  return <section className="scanner-landing" aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-hero-shell">
        <div className="scanner-hero-grid">
          <div className="scanner-hero-copy">
            <p className="scanner-kicker"><span aria-hidden="true" />진단에서 실행까지, 마케팅스캐너</p>
            <h1 id="scanner-heading">검색되는 순간부터,<br /><em>선택받는 이유까지.</em></h1>
            <p className="scanner-hero-description">우리 사이트를 고객의 발견·비교·결정 흐름으로 읽고,<br className="scanner-desktop-break" /> 바꿀 문장과 다음 행동을 구체화합니다.</p>
            <ol className="scanner-hero-questions">{questions.map(q=><li key={q.number}><span>{q.number}</span><div><strong>{q.title}</strong><p>{q.detail}</p></div></li>)}</ol>
            <a className="scanner-explore-link" href="#scanner-start">내 사이트의 다음 변화 찾기 <span aria-hidden="true">↓</span></a>
          </div>
          <LivePreviewCard />
        </div>
        <div className="scanner-hero-entry" id="scanner-start">
          <div className="scanner-entry-heading"><p>YOUR NEXT STEP</p><h2>다음 변화의 시작,<br />우리 사이트 URL 하나.</h2><span>수집 가능한 공개 정보를 바탕으로 진단합니다.</span></div>
          <div className="scanner-entry-content">
            {allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-url-form scanner-gated-form">
              <p className="scanner-url-label">우리 사이트의 개선점 찾기</p>
              <div className="scanner-url-row">
                <a href="/inquiry" className="scanner-url-input scanner-gated-input" aria-label="URL 입력 전 이용 문의하기"><span aria-hidden="true">↗</span> 웹사이트 URL로 시작</a>
                <a href="/inquiry" className="jm-button scanner-submit">{checking ? '확인 중…' : '진단 이용 문의'}<span aria-hidden="true">↗</span></a>
              </div>
              <ol className="scanner-access-steps" aria-label="이용 절차"><li>이용 문의</li><li>계정 승인</li><li>진단 시작</li></ol>
            </div>}
            <p className="scanner-before-notice">참고용 자동 진단 · 정확성·성과 보장 없음. <a href="/notice" target="_blank" rel="noopener noreferrer">이용 안내 ↗</a></p>
          </div>
        </div>
      </div>
      <LandingReportFeatures />
      <details className="scanner-scope-details"><summary>진단 범위와 확인할 점</summary><p>수집 가능한 공개 정보에 따라 결과 항목이 달라집니다. 경쟁사 비교·AI 답변 관측은 연결 상태와 응답에 따라 제공되지 않을 수 있습니다. 결과와 실행안은 참고용이며 실제 적용 전 사실과 적합성을 확인해 주세요.</p></details>
    </div>
  </section>;
}
