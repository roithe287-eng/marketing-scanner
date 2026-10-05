'use client';
import React,{useEffect,useRef,useState} from 'react';
import {DiagnosisBaselineSchema,type DiagnosisBaseline,type MarketingReport} from '@/lib/reportSchema';
import {buildDiagnosisComparison,comparisonGroups,DIAGNOSIS_COMPARISON_NOTE} from '@/lib/diagnosisComparison';
import {comparisonTime,parseReportReference} from '@/lib/geoComparison';
import DiagnosisRadarGraphic from '../DiagnosisRadarGraphic';

export default function DiagnosisComparisonPanel({report,onChange}:{report:MarketingReport;onChange?:(baseline?:DiagnosisBaseline)=>void}) {
 const [reference,setReference]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const active=useRef<AbortController|null>(null);useEffect(()=>()=>active.current?.abort(),[]);
 const comparison=buildDiagnosisComparison(report);
 async function load(){
  const id=parseReportReference(reference,window.location.origin);if(!id){setMessage('마케팅스캐너의 보관 링크 또는 보고서 ID를 입력하세요.');return;}
  active.current?.abort();const controller=new AbortController();active.current=controller;setLoading(true);setMessage('');const timer=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(`/api/share?id=${encodeURIComponent(id)}&mode=diagnosis`,{cache:'no-store',signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.message||'기준 보고서를 불러오지 못했습니다.');const parsed=DiagnosisBaselineSchema.safeParse(data.diagnosisBaseline);if(!parsed.success)throw Error('기준 보고서의 비교 데이터를 확인하지 못했습니다.');const result=buildDiagnosisComparison({...report,diagnosisBaseline:parsed.data});if(result?.blocked)throw Error(result.blocked);if(!controller.signal.aborted){onChange?.(parsed.data);setMessage('이전 결과를 연결했습니다. 비교 내용을 포함해 PDF 또는 결과 링크를 저장할 수 있습니다.');}}
  catch(error){if(active.current===controller)setMessage(controller.signal.aborted?'응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.':error instanceof Error?error.message:'기준 보고서를 불러오지 못했습니다.');}
  finally{clearTimeout(timer);if(active.current===controller)setLoading(false);}
 }
 return <section className="report-card report-workflow work-comparison" id="report-recheck" aria-label="재진단 이전 현재 비교">
  <div className="report-card-heading"><p className="report-eyebrow">BEFORE → NOW</p><h3>바꾼 뒤, 무엇이 달라졌나요?</h3><p className="report-note">{DIAGNOSIS_COMPARISON_NOTE}</p></div>
  {onChange&&<div className="work-baseline-form"><label>이전 보고서 보관 링크 또는 ID<input value={reference} onChange={e=>setReference(e.target.value)} disabled={loading} placeholder="보관 링크 또는 보고서 ID" autoComplete="off"/></label><button type="button" className="report-secondary-button" disabled={loading||!reference.trim()} onClick={load}>{loading?'불러오는 중…':'이전 결과 연결'}</button>{comparison&&<button type="button" className="report-secondary-button" onClick={()=>{onChange(undefined);setMessage('비교 연결을 해제했습니다.');}} disabled={loading}>비교 해제</button>}</div>}
  {message&&<p className="work-feedback" role="status">{message}</p>}
  {!comparison?<div className="work-recheck-empty"><span className="work-number">↻</span><div><h4>처음 진단했다면, 이 결과부터 보관하세요.</h4><p>결과 보관 → 사이트 수정 → 같은 URL 재진단 → 이전 결과 연결. 비교할 데이터가 준비되면 레이더와 항목별 변화가 이곳에 표시됩니다.</p><a className="work-link" href="/account">보관함에서 기준 결과 찾기 <span aria-hidden="true">↗</span></a></div></div>:comparison.blocked?<p className="work-empty" role="alert">{comparison.blocked}</p>:<>
   <div className="work-comparison-times"><p><strong>이전 · {comparison.baseline.reportId}</strong><span>{comparisonTime(comparison.baseline.capturedAt)}</span></p><p><strong>현재 진단</strong><span>{comparisonTime(comparison.currentTime)}</span></p></div>
   {(!comparison.methodMatched||!comparison.timeKnown)&&<p className="work-empty">{!comparison.methodMatched?'평가 기준·모델 기록이 없거나 서로 다릅니다. 점수 차이는 참고용입니다. ':''}{!comparison.timeKnown?'수집 시각이 없는 결과는 새 측정인지 확인할 수 없어 해결 판정을 보류합니다.':''}</p>}
   <div className="work-compare-layout"><div className="work-compare-chart"><div className="work-chart-legend"><span><i/>현재 · 실선</span><span><i/>이전 · 점선</span></div><DiagnosisRadarGraphic scores={comparison.axes.map(a=>a.after)} previousScores={comparison.axes.map(a=>a.before)} selected={0}/><p>같은 0–100 척도 · 중앙은 현재 8개 영역의 평균</p></div><div className="work-score-changes">{comparison.axes.map(a=><div key={a.key}><strong>{a.label}</strong><span>{a.before} → {a.after}</span><b data-trend={a.delta>0?'up':a.delta<0?'down':'same'}>{a.delta>0?'+':''}{a.delta}점</b></div>)}</div></div>
   <div className="work-change-groups">{comparisonGroups.map(g=>{const items=comparison.items.filter(t=>t.group===g.id);return <details key={g.id} data-change={g.id}><summary><span><strong>{g.label}</strong><small>{g.note}</small></span><b>{items.length}<small>개</small></b></summary><div>{items.length?items.map(item=><article key={item.key}><h4>{item.label}</h4><p><strong>이전 · {item.before?.source||'기록 없음'}</strong>{item.before?.evidence||'같은 항목이 저장되지 않았습니다.'}</p><p><strong>현재 · {item.after?.source||'기록 없음'}</strong>{item.after?.evidence||'현재 결과에 없어 해결 여부를 확인할 수 없습니다.'}</p>{item.reason&&<small>{item.reason}</small>}</article>):<p>이 분류에 해당하는 항목이 없습니다.</p>}</div></details>;})}</div>
   <p className="work-footnote">항목 이름·분류가 같은 기록을 대조합니다. 새로 보완은 새로 생긴 문제와 같지 않으며 수집 범위 변화일 수 있습니다. 한 문제의 여러 진단 근거는 각각 집계됩니다. 매출·CTR·문의율은 실제 계정 실적으로 별도 확인하세요.</p>
  </>}
 </section>;
}
