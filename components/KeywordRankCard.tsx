"use client";
import {CompactText} from './report/ReportVisualSummary';
import React from "react";
import type {KeywordRankTracking} from '@/lib/reportSchema';
import {KEYWORD_API_NOTE,keywordObservationLabel,keywordObservationSummary} from '@/lib/keywordObservationPresentation';
import {safeHttpUrl} from '@/lib/citationMeasurement';
export default function KeywordRankCard({tracking}:{tracking?:KeywordRankTracking|null}) {
  if(!tracking)return null;
  return <section className="report-card" aria-labelledby="keyword-api-title">
    <div className="report-card-heading"><p className="report-eyebrow">NAVER DEVELOPERS · OBSERVATION</p><h3 id="keyword-api-title">웹문서 API에서 발견된 페이지</h3><CompactText className="report-note" text={KEYWORD_API_NOTE} summary="네이버 웹문서 API 응답 기준입니다. 실제 통합검색 순위는 아닙니다."/></div>
    <p className="naver-api-summary">{keywordObservationSummary(tracking)}</p>
    <div className="naver-api-list">{tracking.keywords.map((item,i)=>{
      const link=safeHttpUrl(item.matchedUrl);const valid=tracking.measurementVersion===2&&['found','not_found'].includes(item.observationStatus||'');
      return <article key={`${item.keyword}-${i}`}><div><h4>{item.keyword}</h4><p>{keywordObservationLabel(item,tracking.measurementVersion)}</p></div><div className="naver-api-evidence">{valid?<p>최대 {item.requestedCount??'—'}건 요청 · {item.returnedCount??'—'}건 수신<br/>API 전체 결과 수 {item.totalResults?.toLocaleString()??'—'}건</p>:<p>{item.errorMessage||'정상 응답 여부를 확인할 수 없습니다.'}</p>}{item.observedAt&&<time dateTime={item.observedAt}>{new Date(item.observedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} KST</time>}{link&&<a href={link} target="_blank" rel="noopener noreferrer">발견한 URL 보기 ↗</a>}</div></article>;
    })}</div>
    <a className="naver-source-link" href="https://developers.naver.com/docs/serviceapi/search/web/web.md" target="_blank" rel="noopener noreferrer">웹문서 검색 API 공식 문서 ↗</a>
  </section>;
}
