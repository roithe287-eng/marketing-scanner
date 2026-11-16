'use client';
import {useRef,useState} from 'react';
import {comparablePeriods,maxSearchFileBytes,parseSearchConsoleFiles,sampleTotals,searchOpportunities,type DateRange,type SearchConsoleSample} from '@/lib/searchConsoleFiles';
import {RoleBox} from './ReportRole';
import ReportJumpLink from './ReportJumpLink';

const format=(v:number|null)=>v===null?'미확인':v.toLocaleString('ko-KR',{maximumFractionDigits:2});
const pct=(v:number|null)=>v===null?'미확인':format(v)+'%';
const hrefProps={target:'_blank',rel:'noopener noreferrer'};
type PeriodKey='recent'|'previous';
type Period={sample?:SearchConsoleSample;range:DateRange;error?:string};
const empty={range:{start:'',end:''}};
const labels:Record<PeriodKey,string>={recent:'최근 기간',previous:'이전 기간'};

export default function SearchConsoleEvidencePanel({target}:{target:string}){
  const [periods,setPeriods]=useState<Record<PeriodKey,Period>>({recent:empty,previous:empty});
  const fileRevision=useRef({recent:0,previous:0});
  function updatePeriod(which:PeriodKey,change:Partial<Period>){
    setPeriods(current=>({...current,[which]:{...current[which],...change}}));
  }
  async function importSample(which:PeriodKey,selected:File[]){
    if(!selected.length)return;
    const revision=++fileRevision.current[which];
    try{
      if(selected.length!==2||selected.some(file=>file.size>maxSearchFileBytes))throw Error('검색어 CSV와 필터 CSV, 각각 1MB 이하 파일 2개를 선택해 주세요.');
      const sample=parseSearchConsoleFiles(await Promise.all(selected.map(file=>file.text())),target);
      if(revision===fileRevision.current[which])updatePeriod(which,{sample,error:undefined});
    }catch(error){
      if(revision===fileRevision.current[which])updatePeriod(which,{sample:undefined,error:error instanceof Error?error.message:'검색 실적 파일을 읽지 못했습니다.'});
    }
  }
  const recent=periods.recent.sample,previous=periods.previous.sample;
  const totals=recent?sampleTotals(recent):null;
  const previousTotals=previous?sampleTotals(previous):null;
  const compare=!!recent&&!!previous&&comparablePeriods(periods.recent.range,periods.previous.range,recent.scopeKey,previous.scopeKey);
  const opportunities=recent?searchOpportunities(recent):null;
  return <section className="report-card search-evidence-card">
    <details><summary><strong>실제 검색어와 랜딩 성과</strong></summary>
      <div className="search-evidence-stack">
        <p className="report-note">Google 서치콘솔에서 이 URL의 검색 실적을 내보내세요. 두 CSV는 브라우저에서 읽으며 공유 보고서와 PDF에 포함되지 않습니다.</p>
        <RoleBox role="location" label="서치콘솔에서 가져오는 순서"><ol className="search-evidence-steps">
          <li>검색 실적에서 검색 유형을 웹으로 설정합니다. 페이지 필터는 정확한 URL을 선택하고 아래 주소를 입력하세요.</li>
          <li>날짜·기기를 선택하고 CSV로 내보냅니다. 압축을 푼 뒤 검색어 CSV와 필터 CSV를 함께 선택하세요.</li>
        </ol><p className="search-evidence-address">{target}</p></RoleBox>
        <div className="search-evidence-upload-grid">
          {(['recent','previous'] as const).map(which=><fieldset key={which}>
            <legend>{labels[which]}{which==='previous'?' (선택)':''}</legend>
            <label className="search-evidence-file">{labels[which]} 검색어·필터 CSV<input type="file" accept=".csv,text/csv" multiple onChange={e=>{void importSample(which,Array.from(e.currentTarget.files||[]));e.currentTarget.value='';}}/></label>
            {periods[which].sample&&<p className="report-note">{periods[which].sample!.rows.length}개 검색어 · {periods[which].sample!.device}{periods[which].sample!.periodLabel?' · '+periods[which].sample!.periodLabel:''}</p>}
            {periods[which].error&&<p className="access-error" role="alert">{periods[which].error}</p>}
            <div className="search-evidence-dates">{(['start','end'] as const).map(key=><label key={key}>{key==='start'?'시작일':'종료일'}<input type="date" aria-label={labels[which]+' '+(key==='start'?'시작일':'종료일')} value={periods[which].range[key]} onChange={e=>updatePeriod(which,{range:{...periods[which].range,[key]:e.target.value}})}/></label>)}</div>
          </fieldset>)}
        </div>
        {totals&&<div className="naver-counts">
          <div data-state="observed"><span>검색어 표본 노출</span><strong>{format(totals.impressions)}</strong></div>
          <div data-state="observed"><span>검색어 표본 클릭</span><strong>{format(totals.clicks)}</strong></div>
          <div data-state="observed"><span>표본 CTR</span><strong>{pct(totals.ctr)}</strong></div>
        </div>}
        {recent&&previous&&!compare&&<p className="report-note">두 파일의 기기·국가 등 필터를 맞추고 겹치지 않는 같은 길이의 날짜 구간을 입력하면 전후 비교를 표시합니다.</p>}
        {compare&&totals&&previousTotals&&<div className="search-evidence-compare">
          <h4>같은 조건의 기간 비교</h4>
          <p className="report-note">입력 기준 · {periods.previous.range.start} ~ {periods.previous.range.end} → {periods.recent.range.start} ~ {periods.recent.range.end} · {recent?.device}</p>
          {([{key:'impressions',label:'노출'},{key:'clicks',label:'클릭'},{key:'ctr',label:'CTR'}] as const).map(metric=>{
            const now=totals[metric.key],before=previousTotals[metric.key],peak=Math.max(1,before??0,now??0);
            const print=metric.key==='ctr'?pct:format;
            return <div key={metric.key} className="search-evidence-comparison-row">
              <strong>{metric.label}</strong>
              {([{name:'이전',value:before},{name:'최근',value:now}]).map(row=><div key={row.name}>
                <span>{row.name}</span><div className="search-meter" aria-hidden="true"><i style={{width:((row.value??0)/peak*100)+'%'}}/></div><b>{print(row.value)}</b>
              </div>)}
            </div>;
          })}
        </div>}
        {opportunities&&<>
          <div className="site-diagnostics-scroll" tabIndex={0} role="region" aria-label="검색어별 개선 후보"><table>
            <caption>{opportunities.hasCandidates?'제목·설명 검토 후보':'대표 노출 검색어'}</caption>
            <thead><tr><th scope="col">검색어</th><th scope="col">노출</th><th scope="col">클릭</th><th scope="col">CTR</th><th scope="col">평균 게재순위</th></tr></thead>
            <tbody>{opportunities.selected.map(row=><tr key={row.query}><th scope="row">{row.query}</th><td>{format(row.impressions)}</td><td>{format(row.clicks)}</td><td>{pct(row.impressions?row.clicks/row.impressions*100:null)}</td><td>{format(row.position)}</td></tr>)}</tbody>
          </table></div>
          <RoleBox role="proposal" label="다음 작업"><p>노출이 있는 검색어의 의도와 이 페이지의 제공 범위를 대조합니다. 같은 의도라면 제목·설명에 페이지의 실제 답을 드러내고, 다른 의도라면 알맞은 기존 페이지로 안내하세요. 게시 후 같은 웹 검색·기기·기간 조건으로 노출·클릭·CTR을 다시 비교하세요.</p></RoleBox>
          <p className="report-note">검색어 CSV에 들어 있는 행의 합계입니다. 평균 게재순위와 검색어별 표본 규모도 함께 확인하세요.</p>
          <div className="naver-sources"><ReportJumpLink id="report-view-search-edits">제목·설명 수정안</ReportJumpLink><ReportJumpLink id="report-view-search-platforms">플랫폼별 수정 위치</ReportJumpLink></div>
        </>}
        <div className="naver-sources"><a href="https://search.google.com/search-console/performance/search-analytics" {...hrefProps}>Google 검색 실적 ↗</a><a href="https://searchadvisor.naver.com/guide/report-expose-ctr" {...hrefProps}>네이버 노출·클릭 확인 경로 ↗</a></div>
      </div>
    </details>
  </section>;
}
