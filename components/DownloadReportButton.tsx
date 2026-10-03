"use client";
import { useEffect, useRef, useState } from 'react';
import LeadModal, { type LeadFormData } from './LeadModal';
import type { MarketingReport } from '@/lib/reportSchema';
type Props={targetId?:string;report:MarketingReport;direct?:boolean;pending?:boolean};
export default function DownloadReportButton({report,direct=false,pending=false}:Props) {
  const [open,setOpen]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [progress,setProgress]=useState('');
  const [error,setError]=useState('');
  const [prepared,setPrepared]=useState<{url:string;filename:string;pages:number;source:MarketingReport}|null>(null);
  const busy=useRef(false);
  const task=useRef<AbortController|null>(null);
  useEffect(()=>{setPrepared(null);setProgress('');setError('');return()=>task.current?.abort();},[report]);
  useEffect(()=>()=>{if(prepared)URL.revokeObjectURL(prepared.url);},[prepared]);
  const ready=prepared?.source===report&&!pending?prepared:null;
  async function runDownload() {
    if(busy.current || pending)return;
    busy.current=true;setDownloading(true);setError('');setProgress('PDF 준비 중...');
    const started=Date.now();
    const controller=new AbortController();task.current=controller;
    try {
      const {exportReportPdf}=await import('@/lib/exportReportPdf');
      const result=await exportReportPdf(report,text=>{if(!controller.signal.aborted)setProgress(text);},controller.signal);
      controller.signal.throwIfAborted();
      setPrepared({url:URL.createObjectURL(result.blob),filename:result.filename,pages:result.pages,source:report});
      setProgress(`전체 상세 내용 ${result.pages}페이지 PDF 생성 완료 · ${((Date.now()-started)/1000).toFixed(1)}초. 아래에서 저장하거나 열어보세요.`);
    } catch {if(!controller.signal.aborted){setError('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');setProgress('');}}
    finally {busy.current=false;setDownloading(false);}
  }
  async function handleLeadSubmit(form:LeadFormData) {
    setOpen(false);
    // Explicit form submission only. Export is not held up by lead delivery.
    void fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,url:report.url,overallScore:report.overallScore}),signal:AbortSignal.timeout(5000)}).catch(()=>{});
    await runDownload();
  }
  return <div className="report-download flex flex-col gap-2 max-w-md" data-hide-on-export>
    {!ready&&<button type="button" className="jm-button" disabled={downloading || pending} onClick={()=>direct?void runDownload():setOpen(true)}>{pending?'추가 분석 완료 후 PDF 가능':downloading?'PDF 생성 중...':'PDF 리포트 다운로드'}</button>}
    <p role="status" aria-live="polite" className="text-xs text-jm-gray">{progress}</p>
    {ready&&<div className="report-pdf-ready">
      <div className="report-pdf-actions"><a className="jm-button" href={ready.url} download={ready.filename}>PDF 파일 저장</a><a className="report-secondary-button" href={ready.url} target="_blank" rel="noopener noreferrer">PDF 열어보기</a></div>
      <p>저장이 시작되지 않으면 ‘PDF 열어보기’에서 브라우저의 저장·공유 메뉴를 이용해 주세요. 생성한 파일은 이 화면에서 다시 받을 수 있습니다.</p>
    </div>}
    {error && <p role="alert" className="text-xs text-jm-red">{error}</p>}
    {!direct && <LeadModal open={open} onClose={()=>setOpen(false)} onSubmit={handleLeadSubmit} title="PDF 리포트를 받아보세요" description="정보를 입력하시면 전체 상세 내용이 포함된 PDF를 생성합니다. 생성 후 파일을 저장할 수 있습니다." submitLabel="PDF 만들기" />}
  </div>;
}
