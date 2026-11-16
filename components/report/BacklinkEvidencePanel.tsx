'use client';
import {useRef,useState} from 'react';
import type {BacklinkRow} from '@/lib/backlinkAudit';
import {requestJson} from '@/lib/client/request';
import {comparableUrl,maxSearchFileBytes,sourceUrlsFromFile} from '@/lib/searchConsoleFiles';
import {RoleBox} from './ReportRole';

const status={linked:'연결 확인',mentioned:'브랜드 언급 확인',broken:'대상 오류',review:'확인 불가',no_evidence:'근거 미감지'};
const hrefProps={target:'_blank',rel:'noopener noreferrer'};
export default function BacklinkEvidencePanel({target,brand}:{target:string;brand:string}){
  const [urls,setUrls]=useState(''),[rows,setRows]=useState<BacklinkRow[]>([]),[sample,setSample]=useState(false);
  const [brandName,setBrandName]=useState(brand.slice(0,100));
  const [count,setCount]=useState(0),[working,setWorking]=useState(false),[error,setError]=useState('');
  const inputRevision=useRef(0);
  async function importFile(file:File|undefined){
    if(!file)return;
    setError('');
    const revision=++inputRevision.current;
    try{
      if(file.size>maxSearchFileBytes)throw Error('1MB 이하의 CSV를 선택하거나 상위 일부 행만 내보내 주세요.');
      const addresses=[...new Set(sourceUrlsFromFile(await file.text()))];
      if(revision!==inputRevision.current)return;
      if(!addresses.length)throw Error('외부 원문 주소를 찾지 못했습니다.');
      setUrls(addresses.slice(0,6).join('\n'));setSample(true);setCount(addresses.length);setRows([]);
    }catch(error){if(revision===inputRevision.current)setError(error instanceof Error?error.message:'CSV를 읽지 못했습니다.');}
  }
  async function inspect(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(working)return;
    const sources=[...new Set(urls.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean))];
    if(!sources.length||sources.length>6||sources.some(u=>!comparableUrl(u)||u.length>2048)){
      setError('공개 HTTP(S) 원문 URL을 한 줄에 하나씩, 1~6개 입력해 주세요.');
      return;
    }
    ++inputRevision.current;setError('');setRows([]);setWorking(true);
    try{
      const result=await requestJson<{rows:BacklinkRow[]}>('/api/search-evidence',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'links',target,sources,brand:brandName})},21000);
      setRows(result.rows);
    }catch(error){setError(error instanceof Error?error.message:'외부 링크를 확인하지 못했습니다.');}
    finally{setWorking(false);}
  }
  const counts=[{label:'검사한 원문',value:rows.length,state:'observed'},
    {label:'사이트 링크 감지',value:rows.filter(row=>row.target).length,state:'observed'},
    {label:'도착 페이지 오류',value:rows.filter(row=>row.status==='broken').length,state:'action'}];
  return <section className="report-card search-evidence-card">
    <details><summary><strong>내 사이트로 들어오는 링크</strong></summary>
      <div className="search-evidence-stack">
        <p className="report-note">기사·협업 게시물 등 확인하려는 공개 원문 주소를 붙여 넣으세요. 서치콘솔의 최신 링크 CSV를 쓰면 목록 중 최대 6개를 확인합니다.</p>
        <form className="access-form" onSubmit={inspect}>
          <label>외부 원문 URL<textarea rows={3} value={urls} disabled={working} onChange={e=>{++inputRevision.current;setUrls(e.target.value);setSample(false);setRows([]);setError('');}} placeholder="https://example.com/article"/></label>
          <label>브랜드명 (언급 확인용)<input value={brandName} maxLength={100} disabled={working} onChange={e=>{setBrandName(e.target.value);setRows([]);}}/></label>
          <label>서치콘솔 링크 CSV<input type="file" accept=".csv,text/csv" disabled={working} onChange={e=>{void importFile(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
          {sample&&<p className="report-note">서치콘솔 내보내기 표본 · {count.toLocaleString('ko-KR')}개 주소 중 최대 6개</p>}
          <button className="report-secondary-button" disabled={working}>{working?'원문 확인 중…':'외부 링크 확인'}</button>
        </form>
        {error&&<p className="access-error" role="alert">{error}</p>}
        {rows.length>0&&<>
          <div className="naver-counts">{counts.map(card=><div key={card.label} data-state={card.state}><span>{card.label}</span><strong>{card.value}<small>건</small></strong></div>)}</div>
          <div className="site-diagnostics-scroll" tabIndex={0} role="region" aria-label="백링크 원문 확인 결과"><table>
            <caption className="sr-only">외부 원문에서 링크와 도착 페이지 확인</caption>
            <thead><tr><th scope="col">외부 원문</th><th scope="col">감지 결과</th><th scope="col">실행 내용</th></tr></thead>
            <tbody>{rows.map(row=><tr key={row.source}>
              <th scope="row"><a href={row.observedSource} {...hrefProps}>{row.observedSource} ↗</a></th>
              <td><strong>{status[row.status]}</strong>{row.target&&<small>{row.target}{row.http?' · HTTP '+row.http:''}</small>}
                {row.target&&<small>{row.anchor||'링크 문구 미감지'} · {row.rel?.length?row.rel.join(' · '):'특수 rel 표기 미감지'}</small>}
                {row.destination&&row.destination!==row.target&&<small>이동 후 · {row.destination}</small>}
                <small>{row.note}</small>
              </td>
              <td>{row.status==='broken'?'문맥에 맞는 최신 도착 페이지를 찾아 원문 담당자에게 링크 수정을 요청':
                row.status==='mentioned'?'문맥을 읽고 원문 독자에게 도움이 되는 자료가 있을 때 편집자에게 알려주기':
                row.status==='linked'?'협찬·광고 링크라면 원문 담당자와 sponsored 표기를 확인':
                '원문과 도착 주소의 브라우저 접근 상태를 직접 확인'}</td>
            </tr>)}</tbody>
          </table></div>
          <RoleBox role="verify" label="다시 확인"><p>편집 후 같은 원문 URL을 다시 검사해 링크와 도착 페이지를 확인하세요. 수집이 제한된 원문은 담당자가 직접 확인하세요.</p></RoleBox>
        </>}
        <div className="naver-sources"><a href="https://search.google.com/search-console/links" {...hrefProps}>서치콘솔 링크 보고서 ↗</a><a href="https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links" {...hrefProps}>링크 표시 가이드 ↗</a></div>
      </div>
    </details>
  </section>;
}
