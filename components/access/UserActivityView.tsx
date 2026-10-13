"use client";
import React, { useEffect, useState } from 'react';
import type { Account } from '@/lib/saas/types';
import { ActivityMetrics } from './AdminActivityDashboard';
import { ACTIVITY_LABELS, type ActivitySite, type ActivityEvent, type ActivityStats } from '@/lib/saas/activityTypes';
import { koreanTime } from './activityFormat';
export { koreanTime } from './activityFormat';
export type ActivityDetailData={
  account:Omit<Account,'passwordHash'>; network?:false; totals:ActivityStats;usage:Record<string,number>;
  activity:{sites?:ActivitySite[];events:ActivityEvent[];daily:{day:string;counts:ActivityStats}[];ips:string[];retentionDays:number;truncated:boolean};
  reports:{id:string;url:string;title:string;createdAt:number;expiresAt:number}[];
};
export default function UserActivityView({id,revision=0}:{id:string;revision?:number}){
  const [data,setData]=useState<ActivityDetailData|(Omit<ActivityDetailData,'account'|'network'>&{account:null;network:true})|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setData(null);setError('');
    void (async()=>{try{
      const r=await fetch('/api/admin?id='+encodeURIComponent(id),{cache:'no-store',signal:controller.signal});const d=await r.json();
      if(!r.ok){if(r.status===401||r.status===403)window.location.replace('/login');throw Error(d.message||'활동 기록을 불러오지 못했습니다.');}
      if(!controller.signal.aborted)setData(d);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'활동 기록을 불러오지 못했습니다.');}})();
    return()=>controller.abort();
  },[id,revision]);
  if(error)return <p className="access-error" role="alert">{error}</p>;
  if(!data||(!data.network&&data.account?.id!==id))return <p className="access-muted" role="status">사용자별 활동을 불러오는 중…</p>;
  if(data.network)return <div className="admin-user-activity"><p className="access-muted">등록된 네트워크에서 로그인 없이 이용한 기록입니다. 특정 개인의 활동으로 간주하지 않습니다.</p><ActivityMetrics stats={data.totals}/><ActivityHistory activity={data.activity}/></div>;
  return <UserActivityPanel key={data.account!.id} data={data}/>;
}
export function UserActivityPanel({data}:{data:ActivityDetailData}){
  const {account,totals,activity,reports}=data;
  if(!account)return null;
  const customerCanRead=account.status==='approved'&&account.features.reports&&(account.role==='admin'||account.expiresAt>Date.now());
  const number=(key:keyof ActivityStats)=>Number(totals[key]||0).toLocaleString('ko-KR');
  const max=Math.max(1,...activity.daily.map(d=>Number(d.counts.analyze_success||0)));
  return <div className="admin-user-activity">
    <dl className="admin-identity">
      <div><dt>로그인 계정 ID</dt><dd>{account.email}</dd></div>
      <div><dt>고유 사용자 ID (UUID)</dt><dd className="admin-uuid">{account.id}</dd></div>
      <div><dt>계정 생성</dt><dd>{koreanTime(account.createdAt)}</dd></div>
      <div><dt>최근 활동 기록</dt><dd>{koreanTime(totals.lastSeenAt)}</dd></div>
    </dl>
    <p className="access-muted">누적 횟수는 {koreanTime(totals.firstTrackedAt)}부터 집계합니다. 도입 이전 활동은 소급 집계하지 않습니다.</p>
    <ActivityMetrics stats={totals}/>
    <p className="access-muted">로그인 성공 {number('login')} · 실패 {number('login_failed')} · 공유 생성 {number('share_created')} · 공유 열람 {number('report_view')}</p>
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
    <ActivityHistory activity={activity}/>
  </div>;
}

