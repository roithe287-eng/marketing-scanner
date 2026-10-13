import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import LandingReportFeatures from '@/components/LandingReportFeatures';
import LandingPricing from '@/components/LandingPricing';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean };
const questions = [
  {number:'01',title:'발견되는가',detail:'검색·AI 노출'},
  {number:'02',title:'선택받는가',detail:'경쟁사·전환 흐름'},
  {number:'03',title:'무엇을 바꿀까',detail:'개선 문구·실행·KPI'},
];
export default function LandingHero({ onSubmit, loading, allowed = false, checking = false }: Props) {
  return <section className="scanner-landing" aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-hero-shell">
        <div className="scanner-hero-grid">
          <div className="scanner-hero-copy">
            <p className="scanner-kicker"><span aria-hidden="true" />진단에서 실행까지, 마케팅스캐너</p>
            <h1 id="scanner-heading">검색되는 순간부터,<br /><em>선택받는 이유까지.</em></h1>
            <p className="scanner-hero-description">우리 사이트의 강점과 놓친 기회.<br />검색·AI 노출부터 경쟁사 비교, 바꿀 문장까지 확인하세요.</p>
            <ol className="scanner-hero-questions">{questions.map(q=><li key={q.number}><span>{q.number}</span><div><strong>{q.title}</strong><p>{q.detail}</p></div></li>)}</ol>
            <div className="scanner-hero-entry" id="scanner-start" aria-labelledby="scanner-entry-title">
              <div className="scanner-entry-heading"><p>START HERE <span aria-hidden="true">↘</span></p><h2 id="scanner-entry-title">우리 사이트, 어디부터 바꿀까요?</h2></div>
              <div className="scanner-entry-content">
                {allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-url-form scanner-gated-form">
                  <p className="scanner-url-label">진단할 웹사이트 URL</p>
                  <div className="scanner-url-row">
                    <a href="/inquiry" className="scanner-url-input scanner-gated-input" aria-label="URL 입력 전 이용 문의하기"><span className="scanner-url-prefix" aria-hidden="true">https://</span><span>우리 사이트 주소로 시작</span><span aria-hidden="true">↗</span></a>
                    <a href="/inquiry" className="jm-button scanner-submit">{checking ? '확인 중…' : '진단 이용 문의'}<span aria-hidden="true">↗</span></a>
                  </div>
                  <ol className="scanner-access-steps" aria-label="이용 절차"><li>이용 문의</li><li>승인 후 URL 입력</li><li>진단 시작</li></ol>
                </div>}
              </div>
            </div>
          </div>
          <LivePreviewCard />
        </div>
      </div>
      <LandingReportFeatures />
      <LandingPricing />
    </div>
  </section>;
}
