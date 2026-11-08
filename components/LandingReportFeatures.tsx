import {ReadingToggle} from './ReadingDisclosure';
import LivePreviewCard from './LivePreviewCard';

const features = [
  {kind:'search',title:'검색·AI 노출',description:'네이버·구글 검색과 AI 답변에 필요한 페이지 구조, 키워드 연결과 콘텐츠 준비도를 살펴봅니다.',detail:'SEO · GEO · AEO · 네이버 최적화'},
  {kind:'citation',title:'브랜드 언급·출처',description:'브랜드 언급과 출처 인용을 구분하고, 고객 질문별 답변과 연결된 페이지를 대조합니다.',detail:'질문별 관측 · 답변 검토 · 출처 목록'},
  {kind:'competition',title:'경쟁사 비교',description:'같은 검색어에서 찾은 후보의 위치와 메시지를 비교하고, 자사에 보완할 정보를 찾습니다.',detail:'포지셔닝 · 원문 비교 · 선택 정보'},
  {kind:'rewrite',title:'문구 개선',description:'반복 표현과 추상적인 주장을 실제 URL의 근거에 맞춰 다듬습니다. 수정 위치와 실행 방법도 함께 확인합니다.',detail:'반복어 조정 · TO-BE · 수정 가이드'},
  {kind:'action',title:'실행 우선순위',description:'우선순위·실행 일정을 정하고, 적용 후 확인할 KPI와 재진단 결과를 연결합니다.',detail:'실행 목록 · 목표 설정 · 이전 관측 비교'},
  {kind:'diagnosis',title:'전환 흐름·UX',description:'첫인상·CTA·카피·신뢰·전환·광고·모바일·SEO의 8개 기본 영역을 함께 점검합니다.',detail:'8개 기본 진단 · 전환 흐름 · 체크리스트'},
] as const;

/** Scalable diagrams stay legible in the compact two-column mobile grid. */
function FeatureGraphic({kind}:{kind:typeof features[number]['kind']}) {
  return <div className="scanner-common-graphic" aria-hidden="true"><svg viewBox="0 0 200 96" fill="none">
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {kind==='search'?<><rect x="18" y="17" width="48" height="62" rx="7" fill="white"/><path d="M29 32h26M29 44h26M29 56h17M76 48h20m-6-5 6 5-6 5"/><rect x="108" y="14" width="74" height="30" rx="7" fill="white"/><rect x="108" y="52" width="74" height="30" rx="7" fill="white"/></>:
      kind==='citation'?<><path d="M20 18h115a7 7 0 0 1 7 7v34a7 7 0 0 1-7 7H52L34 78V66H20a7 7 0 0 1-7-7V25a7 7 0 0 1 7-7Z" fill="white"/><path d="M29 32h44M29 43h26"/><rect x="80" y="31" width="48" height="23" rx="5" fill="currentColor" fillOpacity=".1" stroke="none"/><rect x="126" y="58" width="62" height="28" rx="7" fill="white"/></>:
      kind==='competition'?<><path d="M24 16v65h151M25 47h150M100 16v65" opacity=".3"/><circle cx="55" cy="34" r="12" fill="currentColor" fillOpacity=".15"/><circle cx="107" cy="58" r="19" fill="currentColor"/><circle cx="157" cy="28" r="14" fill="currentColor" fillOpacity=".3"/></>:
      kind==='rewrite'?<><rect x="10" y="22" width="72" height="52" rx="8" fill="white"/><rect x="118" y="22" width="72" height="52" rx="8" fill="white"/><path d="M90 48h20m-6-5 6 5-6 5M22 62h47"/><path d="M131 62h46" strokeWidth="4" opacity=".3"/></>:
      kind==='action'?<><path d="M49 37h32M119 37h32" opacity=".4"/>{[30,100,170].map((x,i)=><circle key={x} cx={x} cy="37" r="19" fill={i===2?'currentColor':'white'}/>)}</>:
      <><path d="m100 12 27 10 12 26-12 25-27 11-27-11-12-25 12-26Z" opacity=".3"/><path d="m100 12 14 23 25 13-22 14-17 22-17-22-22-14 25-13Z" fill="currentColor" fillOpacity=".12"/>{[[100,12],[127,22],[139,48],[127,73],[100,84],[73,73],[61,48],[73,22]].map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="currentColor"/>)}<circle cx="100" cy="48" r="16" fill="white"/></>}
    </g>
    <g fill="currentColor" fontSize="19" fontWeight="700" textAnchor="middle" dominantBaseline="central">
      {kind==='search'?<><text x="145" y="30">SEO</text><text x="145" y="68">AI</text></>:
      kind==='citation'?<><text x="104" y="43" fontSize="16">언급</text><text x="157" y="73" fontSize="16">출처</text></>:
      kind==='competition'?<text x="107" y="58" fill="white" fontSize="15">우리</text>:
      kind==='rewrite'?<><text x="46" y="44" fontSize="17">기존</text><text x="154" y="44" fontSize="17">개선</text></>:
      kind==='action'?<>{[30,100,170].map((x,i)=><g key={x}><text x={x} y="38" fill={i===2?'white':'currentColor'} fontSize="17">0{i+1}</text><text x={x} y="76" fontSize="16">{['확인','수정','측정'][i]}</text></g>)}</>:
      <text x="100" y="49">8</text>}
    </g>
  </svg></div>;
}

export default function LandingReportFeatures() {
  return <section id="scanner-report-features" className="scanner-report-features scanner-common-examples" aria-labelledby="scanner-features-heading">
    <div className="scanner-features-heading"><h2 id="scanner-features-heading" className="scanner-example-title"><span>공통 적용</span> 예시</h2></div>
    <div className="scanner-feature-grid">{features.map(feature=><article key={feature.kind} className="scanner-feature-card" data-kind={feature.kind}>
      <FeatureGraphic kind={feature.kind}/><h3>{feature.title}</h3>
      <details className="reading-fold feature-reading"><summary className="reading-summary"><span className="sr-only">{feature.title} 설명</span><ReadingToggle/></summary>
        <p className="scanner-feature-description">{feature.description}</p><p className="scanner-feature-detail">{feature.detail}</p>
      </details>
    </article>)}</div>
    <details className="scanner-common-result">
      <summary><span>진단 결과 화면 보기</span><ReadingToggle/></summary>
      <div className="scanner-gate-preview"><LivePreviewCard/></div>
    </details>
  </section>;
}
