'use client';

import React, { useId, useState } from 'react';
import { sectorJourneys } from '@/lib/nonCommerceJourneys';

type SectorExample = {
  id: keyof typeof sectorJourneys;
  label: string;
  question: string;
  checks: string;
};

const examples: SectorExample[] = [
  {
    id: 'medical',
    label: '병의원',
    question: '처음 방문하는 환자가 진료 대상을 확인하고 예약할 수 있나요?',
    checks: '진료과와 의료진, 진료시간·위치·예약 경로를 확인합니다. 홈페이지 원문에서 플레이스 키워드 후보와 환자 질문에 답할 근거를 찾습니다.',
  },
  {
    id: 'legal',
    label: '법률 상담',
    question: '내 사건을 맡는 곳인지 상담 전에 알 수 있나요?',
    checks: '취급 업무, 담당자, 상담 절차와 비용 안내가 문의 경로로 이어지는지 살펴봅니다.',
  },
  {
    id: 'property_sales',
    label: '분양',
    question: '방문 전에 공급 조건과 일정을 비교할 수 있나요?',
    checks: '단지·입지, 공급 일정, 견본주택 방문 안내와 분양 문의 경로를 살펴봅니다.',
  },
  {
    id: 'franchise',
    label: '프랜차이즈',
    question: '가맹 문의 전에 개설비와 본사 지원 범위를 알 수 있나요?',
    checks: '개설 비용의 포함·별도 항목, 점포 조건, 교육·운영 지원과 상담 경로를 살펴봅니다.',
  },
  {
    id: 'insurance',
    label: '보험 상담',
    question: '상담 전에 보장 범위와 제외 조건을 찾을 수 있나요?',
    checks: '상품 설명에서 보장·제외 항목과 가입 조건을 확인하고 개별 상담으로 이어지는지 살펴봅니다.',
  },
  {
    id: 'startup',
    label: '창업 지원',
    question: '지원 대상과 신청 전에 준비할 자료가 보이나요?',
    checks: '참여 조건, 제공 범위, 본인 부담 비용과 상담·신청 안내를 살펴봅니다.',
  },
  {
    id: 'rehabilitation',
    label: '회생·파산',
    question: '상담 전에 신청 조건과 준비 서류를 확인할 수 있나요?',
    checks: '홈페이지에 나온 업무 범위, 준비 서류, 비용 안내에서 개별 상담으로 이어지는 경로를 살펴봅니다.',
  },
  {
    id: 'medical_consulting',
    label: '병원 컨설팅',
    question: '우리 병원이 맡길 수 있는 업무와 견적 절차가 보이나요?',
    checks: '병원 대상 서비스, 담당 조직과 수행 사례를 확인하고 견적·상담 문의로 이어지는지 살펴봅니다.',
  },
];

export default function LandingSectorPreview() {
  const [selected, setSelected] = useState(examples[0]);
  const panelId = useId();

  return (
    <section id="scanner-sector-preview" className="scanner-sector-preview" aria-labelledby="scanner-sector-heading">
      <h2 id="scanner-sector-heading">예약·상담형 사이트 진단 예시</h2>
      <p className="scanner-sector-intro">
        업종을 선택해 고객이 예약·상담·신청을 결정하기까지 홈페이지에서 찾는 정보를 확인해 보세요.
      </p>
      <div className="scanner-sector-options" role="group" aria-label="진단 예시 업종 선택">
        {examples.map(example => (
          <button
            key={example.id}
            type="button"
            value={example.id}
            aria-pressed={selected.id === example.id}
            aria-controls={panelId}
            onClick={() => setSelected(example)}
          >
            {example.label}
          </button>
        ))}
      </div>
      <div className="scanner-sector-example" id={panelId} aria-live="polite" aria-atomic="true">
        <div className="scanner-sector-question">
          <h3>{selected.question}</h3>
          <p>{selected.checks}</p>
        </div>
        <ol className="scanner-sector-journey" aria-label={selected.label + ' 진단 순서'}>
          {sectorJourneys[selected.id].map(step => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </section>
  );
}
