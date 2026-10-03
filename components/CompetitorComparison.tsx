"use client";
import React,{useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import CompetitorDeepDiveModal from '@/components/CompetitorDeepDiveModal';
type Props={competitorAnalysis:NonNullable<MarketingReport['competitorAnalysis']>;ourUrl:string;ourTitle?:string};
function getDomainFromUrl(url:string){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}}
function getFaviconUrl(domain:string){return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;}
export default function CompetitorComparison({competitorAnalysis,ourUrl,ourTitle}:Props){
  const competitors=competitorAnalysis.competitors||[],ourDomain=getDomainFromUrl(ourUrl);
  const [deepDiveTarget,setDeepDiveTarget]=useState<{url:string;domain:string}|null>(null);
  return (<div className="competitor-report">
    <p className="report-note">비교 번호는 목록 순서입니다. 검색 응답 순서와 실제 경쟁 관계는 각 후보의 근거에서 구분해 확인하세요. 아래는 저장된 전체 원문이며 AI 해석이 있으면 별도로 표시합니다.</p>
    <div className="competitor-report-body">
        {/* ===== ⑤ 경쟁사 상세 카드 ===== */}
        <div>
          <p className="text-xs font-black tracking-wider text-jm-red mb-3">
            COLLECTED PAGE EVIDENCE
          </p>
          {/* Give the complete saved titles and descriptions enough reading width. */}
          <div className="competitor-cards grid gap-4 grid-cols-1 lg:grid-cols-2 items-start">
            {competitors.map((comp) => (
              <div
                key={comp.rank}
                className="competitor-card group rounded-2xl border border-jm-border bg-white p-5 flex flex-col hover:border-jm-red transition-colors min-w-0"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jm-black text-white text-xs font-black shrink-0">
                    {comp.rank}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFaviconUrl(comp.domain)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded shrink-0 bg-jm-light-gray"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
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
                <h4 className="mt-3 font-black text-base leading-snug">
                  {comp.metaTitle || comp.title}
                </h4>
                {comp.relevance && <div className="mt-3 rounded-lg border bg-neutral-50 p-3">
                  <p className="text-xs font-bold">{comp.relevance === 'keyword_match' ? '검색어 관련 신호 확인' : '서비스 일치 검토 필요'}</p>
                  <p className="mt-1 text-xs text-jm-gray leading-6">{comp.selectionEvidence}</p>
                  {comp.searchRank && <p className="mt-2 text-xs text-jm-gray">네이버 웹문서 검색 응답에서 {comp.searchRank}번째 항목</p>}
                </div>}
                {!comp.metaDescription && comp.description && <div className="mt-3 rounded-lg bg-neutral-50 p-3"><p className="font-bold">네이버 검색 요약 · 좌표 계산에서는 제외</p><p>{comp.description}</p></div>}
                {comp.metaDescription && (
                  <p className="mt-2 text-xs text-jm-gray leading-6">
                    {comp.metaDescription}
                  </p>
                )}
                {comp.h1 && (
                  <div className="mt-3 rounded-lg bg-jm-light-gray px-3 py-2">
                    <p className="text-[10px] font-black tracking-wider text-jm-gray">
                      H1
                    </p>
                    <p className="mt-0.5 text-xs leading-5 font-medium">
                      {comp.h1}
                    </p>
                  </div>
                )}
                {comp.keyMessage && (
                  <div className="mt-3 rounded-xl bg-gradient-to-br from-jm-red/[0.08] to-jm-red/[0.04] p-3 border-l-4 border-jm-red">
                    <p className="text-[10px] font-black tracking-wider text-jm-red">
                      💬 저장된 AI 핵심 메시지 해석
                    </p>
                    <p className="mt-1 text-xs leading-6 font-medium">
                      {comp.keyMessage}
                    </p>
                  </div>
                )}
                {comp.differentiation && (
                  <div className="mt-3 rounded-xl bg-jm-light-gray p-3">
                    <p className="text-[10px] font-black tracking-wider text-jm-gray">
                      ⚖️ 저장된 AI 차별점 해석
                    </p>
                    <p className="mt-1 text-xs leading-6">
                      {comp.differentiation}
                    </p>
                  </div>
                )}
                {comp.ctaTexts && comp.ctaTexts.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-black tracking-wider text-jm-gray">
                      🎯 CTA 버튼
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
                {comp.fetchError && (
                  <p className="mt-3 text-[10px] text-jm-gray italic">
                    * 페이지 수집 미완료 · 검색 결과 요약만 확인 가능
                  </p>
                )}

                {/* v45-W2: 딥다이브 버튼 */}
                <button
                  onClick={() =>
                    setDeepDiveTarget({
                      url: comp.link,
                      domain: comp.domain,
                    })
                  }
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-jm-black text-white text-xs font-bold py-2.5 rounded-lg hover:bg-jm-red transition-colors"
                >
                  🔍 딥다이브 분석
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
