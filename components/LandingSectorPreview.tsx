'use client';

import React, { useId, useState } from 'react';
import { industryExamples, type IndustryExampleGroup, type IndustryExample } from '@/lib/landingIndustryExamples';
import DiagnosisIcon from './report/DiagnosisIcon';
import { ReadingToggle } from './ReadingDisclosure';

const groupLabels = { noncommerce: '비커머스', commerce: '커머스' } as const;

function IndustrySpread({ example, group, id }: {
  example: IndustryExample;
  group: IndustryExampleGroup;
  id: string;
}) {
  const commerce = group === 'commerce';
  const icons = ['firstView', 'trust', 'cta'] as const;
  return <article className="scanner-industry-example" id={id} aria-live="polite" aria-atomic="true">
    <div className="industry-spread">
      <header className="industry-cover">
        <p className="industry-byline"><span>{example.label}</span>진단 노트</p>
        <h3>{example.question}</h3>
        <p className="industry-abstract">{example.summary}</p>
      </header>
      <div className="industry-figure">
        <h4>{commerce ? '상품 상세에서 비교할 정보' : '문의 전 확인할 정보'}</h4>
        <ol className="scanner-industry-flow" aria-label={example.label + ' 고객의 선택 흐름'}>
          {example.steps.map((step, i) => <li key={step}>
            <span className="industry-node" aria-hidden="true"><DiagnosisIcon axis={icons[i]}/></span>
            <div><strong>{step}</strong><span className="industry-evidence">{example.evidence[i]}</span></div>
          </li>)}
        </ol>
      </div>
    </div>
    <div className="industry-edit">
      <span><DiagnosisIcon axis="copywriting"/>수정 예시</span>
      <p>{example.action}</p>
    </div>
  </article>;
}

export default function LandingSectorPreview({ group = 'noncommerce' }: { group?: IndustryExampleGroup }) {
  const examples = industryExamples[group];
  const [selected, setSelected] = useState(examples[0]);
  const panelId = useId();
  const headingId = useId();
  const label = groupLabels[group];
  const option = (example: IndustryExample) => <button
    key={example.id} type="button" value={example.id} aria-pressed={selected.id === example.id}
    aria-controls={panelId} onClick={() => setSelected(example)}
  >{example.label}</button>;

  return <section id={group === 'noncommerce' ? 'scanner-sector-preview' : 'scanner-commerce-preview'}
    className="scanner-industry-preview" data-industry-group={group} aria-labelledby={headingId}>
    <h2 id={headingId} className="scanner-example-title"><span>{label}</span> 적용 예시</h2>
    <p className="scanner-industry-purpose">{group === 'noncommerce'
      ? '예약·상담·신청으로 이어지는 사이트' : '상품 탐색부터 구매로 이어지는 쇼핑몰'}</p>
    <div className="scanner-industry-options" role="group" aria-label={label + ' 대표 업종 선택'}>{examples.slice(0, 8).map(option)}</div>
    <details className="scanner-industry-more">
      <summary><span>전체 업종 <b>{examples.length}개</b></span><ReadingToggle/></summary>
      <div className="scanner-industry-options" role="group" aria-label={label + ' 추가 업종 선택'}>{examples.slice(8).map(option)}</div>
    </details>
    <IndustrySpread example={selected} group={group} id={panelId}/>
  </section>;
}
