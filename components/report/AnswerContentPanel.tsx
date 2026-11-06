'use client';
import React,{useId,useState} from 'react';
import type {AnswerContentPlan,AnswerQuestion,AnswerSource} from '@/lib/answerContentSchema';
import {ANSWER_CONTENT_TITLE,ANSWER_STATUS,answerPlanText,answerQuestionText} from '@/lib/answerContent';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import type {HospitalPlaceReview} from '@/lib/hospitalPlace';
import HospitalPlacePanel from './HospitalPlacePanel';
import ReportJumpLink from './ReportJumpLink';
import ReportItemPanels from './ReportItemPanels';
import {PagePatternGrid} from './PagePatternGuide';

function CopyText({text,label}:{text:string;label:string}){
  const [message,setMessage]=useState('');
  async function copy(){
    try{await navigator.clipboard.writeText(text);setMessage('복사했습니다.');}
    catch{setMessage('복사할 내용을 선택해 직접 복사해 주세요.');}
  }
  return <div className="answer-copy"><button type="button" onClick={copy}>{label}</button><span role="status" aria-live="polite">{message}</span></div>;
}

function BriefIcon({kind}:{kind:'answer'|'source'|'question'}){
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind==='answer'?<><path d="M3.5 5.5h17v11h-9l-5.5 4v-4H3.5z"/><path d="M7.5 9h9m-9 3h6"/></>:kind==='question'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></>:<><path d="M5.5 3.5h8l5 5v12h-13Z"/><path d="M13.5 4.5v5h4M9 13h6m-6 3.5h4"/></>}
  </svg>;
}

function BriefingEvidence({evidence,targetUrl}:{evidence:AnswerSource[];targetUrl:string}){
  const [selected,setSelected]=useState('');
  const excerptId=useId();
  const item=evidence.find(e=>e.id===selected)||evidence[0];
  if(!item)return <p className="briefing-unavailable">이 질문을 뒷받침하는 페이지 원문을 수집 범위에서 확인하지 못했습니다.</p>;
  const href=safeHttpUrl(item.url??targetUrl);
  return <div className="briefing-evidence">
    <div className="briefing-source-title"><BriefIcon kind="source"/><strong>답변 근거</strong><small>{evidence.length}개</small></div>
    {evidence.length>1&&<div className="briefing-source-picker" role="group" aria-label="답변 근거 선택">{evidence.map((e,i)=>
      <button type="button" key={e.id} aria-controls={excerptId} aria-pressed={item.id===e.id} onClick={()=>setSelected(e.id)}>근거 {i+1}</button>)}</div>}
    <div id={excerptId} className="briefing-excerpt" aria-live="polite"><strong>{item.location}</strong><blockquote>{item.text}</blockquote>
      {href&&<a href={href} target="_blank" rel="noopener noreferrer">{new URL(href).hostname} · 원문 열기 ↗</a>}</div>
  </div>;
}

function BriefingQuestion({q,targetUrl}:{q:AnswerQuestion;targetUrl:string}){
  return <article className="answer-question">
    <div className="briefing-query"><BriefIcon kind="question"/><h4>{q.question}</h4></div>
    <div className="briefing-answer"><div className="briefing-answer-meta"><span><BriefIcon kind="answer"/>{q.draft?'원문 기반 답변 초안':'확인 후 채울 답변 예시'}</span><small data-state={q.status}>{ANSWER_STATUS[q.status]}</small></div>
      <p className="briefing-answer-text">{q.draft||q.template}</p>
      {!q.draft&&<small>대괄호는 실제 운영 정보로 채우세요.</small>}
      <BriefingEvidence evidence={q.evidence} targetUrl={targetUrl}/>
    </div>
  </article>;
}

function BriefingFollowup({q,index}:{q:AnswerQuestion;index:number}){
  return <><details open className="briefing-details"><summary>홈페이지 적용 위치·게시 전 확인</summary><div>
      <strong>적용 위치</strong><p>{q.placement}</p>
      {q.missingFacts.length>0&&<><strong>게시 전 확인</strong><ul>{q.missingFacts.map(f=><li key={f}>{f}</li>)}</ul></>}
      {!!q.steps.length&&<><strong>작성 순서</strong><ol>{q.steps.map(step=><li key={step}>{step}</li>)}</ol></>}
      {q.draft&&q.missingFacts.length>0&&<><strong>추가 작성 형식</strong><p>{q.template}</p></>}
    </div></details>
    <CopyText text={answerQuestionText(q)} label={'질문 '+(index+1)+' · 답변 초안 복사'}/>
  </>;
}

