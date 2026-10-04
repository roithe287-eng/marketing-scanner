"use client";
import {useId, useState, type CSSProperties} from 'react';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';
import {diagnosisAxes, radarPoint} from '@/lib/diagnosisVisuals';

const views = [{key:'overview',label:'진단 그래프'}, {key:'ai',label:'검색·AI'}, {key:'competition',label:'경쟁사'}, {key:'rewrite',label:'수정·실행'}] as const;
type PreviewView = typeof views[number]['key'];

const exampleScores = [78,48,64,84,52,61,88,70];
const exampleAverage = Math.round(exampleScores.reduce((sum, score) => sum + score, 0) / exampleScores.length);
const previewPoint = (index:number, value:number) => radarPoint(index,value,240,150,103);
const previewPolygon = (level?:number) => diagnosisAxes.map((_,i) => {
  const point = previewPoint(i,level ?? exampleScores[i]);
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}).join(' ');
const labelPositions = [[240,19],[363,63],[423,151],[363,239],[240,283],[117,239],[57,151],[117,63]];

function ReportPreview() {
  const [selected,setSelected] = useState(1);
  const axis = diagnosisAxes[selected];
  const edge = previewPoint(selected,100);
  const insightId = useId();
  return <div className="scanner-radar-preview">
    <div className="scanner-radar-caption"><strong>강점과 빈틈이 한눈에</strong><span>8개 축 · 예시 점수</span></div>
    <svg className="scanner-landing-radar" viewBox="0 0 480 306" role="img" aria-label={`8개 영역 진단 예시. 평균 ${exampleAverage}점. ${diagnosisAxes.map((a,i)=>`${a.label} ${exampleScores[i]}점`).join(', ')}. 바깥쪽이 100점입니다.`}>
      <polygon points={previewPolygon(100)} fill="#edf3ff"/>
      {[25,50,75,100].map(level=><polygon key={level} points={previewPolygon(level)} fill="none" stroke="#b7c8e5" strokeWidth="1"/>)}
      {diagnosisAxes.map((a,i)=>{const p=previewPoint(i,100);return <line key={a.key} x1="240" y1="150" x2={p.x} y2={p.y} stroke="#c4d2e8"/>;})}
      <line x1="240" y1="150" x2={edge.x} y2={edge.y} stroke={axis.color} strokeWidth="20" opacity=".12"/>
      <polygon points={previewPolygon()} fill="#1745d1" fillOpacity=".22" stroke="#1745d1" strokeWidth="3" strokeLinejoin="round"/>
      {diagnosisAxes.map((a,i)=>{const p=previewPoint(i,exampleScores[i]);const [x,y]=labelPositions[i];return <g key={a.key}>
        <circle cx={p.x} cy={p.y} r={i===selected?7:5} fill={a.color} stroke="white" strokeWidth="2"/>
        <rect x={x-43} y={y-15} width="86" height="30" rx="10" fill={a.surface} stroke={i===selected?a.color:'transparent'} strokeWidth="2"/>
        <text x={x} y={y+6} textAnchor="middle" fill={a.color} fontSize="18" fontWeight="750">{a.short}</text>
      </g>;})}
      <circle cx="240" cy="150" r="37" fill="white" stroke="#cedaef"/>
      <text className="scanner-radar-average" x="240" y="146" textAnchor="middle" fontSize="28" fontWeight="850" fill="#192a4d">{exampleAverage}</text>
      <text className="scanner-radar-average-note" x="240" y="174" textAnchor="middle" fontSize="12" fontWeight="650" fill="#526078">평균 · 예시</text>
    </svg>
    <div className="scanner-radar-controls" role="group" aria-label="예시 진단 영역 선택">{diagnosisAxes.map((a,i)=><button type="button" key={a.key} aria-pressed={i===selected} aria-controls={insightId} onClick={()=>setSelected(i)} style={{'--axis-color':a.color,'--axis-surface':a.surface} as CSSProperties}>
      <span><DiagnosisIcon axis={a.key}/>{a.short}<b>{exampleScores[i]}</b></span><i aria-hidden="true"><i style={{width:`${exampleScores[i]}%`}}/></i>
    </button>)}</div>
    <div className="scanner-radar-guidance" id={insightId} aria-live="polite"><strong>{axis.label} · 이렇게 개선</strong><p>{axis.action}</p></div>
    <p className="scanner-radar-extension">진단 이후에도 <strong>검색·AI → 경쟁사 → 개선안·KPI</strong></p>
  </div>;
}

