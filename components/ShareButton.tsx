"use client";
import { useEffect, useRef, useState } from 'react';
import {retentionTime} from '@/lib/reportRetention';
import {requestJson} from '@/lib/client/request';
import type { MarketingReport } from '@/lib/reportSchema';
export default function ShareButton({report,competitorLoading=false,onShareCreated}:{report:MarketingReport;competitorLoading?:boolean;onShareCreated?:(saved:MarketingReport)=>void}) {
  const [loading,setLoading] = useState(false);
  const [url,setUrl] = useState('');
  const [expiresAt,setExpiresAt]=useState<number|null>(null);
  const [copied,setCopied] = useState(false);
  const [error,setError] = useState('');
  const busy = useRef(false);
  const active=useRef<AbortController|null>(null);
  const currentReport=useRef(report);
  const savedReport=useRef<MarketingReport|null>(null);
  currentReport.current=report;
  useEffect(()=>{
    // The parent retains the exact saved snapshot so later edits keep its original expiry.
    if(savedReport.current!==report){savedReport.current=null;setUrl('');setExpiresAt(null);setCopied(false);setError('');busy.current=false;setLoading(false);}
    return()=>active.current?.abort();
  },[report]);
  async function share() {
    if (busy.current || competitorLoading) return;
    busy.current=true;setLoading(true);setError('');setCopied(false);
    const snapshot=report;
    const controller=new AbortController();active.current=controller;
    try {
      let link=savedReport.current===snapshot?url:'';
      if (!link) {
        const data=await requestJson<{id?:unknown;createdAt?:unknown;expiresAt?:unknown}>('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({report:snapshot}),signal:controller.signal},15000);
        if(typeof data.id!=='string'||!/^[A-Za-z0-9]{4,12}$/.test(data.id))throw new Error('공유 링크를 생성하지 못했습니다.');
        if(controller.signal.aborted||currentReport.current!==snapshot) return;
        if(typeof data.createdAt!=='number'||!Number.isFinite(data.createdAt)||typeof data.expiresAt!=='number'||!Number.isFinite(data.expiresAt))throw new Error('보관 만료일을 확인하지 못했습니다.');
        setExpiresAt(data.expiresAt);
        const saved={...snapshot,sharedRetention:{reportId:data.id,createdAt:data.createdAt,expiresAt:data.expiresAt}};
        savedReport.current=onShareCreated?saved:snapshot;
        link=`${window.location.origin}/r/${data.id}`;setUrl(link);onShareCreated?.(saved);
      }
      if(controller.signal.aborted||currentReport.current!==snapshot) return;
      try {await navigator.clipboard.writeText(link);if(!controller.signal.aborted&&currentReport.current===snapshot) setCopied(true);} catch { /* The selectable link below remains available. */ }
    } catch(error) {if(!controller.signal.aborted&&currentReport.current===snapshot)setError(error instanceof Error?error.message:'공유 링크 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');}
    finally {if(active.current===controller&&!controller.signal.aborted){active.current=null;busy.current=false;setLoading(false);}}
  }
  return <div className="flex flex-col gap-2 max-w-md" data-hide-on-export>
    <button type="button" className="rounded-full border px-5 py-3 text-sm font-bold disabled:opacity-50" disabled={loading || competitorLoading} onClick={share}>{competitorLoading?'추가 분석 완료 후 공유 가능':loading?'공유 링크 생성 중...':copied?'링크가 복사되었습니다':url?'링크 다시 복사':'결과 보관·링크 복사'}</button>
    {url && <div className="text-xs rounded-lg bg-neutral-50 p-3 break-all"><a className="underline" href={url} target="_blank" rel="noopener noreferrer">{url}</a><p className="mt-2">{expiresAt?`${retentionTime(expiresAt)}에 자동 만료됩니다.`:'최대 7일간 보관됩니다.'} 저장할 때 이용한 계정·등록 네트워크와 관리자만 열람할 수 있으며, 열람·복사로 기간이 연장되지 않습니다.</p></div>}
    {error && <p role="alert" className="text-xs text-jm-red">{error}</p>}
  </div>;
}
