import DraftText from './report/DraftText';
import {Guidebook} from './report/SiteGuidebook';
import {RoleBox} from './report/ReportRole';
import React from 'react';
import type {ChecklistItem,MarketingReport} from '@/lib/reportSchema';
import ReadingDisclosure from './ReadingDisclosure';
import {reportPhraseKey,reportReadingPoints} from '@/lib/conciseReport';
import EvidenceFlow from './report/EvidenceFlow';
import ReportJumpLink from './report/ReportJumpLink';
const states={pass:{label:'관측 충족',symbol:'✓'},warning:{label:'보완 검토',symbol:'!'},fail:{label:'미충족',symbol:'−'},review:{label:'미확인·검토',symbol:'?'},not_applicable:{label:'해당 없음',symbol:'·'}} as const;
const categories:Record<string,string>={seo:'SEO',content:'콘텐츠',trust:'신뢰',conversion:'전환'};
export default function DiagnosisChecklist({checklist,issues=[]}:{checklist:ChecklistItem[];issues?:MarketingReport['criticalIssues']}) {
  if(!checklist?.length)return null;
  const counts=Object.fromEntries(Object.keys(states).map(state=>[state,checklist.filter(c=>c.status===state).length]));
  return <section className="report-checklist" aria-label="기본 진단 체크리스트 상세"><div className="report-card-heading"><p className="report-eyebrow">PAGE CHECKLIST</p><h3>기본 진단 체크리스트</h3><p className="report-note">저장된 기본 점검 {checklist.length}개입니다. 항목별로 수집값과 판단 이유를 읽고, 수정이 필요하면 적용 방법을 확인하세요.</p></div>
    <div className="report-checklist-stats">{(Object.keys(states) as (keyof typeof states)[]).map(state=><div key={state} data-state={state}><span>{states[state].label}</span><strong>{counts[state]}<small>개</small></strong><div className="report-meter" aria-hidden="true"><i style={{width:`${100*counts[state]/checklist.length}%`}}/></div></div>)}</div>
    <div className="report-checklist-rows">{checklist.map((item,i)=>{
      const current=reportPhraseKey(item.currentValue),diagnosis=reportPhraseKey(item.diagnosis);
      const explanation=reportReadingPoints(item.diagnosis||'저장된 설명이 없습니다.');
      const instructions=reportReadingPoints(item.guide||'저장된 가이드가 없습니다.');
      const facts:React.ComponentProps<typeof EvidenceFlow>['items']=[];
      if(!current||current!==diagnosis)facts.push({label:'판정 이유',role:'review',content:<ReadingPoints points={explanation}/>});
      const guide=reportPhraseKey(item.guide);
      const related=guide?issues.flatMap((issue,index)=>reportPhraseKey(issue.recommendation)===guide?[{issue,index}]:[]):[];
      const match=related.length===1?related[0]:undefined;
      if(!guide||(guide!==current&&guide!==diagnosis)){
        facts.push({label:match?'관련 이슈의 수정 방향':'다음에 할 일',role:'proposal',content:match
          ?<ReportJumpLink id={`report-issue-${match.index}`}>{match.issue.title} · 수정 제안 보기</ReportJumpLink>
          :<ReadingPoints points={instructions}/>});
      }
      return <article key={item.id||i} data-state={item.status}>
        <header><span className="report-check-symbol" aria-hidden="true">{states[item.status].symbol}</span><h4>{item.label}</h4><span className="report-pill">{states[item.status].label}</span>{item.category&&<span className="report-check-category">{categories[item.category]||item.category}</span>}</header>
        {item.currentValue&&<RoleBox role="current" className="report-check-current" label="수집한 값"><p>{item.currentValue}</p></RoleBox>}
        {facts.length>0&&<EvidenceFlow label={`${item.label}의 판단 이유와 다음 행동`} items={facts}/>}
        {!['pass','not_applicable'].includes(item.status)&&<ReadingDisclosure title="실제 수정 위치와 적용 방법"><Guidebook title={item.label} current={item.currentValue} evidence={item.diagnosis} proposal={item.guide} hideRepeatedProposal/></ReadingDisclosure>}
      </article>;
    })}</div>
  </section>;
}

function ReadingPoints({points}:{points:string[]}) {
  if(points.length<=1)return <p><DraftText text={points[0]||''}/></p>;
  return <ul className="report-reading-points">{points.map((text,i)=><li key={i}><DraftText text={text}/></li>)}</ul>;
}