function AiPreview() {
  return <div className="scanner-ai-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">GEO / AEO · AI 답변 속 우리 브랜드</p>
    <h3>언급됐는지, 출처로 쓰였는지.</h3>
    <p className="scanner-panel-description">페이지 준비도와 실제 답변 관측을 구분합니다.</p>
    <div className="scanner-ai-question"><span>고객의 질문 예시</span><p>“우리 업종에 맞는 서비스를 추천해 줘.”</p></div>
    <div className="scanner-ai-observations">
      <div><span className="scanner-ai-symbol" aria-hidden="true">Aa</span><div><div className="scanner-ai-observation-title"><strong>브랜드 언급</strong><b>언급 예시</b></div><p>답변에 이름이 등장했는가</p></div></div>
      <div><span className="scanner-ai-symbol" aria-hidden="true">↗</span><div><div className="scanner-ai-observation-title"><strong>자사 출처 인용</strong><b data-state="missing">미확인 예시</b></div><p>우리 URL이 근거로 연결됐는가</p></div></div>
    </div>
    <div className="scanner-panel-takeaway"><span>다음 행동</span><p>질문에 바로 답하는 문장과 확인 가능한 근거를 보강합니다.</p></div>
    <p className="scanner-demo-note">실제 관측은 질문·시점·AI 응답과 연결 상태에 따라 달라집니다.</p>
  </div>;
}

function CompetitionPreview() {
  return <div className="scanner-competition-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">COMPETITION · 같은 검색어, 다른 강점</p>
    <h3>경쟁사 사이, 우리 위치는?</h3>
    <p className="scanner-panel-description">대표 검색어의 네이버 API 검색 결과에서 대형몰 등을 제외한 비교 후보를 살펴봅니다.</p>
    <div className="scanner-mini-map" role="img" aria-label="경쟁사 포지셔닝 예시. 가로축은 검색어 연결도, 세로축은 선택 정보 범위, 원의 크기는 확인된 정보 단서 수입니다. 예시 A, B와 우리 사이트를 비교합니다.">
      <div className="scanner-map-y" aria-hidden="true">선택 정보 범위 <span>↑</span></div>
      <div className="scanner-map-field" aria-hidden="true"><span className="scanner-map-bubble" data-site="a">예시 A</span><span className="scanner-map-bubble" data-site="own">우리 사이트</span><span className="scanner-map-bubble" data-site="b">예시 B</span></div>
      <div className="scanner-map-x" aria-hidden="true">검색어 연결도 <span>→</span></div>
    </div>
    <p className="scanner-map-legend"><i aria-hidden="true"/> 원이 클수록 확인된 정보 단서가 많음</p>
    <p className="scanner-demo-note">배치와 크기는 예시입니다. 검색어 연결도는 제목·설명과의 연결, 선택 정보 범위는 확인된 정보의 종류를 뜻합니다. 검색 순위·매출·시장점유율이 아닙니다.</p>
  </div>;
}

function RewritePreview() {
  return <div className="scanner-copy-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">TO-BE · 원문에서 실행까지</p>
    <h3>무엇을, 어디서, 어떻게 바꿀지.</h3>
    <div className="scanner-demo-before"><span>AS-IS · 추상적인 표현</span><p>최고의 서비스로 성공을 함께합니다.</p></div>
    <div className="scanner-demo-flow"><span>고객</span><span>제공 범위</span><span>확인 가능한 근거</span></div>
    <div className="scanner-demo-after"><span>TO-BE · 사실을 채울 작성 틀</span><p><mark>[고객 유형]</mark>을 위한 <mark>[서비스 범위]</mark>를 제공합니다. <mark>[확인 가능한 사례]</mark>에서 진행 내용을 확인하세요.</p></div>
    <div className="scanner-rewrite-location"><span>수정 위치</span><strong>첫 화면의 제목 아래 소개 문장</strong></div>
    <p className="scanner-demo-note">실제 결과에는 수집된 URL의 원문 근거와 단계별 실행 안내가 함께 나옵니다. 확인되지 않은 사실은 직접 채워 주세요.</p>
  </div>;
}

/** All panels are illustrative, not a diagnosis or a live integration status. */
export default function LivePreviewCard() {
  const [view,setView] = useState<PreviewView>('overview');
  const panelId = useId();
  return <aside className="scanner-preview" aria-label="진단 결과 미리보기 · 예시 데이터">
    <div className="scanner-preview-heading"><div><p>YOUR MARKETING MAP</p><h2>우리 사이트를 읽는 입체적인 시선</h2></div><span>결과 예시</span></div>
    <div className="scanner-preview-tabs" role="group" aria-label="결과 미리보기 선택">
      {views.map(item => <button key={item.key} type="button" aria-pressed={view===item.key} aria-controls={panelId} onClick={() => setView(item.key)}>{item.label}</button>)}
    </div>
    <div className="scanner-preview-content" id={panelId} aria-label={`${views.find(item=>item.key===view)?.label} 미리보기`}>
      {view==='overview'?<ReportPreview/>:view==='ai'?<AiPreview/>:view==='competition'?<CompetitionPreview/>:<RewritePreview/>}
    </div>
    <div className="scanner-preview-footer"><small>실제 분석 결과가 아닌 구성·데이터 예시입니다.</small></div>
  </aside>;
}
