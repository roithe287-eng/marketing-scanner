import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import LandingReportFeatures from '@/components/LandingReportFeatures';
import LandingSectorPreview from '@/components/LandingSectorPreview';
import LandingPricing from '@/components/LandingPricing';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean; compact?: boolean };
const shortcuts = [
  {number:'01',title:'결과 미리보기',detail:'진단 결과와 개선안',href:'#scanner-result-preview'},
  {number:'02',title:'업종별 진단',detail:'병의원·법률·분양 등',href:'#scanner-sector-preview'},
  {number:'03',title:'진단 항목',detail:'검색부터 수정·실행까지',href:'#scanner-report-features'},
] as const;

export default function LandingHero({ onSubmit, loading, allowed = false, checking = false, compact = false }: Props) {
  return <section className={`scanner-landing scanner-landing--gate${compact?' scanner-landing--compact':''}`} aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-gate-hero">
        <div className="scanner-gate-copy">
          {compact ? <h2 id="scanner-heading">다른 웹사이트 진단하기</h2> : <>
            <span className="scanner-home-eyebrow">웹사이트 마케팅 진단</span>
            <h1 id="scanner-heading"><span>한 번의 진단,</span><strong>다음 행동은 선명하게<span className="scanner-gate-period">.</span></strong></h1>
            <p>검색·AI 노출부터 경쟁사 비교, 바꿀 문장까지.</p>
            <p className="scanner-gate-audience">쇼핑몰부터 병의원·법률·분양 등 예약·상담형 사이트까지.</p>
          </>}
        </div>
        <div className="scanner-gate-stage">
          <div className="scanner-gate-entry" id="scanner-start" tabIndex={-1}>
            {checking ? <div className="scanner-entry-checking" role="status" aria-live="polite"><span className="scanner-entry-dot" aria-hidden="true"/>이용 권한을 확인하고 있습니다.</div> : allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-gated-form">
              <div className="scanner-entry-intro">
                <h2>URL 하나로, 우리 사이트부터.</h2>
                <p>처음 이용하신다면 이용 문의 후 승인된 계정으로 진단을 시작하세요.</p>
              </div>
              <div className="scanner-entry-actions">
                <a href="/inquiry" className="jm-button scanner-submit">진단 이용 문의<span aria-hidden="true">→</span></a>
                <a href="/login" className="scanner-entry-login">기존 계정으로 로그인</a>
              </div>
              <ol className="scanner-access-steps" aria-label="이용 절차"><li>이용 문의</li><li>계정 승인</li><li>URL 입력·진단</li></ol>
            </div>
            }
          </div>
        </div>
        {!compact && <nav className="scanner-home-shortcuts" aria-label="진단 서비스 알아보기">
          {shortcuts.map(item=><a key={item.number} href={item.href}><span className="scanner-shortcut-number" aria-hidden="true">{item.number}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="scanner-shortcut-arrow" aria-hidden="true">↓</span></a>)}
        </nav>}
      </div>
      {!compact && <div className="scanner-gate-details">
        <div className="scanner-gate-preview"><LivePreviewCard /></div>
        <LandingSectorPreview />
        <LandingReportFeatures />
        <LandingPricing />
        <a className="scanner-back-to-start" href="#scanner-start">{allowed?'URL 입력하고 진단 시작하기':'진단 이용 시작하기'} <span aria-hidden="true">↑</span></a>
      </div>}
    </div>
  </section>;
}
