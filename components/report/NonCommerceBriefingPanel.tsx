import DraftText from './DraftText';
import React from 'react';
import type {NonCommerceBriefing} from '@/lib/nonCommerceBriefing';
import {safeHttpUrl} from '@/lib/citationMeasurement';

export default function NonCommerceBriefingPanel({plan}:{plan:NonCommerceBriefing}){
  const link=(url:string,label:string)=>{const href=safeHttpUrl(url);return href?<a href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>:<span>{label}</span>;};
  return <section className="report-card service-strategy" aria-label="업종별 네이버 AI 브리핑 대응">
    <p className="report-eyebrow">NAVER · 콘텐츠 실행 제안</p><h3>질문별로 답변할 내용을 나누세요</h3><p className="service-strategy-lead">{plan.notice}</p>
    <div className="service-strategy-grid">{plan.blocks.map((block,i)=><article key={block.title}><h4 className="service-stage-heading"><span>{String(i+1).padStart(2,'0')}</span><u>{block.title}</u></h4><h5>고객 질문</h5><p>{block.question}</p><h5>담을 내용</h5><ul>{block.fields.map(x=><li key={x}>{x}</li>)}</ul><h5>수정 위치</h5><p>{block.placement}</p><h5>실행 제안</h5><p><DraftText text={block.action}/></p><div className="service-strategy-copy"><span>작성 초안 · 조건 확인 후 사용</span><p><DraftText text={block.draft}/></p></div>{block.evidence.length?<details><summary>판단에 사용한 자사 원문 {block.evidence.length}개</summary>{block.evidence.map((s,j)=><div key={s.url+j}><blockquote>{s.text}</blockquote>{link(s.url,s.title||`원문 ${j+1}`)}</div>)}</details>:<p className="report-note">작성할 항목</p>}</article>)}</div>
    <h4 className="service-strategy-section-title">채널별 만들 자료와 역할</h4><div className="service-strategy-grid">{plan.channels.map(c=><article key={c.title}><h4>{c.title}</h4><h5>{c.role}</h5><p>{c.deliverable}</p></article>)}</div>
    <h4 className="service-strategy-section-title">게시와 실제 노출·이용을 따로 검증하세요</h4><ol className="service-strategy-funnel">{plan.verification.map((v,i)=><li key={v.title}><span>{String(i+1).padStart(2,'0')}</span><div><h4>{v.title}</h4><p>{v.action}</p><small>확인 항목: {v.metric}</small></div></li>)}</ol>
    <p className="report-note">참고한 공식 안내 · 콘텐츠 구성의 근거이며 개별 업체의 노출 결과가 아닙니다.</p><div className="service-strategy-links">{plan.references.map(r=><React.Fragment key={r.url}>{link(r.url,r.label)}</React.Fragment>)}</div>
  </section>;
}