export function ActivityHistory({activity}:{activity:ActivityDetailData['activity']}){
  const [filter,setFilter]=useState('all');
  const [siteSearch,setSiteSearch]=useState('');
  const events=activity.events.filter(e=>filter==='all'||(filter==='auth'?['login','login_failed','logout','activated'].includes(e.action):filter==='report'?['share_created','report_view','comparison_loaded','share_updated'].includes(e.action):e.action.startsWith(filter)));
  const sites=(activity.sites||[]).filter(site=>site.target.toLowerCase().includes(siteSearch.trim().toLowerCase()));
  return <>
    <section className="admin-detail-section">
      <div className="admin-section-head"><h3>URL별 이용 집계 · 최근 30일</h3><label>URL 검색 <input value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="example.com"/></label></div>
      <p className="access-muted">입력 URL의 도메인별 합계입니다. 민감한 경로·검색값은 보관하지 않으며, 아래 이력 200건 제한과 별도로 집계합니다. 이 표는 이번 적용 이후 기록부터 표시합니다.</p>
      {sites.length?<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="URL별 이용 횟수"><table className="admin-event-table"><thead><tr><th>입력 URL 도메인</th><th>진단 요청 / 완료 / 실패</th><th>경쟁사 비교 / 상세 완료</th><th>PDF 생성 / 실패</th><th>다운로드 요청 / 저장 완료</th></tr></thead><tbody>{sites.map(({target,counts:c})=><tr key={target}><td><strong>{target}</strong></td><td>{c.analyze_started||0} / {c.analyze_success||0} / {c.analyze_failed||0}</td><td>{c.competitor_success||0} / {c.deepdive_success||0}</td><td>{c.pdf_ready||0} / {c.pdf_failed||0}</td><td>{c.pdf_save||0} / {c.pdf_saved||0}</td></tr>)}</tbody></table></div>:<p className="access-empty">집계된 URL이 없습니다.</p>}
    </section>
    <section className="admin-detail-section">
      <div className="admin-section-head"><h3>사용자 활동 이력</h3><label>활동 필터 <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체</option><option value="auth">로그인·계정</option><option value="analyze">사이트 진단</option><option value="competitor">경쟁사 비교</option><option value="deepdive">상세 분석</option><option value="pdf">PDF</option><option value="report">공유·비교</option></select></label></div>
      <p className="access-muted">최대 30일 내 최신 200건 · 한국시간. 진단 완료는 서버 확인, PDF 단계는 브라우저 보고입니다. 저장 완료는 파일 쓰기·닫기 성공, 일반 다운로드는 요청 전달로 구분합니다.</p>
      {events.length?<div className="admin-table-scroll" tabIndex={0} role="region" aria-label="사용자 활동 기록 표"><table className="admin-event-table"><thead><tr><th>일시</th><th>활동</th><th>접속 IP · 환경</th><th>대상 · 상태</th></tr></thead><tbody>{events.map(e=><tr key={e.id+e.action}><td>{koreanTime(e.at)}</td><td><strong>{ACTIVITY_LABELS[e.action]||e.action}</strong><small>{e.source==='browser'?'브라우저 보고':'서버 확인'}</small></td><td><code>{e.ip||'IP 미확인'}</code><small>{e.device}</small></td><td>{e.target||'—'}{e.durationMs!==undefined&&<small>소요 {(e.durationMs/1000).toFixed(1)}초</small>}{e.pages&&<small>{e.pages}페이지 · {((e.bytes||0)/1024/1024).toFixed(2)} MB</small>}{e.scope&&<small>{e.scope==='full'?'전체 PDF':'한 장 요약 PDF'}</small>}{e.reportId&&<small>보고서 {e.reportId}</small>}{e.expiresAt&&<small>{e.expiresAt>Date.now()?'만료 예정: ':'만료: '}{koreanTime(e.expiresAt)}</small>}{e.subjectId&&<small>대상 ID: {e.subjectId}</small>}</td></tr>)}</tbody></table></div>:<p className="access-empty">선택한 활동의 기록이 없습니다.</p>}
    </section>
  </>;
}
