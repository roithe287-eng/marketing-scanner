'use client';
import React,{useId,useState} from 'react';
import {calculateGrowthKpi,EMPTY_KPI,DEMO_KPI,type KpiInputs} from '@/lib/growthKpi';
import {GROWTH_MEASUREMENT,GROWTH_SOURCES} from '@/lib/growthKnowledge';
const number=(n:number|null)=>n===null?'—':n.toLocaleString('ko-KR',{maximumFractionDigits:2});
const signed=(n:number|null)=>n===null?'기준선 입력 후 차이 계산':`${n>0?'+':''}${number(n)}`;
function Comparison({title,current,target,unit,delta}:{title:string;current:number|null;target:number|null;unit:string;delta:number|null}) {
  const max=Math.max(current||0,target||0,1);
  return <article className="growth-kpi-result"><h4>{title}</h4><p className="growth-kpi-total"><strong>{number(target)}</strong><span>{unit}</span></p><p className="growth-kpi-delta">현재 대비 {signed(delta)}{delta===null?'':` ${unit}`}</p><div className="growth-bars">{[['입력한 현재',current],['목표 조건 계산',target]].map(([label,value])=><div key={String(label)}><span>{label}</span><div aria-hidden="true"><i style={{width:`${typeof value==='number'?value/max*100:0}%`}}/></div><b>{number(typeof value==='number'?value:null)}</b></div>)}</div></article>;
}
export default function GrowthKpiPanel({targetUrl}:{targetUrl:string}) {
  const id=useId();const [inputs,setInputs]=useState<KpiInputs>({...EMPTY_KPI}),[demo,setDemo]=useState(false),[channel,setChannel]=useState('Google 자연 검색'),[period,setPeriod]=useState('동일한 28일 구간'),[copyStatus,setCopyStatus]=useState(''),[fallback,setFallback]=useState('');
  const result=calculateGrowthKpi(inputs);
  function field(key:keyof KpiInputs,label:string,help:string,rate=false) {return <label className="growth-kpi-field" key={key} htmlFor={`${id}-${key}`}><span>{label}</span><input id={`${id}-${key}`} type="number" inputMode={rate?'decimal':'numeric'} min="0" max={rate?100:1e12} step={rate?'any':'1'} value={inputs[key]} placeholder="직접 입력" aria-invalid={!!result.errors[key]} aria-describedby={`${id}-${key}-help`} onChange={e=>{setInputs({...inputs,[key]:e.target.value});setCopyStatus('');setFallback('');}}/><small id={`${id}-${key}-help`}>{result.errors[key]||help}</small></label>;}
  async function copy() {
    const text=[`[${demo?'가상 예시':'사용자 입력'} KPI 시나리오]`,targetUrl,`채널: ${channel} / 기간: ${period}`,`현재 노출 ${inputs.impressions||'미입력'} · 클릭 ${inputs.clicks||'미입력'} · CTR ${number(result.ctr)}%`,`목표 노출 ${inputs.targetImpressions||'미입력'} × 목표 CTR ${inputs.targetCtr||'미입력'}% = 계산 클릭 ${number(result.clicks)}`,`현재 세션 ${inputs.sessions||'미입력'} · 전환 세션 ${inputs.converted||'미입력'} · 세션 전환율 ${number(result.cvr)}%`,`목표 세션 ${inputs.targetSessions||'미입력'} × 목표 세션 전환율 ${inputs.targetCvr||'미입력'}% = 계산 전환 세션 ${number(result.converted)}`,'목표를 충족했을 때의 산술 시나리오입니다. 개선 효과 예측·성과 보장이 아니며 클릭과 세션은 자동 연결하지 않았습니다.'].join('\n');
    try{await navigator.clipboard.writeText(text);setCopyStatus('시나리오를 복사했습니다.');setFallback('');}catch{setFallback(text);setCopyStatus('아래 내용을 직접 복사하세요.');}
  }
  return <section className="report-card report-growth-kpi" aria-label="목표 KPI 실험실">
    <div className="report-card-heading"><p className="report-eyebrow">YOUR BASELINE → YOUR TARGET</p><h3>바꾸면 어떤 숫자를 확인해야 할까요?</h3><p className="report-note">내 실적과 목표를 넣으면 목표 조건을 달성했을 때의 클릭·전환 규모를 계산합니다. 진단 점수에서 상승률을 추정하지 않습니다.</p></div>
    <div className="growth-kpi-intro"><span className="report-pill">{demo?'가상 예시 데이터 · 실제 사이트 실적 아님':'계정 미연동 · 사용자 직접 입력'}</span><p>CTR은 노출 대비 클릭 비율, 세션 전환율은 방문 세션 중 정한 행동을 완료한 비율입니다. 아래 두 계산은 독립적이며 검색 클릭과 GA4 세션을 1:1로 가정하지 않습니다.</p></div>
    <div className="growth-kpi-context"><label>비교할 채널<select value={channel} onChange={e=>setChannel(e.target.value)}><option>Google 자연 검색</option><option>네이버 웹 자연 검색</option><option>AI 서비스 유입 · 별도 집계</option></select></label><label>비교 기간 메모<input value={period} maxLength={100} onChange={e=>setPeriod(e.target.value)} placeholder="예: 수정 전 28일 / 수정 후 28일"/></label></div>
    {channel.startsWith('AI')&&<p className="growth-evidence-note">AI 채널은 전체 노출·클릭을 확보하기 어려울 수 있습니다. 확인할 수 없는 값은 비워 두고 실제 유입 세션·전환부터 기록하세요. 표본 인용률을 CTR 대신 입력하지 않습니다.</p>}
    <div className="growth-kpi-input-grid">
      <fieldset><legend>01 · 노출에서 클릭으로</legend><p>같은 검색 도구·URL·기간 기준</p><div>{field('impressions','현재 노출수','Search Console 또는 서치어드바이저')}{field('clicks','현재 클릭수',`현재 CTR: ${number(result.ctr)}%`)}{field('targetImpressions','목표 노출수','담당자가 정한 목표 · 예측값 아님')}{field('targetCtr','목표 CTR (%)','예: 4를 입력하면 4% · 증가율 아님',true)}</div><small>계산식: 목표 노출수 × 목표 CTR ÷ 100</small></fieldset>
      <fieldset><legend>02 · 방문에서 완료 행동으로</legend><p>같은 채널·기간·핵심 이벤트 기준</p><div>{field('sessions','현재 세션 수','GA4의 해당 채널 방문 세션')}{field('converted','현재 전환 세션 수',`현재 세션 전환율: ${number(result.cvr)}% · 이벤트 횟수와 구분`)}{field('targetSessions','목표 세션 수','검색 클릭에서 자동 환산하지 않음')}{field('targetCvr','목표 세션 전환율 (%)','문의 완료 등 선택한 핵심 이벤트 기준',true)}</div><small>계산식: 목표 세션 수 × 목표 세션 전환율 ÷ 100</small></fieldset>
    </div>
    <div className="growth-kpi-controls"><button type="button" className="report-secondary-button" onClick={()=>{setInputs({...DEMO_KPI});setDemo(true);setCopyStatus('');setFallback('');}}>가상 예시로 계산 방법 보기</button><button type="button" className="report-secondary-button" onClick={()=>{setInputs({...EMPTY_KPI});setDemo(false);setCopyStatus('');setFallback('');}}>입력 비우기 · 내 실적 입력</button></div>
    {!!Object.keys(result.errors).length&&<p className="growth-kpi-error" role="alert">입력값의 범위와 집계 기준을 확인해 주세요. 오류를 수정하면 결과가 표시됩니다.</p>}
    <div className="growth-kpi-results" aria-live="polite" aria-atomic="true"><Comparison title="목표 조건의 검색 클릭" current={result.values.clicks} target={result.clicks} unit="클릭" delta={result.clickDelta}/><Comparison title="목표 조건의 전환 세션" current={result.values.converted} target={result.converted} unit="세션" delta={result.conversionDelta}/></div>
    <p className="report-note">값이 없으면 계산하지 않습니다. 전환 세션은 통계적 기대값이므로 소수가 나올 수 있습니다. ‘목표 CTR 4%’는 현재보다 4% 상승한다는 뜻이 아닙니다. 목표 달성 가능성은 이 계산으로 판단할 수 없습니다.</p>
    <div className="growth-kpi-save"><button type="button" className="report-secondary-button" disabled={!!Object.keys(result.errors).length||(result.clicks===null&&result.converted===null)} onClick={copy}>내 KPI 시나리오 복사</button><p>입력값은 이 화면에서만 유지됩니다. 공유 보고서·PDF에는 입력값이 저장되지 않으므로 복사해 보관하세요.</p></div><span role="status">{copyStatus}</span>{fallback&&<label className="growth-copy-fallback">직접 복사할 KPI 시나리오<textarea readOnly value={fallback} rows={9}/></label>}
    <details className="growth-measurement"><summary>실제 지표는 어디서 가져오나요?</summary><div>{GROWTH_MEASUREMENT.map(m=><article key={m.title}><h4>{m.title}</h4><strong>{m.where}</strong><p className="growth-measurement-metric">{m.metric}</p><p>{m.note}</p><a href={GROWTH_SOURCES[m.source].url} target="_blank" rel="noopener noreferrer">공식 측정 가이드 ↗</a></article>)}</div></details>
    <ol className="growth-review-cycle"><li><strong>수정 전</strong><p>대상 URL·기간·채널·현재 수치 저장</p></li><li><strong>배포 직후</strong><p>수정 내용·접근·이벤트 수신 확인</p></li><li><strong>데이터 반영 후</strong><p>같은 길이·같은 조건으로 전후 비교</p></li><li><strong>다음 결정</strong><p>유지·추가 수정·추가 관측 중 선택</p></li></ol>
  </section>;
}
