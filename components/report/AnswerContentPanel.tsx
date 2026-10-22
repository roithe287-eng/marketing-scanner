'use client';
import React,{useState} from 'react';
import type {AnswerContentPlan} from '@/lib/answerContentSchema';
import {ANSWER_CONTENT_TITLE,ANSWER_STATUS,answerPlanText,answerQuestionText} from '@/lib/answerContent';

function CopyText({text,label}:{text:string;label:string}){
  const [message,setMessage]=useState('');
  async function copy(){
    try{await navigator.clipboard.writeText(text);setMessage('복사했습니다.');}
    catch{setMessage('복사할 내용을 선택해 직접 복사해 주세요.');}
  }
  return <div className="answer-copy"><button type="button" onClick={copy}>{label}</button><span role="status" aria-live="polite">{message}</span></div>;
}
export default function AnswerContentPanel({plan}:{plan?:AnswerContentPlan|null}){
  if(!plan)return <section className="report-card answer-content" aria-labelledby="answer-content-title"><p className="report-eyebrow">키워드 → 질문 → 답변</p><h3 id="answer-content-title">{ANSWER_CONTENT_TITLE}</h3><p className="answer-scope">이 보고서에는 새 콘텐츠 개선안이 없습니다. URL을 다시 진단하면 대표 키워드·추천 질문·FAQ 작성 예시가 추가됩니다.</p></section>;
  const keyword=plan.primaryKeyword;
  return <section className="report-card answer-content" id="answer-content" aria-labelledby="answer-content-title">
    <header className="answer-header"><p className="report-eyebrow">키워드 → 질문 → 답변</p><h3 id="answer-content-title">{ANSWER_CONTENT_TITLE}</h3><p>고객이 궁금해할 질문을 고르고, 홈페이지에서 답할 내용을 구체화하세요.</p><div className="answer-tags"><span>입력 페이지 기반</span><span>실제 네이버 노출 · 미측정</span><span>{plan.mode==='ai-assisted'?'페이지 맞춤 질문':plan.mode==='limited'?'수집 내용 제한':'기본 질문 가이드'}</span></div></header>
    <p className="answer-scope">{plan.notice}</p>
    {plan.mode!=='ai-assisted'&&<p className="answer-notice" role="status">{plan.mode==='limited'?'읽을 수 있는 본문이 부족하거나 동적 페이지입니다. 아래 질문은 작성 방향이며, 기존 답변의 유무는 실제 페이지에서 대조해야 합니다.':'맞춤 질문 분석을 완료하지 못해 페이지 주제 기반의 기본 가이드를 표시합니다. 기존 답변의 유무는 실제 페이지에서 대조해 주세요.'}</p>}
    {keyword?<>
      <div className="answer-keywords"><div className="answer-primary"><span>대표 키워드 후보</span><strong>{keyword.term}</strong><small>선정 근거 {keyword.confidence==='high'?'충분':keyword.confidence==='medium'?'일부 확인':'추가 검토'}</small></div><div className="answer-secondary"><span>보조 키워드 후보</span><div>{plan.secondaryKeywords.length?plan.secondaryKeywords.map(k=><b key={k.term}>{k.term}</b>):<p>추가 후보를 단정할 근거가 부족합니다.</p>}</div><p>검색량·자동완성 순위가 아닌 페이지 주제와의 적합성 기준입니다.</p></div></div>
      <details className="answer-evidence"><summary>키워드를 선정한 페이지 근거 보기</summary>{[keyword,...plan.secondaryKeywords].map(k=><div key={k.term}><h4>{k.term}</h4><p>{k.reason}</p>{k.evidence.map(e=><blockquote key={e.id}><span>{e.location}</span>{e.text}</blockquote>)}</div>)}</details>
      {plan.topicScope==='mixed'&&<p className="answer-notice">여러 주제가 섞인 페이지입니다. 대표 키워드를 검토하고, 상품·서비스별 상세 URL도 각각 진단해 주세요.</p>}
      <div className="answer-list">{plan.questions.map((q,i)=><article className="answer-question" key={q.id}>
        <div className="answer-question-head"><span className="answer-number">추천 질문 0{i+1}</span><span className="answer-status" data-state={q.status}>{ANSWER_STATUS[q.status]}</span></div><h4>{q.question}</h4>
        <div className="answer-draft"><span>{q.draft?'원문을 재배치한 답변 초안':'확인 후 채울 답변 예시'}</span><p>{q.draft||q.template}</p><small>{q.draft?'수집 시점의 원문입니다. 문맥과 최신 운영 조건을 확인한 뒤 사용하세요.':'대괄호는 실제 업체 정보로 채워야 합니다. 예시 형식 자체는 운영 사실이 아닙니다.'}</small></div>
        {q.missingFacts.length>0&&<div className="answer-missing"><strong>게시 전 확인할 정보</strong><ul>{q.missingFacts.map(f=><li key={f}>{f}</li>)}</ul></div>}
        <div className="answer-placement"><strong>수정 위치 제안</strong><p>{q.placement}</p><small>해당 영역이 없다면 상품·서비스 설명 다음에 문답 영역을 추가하세요.</small></div>
        <CopyText text={answerQuestionText(q)} label={`질문 ${i+1} · 답변 초안 복사`}/>
        <details className="answer-detail"><summary>원문 위치와 적용 방법</summary>{q.evidence.length?q.evidence.map(e=><blockquote key={e.id}><span>{e.location}</span>{e.text}{e.selector&&<code>{e.selector}</code>}</blockquote>):<p>{q.status==='review'?'기본 가이드이므로 기존 답변과 직접 대조해 주세요.':'수집된 내용에서 이 질문에 직접 답하는 문장을 확인하지 못했습니다. 다른 페이지에 있는지는 확인하지 않았습니다.'}</p>}{q.draft&&q.missingFacts.length>0&&<div className="answer-template"><strong>추가 작성 형식</strong><p>{q.template}</p><small>대괄호를 실제 정보로 채우고 위 원문과 연결해 주세요.</small></div>}<ol>{q.steps.map(step=><li key={step}>{step}</li>)}</ol></details>
      </article>)}</div>
      <footer className="answer-footer"><CopyText text={answerPlanText(plan)} label="추천 질문·개선안 전체 복사"/><p>제목·답변·조건을 실제 본문 텍스트로 제공하세요. FAQ 개수나 특정 코드만으로 AI 인용이 보장되지는 않습니다.</p></footer>
    </>:<p className="answer-notice">대표 키워드를 판단할 페이지 내용이 부족합니다. 대표 상품·서비스 설명이 있는 상세 URL을 진단해 주세요.</p>}
  </section>;
}
