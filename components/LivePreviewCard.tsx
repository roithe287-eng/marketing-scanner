"use client";
import {useId, useState, type CSSProperties} from 'react';
import DiagnosisIcon from '@/components/report/DiagnosisIcon';
import {diagnosisAxes} from '@/lib/diagnosisVisuals';
import DiagnosisRadarGraphic from '@/components/DiagnosisRadarGraphic';

const views = [
  {key:'overview',label:'진단 그래프',icon:'firstView'},
  {key:'ai',label:'검색·AI',icon:'seo'},
  {key:'competition',label:'경쟁사',icon:'conversionFlow'},
  {key:'rewrite',label:'수정·실행',icon:'copywriting'},
] as const;
type PreviewView = typeof views[number]['key'];
const exampleScores = [78,48,64,84,52,61,88,70];
const average = Math.round(exampleScores.reduce((sum,value)=>sum+value,0)/exampleScores.length);
const highest = exampleScores.indexOf(Math.max(...exampleScores));
const lowest = exampleScores.indexOf(Math.min(...exampleScores));

function ScoreRing({score,color,label}:{score:number;color:string;label:string}) {
  const circumference=2*Math.PI*40;
  return <svg className="scanner-focus-ring" viewBox="0 0 100 100" role="img" aria-label={`${label} ${score}점 · 예시`}>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#e7ecf3" strokeWidth="6"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${circumference*score/100} ${circumference}`} transform="rotate(-90 50 50)"/>
    <text x="50" y="49" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="800" fill="#192536">{score}</text>
    <text x="50" y="69" textAnchor="middle" fontSize="10" fill="#647084">/ 100</text>
  </svg>;
}

function ReportPreview() {
  const [selected,setSelected] = useState(1);
  const axis = diagnosisAxes[selected];
  const insightId = useId();
  return <div className="scanner-radar-preview">
    <div className="scanner-radar-caption"><strong>커머스 분석 예시</strong><span>8개 축 · 예시 점수</span></div>
    <div className="scanner-radar-layout">
      <div className="scanner-radar-plot">
        <DiagnosisRadarGraphic scores={exampleScores} selected={selected} example />
        <dl className="scanner-radar-snapshot">
          <div><dt>평균 점수</dt><dd>{average}<small>점</small></dd></div>
          <div><dt>가장 높은 영역</dt><dd><span>{diagnosisAxes[highest].short}</span>{exampleScores[highest]}<small>점</small></dd></div>
          <div><dt>가장 낮은 영역</dt><dd><span>{diagnosisAxes[lowest].short}</span>{exampleScores[lowest]}<small>점</small></dd></div>
        </dl>
      </div>
      <div className="scanner-radar-focus" id={insightId} aria-live="polite" style={{'--focus-color':axis.color} as CSSProperties}>
        <div className="scanner-focus-heading"><ScoreRing score={exampleScores[selected]} color={axis.color} label={axis.label}/><div><span>선택한 영역</span><h3><DiagnosisIcon axis={axis.key}/>{axis.label}</h3></div></div>
        <ol className="scanner-focus-steps">
          <li><span>01</span><div><strong>이렇게 확인</strong><p>{axis.check}</p></div></li>
          <li><span>02</span><div><strong>이렇게 개선</strong><p>{axis.action}</p></div></li>
        </ol>
      </div>
    </div>
    <div className="scanner-radar-controls" role="group" aria-label="커머스 분석 예시 영역 선택">{diagnosisAxes.map((a,i)=><button type="button" key={a.key} aria-pressed={i===selected} aria-controls={insightId} onClick={()=>setSelected(i)} style={{'--axis-color':a.color,'--axis-surface':a.surface} as CSSProperties}>
      <span><DiagnosisIcon axis={a.key}/>{a.short}<b>{exampleScores[i]}<small>점</small></b></span><i aria-hidden="true"><i style={{width:`${exampleScores[i]}%`}}/></i>
    </button>)}</div>
    <div className="scanner-preview-journey"><span>진단 이후에도</span><div><DiagnosisIcon axis="seo"/>검색·AI</div><i aria-hidden="true">→</i><div><DiagnosisIcon axis="conversionFlow"/>경쟁사</div><i aria-hidden="true">→</i><div><DiagnosisIcon axis="copywriting"/>개선안·KPI</div></div>
  </div>;
}

function AiPreview() {
  return <div className="scanner-ai-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">GEO / AEO · AI 답변 속 우리 브랜드</p>
    <h3>언급됐는지, 출처로 쓰였는지.</h3>
    <p className="scanner-panel-description">페이지 준비도와 실제 답변 관측을 구분합니다.</p>
    <div className="scanner-demo-layout">
      <div className="scanner-ai-answer">
        <div className="scanner-ai-question"><span>고객의 질문 예시</span><p>“우리 업종에 맞는 서비스를 추천해 줘.”</p></div>
        <div className="scanner-answer-sheet" aria-label="AI 답변 예시 · 브랜드 이름 언급, 자사 출처 인용은 미확인">
          <span><DiagnosisIcon axis="seo"/>AI 답변 예시</span>
          <div className="scanner-answer-lines" aria-hidden="true"><i/><i/><div><i/><mark>브랜드 이름</mark><i/></div><i/><i/></div>
          <div className="scanner-answer-sources"><span>브랜드 언급</span><span>자사 출처 미확인</span></div>
        </div>
      </div>
      <div className="scanner-ai-reading">
        <div className="scanner-ai-observations">
          <div><span className="scanner-ai-symbol"><DiagnosisIcon axis="firstView"/></span><div><div className="scanner-ai-observation-title"><strong>브랜드 언급</strong><b>언급 예시</b></div><p>답변에 이름이 등장했는가</p></div></div>
          <div><span className="scanner-ai-symbol"><DiagnosisIcon axis="conversionFlow"/></span><div><div className="scanner-ai-observation-title"><strong>자사 출처 인용</strong><b data-state="missing">미확인 예시</b></div><p>우리 URL이 근거로 연결됐는가</p></div></div>
        </div>
        <div className="scanner-panel-takeaway"><span>다음 행동</span><p>질문에 바로 답하는 문장과 확인 가능한 근거를 보강합니다.</p></div>
      </div>
    </div>
  </div>;
}

