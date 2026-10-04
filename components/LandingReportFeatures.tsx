import {diagnosisAxes} from '@/lib/diagnosisVisuals';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';

const features = [
  {kind:'diagnosis',eyebrow:'01 / DIAGNOSIS',title:'8개 영역, 강점과 개선점',description:'첫인상·CTA·카피·신뢰부터 전환·광고·모바일·SEO까지 짚습니다.',detail:'영역별 점수 · 개선 우선순위'},
  {kind:'search',eyebrow:'02 / SEARCH & AI',title:'검색과 AI가 읽는 구조',description:'네이버·구글 검색과 AI 답변에 필요한 페이지 구조와 정보 근거를 점검합니다.',detail:'SEO · GEO · AEO 준비도'},
  {kind:'citation',eyebrow:'03 / BRAND VISIBILITY',title:'AI 답변에 등장하는 방식',description:'브랜드 이름의 언급과 우리 사이트의 출처 인용을 나누어 확인합니다.',detail:'질문별 관측 · 출처 확인'},
  {kind:'competition',eyebrow:'04 / COMPETITION',title:'경쟁사와 다른 우리의 위치',description:'같은 검색어의 비교 후보를 살펴보고, 부족한 선택 정보를 찾습니다.',detail:'포지셔닝 · 메시지 비교'},
  {kind:'rewrite',eyebrow:'05 / BEFORE → AFTER',title:'원문 옆, 따라 할 개선안',description:'반복 표현과 추상적인 문구를 어떻게 바꿀지, 수정 위치와 순서까지 제안합니다.',detail:'URL 근거 · TO-BE 작성 틀'},
  {kind:'action',eyebrow:'06 / NEXT ACTION',title:'실행 순서와 확인할 KPI',description:'먼저 할 일과 다음 할 일을 정하고, 적용 후 확인할 지표를 연결합니다.',detail:'실행 로드맵 · 목표 설정 · 재측정'},
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
    <div className="scanner-features-heading"><div><p>BEYOND THE SCORE</p><h2 id="scanner-features-heading">점수 다음에, <em>바꿀 방법까지.</em></h2></div><p>8개 진단은 시작입니다.<br/>발견부터 비교, 수정과 실행까지 이어집니다.</p></div>
    <div className="scanner-feature-grid">{features.map(feature=><article key={feature.kind} className="scanner-feature-card" data-kind={feature.kind}>
      <FeatureGraphic kind={feature.kind}/>
      <p className="scanner-feature-eyebrow">{feature.eyebrow}</p><h3>{feature.title}</h3><p className="scanner-feature-description">{feature.description}</p><p className="scanner-feature-detail">{feature.detail}</p>
    </article>)}</div>
    <p className="scanner-feature-availability">수집된 정보·연동 상태·이용 권한에 따라 제공 항목이 달라집니다. KPI는 성과 예측이나 보장이 아닌 목표 설정·검증을 위한 지표입니다.</p>
  </section>;
}
