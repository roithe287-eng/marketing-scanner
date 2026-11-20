import React from 'react';
import DraftText from './DraftText';
import {LongReadingText} from './EvidenceFlow';
import ReportJumpLink from './ReportJumpLink';
import {purposeCheckAnchor} from './WebsitePurposePanel';
import {serviceFindingPresentation} from '@/lib/serviceFindingPresentation';
import {reportPhraseKey} from '@/lib/conciseReport';
import type {ServiceStrategy} from '@/lib/serviceStrategy';
import type {WebsitePurpose} from '@/lib/websitePurpose';
import {safeHttpUrl} from '@/lib/citationMeasurement';

type View='segments'|'search'|'acquisition'|'conversion';
function SourceLink({url,label}:{url:string;label:string}){
  const href=safeHttpUrl(url);
  return href?<a href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>:<span>{label}</span>;
}

function matchingCheck(f:ServiceStrategy['findings'][number],purpose?:WebsitePurpose){
  if(!purpose)return -1;
  return purpose.checks.filter(check=>check.status!=='not_applicable').findIndex(check=>
    check.label===f.title&&check.evidence.length===f.evidence.length&&check.evidence.every(item=>
      f.evidence.some(e=>e.text===item.text&&safeHttpUrl(e.url)===(safeHttpUrl(item.locator)||safeHttpUrl(purpose.sourceUrl)))));
}

const introductions:Record<View,string>={
  segments:'이용자가 판단할 질문을 단계별로 살펴보세요. 수집한 근거와 고객 유형 제안을 구분해서 표시합니다.',
  search:'검색어별로 연결할 페이지와 도착 후 보여줄 내용을 정하세요. 키워드는 기획 예시입니다. 검색량과 순위는 따로 확인하세요.',
  acquisition:'각 채널에서 만들 자료를 정하세요. 집행 전·후 확인할 항목과 연결 위치를 함께 볼 수 있습니다.',
  conversion:'왼쪽 번호는 완료 조건을 확인할 순서입니다. 각 단계의 이름과 확인 방법은 측정 설계 제안입니다.',
};

