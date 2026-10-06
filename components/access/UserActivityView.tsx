"use client";
import React, { useEffect, useState } from 'react';
import type { Account } from '@/lib/saas/types';
import { ACTIVITY_LABELS, type ActivityEvent, type ActivityStats } from '@/lib/saas/activityTypes';
export const koreanTime=(at?:number)=>at?new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}):'기록 없음';
export type ActivityDetailData={
  account:Omit<Account,'passwordHash'>; totals:ActivityStats;usage:Record<string,number>;
  activity:{events:ActivityEvent[];daily:{day:string;counts:ActivityStats}[];ips:string[];retentionDays:number;truncated:boolean};
  reports:{id:string;url:string;title:string;createdAt:number;expiresAt:number}[];
};
export default function UserActivityView({id,revision=0}:{id:string;revision?:number}){
  const [data,setData]=useState<ActivityDetailData|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setData(null);setError('');
    void (async()=>{try{
      const r=await fetch('/api/admin?id='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal});const d=await r.json();
      if(!r.ok)throw Error(d.message||'활동 기록을 불러오지 못했습니다.');
      if(!controller.signal.aborted)setData(d);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'활동 기록을 불러오지 못했습니다.');}})();
    return()=>controller.abort();
  },[id,revision]);
  if(error)return <p className="access-error" role="alert">{error}</p>;
  if(!data||data.account.id!==id)return <p className="access-muted" role="status">사용자별 활동을 불러오는 중…</p>;
  return <UserActivityPanel key={data.account.id} data={data}/>;
}
export function UserActivityPanel({data}:{data:ActivityDetailData}){
  const [filter,setFilter]=useState('all');
  const {account,totals,activity,reports}=data;
  const customerCanRead=account.status==='approved'&&account.features.reports&&(account.role==='admin'||account.expiresAt>Date.now());
  const number=(key:keyof ActivityStats)=>Number(totals[key]||0).toLocaleString('ko-KR');
  const events=activity.events.filter(e=>filter==='all'||(filter==='auth'?['login','login_failed','logout','activated'].includes(e.action):filter==='report'?['share_created','report_view','comparison_loaded','share_updated'].includes(e.action):e.action.startsWith(filter)));
  const max=Math.max(1,...activity.daily.map(d=>Number(d.counts.analyze_success||0)));
  return <div className="admin-user-activity">
    <dl className="admin-identity">
      <div><dt>로그인 계정 ID</dt><dd>{account.email}</dd></div>
      <div><dt>고유 사용자 ID (UUID)</dt><dd className="admin-uuid">{account.id}</dd></div>
      <div><dt>계정 생성</dt><dd>{koreanTime(account.createdAt)}</dd></div>
      <div><dt>최근 활동 기록</dt><dd>{koreanTime(totals.lastSeenAt)}</dd></div>
    </dl>
    <p className="access-muted">누적 횟수는 {koreanTime(totals.firstTrackedAt)}부터 집계합니다. 도입 이전 활동은 소급 집계하지 않습니다.</p>
    <div className="admin-metrics">
      <article><span>사이트 진단 완료</span><strong>{number('analyze_success')}<small>회</small></strong><p>요청 {number('analyze_started')} · 실패 {number('analyze_failed')}<br/>진행·결과 미확인 {Math.max(0,Number(totals.analyze_started||0)-Number(totals.analyze_success||0)-Number(totals.analyze_failed||0))}</p></article>
      <article><span>PDF 생성 완료</span><strong>{number('pdf_ready')}<small>회</small></strong><p>저장 클릭 {number('pdf_save')} · 열기 {number('pdf_open')}</p></article>
      <article><span>공유 링크 생성</span><strong>{number('share_created')}<small>개</small></strong><p>현재 보관 {reports.length===50?'50개 이상':reports.length+'개'} · 열람 {number('report_view')}</p></article>
      <article><span>로그인 성공</span><strong>{number('login')}<small>회</small></strong><p>로그인 실패 {number('login_failed')}</p></article>
    </div>
    <p className="access-muted">경쟁사 비교 완료 {number('competitor_success')}회 · 상세 분석 완료 {number('deepdive_success')}회 · 이번 달 진단 차감 {Number(data.usage.analyze||0)}회{account.role==='admin'?' (관리자는 한도 차감 없음)':''}</p>
    <section className="admin-detail-section">
      <h3>최근 30일 사이트 진단</h3>
      <div className="admin-daily" role="img" aria-label="한국시간 기준 최근 30일의 일별 사이트 진단 완료 횟수">
        {activity.daily.map(d=><div key={d.day} title={`${d.day} · ${d.counts.analyze_success||0}회`}><span style={{height:`${Math.max(3,Number(d.counts.analyze_success||0)/max*80)}px`}} data-empty={!d.counts.analyze_success}/><small>{d.day.slice(8)}</small></div>)}
      </div>
      <p className="access-muted">{activity.daily[0]?.day} ~ {activity.daily.at(-1)?.day} · 일별 성공 횟수</p>
    </section>
    <section className="admin-detail-section">
      <h3>접속 IP</h3>
      <div className="admin-ip-list">{activity.ips.length?activity.ips.map(ip=><code key={ip}>{ip}</code>):<p className="access-muted">확인된 접속 IP가 없습니다.</p>}</div>
      <p className="access-muted">아래 최근 기록에서 확인된 IP입니다. IP는 여러 사용자가 공유하거나 변경될 수 있으며, 사람·기기를 고유하게 식별하지 않습니다.</p>
    </section>
    <section className="admin-detail-section">
      <h3>공유 링크 상태</h3>
      {reports.length?<ul className="admin-links">{reports.map(r=><li key={r.id}><div><a href={'/r/'+r.id} target="_blank" rel="noopener noreferrer">{r.title} ↗</a><p>{r.id} · {koreanTime(r.expiresAt)} 만료</p></div><span className="admin-badge">{customerCanRead?'활성':'고객 열람 중지'}</span></li>)}</ul>:<p className="access-empty">현재 보관된 공유 링크가 없습니다.</p>}
      <p className="access-muted">최신 50개까지 표시합니다. 계정 중지·기간 종료·보관 권한 해제 시 고객 열람이 차단됩니다. 만료된 보고서 내용은 삭제되며, 링크 생성·열람 이력만 상세 기록 보관기간 내 표시됩니다.</p>
    </section>
    <section className="admin-detail-section">
      <div className="admin-section-head"><h3>사용자 활동 이력</h3><label>활동 필터 <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체</option><option value="auth">로그인·계정</option><option value="analyze">사이트 진단</option><option value="competitor">경쟁사 비교</option><option value="deepdive">상세 분석</option><option value="pdf">PDF</option><option value="report">공유·비교</option></select></label></div>
      <p className="access-muted">최대 30일 내 최신 200건 · 한국시간. PDF 생성 완료·저장·열기는 브라우저가 보고한 기록이며, 기기에 파일이 실제 저장됐는지는 확인할 수 없습니다.</p>
      {events.length?<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="사용자 활동 기록 표"><table className="admin-event-table"><thead><tr><th>일시</th><th>활동</th><th>접속 IP · 환경</th><th>대상 · 상태</th></tr></thead><tbody>{events.map(e=><tr key={e.id+e.action}><td>{koreanTime(e.at)}</td><td><strong>{ACTIVITY_LABELS[e.action]||e.action}</strong><small>{e.source==='browser'?'브라우저 보고':'서버 확인'}</small></td><td><code>{e.ip||'IP 미확인'}</code><small>{e.device}</small></td><td>{e.target||'—'}{e.scope&&<small>{e.scope==='full'?'전체 PDF':'한 장 요약 PDF'}</small>}{e.reportId&&<small>보고서 {e.reportId}</small>}{e.expiresAt&&<small>{e.expiresAt>Date.now()?'만료 예정: ':'만료: '}{koreanTime(e.expiresAt)}</small>}{e.subjectId&&<small>대상 ID: {e.subjectId}</small>}</td></tr>)}</tbody></table></div>:<p className="access-empty">선택한 활동의 기록이 없습니다.</p>}
    </section>
  </div>;
}
