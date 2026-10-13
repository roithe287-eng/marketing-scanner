"use client";
import React, {useState} from 'react';
import {NETWORK_ACTIVITY_ID, type ActivityStats, type ActivityPeriod, type AdminCustomerActivity} from '@/lib/saas/activityTypes';
const number=(value?:number)=>Number(value||0).toLocaleString('ko-KR');
const PAGE_SIZE=20;
function Counts({stats:s}:{stats:ActivityStats}){
  return <><td>{number(s.analyze_started)}</td><td>{number(s.analyze_success)} / {number(s.analyze_failed)}</td><td>{number(s.pdf_ready)}</td><td>{number(s.pdf_save)}</td><td>{number(s.pdf_saved)}</td></>;
}
export function customerActivityPage(customers:AdminCustomerActivity[],search:string,page:number){
  const query=search.trim().toLowerCase();
  const filtered=customers.filter(customer=>[customer.id,customer.name,customer.email,customer.company].some(value=>value.toLowerCase().includes(query)));
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const current=Math.max(0,Math.min(page,pages-1));
  return {rows:filtered.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE),total:filtered.length,pages,current};
}
export default function AdminUsageTable({customers,period,groups,at,onSelect}:{customers:AdminCustomerActivity[];period:ActivityPeriod;groups:Record<'owner'|'customers'|'network',ActivityStats>;at:number;onSelect:(id:string)=>void}){
  const [search,setSearch]=useState(''),[page,setPage]=useState(0),[copyMessage,setCopyMessage]=useState('');
  const result=customerActivityPage(customers,search,page);
  async function copyId(id:string){
    try{await navigator.clipboard.writeText(id);setCopyMessage('고객 ID를 복사했습니다.');}
    catch{setCopyMessage('ID를 선택해 직접 복사해 주세요.');}
  }
  return <div className="admin-customer-usage">
    <div className="admin-section-head"><h3>고객 ID별 이용 현황</h3><label className="admin-customer-search">고객 검색 <input value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}} placeholder="고객 ID · 이름 · 회사 · 이메일"/></label></div>
    {copyMessage&&<p className="access-muted" role="status">{copyMessage}</p>}
    <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="이용 주체 및 고객 ID별 집계">
      <table className="admin-event-table admin-customer-table"><thead><tr><th scope="col">이용 주체 / 고객 고유 ID</th><th scope="col">URL 호출</th><th scope="col">호출 완료 / 실패</th><th scope="col">PDF 생성</th><th scope="col">다운로드 요청</th><th scope="col">저장 완료 확인</th></tr></thead>
        <tbody>
          <tr><th scope="row">관리자 본인</th><Counts stats={groups.owner}/></tr>
          <tr className="admin-customer-total"><th scope="row">고객 계정 합계<small>전체 {number(customers.length)}개 계정</small></th><Counts stats={groups.customers}/></tr>
          {result.rows.map(customer=><tr key={customer.id} data-customer-id={customer.id}>
            <th scope="row" className="admin-customer-identity">
              <div className="admin-customer-name"><button type="button" className="admin-text-button" onClick={()=>onSelect(customer.id)} aria-label={`${customer.name} · ${customer.id} 활동 상세 보기`}>{customer.name} ↗</button><span className="admin-badge">{customer.status==='suspended'?'이용 중지':customer.expiresAt<=at?'기간 종료':!customer.activated?'활성화 대기':'승인됨'}</span></div>
              {customer.company&&<small>{customer.company}</small>}<small>{customer.email}</small>
              <div className="admin-customer-id"><code>{customer.id}</code><button type="button" className="admin-text-button" onClick={()=>void copyId(customer.id)} aria-label={`${customer.id} 고객 ID 복사`}>ID 복사</button></div>
            </th><Counts stats={customer.periods[period]}/>
          </tr>)}
          {!result.rows.length&&<tr><td colSpan={6} className="access-empty">{customers.length?'검색 조건에 맞는 고객 계정이 없습니다.':'등록된 고객 계정이 없습니다. 고객 승인 시 고유 ID별로 표시됩니다.'}</td></tr>}
          <tr><th scope="row"><button type="button" className="admin-text-button" onClick={()=>onSelect(NETWORK_ACTIVITY_ID)}>허용 네트워크 · 비로그인 ↗</button></th><Counts stats={groups.network}/></tr>
        </tbody>
      </table>
    </div>
    {result.total>0&&<div className="admin-pagination"><span>고객 {number(result.total)}명 중 {number(result.current*PAGE_SIZE+1)}–{number(Math.min((result.current+1)*PAGE_SIZE,result.total))}명</span><button type="button" className="access-secondary" disabled={result.current===0} onClick={()=>setPage(result.current-1)}>이전</button><span>{result.current+1} / {result.pages}</span><button type="button" className="access-secondary" disabled={result.current+1>=result.pages} onClick={()=>setPage(result.current+1)}>다음</button></div>}
  </div>;
}
