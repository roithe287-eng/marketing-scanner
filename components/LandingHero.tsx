import Image from 'next/image';
import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import LandingReportFeatures from '@/components/LandingReportFeatures';
import LandingPricing from '@/components/LandingPricing';

type Props = { onSubmit: (url: string, questions?: string[], baselineId?: string) => void; loading: boolean; allowed?: boolean; checking?: boolean };
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
export default function LandingHero({ onSubmit, loading, allowed = false, checking = false }: Props) {
  return <section className="scanner-landing scanner-landing--gate" aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-gate-hero">
        <div className="scanner-gate-copy">
          <h1 id="scanner-heading"><span>한 번의 진단,</span><strong>다음 행동은 선명하게<span className="scanner-gate-period">.</span></strong></h1>
          <p>검색·AI 노출부터 경쟁사 비교, 바꿀 문장까지.</p>
        </div>
        <div className="scanner-gate-stage">
          <div className="scanner-gate-art" aria-hidden="true">
            <Image src="/images/scanner-gate.webp" alt="" width={1942} height={809} priority sizes="(max-width: 1440px) 100vw, 1400px" />
          </div>
          <div className="scanner-gate-entry" id="scanner-start">
            {allowed ? <UrlForm onSubmit={onSubmit} loading={loading} /> : <div className="scanner-url-form scanner-gated-form">
              <p className="scanner-url-label">진단할 웹사이트 URL</p>
              <div className="scanner-url-row">
                <a href="/inquiry" className="scanner-url-input scanner-gated-input" aria-label="URL 입력 전 이용 문의하기"><span aria-hidden="true">↗</span><span>웹사이트 URL로 시작하세요</span></a>
                <a href="/inquiry" className="jm-button scanner-submit">{checking ? '확인 중…' : '진단 이용 문의'}<span aria-hidden="true">→</span></a>
              </div>
              <ol className="scanner-access-steps" aria-label="이용 절차"><li>이용 문의</li><li>승인 후 URL 입력</li><li>진단 시작</li></ol>
            </div>
            }
          </div>
        </div>
        <ol className="scanner-gate-capabilities" aria-label="진단으로 확인할 내용">
          {capabilities.map(item=><li key={item.number}><span className="scanner-gate-number">{item.number}</span><CapabilityIcon kind={item.kind}/><h2>{item.title}</h2><p>{item.detail}</p></li>)}
        </ol>
      </div>
      <div className="scanner-gate-details">
        <LandingReportFeatures />
        <div className="scanner-gate-preview"><LivePreviewCard /></div>
        <LandingPricing />
      </div>
    </div>
  </section>;
}