export default function ServiceStrategyPanel({plan,view,purpose}:{plan:ServiceStrategy;view:View;purpose?:WebsitePurpose}){
  const generic=plan.industry==='noncommerce';
  const totals={observed:plan.findings.filter(f=>f.evidence.length).length,sourcePages:new Set(plan.sources.map(s=>s.url)).size};
  const title={segments:generic?'고객이 결정하기 전 확인할 질문':'서비스별 고객과 선택 기준',search:generic?'검색어별로 안내할 페이지 정하기':'검색어부터 견적 상담까지 연결하기',acquisition:'채널별 운영과 콘텐츠 제작',conversion:generic?'무엇을 완료로 셀지 정하기':'유효 견적과 계약까지 확인하기'}[view];
  return <section className="report-card service-strategy" aria-label={title}>
    <h3>{title}</h3>
    <p className="service-strategy-lead">{introductions[view]}</p>
    {view==='segments'&&<>
      <dl className="service-strategy-counts" aria-label="수집 범위 요약">
        <div><dt>원문 페이지</dt><dd>{totals.sourcePages}개</dd></div>
        <div><dt>관련 문구 확인</dt><dd>{totals.observed}개</dd></div>
        <div><dt>근거 추가 확인</dt><dd>{plan.findings.length-totals.observed}개</dd></div>
      </dl>
      {!!plan.findings.length&&<details className="service-strategy-evidence">
        <summary>업종별 확인 항목과 원문 보기</summary>
        <div className="service-strategy-grid">
          {plan.findings.map(serviceFindingPresentation).map(f=>{
            const index=matchingCheck(f,purpose);
            const joined=f.evidence.map(e=>e.text).join(' / ');
            const separatelyRecorded=f.evidence.length&&f.observed&&!joined.startsWith(f.observed);
            return <article key={f.title}>
              <h4><u className="service-fact-title">{f.title}</u></h4>
              {index>=0?
                <ReportJumpLink id={purposeCheckAnchor(index)}>{f.title} 근거와 확인 방법</ReportJumpLink>:
                f.evidence.length?<ul className="service-source-quotes">{f.evidence.map((e,i)=><li key={i}><blockquote>{e.text}</blockquote><SourceLink url={e.url} label={`${f.title} 원문 ${i+1}`}/></li>)}</ul>:<p>이번 수집에서 관련 문구를 찾지 못했습니다.</p>}
              {!!separatelyRecorded&&<LongReadingText text={f.observed}/>}
              {f.interpretation&&<><h5>관측 해석</h5><LongReadingText text={f.interpretation}/></>}
              {f.action&&<><h5>수정 제안</h5><LongReadingText text={f.action}/></>}
            </article>;
          })}
        </div>
      </details>}
      <h4 className="service-strategy-section-title">이용자가 다음 단계로 넘어가기 전</h4>
      <div className="service-strategy-grid" data-page-model="service-decisions">
        {plan.segments.map(s=><article key={s.id} id={`report-service-segment-${s.id}`}>
          <h4>{s.label}</h4>
          <h5>어떤 이용자를 위한 단계인가요?</h5><LongReadingText text={s.audience}/>
          <h5>고객이 결정하기 전에 묻는 내용</h5><ul>{s.questions.map(q=><li key={q}>{q}</li>)}</ul>
          {!generic&&s.evidence[0]&&<><h5>관련 원문</h5><blockquote>{s.evidence[0].text}</blockquote><SourceLink url={s.evidence[0].url} label={s.evidence[0].title||'판단 근거 원문'}/></>}
          {!generic&&<><h5>성과 확인</h5><p>{s.metric}</p></>}
        </article>)}
      </div>
    </>}
    {view==='search'&&<div className="service-strategy-grid" data-page-model="service-landing">
      {plan.segments.map(s=><article key={s.id} data-stage={s.id}>
        <h4>{s.label}</h4>
        {generic&&purpose&&<ReportJumpLink id={`report-service-segment-${s.id}`}>이 단계에서 고객이 확인할 질문</ReportJumpLink>}
        <h5>찾을 만한 검색어</h5><ul>{s.keywords.map(k=><li key={k}>{k}</li>)}</ul>
        <h5>연결할 페이지</h5><p>{s.landingUrl?<SourceLink url={s.landingUrl} label="수집한 페이지 열기 · 연결 적합성 확인"/>:'이 보고서에서 연결할 상세 주소를 확인하지 못했습니다. 실제 페이지를 지정하세요.'}</p>
        <h5>도착 페이지에 놓을 내용</h5><ol>{s.landingBlocks.map(b=><li key={b}><DraftText text={b} emphasizeLead/></li>)}</ol>
        <div className="service-strategy-copy"><span>문구 제안 · 대괄호는 확인한 정보로 채우기</span><strong>{s.headline}</strong><LongReadingText text={s.message} draft/><b>버튼 문구 {s.cta}</b></div>
      </article>)}
    </div>}
    {view==='acquisition'&&<>
      <div className="service-strategy-grid" data-page-model="service-channels">
        {plan.channels.map(c=><article key={c.id}>
          <h4>{c.label}</h4><p className="service-strategy-role">{c.role}</p>
          <h5>채널을 어떻게 운영할까요?</h5><LongReadingText text={c.setup}/>
          <h5>어떤 소재를 만들까요?</h5><LongReadingText text={c.creative}/>
          <h5>무엇을 기록할까요?</h5><LongReadingText text={c.conversion}/>
          <h5>집행 전·후 확인</h5><LongReadingText text={c.review}/>
        </article>)}
      </div>
      <h4 className="service-strategy-section-title">콘텐츠별 제작 순서</h4>
      <div className="service-strategy-grid">{plan.content.map(c=><article key={c.title}>
        <h4>{c.title}</h4><LongReadingText text={c.angle}/>
        <ol>{c.outline.map(x=><li key={x}><DraftText text={x} emphasizeLead/></li>)}</ol>
        <p><strong>다음 행동</strong> · {c.cta}</p>
        <div className="service-strategy-links">{c.sourceUrls.map((url,i)=><SourceLink key={url} url={url} label={`${c.title} 제작 근거 ${i+1}`}/>)}</div>
      </article>)}</div>
    </>}
    {view==='conversion'&&<>
      <ol className="service-strategy-funnel service-measurement-flow" aria-label="단계별 완료 조건" data-page-model="service-conversion">
        {plan.funnel.map((f,i)=><li key={f.stage}>
          <span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
          <div><h4>{f.stage}</h4><LongReadingText text={f.definition}/>
            {reportPhraseKey(f.check)!==reportPhraseKey(f.definition)&&<div className="service-step-check"><strong>완료 확인</strong><LongReadingText text={f.check}/></div>}
            <small>측정에 쓸 이름 예시 <code>{f.event}</code></small>
          </div>
        </li>)}
      </ol>
      <h4 className="service-strategy-section-title">운영 데이터로 확인할 지표</h4>
      <div className="service-strategy-grid">{plan.metrics.map(m=><article key={m.name}>
        <h4>{m.name}</h4><p className="service-strategy-formula">{m.formula}</p>
        <h5>계산에 필요한 데이터</h5><LongReadingText text={m.required}/>
        <h5>이 수치를 읽는 법</h5><LongReadingText text={m.interpretation}/>
      </article>)}</div>
      <h4 className="service-strategy-section-title">{generic?'변경 후 비교할 항목':'4주 실행·검증 순서'}</h4>
      <div className="service-strategy-grid">{plan.experiments.map(e=><article key={e.title}>
        <h4>{e.title}</h4>
        <h5>검토할 가설</h5><LongReadingText text={e.hypothesis}/>
        <h5>실행할 변경</h5><LongReadingText text={e.change}/>
        <h5>확인 지표</h5><p>{e.metric}</p>
        <h5>유지할지 판단하는 기준</h5><LongReadingText text={e.decision}/>
      </article>)}</div>
    </>}
  </section>;
}