export default function AnswerContentPanel({plan,opportunityFirst=false,placeReview,clinicWebAllowed=true}:{plan?:AnswerContentPlan|null;opportunityFirst?:boolean;placeReview?:HospitalPlaceReview;clinicWebAllowed?:boolean}){
  const keyword=plan?.primaryKeyword;
  return <>
    {placeReview&&<><nav className="report-search-links" aria-label="병의원 검색 분석 바로가기">
      <ReportJumpLink id="hospital-place-title">장소·키워드</ReportJumpLink><ReportJumpLink id="hospital-place-comparison">일반검색 비교</ReportJumpLink><ReportJumpLink id="answer-content">AI 브리핑 초안</ReportJumpLink>
    </nav><HospitalPlacePanel key={placeReview.page.url} review={placeReview} webAllowed={clinicWebAllowed}/></>}
    <section className="report-card answer-content briefing-panel" id="answer-content" aria-labelledby="answer-content-title">
      <header className="briefing-heading"><span className="briefing-symbol"><BriefIcon kind="answer"/></span><div>
        <h3 className="answer-header" id="answer-content-title">{ANSWER_CONTENT_TITLE}</h3><p>마케팅스캐너 작성 제안 · 실제 네이버 노출 미측정</p>
      </div></header>
      {!plan?<><p className="briefing-unavailable">고객이 먼저 궁금해할 대상과 이용 조건을 질문으로 정리하세요.</p>
        <details open className="briefing-details"><summary>콘텐츠 분석 기록</summary><div><p>이 보고서에는 질문·답변 분석 기록이 없습니다. 같은 URL로 다시 진단하면 페이지에 맞는 초안을 확인할 수 있습니다.</p></div></details>
        <PagePatternGrid label="질문과 답변의 구성 예시" patterns={[{kind:'faq',title:'고객 질문',detail:'대상·범위·이용 방법'},{kind:'proof',title:'답변 근거',detail:'현재 홈페이지의 원문'},{kind:'action',title:'다음 행동',detail:'방문·문의·신청 방법'}]}/></>:<>
        {keyword?<>
          <div className="briefing-topics"><strong>질문 주제</strong><span>{keyword.term}</span>{plan.secondaryKeywords.map(k=><span key={k.term}>{k.term}</span>)}</div>
          {plan.topicScope==='mixed'&&<p className="briefing-unavailable">여러 주제가 포함된 페이지입니다. 실제 상품·서비스를 설명하는 대표 주제를 확인하세요.</p>}
          {plan.questions.length?<ReportItemPanels briefing id="answer-questions" label="고객 질문 선택" items={plan.questions.map((q,i)=>({
            id:q.id,label:q.question,children:<BriefingQuestion key={q.id} q={q} targetUrl={plan.targetUrl}/>,followup:<BriefingFollowup key={q.id} q={q} index={i}/>
          }))}/>:<p className="briefing-unavailable">이 페이지에는 저장된 고객 질문이 없습니다.</p>}
          <details open className="briefing-details briefing-keywords"><summary>질문 주제를 선정한 페이지 근거</summary><div>{[keyword,...plan.secondaryKeywords].map(k=>
            <section key={k.term}><h4>{k.term}</h4><p>{k.reason}</p>{k.evidence.map(e=><blockquote key={e.id}><strong>{e.location}</strong>{e.text}</blockquote>)}</section>)}</div></details>
        </>:<p className="briefing-unavailable">대표 주제를 정할 페이지 내용이 부족합니다. {opportunityFirst?'대상과 제공 범위를 설명한 페이지의 URL을 확인하세요.':'상품·서비스를 설명한 상세 URL로 다시 진단하세요.'}</p>}
        <details open className="briefing-details answer-scope-detail"><summary>작성 방식·분석 범위</summary><div><p className="answer-tags">{plan.mode==='ai-assisted'?'페이지 맞춤 질문':plan.mode==='limited'&&opportunityFirst?'페이지 주제 기반 가이드':'기본 질문 가이드'} · {plan.scope==='submitted-page-and-business'?'페이지·서비스 상세 기반':plan.scope==='submitted-page-and-products'?'페이지·상품 표본 기반':'입력 페이지 기반'} · 실제 네이버 노출 미측정</p><p>{plan.notice}</p>
          {plan.mode!=='ai-assisted'&&<p>{plan.mode==='limited'?'본문 표본이 적어 기본 질문 가이드를 표시합니다.':'페이지 주제에 맞춘 기본 질문입니다.'} 운영 조건은 게시 전에 대조하세요.</p>}
        </div></details>
        {keyword&&<footer className="briefing-footer"><ReportJumpLink id="report-site-guide">원문·링크 모음</ReportJumpLink><CopyText text={answerPlanText(plan)} label="추천 질문·개선안 전체 복사"/></footer>}
      </>}
    </section>
  </>;
}
