"use client";
import { useEffect, useRef, useState } from 'react';
import {requestJson} from '@/lib/client/request';
import type { MarketingReport } from '@/lib/reportSchema';
export default function ShareButton({report,competitorLoading=false,onShareCreated}:{report:MarketingReport;competitorLoading?:boolean;onShareCreated?:(id:string)=>void}) {
  const [loading,setLoading] = useState(false);
  const [url,setUrl] = useState('');
  const [copied,setCopied] = useState(false);
  const [error,setError] = useState('');
  const busy = useRef(false);
  const active=useRef<AbortController|null>(null);
  const currentReport=useRef(report);
  const savedReport=useRef<MarketingReport|null>(null);
  currentReport.current=report;
  useEffect(()=>{savedReport.current=null;setUrl('');setCopied(false);setError('');busy.current=false;setLoading(false);return()=>active.current?.abort();},[report]);
  async function share() {
    if (busy.current || competitorLoading) return;
    busy.current=true;setLoading(true);setError('');setCopied(false);
    const snapshot=report;
    const controller=new AbortController();active.current=controller;
    try {
      let link=savedReport.current===snapshot?url:'';
      if (!link) {
        const data=await requestJson<{id?:unknown}>('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report:snapshot}),signal:controller.signal},15000);
        if(typeof data.id!=='string'||!/^[A-Za-z0-9]{4,12}$/.test(data.id))throw new Error('공유 링크를 생성하지 못했습니다.');
        if(controller.signal.aborted||currentReport.current!==snapshot) return;
        savedReport.current=snapshot;
        link=`${window.location.origin}/r/${data.id}`;setUrl(link);onShareCreated?.(data.id);
      }
      if(controller.signal.aborted||currentReport.current!==snapshot) return;
      try {await navigator.clipboard.writeText(link);if(!controller.signal.aborted&&currentReport.current===snapshot) setCopied(true);} catch { /* The selectable link below remains available. */ }
    } catch(error) {if(!controller.signal.aborted&&currentReport.current===snapshot)setError(error instanceof Error?error.message:'공유 링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');}
    finally {if(active.current===controller&&!controller.signal.aborted){active.current=null;busy.current=false;setLoading(false);}}
  }
  return <div className="flex flex-col gap-2 max-w-md" data-hide-on-export>
    <button type="button" className="rounded-full border px-5 py-3 text-sm font-bold disabled:opacity-50" disabled={loading || competitorLoading} onClick={share}>{competitorLoading?'추가 분석 완료 후 공유 가능':loading?'공유 링크 생성 중...':copied?'링크가 복사되었습니다':url?'링크 다시 복사':'결과 보관·링크 복사'}</button>
    {url && <div className="text-xs rounded-lg bg-neutral-50 p-3 break-all"><a className="underline" href={url} target="_blank" rel="noopener noreferrer">{url}</a><p className="mt-2">전체 결과가 21일간 보관됩니다. 보고서 소유 계정 또는 등록 네트워크에서만 열람할 수 있습니다.</p></div>}
    {error && <p role="alert" className="text-xs text-jm-red">{error}</p>}
  </div>;
}
