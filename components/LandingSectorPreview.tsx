'use client';

import React,{useId,useState} from 'react';
import {industryExamples,type IndustryExampleGroup,type IndustryExample} from '@/lib/landingIndustryExamples';
import DiagnosisIcon from './report/DiagnosisIcon';
import {ReadingToggle} from './ReadingDisclosure';

const groupLabels={noncommerce:'비커머스',commerce:'커머스'} as const;
export default function LandingSectorPreview({group='noncommerce'}:{group?:IndustryExampleGroup}) {
  const examples=industryExamples[group];
  const [selectedId,setSelectedId]=useState(examples[0].id);
  const selected=examples.find(example=>example.id===selectedId)??examples[0];
  const panelId=useId();
  const headingId=useId();
  const label=groupLabels[group];
  const icons=group==='commerce'?['firstView','trust','conversionFlow'] as const:['firstView','trust','cta'] as const;
  const option=(example:IndustryExample)=><button key={example.id} type="button" value={example.id} aria-pressed={selected.id===example.id} aria-controls={panelId} onClick={()=>setSelectedId(example.id)}>{example.label}</button>;
  return <section id={group==='noncommerce'?'scanner-sector-preview':'scanner-commerce-preview'} className="scanner-industry-preview" data-industry-group={group} aria-labelledby={headingId}>
    <h2 id={headingId} className="scanner-example-title"><span>{label}</span> 적용 예시</h2>
    <p className="scanner-industry-purpose">{group==='noncommerce'?'예약·상담·신청으로 이어지는 사이트':'상품 탐색부터 구매로 이어지는 쇼핑몰'}</p>
    <div className="scanner-industry-options" role="group" aria-label={`${label} 대표 업종 선택`}>{examples.slice(0,8).map(option)}</div>
    <details className="scanner-industry-more">
      <summary><span>전체 업종 <b>{examples.length}개</b></span><ReadingToggle/></summary>
      <div className="scanner-industry-options" role="group" aria-label={`${label} 추가 업종 선택`}>{examples.slice(8).map(option)}</div>
    </details>
    <div className="scanner-industry-example" id={panelId} aria-live="polite" aria-atomic="true">
      <h3>{selected.label}<span>고객의 선택 흐름</span></h3>
      <ol className="scanner-industry-flow" aria-label={`${selected.label} 적용 예시 흐름`}>
        {selected.steps.map((step,index)=><li key={index}><span className="scanner-industry-step-icon"><DiagnosisIcon axis={icons[index]}/></span><small aria-hidden="true">{String(index+1).padStart(2,'0')}</small><strong>{step}</strong></li>)}
      </ol>
    </div>
  </section>;
}
