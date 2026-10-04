"use client";
import {useState} from 'react';
import {diagnosisAxes,radarPoint} from '@/lib/diagnosisVisuals';

const scores=[60,70,60,50,65,60,80,65];
const points=(values:readonly number[],radius=128)=>values.map((v,i)=>{const p=radarPoint(i,v,230,214,radius);return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;}).join(' ');

/** Explicitly illustrative data. Never represent this preview as a visitor's diagnosis. */
export default function LivePreviewCard() {
  const [view,setView]=useState<'overview'|'rewrite'>('overview');
  return <aside className="scanner-preview" aria-label="진단 결과 미리보기 · 예시 데이터">
    <div className="scanner-preview-heading"><div><p>YOUR NEXT MOVE</p><h2>우리 사이트의 다음 한 수</h2></div><span>예시 데이터</span></div>
    <div className="scanner-preview-tabs" role="group" aria-label="결과 미리보기 선택">
      <button type="button" aria-pressed={view==='overview'} onClick={()=>setView('overview')}>8개 영역 진단</button>
      <button type="button" aria-pressed={view==='rewrite'} onClick={()=>setView('rewrite')}>문구 수정 예시</button>
    </div>
    <div className="scanner-preview-content">
      {view==='overview'?<>
        <svg className="scanner-preview-radar" viewBox="0 0 460 428" role="img" aria-labelledby="preview-radar-title preview-radar-desc">
          <title id="preview-radar-title">8개 영역 진단 예시</title><desc id="preview-radar-desc">실제 분석 결과가 아닙니다. 첫인상 60, CTA 70, 카피 60, 신뢰 50, 전환 65, 광고 60, 모바일 80, SEO 65점인 예시입니다.</desc>
          {[100,75,50,25].map(level=><polygon key={level} points={points(Array(8).fill(level))} fill={level===100?'#E6F4FA':'none'} stroke="#A5BCD7" strokeWidth="1"/>)}
          {diagnosisAxes.map((a,i)=>{const p=radarPoint(i,100,230,214,128);return <line key={a.key} x1="230" y1="214" x2={p.x} y2={p.y} stroke="#A5BCD7"/>;})}
          <polygon points={points(scores)} fill="#1745D1" fillOpacity=".18" stroke="#1745D1" strokeWidth="2"/>
          {diagnosisAxes.map((axis,i)=>{const p=radarPoint(i,scores[i],230,214,128),label=radarPoint(i,100,230,214,179);return <g key={axis.key}>
            <circle cx={p.x} cy={p.y} r="4" fill={axis.color} stroke="white" strokeWidth="2"/>
            <rect x={label.x-34} y={label.y-25} width="68" height="50" rx="9" fill={axis.surface} stroke={axis.color} strokeOpacity=".35"/>
            <text x={label.x} y={label.y-5} textAnchor="middle" fontSize="16" fill="#263953">{axis.short}</text>
            <text x={label.x} y={label.y+16} textAnchor="middle" fontSize="21" fontWeight="800" fill={axis.color}>{scores[i]}</text>
          </g>;})}
          <circle cx="230" cy="214" r="35" fill="#1745D1"/>
          <text x="230" y="215" textAnchor="middle" fontSize="28" fontWeight="800" fill="#E8F57A">64</text>
          <text x="230" y="232" textAnchor="middle" fontSize="12" fill="white">8영역 평균</text>
        </svg>
        <div className="scanner-preview-insight"><span>예시 · 먼저 검토할 곳</span><p><strong>신뢰 요소</strong> 사례·후기·인증을 주장 가까이에.</p></div>
      </>:<div className="scanner-copy-demo">
        <p className="scanner-demo-label">예시 · 추상적인 표현을 구체적으로</p>
        <div className="scanner-demo-before"><span>AS-IS</span><p>최고의 서비스로 성공을 함께합니다.</p></div>
        <div className="scanner-demo-flow" aria-label="고객, 범위, 근거를 구체화"><span>누구에게</span><span>무엇을</span><span>어떤 근거로</span></div>
        <div className="scanner-demo-after"><span>TO-BE · 사실을 채울 작성 틀</span><p><mark>[고객 유형]</mark>을 위한 <mark>[서비스 범위]</mark>를 제공합니다. <mark>[확인 가능한 사례]</mark>에서 진행 내용을 확인하세요.</p></div>
        <p className="scanner-demo-note">실제 결과에서는 수집된 URL의 원문 근거, 수정 위치와 단계별 실행 안내를 함께 확인합니다. 확인되지 않은 사실은 직접 채워 주세요.</p>
      </div>}
    </div>
    <div className="scanner-preview-footer"><span>링크 공유 · PDF 저장</span><small>실제 분석 결과가 아닌 예시입니다.</small></div>
  </aside>;
}
