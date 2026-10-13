"use client";
import React, { useEffect, useState } from 'react';
import { ACTIVITY_LABELS, type ActivityAction, type ActivityStats, type AdminOverview, type ActivityPeriod } from '@/lib/saas/activityTypes';
import AdminUsageTable from './AdminUsageTable';
import { koreanTime } from './activityFormat';
const groups={owner:'관리자 본인',customers:'고객 계정',network:'허용 네트워크 · 비로그인'} as const;
const n=(value?:number)=>Number(value||0).toLocaleString('ko-KR');
export function ActivityMetrics({stats}:{stats:ActivityStats}){
  const pending=Math.max(0,(stats.analyze_started||0)-(stats.analyze_success||0)-(stats.analyze_failed||0));
  return <div className="admin-metrics admin-flow-metrics">
    <article><span>URL 진단 호출</span><strong>{n(stats.analyze_started)}<small>회</small></strong><p>서버가 접수한 진단 요청</p></article>
    <article><span>호출 완료</span><strong>{n(stats.analyze_success)}<small>회</small></strong><p>실패 {n(stats.analyze_failed)} · 결과 미확인 {n(pending)}</p></article>
    <article><span>PDF 생성 완료</span><strong>{n(stats.pdf_ready)}<small>회</small></strong><p>요청 {n(stats.pdf_requested)} · 실패 {n(stats.pdf_failed)}</p></article>
    <article><span>브라우저 다운로드</span><strong>{n(stats.pdf_save)}<small>회</small></strong><p>다운로드 요청 전달 · 열기 {n(stats.pdf_open)}</p></article>
    <article><span>PDF 저장 완료 확인</span><strong>{n(stats.pdf_saved)}<small>회</small></strong><p>파일 쓰기·닫기 완료 보고</p></article>
    <article><span>파일 저장 시도</span><strong>{n(stats.pdf_save_started)}<small>회</small></strong><p>취소 {n(stats.pdf_save_cancelled)} · 실패 {n(stats.pdf_save_failed)}</p></article>
  </div>;
}
export default function AdminActivityDashboard({revision,pending,onSelect}:{revision:number;pending:number;onSelect:(id:string)=>void}){
  const [data,setData]=useState<AdminOverview|null>(null),[error,setError]=useState('');
  const [period,setPeriod]=useState<ActivityPeriod>('30'),[group,setGroup]=useState('all');
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try{
        const r=await fetch('/api/admin?view=overview',{cache:'no-store',signal:controller.signal});const d=await r.json();
        if(!r.ok){if(r.status===401||r.status===403){setData(null);window.location.replace('/login');}throw Error(d.message||'집계를 불러오지 못했습니다.');}
        if(!controller.signal.aborted){setData(d);setError('');}
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'집계를 불러오지 못했습니다.');}
    }
    void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},60000);
    return()=>{controller.abort();window.clearInterval(timer);};
  },[revision]);
  const statsFor=(name:keyof typeof groups)=>{
    if(!data)return {};
    if(period==='all')return data.groups[name].totals;
    const stats:ActivityStats={};
    for(const day of data.groups[name].daily.slice(-Number(period)))for(const action of Object.keys(ACTIVITY_LABELS) as ActivityAction[])stats[action]=(stats[action]||0)+Number(day.counts[action]||0);
    return stats;
  };
  const rows=(Object.keys(groups) as (keyof typeof groups)[]).map(name=>({name,stats:statsFor(name)}));
  const stats:ActivityStats={};
  for(const row of rows.filter(row=>group==='all'||row.name===group))for(const action of Object.keys(ACTIVITY_LABELS) as ActivityAction[])stats[action]=(stats[action]||0)+Number(row.stats[action]||0);
  return <section id="admin-dashboard" className="admin-dashboard" aria-busy={!data&&!error}>
    <div className="admin-section-head"><div><p className="admin-eyebrow">USAGE OVERVIEW</p><h2>승인 계정과 이용 현황</h2></div><p className="access-muted">{data?koreanTime(data.updatedAt)+' 기준 · 1분마다 갱신':'집계 불러오는 중…'}</p></div>
    {error&&<p role="alert" className="access-error">{error}</p>}
    {data&&<>
      <div className="access-admin-stats">
        <article><strong>{n(data.accounts.approved)}</strong><span>승인 고객 계정 · 활성화 대기 {n(data.accounts.unactivated)}</span></article>
        <article><strong>{n(data.accounts.inactive)}</strong><span>중지·기간 종료 계정</span></article>
        <article><strong>{n(pending)}</strong><span>최근 문의 검토 대기</span></article>
      </div>
      <div className="admin-dashboard-controls"><label>집계 기간 <select value={period} onChange={e=>setPeriod(e.target.value as ActivityPeriod)}><option value="1">오늘</option><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="all">누적 전체</option></select></label><label>이용 주체 <select value={group} onChange={e=>setGroup(e.target.value)}><option value="all">전체 이용</option>{rows.map(row=><option key={row.name} value={row.name}>{groups[row.name]}</option>)}</select></label><span className="access-muted">한국시간 · 전체 계정 기준</span></div>
      <ActivityMetrics stats={stats}/>
      <AdminUsageTable customers={data.customers} period={period} groups={{owner:statsFor('owner'),customers:statsFor('customers'),network:statsFor('network')}} at={data.updatedAt} onSelect={onSelect}/>
      <p className="access-muted admin-counting-note">계정 수에는 관리자 본인을 제외하며, 이용 수에는 포함합니다. 각 단계가 발생한 날짜로 집계합니다. 파일 저장 완료는 지원 브라우저의 저장 완료 보고이며, 일반 다운로드는 요청으로 구분합니다. 신규 지표와 비로그인 기록은 이번 적용 이후부터 쌓입니다.</p>
    </>}
  </section>;
}
