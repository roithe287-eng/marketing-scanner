"use client";
import {CompactText,VisualSteps,SourceReferenceDiagram} from './ReportVisualSummary';
import React,{useState} from 'react';
import EvidenceFlow from './EvidenceFlow';
import ReportJumpLink from './ReportJumpLink';
import {CopyWork} from './ExecutionWorkflow';
import {observationQuestionAnchor} from '@/lib/reportVisuals';
import {Guidebook} from './SiteGuidebook';
import DiagnosisIcon from './DiagnosisIcon';
import {reportGoal} from '@/lib/reportGoal';
import {contentBrief,insightNotes,sourceReferenceGuide,messageThemes,type ReportInsights} from '@/lib/reportInsights';

function Heading({label,title,note}:{label:string;title:string;note?:string}) {return <div className="report-card-heading"><p className="report-eyebrow">{label}</p><h3>{title}</h3>{note&&<CompactText className="report-note" text={note} summary={label==='SOURCE DIRECTORY'?'AI 답변이 인용한 외부 링크입니다. 경쟁사 여부는 별도 확인이 필요합니다.':label==='BRAND ANSWER REVIEW'?'브랜드를 언급한 답변의 업체명·서비스·출처를 대조하세요.':label==='MESSAGE COVERAGE'?'제목·설명의 표현 비교입니다. 미탐지는 서비스 부재를 뜻하지 않습니다.':undefined}/>}{label==='QUESTION → PAGE'&&<VisualSteps kind="questions"/>}</div>;}
function Empty({children}:{children:React.ReactNode}) {return <p className="report-empty">{children}</p>;}
function Link({url,children}:{url:string;children:React.ReactNode}) {return <a className="report-source-link" href={url} target="_blank" rel="noopener noreferrer">{children} ↗</a>;}
export function CollectionCoverage({data}:{data:ReportInsights}) {return <article className="report-card" aria-label="데이터 수집 현황"><Heading label="DATA COVERAGE" title="어디까지 확인했나요?" note="현재 보고서에 저장된 범위입니다. 항목별 확인 범위가 다르면 미확인 상태를 함께 표시합니다."/><div className="report-four-grid">{data.coverage.map((c,i)=><div className="report-stat" key={c.label}><div className="report-stat-top"><DiagnosisIcon axis={i===0?'firstView':i===1?'seo':i===2?'trust':'adLanding'}/><span className="report-pill">{c.state}</span></div><h4>{c.label}</h4><strong>{c.value}</strong><p>{c.detail}</p></div>)}</div></article>;}
export function ConversionPath({data}:{data:ReportInsights}) {
  const goal=reportGoal(data.sitePurpose);
  if(data.evidenceReview)return <article id="report-conversion-verification" className="report-card" aria-label="전환 흐름 직접 확인">
    <Heading label="CONVERSION REVIEW" title="고객이 목표 행동을 끝까지 할 수 있나요?" note={`확인할 목표는 ${data.sitePurpose?.goal.label||'페이지의 다음 행동'}입니다. 휴대폰에서 진단한 주소를 열어 고객처럼 이용해 보세요.`}/>
    <VisualSteps label="직접 확인할 고객 동선" items={[
      {title:'첫 화면 읽기',detail:'누구를 위한 페이지인지 확인하세요.',icon:'firstView'},
      {title:'결정에 필요한 정보 찾기',detail:'대상·이용 조건·근거를 찾아보세요.',icon:'trust'},
      {title:'목표 행동까지 이동',detail:goal?.start||'버튼 문구와 열린 화면이 맞는지 확인하세요.',icon:'cta'},
      {title:goal?.label||'마지막 화면 확인',detail:goal?.check||'목표가 끝났음을 화면이나 실제 기록으로 확인하세요.',icon:'conversionFlow'},
    ]}/>
    <p className="report-note">어느 단계에서 막혔는지 화면과 함께 기록하세요. 방문 대비 완료율과 이탈 원인은 분석 계정에서 별도로 확인합니다.</p>
  </article>;

  const lowest=Math.min(...data.stages.map(s=>s.score));
  return <article className="report-card" aria-label="고객 전환 준비도"><Heading label="CONVERSION READINESS" title="고객이 결정하기까지, 네 단계" note={insightNotes.stages}/><ol className="report-journey">{data.stages.map((s,i)=><li key={s.key} className={s.score===lowest?'is-focus':''}><div className="report-step-top"><span>{String(i+1).padStart(2,'0')}</span>{s.score===lowest&&<b>우선 검토</b>}</div><h4>{s.label}</h4><div className="report-score"><strong>{s.score}</strong><span>/ 100</span></div><div className="report-meter" aria-hidden="true"><i style={{width:`${s.score}%`}}/></div><p>{s.action}</p></li>)}</ol></article>;
}
export function AnswerPageMap({data,linkToObservations=false}:{data:ReportInsights;linkToObservations?:boolean}) {
  return <article className="report-card" aria-label="질문과 답변 페이지 지도">
    <Heading label="QUESTION → PAGE" title="고객 질문에 답할 페이지를 고르세요" note={insightNotes.questions}/>
    {data.questions.length?<div className="report-detail-list">{data.questions.map(q=><details key={q.question}>
      <summary><span className="report-index">{`Q${q.id}`}</span><span className="report-summary-title">{q.question}</span><span className="report-pill">{q.kind}</span></summary>
      <div className="report-detail-body">
        <p>{q.evidence}</p>
        {q.target&&<Link url={q.target}>{q.kind==='인용 페이지'?'AI가 인용한 페이지 열기':'답변을 추가할 후보 페이지 열기'}</Link>}
        {q.target&&<small className="report-url-inline">{q.target}</small>}
        <div className="report-brief-grid">{['직접 답변','적용 조건·범위','검증 가능한 근거','최종 확인 날짜'].map((value,i)=><div key={value}><span>{String(i+1).padStart(2,'0')}</span><strong>{value}</strong></div>)}</div>
        <p className="report-note">가격, 후기, 성과를 쓰려면 담당자에게 사실을 확인하세요. 질문 바로 아래에 답변과 근거를 붙이세요.</p>
        <CopyWork text={contentBrief(q.question,q.target)} label="이 질문의 콘텐츠 작성 틀 복사"/>
        {linkToObservations&&<p className="report-related-link"><ReportJumpLink id={observationQuestionAnchor(q.id)}>이 질문의 AI 답변과 출처 보기</ReportJumpLink></p>}
      </div>
    </details>)}</div>:<Empty>이 보고서에 저장된 질문별 AI 관측이 없습니다. 관측이 수집되면 질문에 맞는 페이지를 이곳에서 검토할 수 있습니다.</Empty>}
  </article>;
}
export function BrandReview({data,linkToObservations=false}:{data:ReportInsights;linkToObservations?:boolean}) {
  const stats=data.reviewSummary;
  return <article className="report-card" aria-label="브랜드 답변 검토함">
    <Heading label="BRAND ANSWER REVIEW" title="AI 설명이 우리 정보와 일치하나요?" note={insightNotes.reviews}/>
    <dl className="report-review-stats">{[['저장된 답변',data.obs?stats.total:'—'],['출처 확인 완료',data.obs?stats.verified:'—'],['우선 대조 대상',stats.verified?data.reviews.length:'—']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}<small>{typeof value==='number'?'건':''}</small></dd></div>)}</dl>
    <div><CompactText className="report-explanation" text={data.reviewExplanation}/></div><VisualSteps kind="brand"/>
    {!!stats.unavailable&&<p className="report-note">나머지 {stats.unavailable}건은 검색·출처 확인 미완료 또는 중복 관측으로 집계에서 제외했습니다. {linkToObservations?<ReportJumpLink id="report-view-geo-observations">집계에서 제외된 답변의 상태 보기</ReportJumpLink>:'실제 AI 답변에서 개별 상태를 확인하세요.'}</p>}
    {!!stats.verified&&<details className="report-inline-details"><summary>대조 대상 선정 근거 보기</summary><ul className="report-reason-list"><li>브랜드 미언급: {stats.noBrand}건</li><li>브랜드 언급 여부 미확인: {stats.unknownMention}건</li><li>브랜드 언급 + 자사 출처 연결: {stats.ownSource}건</li><li>브랜드 언급 + 대조 가능한 외부 출처 미확인: {stats.missingSource}건</li><li>브랜드 언급 + 외부 출처만 연결: {data.reviews.length}건 → 우선 대조 대상</li></ul><p className="report-note">0건은 위 선정 조건에 맞는 답변이 없다는 뜻입니다. 모든 답변의 내용 대조가 완료됐다는 뜻은 아닙니다.</p></details>}
    {!!data.reviews.length&&<div className="report-detail-list">{data.reviews.map((r,i)=>{
      const original=data.questions.find(q=>q.question===r.question.trim());
      return <details key={`${r.engine}-${i}`}>
        <summary><span className="report-pill warning">대조 필요</span><span className="report-summary-title">{r.question}</span><span>{r.engine}</span></summary>
        <div className="report-detail-body">
          <ol className="report-verification-list">
            <li>답변의 업체명과 출처에 적힌 업체명이 일치하는지 확인하세요.</li>
            <li>소개된 서비스, 가격, 이용 조건을 우리 최신 안내 페이지와 대조하세요.</li>
            <li>달라진 내용이 있다면 확인 날짜와 근거 URL을 기록하세요.</li>
          </ol>
          {linkToObservations&&original
            ? <ReportJumpLink id={observationQuestionAnchor(original.id)}>대조할 AI 답변 원문과 출처 열기</ReportJumpLink>
            : <><blockquote className="report-answer">{r.answer}</blockquote><div className="report-source-list">{r.sources.map((s,index)=><Link key={`${s.url}-${index}`} url={s.url}>{s.title||s.url}</Link>)}</div></>}
        </div>
      </details>;
    })}</div>}
  </article>;
}
export function SourceDirectory({data,linkToObservations=false}:{data:ReportInsights;linkToObservations?:boolean}) {
  const [filter,setFilter]=useState('all'),[expanded,setExpanded]=useState(true);
  const filtered=data.eligibleSources.filter(s=>filter==='all'||s.ownership===filter),shown=expanded?filtered:filtered.slice(0,6);
  return <article className="report-card" aria-label="AI 출처 검토함"><Heading label="SOURCE DIRECTORY" title="어떤 외부 페이지가 답변의 근거였나요?" note={insightNotes.sources}/>
    <div className="report-filter-row" role="group" aria-label="출처 구분 필터">{([['all','전체'],['external','외부 도메인 확인'],['unresolved','도메인 미확인']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>{setFilter(key);setExpanded(true);}}>{label}</button>)}<span role="status">{filtered.length}개 URL</span></div>
    {shown.length?<div className="report-source-grid">{shown.map(s=><div className="report-source-item" key={s.url}><div className="report-source-meta"><span className="report-pill">{s.ownership==='unresolved'?'도메인 미확인':'외부'}</span><span>{s.observations.length}건의 관측</span></div><h4><Link url={s.url}>{s.title}</Link></h4><p className="report-note">{s.domain}</p><details><summary>연결된 질문 {s.questions.length}개</summary><ul>{s.questions.map(q=>{const original=data.questions.find(row=>row.question===q);return <li key={q}>{linkToObservations&&original?<ReportJumpLink id={observationQuestionAnchor(original.id)}>{q}</ReportJumpLink>:q}</li>;})}</ul></details></div>)}</div>:<Empty>{data.excludedSources.length?'자사몰·대형몰 등을 제외한 뒤 이 조건에 남는 출처가 없습니다. 아래 제외 내역에서 수집 여부를 확인할 수 있습니다.':data.reviewSummary.verified?'이 조건에 해당하는 출처 URL이 답변에 저장되지 않았습니다.':'검색·출처 확인이 완료된 답변이 없어 표시할 외부 출처가 없습니다.'}</Empty>}
    {filtered.length>6&&<button type="button" className="report-secondary-button mt-4" onClick={()=>setExpanded(!expanded)}>{expanded?'출처 접기':`전체 ${filtered.length}개 출처 보기`}</button>}
    {!!data.eligibleSources.length&&<details className="report-inline-details report-section-reading-guide">
      <summary>외부 출처에서 참고할 수 있는 구성 보기</summary>
      <SourceReferenceDiagram details={<><h4>{sourceReferenceGuide.title}</h4><p>{sourceReferenceGuide.purpose}</p><p>{sourceReferenceGuide.examples}</p><p>{sourceReferenceGuide.check}</p></>}/>
    </details>}
    {!!data.excludedSources.length&&<details className="report-inline-details report-excluded-sources"><summary>목록에서 제외한 출처 {data.excludedSources.length}개 · 사유와 원문 기록</summary><p className="report-note">추천·비교 목록에서는 제외했습니다. AI가 실제 연결한 출처라는 관측 기록은 확인용으로 보존합니다.</p><ul>{data.excludedSources.map(s=><li key={s.url}><span><strong>{s.domain}</strong> · {s.reason}</span><Link url={s.url}>{s.title}</Link><small>{s.observations.length}건의 관측 · {s.questions.join(' / ')}</small></li>)}</ul></details>}
  </article>;
}
function MessageSignal({match}:{match:string|null|undefined}) {
  const state=match===undefined?'unknown':match?'found':'absent';
  return <span className={`report-message-signal is-${state}`}><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/>{state==='found'?<path d="m5 8 2 2 4-4"/>:state==='absent'?<path d="M5.5 8h5"/>:<><path d="M6.5 5.7a1.5 1.5 0 0 1 3 .3c0 1-1.5 1-1.5 2"/><path d="M8 10.5h.01"/></>}</svg><span>{match===undefined?'미확인':match||'미탐지'}</span></span>;
}
function messageReviewLabel(row:ReportInsights['messageRows'][number]) {
  if(row.collectionFailed)return '페이지 수집 실패 · 비교 보류';
  if(row.available)return '제목·설명 모두 확인';
  return row.fieldCount?'제목·설명 중 1개 확인 · 비교 보류':'수집 미확인 · 제목과 설명 없음';
}

