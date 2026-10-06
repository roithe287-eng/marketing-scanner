"use client";

import {useEffect, useRef, useState} from 'react';
import {GeoBaselineSchema, DiagnosisBaselineSchema, type DiagnosisBaseline, type GeoBaseline} from '@/lib/reportSchema';
import {baselineQuestions, comparisonTime, parseReportReference} from '@/lib/geoComparison';
import {retentionTime} from '@/lib/reportRetention';
import {requestJson} from '@/lib/client/request';

type Props = {onSubmit:(url:string, geoQuestions?:string[], baselineId?:string)=>void;loading:boolean};
export default function UrlForm({onSubmit,loading}:Props) {
  const [url,setUrl]=useState('');
  const [questions,setQuestions]=useState('');
  const [reference,setReference]=useState('');
  const [baseline,setBaseline]=useState<DiagnosisBaseline|null>(null);
  const [geoBaseline,setGeoBaseline]=useState<GeoBaseline|null>(null);
  const [baselineLoading,setBaselineLoading]=useState(false);
  const [message,setMessage]=useState('');
  const active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  async function loadBaseline() {
    active.current?.abort();
    setBaselineLoading(false);
    const id=parseReportReference(reference,window.location.origin);
    if (!id) {setMessage('마케팅 스캐너의 공유 링크 또는 보고서 ID를 입력해 주세요.');return;}
    const controller=new AbortController();active.current=controller;setBaselineLoading(true);setMessage('');
    try {
      const result=await requestJson<{diagnosisBaseline:unknown;geoBaseline?:unknown}>(`/api/share?id=${encodeURIComponent(id)}&mode=diagnosis`,{cache:'no-store',signal:controller.signal},15000);
      const restored=DiagnosisBaselineSchema.parse(result.diagnosisBaseline);
      const geo=result.geoBaseline?GeoBaselineSchema.parse(result.geoBaseline):null;
      const fixed=geo?baselineQuestions(geo):[];
      if (controller.signal.aborted) return;
      setBaseline(restored);setGeoBaseline(geo);setUrl(restored.url);setQuestions(fixed.map(q=>q.question).join('\n'));
    } catch (error) {if (!controller.signal.aborted) setMessage(error instanceof Error?error.message:'보고서를 불러오지 못했습니다.');}
    finally {if (!controller.signal.aborted) setBaselineLoading(false);}
  }
  function handleSubmit(e:React.FormEvent) {
    e.preventDefault();if (loading||baselineLoading) return;
    if (!url.trim()) {setMessage('분석할 URL을 입력해 주세요.');return;}
    const rows=questions.split('\n').map(s=>s.trim()).filter(Boolean);
    if (rows.length>5||rows.some(s=>s.length<5||s.length>250)) {setMessage('질문은 한 줄에 하나씩 최대 5개, 각 5~250자로 입력해 주세요.');return;}
    setMessage('');onSubmit(url.trim(),rows.length?rows:undefined,baseline?.reportId);
  }
  return <form onSubmit={handleSubmit} className="scanner-url-form">
    <label htmlFor="scanner-url" className="scanner-url-label">진단할 웹사이트 URL</label>
    <div className="scanner-url-row">
      <input id="scanner-url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="예: https://prorealmkt.com" aria-label="분석할 웹사이트 URL" className="scanner-url-input" disabled={loading||baselineLoading} readOnly={!!baseline} inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="scanner-url-help"/>
      <button type="submit" disabled={loading||baselineLoading} className="jm-button scanner-submit">{loading?'분석 중...':baseline?'같은 URL로 재진단·비교':'내 사이트 진단 시작'}</button>
    </div>
    <p id="scanner-url-help" className="scanner-url-help">홈페이지·서비스 소개·광고 랜딩 URL을 입력해 주세요.</p>
    <details className="scanner-advanced">
      <summary>GEO 질문·이전 보고서 비교 <span>(선택)</span></summary>
    <details className="px-4 py-3 text-left text-sm">
      <summary className="cursor-pointer font-bold">이전 보고서와 재진단 비교하기</summary>
      <p className="mt-3 text-xs leading-6 text-jm-gray">보관한 보고서의 URL로 다시 진단해 레이더·보완 항목을 비교합니다. 재사용 가능한 GEO 질문이 있으면 동일 질문의 관측도 함께 비교합니다.</p><p className="mt-2 text-xs leading-6 text-jm-gray">공유 보고서는 최대 7일간 보관됩니다. 만료 전에 비교하세요. 비교를 저장해도 기준 보고서의 만료일은 연장되지 않습니다.</p>
      {!baseline ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="기준 보고서 공유 링크 또는 ID" value={reference} onChange={e=>{active.current?.abort();setBaselineLoading(false);setReference(e.target.value);setMessage('');}} disabled={loading} placeholder="https://www.mktscanner.com/r/..." className="min-w-0 flex-1 rounded-xl border p-3"/>
        <button type="button" onClick={loadBaseline} disabled={loading||baselineLoading||!reference.trim()} className="rounded-xl border px-4 py-3 font-bold disabled:opacity-50">{baselineLoading?'불러오는 중...':'기준 보고서 불러오기'}</button></div> :
        <div className="mt-3 rounded-xl border bg-neutral-50 p-4"><p className="font-bold">비교 기준을 불러왔습니다</p><p className="mt-2 break-all text-xs leading-6">{baseline.url}<br/>{baseline.expiresAt?`열람 종료: ${retentionTime(baseline.expiresAt)}`:null}<br/>{comparisonTime(baseline.capturedAt)} · {geoBaseline?`질문 ${baselineQuestions(geoBaseline).length}개 고정`:'페이지 진단 비교'}</p>
          {geoBaseline && !geoBaseline.citation.measurementProtocol && <p className="mt-2 text-xs leading-6 text-amber-800">이전 보고서에는 요청 설정 기록이 없어 변화율을 계산하지 않습니다. 이번 결과부터 다음 비교의 기준으로 사용할 수 있습니다.</p>}
          <button type="button" disabled={loading} onClick={()=>{setBaseline(null);setGeoBaseline(null);setMessage('');}} className="mt-3 text-xs underline">비교 해제 · 질문 직접 편집</button></div>}
    </details>
    {baseline && <p role="status" className="px-4 pb-2 text-left text-xs text-jm-gray">기준 보고서 {baseline.reportId}의 URL{geoBaseline?'과 질문':''}을 유지합니다.</p>}
    <details className="px-4 py-2 text-left text-sm">
      <summary className="cursor-pointer text-jm-gray">{geoBaseline?'비교할 고정 질문 보기':'GEO 고객 질문 직접 입력 (선택)'}</summary>
      <label htmlFor="geo-questions" className="my-2 block text-xs text-jm-gray">{geoBaseline?'기준 질문을 그대로 사용합니다. 편집하려면 비교를 해제해 주세요.':'한 줄에 질문 하나씩 최대 5개. 비워두면 사이트에 맞춰 생성합니다.'}</label>
      <textarea id="geo-questions" value={questions} onChange={e=>setQuestions(e.target.value)} disabled={loading||baselineLoading} readOnly={!!geoBaseline} rows={4} maxLength={1254} className="w-full rounded-xl border p-3" placeholder="고객이 실제 상담에서 물어보는 질문을 입력하세요."/>
    </details>
    </details>
    {message && <p role="alert" className="px-4 py-2 text-left text-sm text-red-700">{message}</p>}
  </form>;
}
