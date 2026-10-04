import {diagnosisAxes} from '@/lib/diagnosisVisuals';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';

const features = [
  {kind:'search',eyebrow:'01 / SEARCH & AI',title:'어디서 발견될 수 있을까?',description:'네이버·구글 검색과 AI 답변에 필요한 페이지 구조, 키워드 연결과 콘텐츠 준비도를 살펴봅니다.',detail:'SEO · GEO · AEO · 네이버 최적화'},
  {kind:'citation',eyebrow:'02 / BRAND VISIBILITY',title:'AI는 우리를 어떻게 말할까?',description:'브랜드 언급과 출처 인용을 구분하고, 고객 질문별 답변과 연결된 페이지를 대조합니다.',detail:'질문별 관측 · 답변 검토 · 출처 목록'},
  {kind:'competition',eyebrow:'03 / COMPETITION',title:'비교할 때 무엇이 다를까?',description:'같은 검색어에서 찾은 후보의 위치와 메시지를 비교하고, 자사에 보완할 정보를 찾습니다.',detail:'포지셔닝 · 원문 비교 · 선택 정보'},
  {kind:'rewrite',eyebrow:'04 / BEFORE → AFTER',title:'어떤 문장을 바꾸면 좋을까?',description:'반복 표현과 추상적인 주장을 실제 URL의 근거에 맞춰 다듬습니다. 수정 위치와 실행 방법도 함께 확인합니다.',detail:'반복어 조정 · TO-BE · 수정 가이드'},
  {kind:'action',eyebrow:'05 / NEXT ACTION',title:'오늘 시작할 일은 무엇일까?',description:'우선순위·실행 일정을 정하고, 적용 후 확인할 KPI와 재진단 결과를 연결합니다.',detail:'실행 목록 · 목표 설정 · 이전 관측 비교'},
  {kind:'diagnosis',eyebrow:'06 / SITE EXPERIENCE',title:'고객은 어디에서 망설일까?',description:'첫인상·CTA·카피·신뢰·전환·광고·모바일·SEO의 8개 기본 영역을 함께 점검합니다.',detail:'8개 기본 진단 · 전환 흐름 · 체크리스트'},
] as const;

function FeatureGraphic({kind}:{kind:typeof features[number]['kind']}) {
  if(kind==='diagnosis') return <div className="scanner-feature-axes" aria-hidden="true">{diagnosisAxes.map(axis=><span key={axis.key} style={{background:axis.surface,color:axis.color}}><DiagnosisIcon axis={axis.key}/></span>)}</div>;
  if(kind==='search') return <div className="scanner-feature-search" aria-hidden="true"><span className="scanner-feature-page"><i/><i/><i/></span><span className="scanner-feature-connector">→</span><div><b>검색 SEO</b><b>AI · GEO / AEO</b></div></div>;
  if(kind==='citation') return <div className="scanner-feature-citation" aria-hidden="true"><div><i/><i/><span>브랜드 이름 <b>언급</b></span></div><span className="scanner-feature-source">↗ 우리 URL <b>출처</b></span></div>;
  if(kind==='competition') return <div className="scanner-feature-position" aria-hidden="true"><i/><i/><i/><span>검색어 × 선택 정보</span></div>;
  if(kind==='rewrite') return <div className="scanner-feature-rewrite" aria-hidden="true"><span>막연한 주장</span><b>→</b><strong>고객 + 범위 + 근거</strong></div>;
  return <div className="scanner-feature-roadmap" aria-hidden="true"><span><b>01</b>먼저</span><i/><span><b>02</b>다음</span><i/><span><b>↗</b>재측정</span></div>;
}

export default function LandingReportFeatures() {
  return <section id="scanner-report-features" className="scanner-report-features" aria-labelledby="scanner-features-heading">
    <div className="scanner-features-heading"><div><p>FROM SIGNALS TO ACTION</p><h2 id="scanner-features-heading">우리 사이트를 읽는 <em>더 넓은 시선.</em></h2></div><p>한 번의 진단에서 만나는 여러 관점.<br/>각 결과를 실제로 바꿀 일에 연결합니다.</p></div>
    <div className="scanner-feature-grid">{features.map(feature=><article key={feature.kind} className="scanner-feature-card" data-kind={feature.kind}>
      <FeatureGraphic kind={feature.kind}/>
      <p className="scanner-feature-eyebrow">{feature.eyebrow}</p><h3>{feature.title}</h3><p className="scanner-feature-description">{feature.description}</p><p className="scanner-feature-detail">{feature.detail}</p>
    </article>)}</div>
    <p className="scanner-feature-availability">수집된 정보·연동 상태·이용 권한에 따라 제공 항목이 달라집니다. KPI는 성과 예측이나 보장이 아닌 목표 설정·검증을 위한 지표입니다.</p>
  </section>;
}
