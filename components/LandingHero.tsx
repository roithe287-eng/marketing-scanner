import Image from 'next/image';
import UrlForm from '@/components/UrlForm';
import LandingReportFeatures from '@/components/LandingReportFeatures';
import LandingSectorPreview from '@/components/LandingSectorPreview';
import LandingPricing from '@/components/LandingPricing';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean; compact?: boolean };
const capabilities = [
  {number:'01',title:'검색·AI',detail:'검색·AI 노출부터',kind:'search'},
  {number:'02',title:'경쟁사 비교',detail:'경쟁사 비교',kind:'comparison'},
  {number:'03',title:'수정·실행',detail:'바꿀 문장까지',kind:'rewrite'},
] as const;

function CapabilityIcon({kind}:{kind:typeof capabilities[number]['kind']}) {
  return <svg aria-hidden="true" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {kind==='search' ? <><circle cx="13.5" cy="13.5" r="10"/><path d="m21 21 8 8"/></> : kind==='comparison' ? <><path d="M4 19h5v10H4zM13.5 11h5v18h-5zM23 3h5v26h-5z"/></> : <><path d="m5 21 17-17a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3L11 27l-8 2 2-8Z"/><path d="m19 7 6 6M5 21l6 6"/></>}
  </svg>;
}
export default function LandingHero({ onSubmit, loading, allowed = false, checking = false, compact = false }: Props) {
  return <section className={`scanner-landing scanner-landing--gate${compact ? ' scanner-landing--compact' : ''}`} aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-gate-hero">
        <div className="scanner-gate-copy">
          {compact ? <h2 id="scanner-heading">{loading ? '사이트 진단 중' : '다른 웹사이트 진단하기'}</h2> : <><h1 id="scanner-heading"><span>한 번의 진단,</span><strong>다음 행동은 선명하게<span className="scanner-gate-period">.</span></strong></h1>
          <p>검색·AI 노출부터 경쟁사 비교, 바꿀 문장까지.</p></>}
        </div>
        <div className="scanner-gate-stage">
          {!compact && <div className="scanner-gate-art" aria-hidden="true">
            <Image src="/images/scanner-gate.webp" alt="" width={1942} height={809} priority sizes="(max-width: 1440px) 100vw, 1400px" />
          </div>}
          <div className="scanner-gate-entry" id="scanner-start" tabIndex={-1}>
            {checking ? <div className="scanner-entry-checking" role="status" aria-live="polite">이용 권한을 확인하고 있습니다.</div> : allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-url-form scanner-gated-form">
              <div className="scanner-url-row">
                <div className="scanner-url-input scanner-gated-input"><span aria-hidden="true">↗</span><span>웹사이트 URL로 시작하세요</span></div>
                <a href="/inquiry" className="jm-button scanner-submit">진단 이용 문의<span aria-hidden="true">→</span></a>
              </div>
              <div className="scanner-entry-help"><span>이용 승인 후 URL 입력 · 진단</span><a href="/login">기존 계정 로그인 <span aria-hidden="true">→</span></a></div>
            </div>}

          </div>
        </div>
        {!compact && <ol className="scanner-gate-capabilities" aria-label="진단으로 확인할 내용">
          {capabilities.map(item=><li key={item.number}><span className="scanner-gate-number">{item.number}</span><CapabilityIcon kind={item.kind}/><h2>{item.title}</h2><p>{item.detail}</p></li>)}
        </ol>}
      </div>
      {!compact && <div className="scanner-gate-details">
        <LandingSectorPreview />
        <LandingSectorPreview group="commerce" />
        <LandingReportFeatures />
        <LandingPricing />
      </div>}
    </div>
  </section>;
}
