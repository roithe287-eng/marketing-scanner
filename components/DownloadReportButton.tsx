"use client";
import { useRef, useState } from 'react';
import LeadModal, { type LeadFormData } from './LeadModal';
import type { MarketingReport } from '@/lib/reportSchema';
type Props={targetId?:string;report:MarketingReport;direct?:boolean;pending?:boolean};
export default function DownloadReportButton({report,direct=false,pending=false}:Props) {
  const [open,setOpen]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [progress,setProgress]=useState('');
  const [error,setError]=useState('');
  const busy=useRef(false);
  async function runDownload() {
    if(busy.current || pending)return;
    busy.current=true;setDownloading(true);setError('');setProgress('PDF 준비 중...');
    const started=Date.now();
    try {
      const {exportReportPdf}=await import('@/lib/exportReportPdf');
      const result=await exportReportPdf(report,setProgress);
      setProgress(`전체 상세 내용 ${result.pages}페이지 PDF를 다운로드했습니다. (${((Date.now()-started)/1000).toFixed(1)}초)`);
    } catch {setError('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');setProgress('');}
    finally {busy.current=false;setDownloading(false);}
  }
  async function handleLeadSubmit(form:LeadFormData) {
    setOpen(false);
    // Explicit form submission only. Export is not held up by lead delivery.
    void fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,url:report.url,overallScore:report.overallScore}),signal:AbortSignal.timeout(5000)}).catch(()=>{});
    await runDownload();
  }
  return <div className="flex flex-col gap-2 max-w-md" data-hide-on-export>
    <button type="button" className="jm-button" disabled={downloading || pending} onClick={()=>direct?void runDownload():setOpen(true)}>{pending?'추가 분석 완료 후 PDF 가능':downloading?'PDF 생성 중...':'PDF 리포트 다운로드'}</button>
    <p role="status" aria-live="polite" className="text-xs text-jm-gray">{progress}</p>
    {error && <p role="alert" className="text-xs text-jm-red">{error}</p>}
    {!direct && <LeadModal open={open} onClose={()=>setOpen(false)} onSubmit={handleLeadSubmit} title="PDF 리포트를 받아보세요" description="정보를 입력하시면 전체 상세 내용이 포함된 PDF를 다운로드합니다." submitLabel="PDF 다운로드 받기" />}
  </div>;
}
