import ReportJumpLink from './ReportJumpLink';
import React from 'react';
import type {WebsitePurpose} from '@/lib/websitePurpose';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import CommunitySamples from './CommunitySamples';
import {LongReadingText} from './EvidenceFlow';

type Evidence=WebsitePurpose['evidence'][number];
const labels={observed:'관련 문구 확인',review:'추가 확인',not_applicable:'해당 없음'} as const;
const evidenceKey=(e:Evidence)=>JSON.stringify([e.text,e.locator]);
export const purposeCheckAnchor=(index:number)=>`report-purpose-check-${index+1}`;

export default function WebsitePurposePanel({purpose}:{purpose:WebsitePurpose}){
  const checks=purpose.checks.filter(c=>c.status!=='not_applicable');
  const sources=new Map<string,Evidence&{id:string;number:number}>();
  for(const evidence of [...purpose.evidence,...purpose.goal.evidence,...checks.flatMap(c=>c.evidence)]){
    const key=evidenceKey(evidence),number=sources.size+1;
    if(!sources.has(key))sources.set(key,{...evidence,number,id:`report-purpose-source-${number}`});
  }
  const classified=new Set(purpose.evidence.map(evidenceKey));
  const goal=new Set(purpose.goal.evidence.map(evidenceKey));
  const captured=purpose.capturedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date(purpose.capturedAt))+' (한국시간)':'기록 없음';
  return <section className="report-card report-purpose-evidence" aria-label="페이지 목적별 분석">
    <div className="report-card-heading">
      <h3>이 페이지에서 고객이 할 수 있는 일</h3>
      <dl className="report-purpose-overview">
        <div><dt>페이지 유형</dt><dd>{purpose.sector?.label||purpose.label}</dd></div>
        <div><dt>다음 행동</dt><dd>{purpose.goal.label}<small>{purpose.goal.observed?'관련 문구 확인':'실제 행동 경로 확인 필요'}</small></dd></div>
      </dl>
    </div>
    <div className="report-purpose-checks">{checks.map((c,index)=><article key={c.id} id={purposeCheckAnchor(index)}>
      <div className="report-coverage-row-heading"><h4>{c.label}</h4><span className="report-pill">{labels[c.status]}</span></div>
      <div className="report-purpose-instruction"><strong>실제 화면에서 확인할 내용</strong><LongReadingText text={c.guide}/></div>
      {c.evidence.length>0&&<ul className="report-purpose-links" aria-label={`${c.label} 관련 근거`}>{Array.from(new Set(c.evidence.map(evidenceKey))).map(key=>{
        const source=sources.get(key);
        return source?<li key={key}><ReportJumpLink id={source.id}>{c.label} 근거 {source.number}</ReportJumpLink></li>:null;
      })}</ul>}
      {!c.evidence.length&&<p className="report-note">이 항목을 뒷받침할 문구가 수집되지 않았습니다.</p>}
    </article>)}</div>
    {purpose.community&&<CommunitySamples context={purpose.community}/>}
    <details className="report-inline-details mt-5">
      <summary>분류 근거 원문과 수집 범위 · {sources.size}개 근거</summary>
      <p className="report-note">{purpose.note}</p>
      <p className="report-note">수집 시각 {captured}</p>
      <ol className="report-purpose-originals">{Array.from(sources,([key,e])=>{
        const url=safeHttpUrl(e.locator);
        const context=[classified.has(key)&&'분류 근거',goal.has(key)&&'다음 행동 근거'].filter(Boolean).join(' · ');
        return <li key={key} id={e.id}>
          <strong>근거 {e.number}{context&&` · ${context}`}</strong>
          <blockquote>{e.text}</blockquote>
          {url?<a href={url} target="_blank" rel="noopener noreferrer">이 근거의 원문 페이지 열기 ↗</a>:<small>확인 위치 {e.locator}</small>}
        </li>;
      })}</ol>
      <ReportJumpLink id="report-site-guide">수집한 전체 원문·링크 모음</ReportJumpLink>
    </details>
  </section>;
}