function CompetitionPreview() {
  return <div className="scanner-competition-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">COMPETITION · 같은 검색어, 다른 강점</p>
    <h3>경쟁사 사이, 우리 위치는?</h3>
    <p className="scanner-panel-description">대표 검색어의 네이버 API 검색 결과에서 대형몰 등을 제외한 비교 후보를 살펴봅니다.</p>
    <div className="scanner-demo-layout scanner-competition-layout">
      <div>
        <div className="scanner-mini-map" role="img" aria-label="경쟁사 포지셔닝 예시. 가로축은 검색어 연결도, 세로축은 선택 정보 범위, 원의 크기는 확인된 정보 단서 수입니다. 예시 A, B와 우리 사이트를 비교합니다.">
          <div className="scanner-map-y" aria-hidden="true">선택 정보 범위 <span>↑</span></div>
          <div className="scanner-map-field" aria-hidden="true"><span className="scanner-map-bubble" data-site="a">예시 A</span><span className="scanner-map-bubble" data-site="own">우리 사이트</span><span className="scanner-map-bubble" data-site="b">예시 B</span></div>
          <div className="scanner-map-x" aria-hidden="true">검색어 연결도 <span>→</span></div>
        </div>
        <div className="scanner-map-sites" aria-hidden="true"><span data-site="a">예시 A</span><span data-site="own">우리 사이트</span><span data-site="b">예시 B</span></div>
      </div>
      <dl className="scanner-map-guide">
        <div><dt><span>X</span>검색어 연결도</dt><dd>대표 검색어와 연결되는 정보</dd></div>
        <div><dt><span>Y</span>선택 정보 범위</dt><dd>선택·이용을 판단할 근거</dd></div>
        <div><dt><span className="scanner-map-size" aria-hidden="true"/>원의 크기</dt><dd>확인된 정보 단서가 많을수록 큰 원</dd></div>
      </dl>
    </div>
  </div>;
}

function RewritePreview() {
  return <div className="scanner-copy-demo scanner-preview-demo">
    <p className="scanner-panel-eyebrow">TO-BE · 원문에서 실행까지</p>
    <h3>무엇을, 어디서, 어떻게 바꿀지.</h3>
    <div className="scanner-demo-flow"><span>고객</span><span>제공 범위</span><span>확인 가능한 근거</span></div>
    <div className="scanner-rewrite-layout">
      <div className="scanner-demo-before"><span>AS-IS · 추상적인 표현</span><p>최고의 서비스로 성공을 함께합니다.</p></div>
      <span className="scanner-rewrite-arrow" aria-hidden="true">→</span>
      <div className="scanner-demo-after"><span>TO-BE · 사실을 채울 작성 틀</span><p><mark>[고객 유형]</mark>을 위한 <mark>[서비스 범위]</mark>를 제공합니다. <mark>[확인 가능한 사례]</mark>에서 진행 내용을 확인하세요.</p></div>
    </div>
    <div className="scanner-rewrite-location"><div className="scanner-location-wireframe" aria-hidden="true"><i/><span/><b/><i/></div><div><span>수정 위치</span><strong>첫 화면의 제목 아래 소개 문장</strong></div></div>
  </div>;
}

/** All panels are illustrative, not a diagnosis or a live integration status. */
export default function LivePreviewCard() {
  const [view,setView] = useState<PreviewView>('overview');
  const panelId = useId();
  return <aside id="scanner-result-preview" className="scanner-preview scanner-preview--expanded" aria-label="진단 결과 미리보기 · 예시 데이터">
    <div className="scanner-preview-heading"><div><p>YOUR MARKETING MAP</p><h2>우리 사이트를 읽는 입체적인 시선</h2></div><span>결과 예시</span></div>
    <div className="scanner-preview-tabs" role="group" aria-label="결과 미리보기 선택">
      {views.map(item => <button key={item.key} type="button" aria-pressed={view===item.key} aria-controls={panelId} onClick={() => setView(item.key)}><DiagnosisIcon axis={item.icon}/><span>{item.label}</span></button>)}
    </div>
    <div className="scanner-preview-content" id={panelId} aria-label={`${views.find(item=>item.key===view)?.label} 미리보기`}>
      {view==='overview'?<ReportPreview/>:view==='ai'?<AiPreview/>:view==='competition'?<CompetitionPreview/>:<RewritePreview/>}
    </div>
  </aside>;
}
