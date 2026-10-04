"use client";
import {useId, useState, type CSSProperties} from 'react';
import {diagnosisAxes, radarPoint} from '@/lib/diagnosisVisuals';

const scores = [60, 70, 60, 50, 65, 60, 80, 65];
const views = [{key:'overview',label:'8개 진단'}, {key:'ai',label:'AI 노출'}, {key:'competition',label:'경쟁사'}, {key:'rewrite',label:'TO-BE'}] as const;
type PreviewView = typeof views[number]['key'];
const points = (values:readonly number[]) => values.map((v,i) => {
  const p = radarPoint(i,v,200,200,153);
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}).join(' ');

function RadarPreview() {
  const gradientId = useId();
  return <>
    <div className="scanner-radar-stage" role="img" aria-label="8개 진단 예시: 첫인상 60, CTA 70, 카피 60, 신뢰 50, 전환 65, 광고 60, 모바일 80, SEO 65점. 평균 64점. 100점 기준으로 바깥쪽일수록 높습니다.">
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1745d1" stopOpacity=".34"/><stop offset="1" stopColor="#47bdd5" stopOpacity=".12"/></linearGradient></defs>
        {[100,75,50,25].map(level => <polygon key={level} points={points(Array(8).fill(level))} fill={level===100?'#edf5fc':'none'} stroke="#b0c3dc" strokeWidth={level===100?'1.5':'1'}/>)}
        {diagnosisAxes.map((axis,i) => {const p=radarPoint(i,100,200,200,153);return <line key={axis.key} x1="200" y1="200" x2={p.x} y2={p.y} stroke="#b0c3dc"/>;})}
        <polygon points={points(scores)} fill={`url(#${gradientId})`} stroke="#1745d1" strokeWidth="3" strokeLinejoin="round"/>
        {diagnosisAxes.map((axis,i) => {const p=radarPoint(i,scores[i],200,200,153);return <circle key={axis.key} cx={p.x} cy={p.y} r="5" fill={axis.color} stroke="white" strokeWidth="2"/>;})}
      </svg>
      {diagnosisAxes.map((axis,i) => <div key={axis.key} className="scanner-radar-label" data-axis={i} style={{'--axis-color':axis.color,'--axis-surface':axis.surface} as CSSProperties} aria-hidden="true"><span>{axis.short}</span><strong>{scores[i]}</strong></div>)}
      <div className="scanner-radar-average" aria-hidden="true"><strong>64<small>/100</small></strong><span>8영역 평균</span></div>
    </div>
    <p className="scanner-radar-key">바깥쪽일수록 높은 점수 <span>· 100점 기준</span></p>
    <div className="scanner-preview-insight"><span>예시 · 먼저 검토할 곳</span><p><strong>신뢰 요소</strong> 실제 사례·후기를 핵심 주장 가까이에.</p></div>
  </>;
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
    <div className="scanner-preview-heading"><div><p>YOUR NEXT MOVE</p><h2>우리 사이트의 다음 한 수</h2></div><span>예시 데이터</span></div>
    <div className="scanner-preview-tabs" role="group" aria-label="결과 미리보기 선택">
      {views.map(item => <button key={item.key} type="button" aria-pressed={view===item.key} aria-controls={panelId} onClick={() => setView(item.key)}>{item.label}</button>)}
    </div>
    <div className="scanner-preview-content" id={panelId} aria-label={`${views.find(item=>item.key===view)?.label} 미리보기`}>
      <div className="scanner-preview-panel" inert={view!=='overview'} data-active={view==='overview'}><RadarPreview/></div>
      <div className="scanner-preview-panel" inert={view!=='ai'} data-active={view==='ai'}><AiPreview/></div>
      <div className="scanner-preview-panel" inert={view!=='competition'} data-active={view==='competition'}><CompetitionPreview/></div>
      <div className="scanner-preview-panel" inert={view!=='rewrite'} data-active={view==='rewrite'}><RewritePreview/></div>
    </div>
    <div className="scanner-preview-footer"><span>결과 미리보기 · 4가지 보기</span><small>실제 분석 결과가 아닌 예시입니다.</small></div>
  </aside>;
}
