import {Guidebook} from './report/SiteGuidebook';
import React from 'react';
import type {ChecklistItem} from '@/lib/reportSchema';
import EvidenceFlow from './report/EvidenceFlow';
const states={pass:{label:'통과',symbol:'✓'},warning:{label:'보완',symbol:'!'},fail:{label:'미충족',symbol:'−'}} as const;
const categories:Record<string,string>={seo:'SEO',content:'콘텐츠',trust:'신뢰',conversion:'전환'};
export default function DiagnosisChecklist({checklist}:{checklist:ChecklistItem[]}) {
  if(!checklist?.length)return null;
  return <section className="report-checklist" aria-label="기본 진단 체크리스트 상세"><div className="report-card-heading"><p className="report-eyebrow">PAGE CHECKLIST</p><h3>기본 진단 체크리스트</h3><p className="report-note">저장된 {checklist.length}개 항목의 판정과 수정 가이드입니다. 현재 페이지와 대조해 사용하세요.</p></div>
    <div className="report-checklist-stats">{(Object.keys(states) as (keyof typeof states)[]).map(state=><div key={state} data-state={state}><span>{states[state].label}</span><strong>{checklist.filter(c=>c.status===state).length}<small>개</small></strong><div className="report-meter" aria-hidden="true"><i style={{width:`${100*checklist.filter(c=>c.status===state).length/checklist.length}%`}}/></div></div>)}</div>
    <div className="report-checklist-rows">{checklist.map((item,i)=><article key={item.id||i} data-state={item.status}><header><span className="report-check-symbol" aria-hidden="true">{states[item.status].symbol}</span><h4>{item.label}</h4><span className="report-pill">{states[item.status].label}</span>{item.category&&<span className="report-check-category">{categories[item.category]||item.category}</span>}</header>{item.currentValue&&<p className="report-check-current"><strong>현재 값</strong>{item.currentValue}</p>}<EvidenceFlow label={`${item.label} 근거와 개선`} items={[{label:'진단 근거',content:item.diagnosis||'저장된 설명이 없습니다.'},{label:'수정 가이드',content:item.guide||'저장된 가이드가 없습니다.'}]}/>{item.status!=='pass'&&<Guidebook title={item.label} current={item.currentValue} evidence={item.diagnosis} proposal={item.guide}/>}</article>)}</div>
  </section>;
}