export function MessageMap({data}:{data:ReportInsights}) {
  const comparable=data.messageRows.filter(row=>!row.isOwn&&row.available).length;
  return <article className="report-card" aria-label="경쟁사 메시지 비교 지도">
    <Heading label="MESSAGE COVERAGE" title="제목과 설명에서 찾은 고객 선택 정보" note={insightNotes.messages}/>
    <p className="report-note">{data.competitorCount?`비교 후보 ${data.competitorCount}곳 중 제목과 설명을 모두 확보한 곳은 ${comparable}곳입니다.`:'저장된 외부 비교 후보가 없습니다.'}</p>
    <div className="report-message-legend" aria-label="메시지 탐지 상태 범례"><MessageSignal match="표현 탐지"/><MessageSignal match={null}/><MessageSignal match={undefined}/></div>
    <div className="report-table-scroll"><table className="report-message-table">
      <caption className="sr-only">제목·메타 설명에 저장된 메시지 표현 비교</caption>
      <thead><tr><th scope="col">사이트</th>{messageThemes.map(t=><th scope="col" key={t.label}>{t.label}</th>)}</tr></thead>
      <tbody>{data.messageRows.map((row,i)=><tr key={`${row.name}-${i}`} className={row.isOwn?'is-own':''}>
        <th scope="row">{row.name}<small>{messageReviewLabel(row)}</small></th>
        {row.cells.map(cell=><td key={cell.label} className={cell.match?'has-match':''}><MessageSignal match={cell.match}/></td>)}
      </tr>)}</tbody>
    </table></div>
    <div className="report-message-mobile">{data.messageRows.map((row,i)=><div key={`${row.name}-${i}`}>
      <h4>{row.name} <span>{messageReviewLabel(row)}</span></h4>
      <dl>{row.cells.map(cell=><div key={cell.label}><dt>{cell.label}</dt><dd><MessageSignal match={cell.match}/></dd></div>)}</dl>
    </div>)}</div>
    <div className="report-callout"><strong>우리 문구에서 보완할 정보</strong>
      {data.messageOpportunities.length?<ul className="report-message-opportunities">{data.messageOpportunities.map(o=><li key={o.label}><strong>{o.label}</strong><span>비교 가능한 후보 {o.total}곳 중 {o.count}곳에서 확인</span></li>)}</ul>:<p>현재 저장된 제목·설명에서 제안할 공통 표현이 없거나, 비교할 정보가 충분하지 않습니다.</p>}
      {data.messageOpportunities.length>0&&<p>실제 제공하는 내용과 연결되는 항목을 먼저 검토하세요.</p>}
    </div>
    <details className="report-inline-details"><summary>업체별 제목·설명 확인</summary>
      {data.messageRows.map((row,i)=><div className="report-evidence" key={`${row.name}-${i}`}>
        <strong>{row.name}</strong>
        <p className="report-note">{messageReviewLabel(row)}</p>
        {row.fieldCount>0&&<dl className="report-message-originals">
          <div><dt>페이지 제목</dt><dd>{row.title||'저장된 원문 없음'}</dd></div>
          <div><dt>메타 설명</dt><dd>{row.description||'저장된 원문 없음'}</dd></div>
        </dl>}
        {row.url&&<Link url={row.url}>{row.name} 페이지 열기</Link>}
      </div>)}
    </details>
  </article>;
}
export function KeywordOpportunities({data,compact=false}:{data:ReportInsights;compact?:boolean}) {
 const [selected,setSelected]=useState('');
 const current=data.gaps.find(k=>k.keyword===selected);
 return <article className={compact?'keyword-panel-content':'report-card'} aria-label="키워드 연결 기회">{compact?<h4>검색 제목·설명에 연결할 표현 검토</h4>:<Heading label="KEYWORD REVIEW" title="검색 제목·설명에 연결할 표현 검토"/>}<p className="report-note">실제 상품·서비스를 대표하는 단어만 선택하세요. 제목에 없다고 반드시 추가할 필요는 없습니다.</p>
 <VisualSteps kind="keywords" label="키워드 선택과 적용 순서"/>
 {data.gaps.length?<div className="keyword-choice-list" role="group" aria-label="대표 표현 선택">{data.gaps.map(k=><button type="button" key={k.keyword} aria-pressed={selected===k.keyword} onClick={()=>setSelected(selected===k.keyword?'':k.keyword)}><strong>{k.keyword}</strong><span>수집 범위에서 {k.count}회 등장</span><small>{!k.inTitle?'검색 제목에 없음':''}{!k.inTitle&&!k.inMetaDescription?' · ':''}{!k.inMetaDescription?'검색 설명에 없음':''}</small><b>{selected===k.keyword?'선택됨':'이 표현 검토하기'}</b></button>)}</div>:<Empty>현재 자료에서 제목·설명 보강을 권할 만한 표현을 찾지 못했습니다. 영문 브랜드·상품 코드는 의미와 페이지 주제의 연결을 먼저 확인해야 합니다. 전체 집계와 표현별 검토에서 원문 빈도를 확인할 수 있습니다.</Empty>}
 {current&&<div className="keyword-next-step" aria-live="polite"><strong>‘{current.keyword}’이 대표 상품·서비스라면</strong><p>검색 제목은 ‘{current.keyword}의 실제 특징 또는 제공 범위 | 브랜드명’처럼 페이지 내용을 설명하세요. 본문에 없는 약속은 넣지 마세요.</p><ReportJumpLink id={current.inTitle?'report-edit-description':'report-edit-title'}>검색 제목·설명 수정안 열기</ReportJumpLink></div>}
 {!!data.heldKeywords.length&&<details className="report-inline-details"><summary>제목 보강에서 보류한 표현 {data.heldKeywords.length}개</summary><ul className="keyword-held-list">{data.heldKeywords.map(k=><li key={k.keyword}><strong>{k.keyword} · {k.count}회</strong><p>{k.reason}</p></li>)}</ul></details>}
 <p className="report-note">사용 횟수는 이 페이지에서 수집한 글의 빈도입니다. 검색량이나 인기 순위를 뜻하지 않습니다.</p></article>;
}
export function ActionBacklog({data}:{data:ReportInsights}) {
  const [group,setGroup]=useState('전체');const [query,setQuery]=useState('');const [expanded,setExpanded]=useState(true);
  const groups=['전체',...new Set(data.tasks.map(t=>t.group))];const filtered=data.tasks.filter(t=>(group==='전체'||t.group===group)&&`${t.title} ${t.evidence} ${t.action}`.toLowerCase().includes(query.trim().toLowerCase()));const shown=expanded?filtered:filtered.slice(0,6);
  const names={fail:'우선 보완',warning:'보완',review:'내용 검토'};
  return <article className="report-card" aria-label="통합 보완 목록"><Heading label="ACTION BACKLOG" title="놓치지 않고 실행할 보완 목록" note={insightNotes.tasks}/><div className="report-backlog-controls"><label>보완 항목 검색<input type="search" placeholder="예: H1, 이미지, 출처" value={query} onChange={e=>{setQuery(e.target.value);setExpanded(true);}}/></label><p role="status"><strong>{filtered.length}</strong> / {data.tasks.length}개 항목</p></div><div className="report-backlog-distribution" role="group" aria-label="보완 분야 필터">{groups.map(g=>{const count=g==='전체'?data.tasks.length:data.tasks.filter(t=>t.group===g).length;return <button type="button" key={g} aria-pressed={g===group} onClick={()=>{setGroup(g);setExpanded(true);}}><span>{g}</span><strong>{count}<small>개</small></strong><span className="report-meter" aria-hidden="true"><i style={{width:`${data.tasks.length?100*count/data.tasks.length:0}%`}}/></span></button>;})}</div><div className="report-detail-list">{shown.map(t=><details key={t.id}><summary><span className={`report-pill ${t.status==='fail'?'danger':t.status==='warning'?'warning':''}`}>{names[t.status]}</span><span className="report-summary-title">{t.title}</span><span className="report-source-name">{t.group}</span></summary><div className="report-detail-body"><EvidenceFlow items={[{label:'확인 근거',role:'current',content:t.evidence},{label:'실행할 내용',role:'proposal',content:t.action}]}/><p className="report-note">진단 출처: {t.source} · 실제 수정 전 담당자 확인 필요</p><Guidebook title={t.title} scope={t.guideScope} instructions={t.instructions} completion={t.completion} current={t.current} evidence={t.evidence} proposal={t.action}/></div></details>)}</div>{!shown.length&&<Empty>이 조건에 해당하는 보완 항목이 없습니다.</Empty>}{filtered.length>6&&<button type="button" className="report-secondary-button mt-4" onClick={()=>setExpanded(!expanded)}>{expanded?'보완 목록 접기':`전체 ${filtered.length}개 보완 항목 보기`}</button>}</article>;
}
