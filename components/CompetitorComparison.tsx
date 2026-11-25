"use client";
import React,{useState} from 'react';
import ReadingDisclosure from './ReadingDisclosure';
import type {MarketingReport} from '@/lib/reportSchema';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import CompetitorDeepDiveModal from '@/components/CompetitorDeepDiveModal';
import {reportPhraseKey} from '@/lib/conciseReport';
import {CompactText} from './report/ReportVisualSummary';
import {competitorDisplay} from '@/lib/competitorDisplay';
type Props={competitorAnalysis:NonNullable<MarketingReport['competitorAnalysis']>;ourUrl:string;ourTitle?:string};
function getDomainFromUrl(url:string){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}}
export default function CompetitorComparison({competitorAnalysis:storedAnalysis,ourUrl,ourTitle}:Props){
  const competitorAnalysis=competitorDisplay(storedAnalysis);
  const competitors=competitorAnalysis.competitors||[],ourDomain=getDomainFromUrl(ourUrl);
  const [deepDiveTarget,setDeepDiveTarget]=useState<{url:string;domain:string}|null>(null);
  return (<div className="competitor-report">
    <p className="report-note">후보별 대표 제목과 버튼 문구를 확인하세요. AI 해석은 수집한 문구와 구분해 표시합니다.</p>
    <div className="competitor-report-body">
        {/* ===== ⑤ 경쟁사 상세 카드 ===== */}
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red mb-3">
            후보별 수집 자료
          </p>
          {/* Give the complete saved titles and descriptions enough reading width. */}
          <div className="competitor-cards report-competitor-list">
            {competitors.map((comp,index) => (
              <div
                key={comp.rank}
                id={`report-competitor-page-${index+1}`}
                className="competitor-card group rounded-2xl border border-jm-border bg-white p-5 flex flex-col hover:border-jm-red transition-colors min-w-0"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black shrink-0">
                    {comp.rank}
                  </span>
                  <a
                    href={safeHttpUrl(comp.link)||undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-jm-gray hover:text-jm-red break-all flex-1 min-w-0"
                    title={comp.domain}
                  >
                    {comp.domain} ↗
                  </a>
                </div>
                <p className="mt-3 text-sm font-semibold">{comp.metaTitle?'수집한 페이지 제목':'후보 페이지 제목'}</p>
                <h4 className="font-black text-base leading-snug">
                  {comp.metaTitle || comp.title}
                </h4>
                {comp.relevance && <p className="report-competitor-relevance">{comp.relevance === 'keyword_match' ? '검색어 관련 신호 확인' : '서비스 일치 검토 필요'}</p>}
                {comp.fetchError && <p className="mt-2 report-note">페이지 수집 미완료. 저장된 자료는 원문과 대조해 확인하세요.</p>}
                {(comp.metaDescription||comp.description||comp.h1||comp.keyMessage||comp.differentiation||comp.ctaTexts?.length||comp.selectionEvidence||comp.searchRank) ? <ReadingDisclosure title="수집 문구와 비교 근거" className="report-supporting-detail">
                  {(comp.selectionEvidence||comp.searchRank) ? <div className="report-competitor-selection">
                    {comp.selectionEvidence && <p className="text-sm text-jm-gray leading-6">{comp.selectionEvidence}</p>}
                    {comp.searchRank && <p className="mt-2 text-sm text-jm-gray">네이버 웹문서 검색 응답에서 {comp.searchRank}번째 항목</p>}
                  </div> : null}
                  {!comp.metaDescription && comp.description && <div className="mt-3 rounded-lg bg-neutral-50 p-3"><p className="font-bold">네이버 검색 요약 · 좌표 계산에서는 제외</p><p>{comp.description}</p></div>}
                  {comp.metaDescription && (
                    <div className="mt-2"><p className="text-sm font-semibold">수집한 메타 설명</p><p className="text-sm text-jm-gray leading-7">{comp.metaDescription}</p></div>
                  )}
                  {comp.h1 && (
                    <div className="mt-3 rounded-lg bg-jm-light-gray px-3 py-2">
                      <p className="text-[10px] font-black tracking-wider text-jm-gray">
                        페이지 대표 제목 (H1)
                      </p>
                      <p className="mt-0.5 text-xs leading-5 font-medium">
                        {comp.h1}
                      </p>
                    </div>
                  )}
                  {comp.keyMessage && (
                    <div className="mt-3 rounded-xl bg-gradient-to-br from-jm-red/[0.08] to-jm-red/[0.04] p-3 border-l-4 border-jm-red">
                      <p className="text-[10px] font-black tracking-wider text-jm-red">
                        AI가 해석한 핵심 메시지
                      </p>
                      <CompactText className="mt-1 text-sm leading-7" text={comp.keyMessage} verbatim/>
                    </div>
                  )}
                  {comp.differentiation && reportPhraseKey(comp.differentiation)!==reportPhraseKey(comp.keyMessage) && (
                    <div className="mt-3 rounded-xl bg-jm-light-gray p-3">
                      <p className="text-[10px] font-black tracking-wider text-jm-gray">
                        AI가 해석한 차별점
                      </p>
                      <CompactText className="mt-1 text-sm leading-7" text={comp.differentiation} verbatim/>
                    </div>
                  )}
                  {comp.ctaTexts && comp.ctaTexts.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-black tracking-wider text-jm-gray">
                        고객이 누르는 버튼
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comp.ctaTexts.map((cta, i) => (
                          <span
                            key={i}
                            className="inline-block rounded-full bg-jm-black px-2 py-0.5 text-[10px] font-bold text-white"
                          >
                            {cta}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </ReadingDisclosure> : null}

                <button
                  type="button"
                  aria-label={`${comp.domain} 페이지 상세 분석`}
                  onClick={() =>
                    setDeepDiveTarget({
                      url: comp.link,
                      domain: comp.domain,
                    })
                  }
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-jm-black text-white text-xs font-bold py-2.5 rounded-lg hover:bg-jm-red transition-colors"
                >
                  페이지 상세 분석
                </button>
              </div>
            ))}
          </div>
        </div>

    </div>
    {(competitorAnalysis.ourPositioning||competitorAnalysis.overallComparison)&&<details className="position-method"><summary>저장된 AI 비교·포지셔닝 해석</summary><div><p>아래는 기존 보고서의 AI 해석이며 새 도표의 좌표 계산에는 사용하지 않습니다. 실제 상품·서비스와 맞는지 확인하세요.</p>{competitorAnalysis.overallComparison&&<p>{competitorAnalysis.overallComparison}</p>}{competitorAnalysis.ourPositioning&&<p>{competitorAnalysis.ourPositioning}</p>}</div></details>}
      {/* v45-W2: 경쟁사 딥다이브 모달 */}
      {deepDiveTarget && (
        <CompetitorDeepDiveModal
          open={!!deepDiveTarget}
          onClose={() => setDeepDiveTarget(null)}
          targetUrl={deepDiveTarget.url}
          targetDomain={deepDiveTarget.domain}
          ourDomain={ourDomain}
          ourTitle={ourTitle}
        />
      )}
    </div>
  );
}
