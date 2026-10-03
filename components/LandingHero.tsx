import UrlForm from '@/components/UrlForm';
import LivePreviewCard from '@/components/LivePreviewCard';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';

type Props={onSubmit:(url:string,questions?:string[],baselineId?:string)=>void;loading:boolean};
const steps=[
  {axis:'seo' as const,title:'무엇이 보이는지',text:'검색·AI 답변과 공개 페이지의 확인 근거를 살펴봅니다.'},
  {axis:'conversionFlow' as const,title:'무엇부터 바꿀지',text:'8개 핵심 영역과 비교 후보를 바탕으로 우선순위를 정합니다.'},
  {axis:'copywriting' as const,title:'어떻게 고칠지',text:'TO-BE 문구와 실행 순서로 실제 수정할 일을 구체화합니다.'},
];
export default function LandingHero({onSubmit,loading}:Props) {
  return <section className="scanner-landing" aria-labelledby="scanner-heading">
    <div className="jm-container">
      <div className="scanner-hero-grid">
        <div className="scanner-hero-copy">
          <p className="scanner-kicker"><span aria-hidden="true"/>마케팅스캐너 · 웹사이트 자동 진단</p>
          <h1 id="scanner-heading">우리 사이트,<br/><em>어디부터</em> 바꿔야 할까요?</h1>
          <p className="scanner-hero-description">검색·AI 답변 노출(GEO)부터 문의로 이어지는 흐름까지.<br className="hidden sm:block"/> URL 하나로 점검하고, 바꿀 문장과 실행 순서를 확인하세요.</p>
          <div className="scanner-capabilities" aria-label="주요 진단 기능"><span>검색·SEO</span><span>AI·GEO</span><span>전환 흐름</span><span>TO-BE 실행안</span></div>
          <UrlForm onSubmit={onSubmit} loading={loading}/>
          <p className="scanner-before-notice">공개 정보 기반 참고용 분석으로 실제와 다를 수 있으며, 정확성·성과를 보장하지 않습니다. <a href="/notice" target="_blank" rel="noopener noreferrer">이용 안내 ↗</a></p>
        </div>
        <LivePreviewCard/>
      </div>
      <div className="scanner-outcomes" aria-label="진단 결과로 할 수 있는 일">
        {steps.map((step,i)=><article key={step.title}><div className="scanner-outcome-icon"><DiagnosisIcon axis={step.axis}/></div><div><p className="scanner-outcome-number">0{i+1}</p><h2>{step.title}</h2><p>{step.text}</p></div></article>)}
      </div>
      <p className="scanner-scope-note">수집 가능한 정보에 따라 결과 항목이 달라집니다. 경쟁사 비교·AI 답변 관측은 연결 상태와 응답에 따라 제공되지 않을 수 있습니다.</p>
    </div>
  </section>;
}
