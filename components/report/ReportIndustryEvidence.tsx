import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {sameSite} from '@/lib/siteIdentity';
import ReportJumpLink from './ReportJumpLink';
import {isSecondarySection} from '@/lib/websiteIdentity';

export default function ReportIndustryEvidence({report,linkToPurpose=false}:{report:MarketingReport;linkToPurpose?:boolean}){
  const page=report.pageEvidence, purpose=report.sitePurpose;
  if(!page||!purpose||(!page.title&&!page.description)||!sameSite(page.finalUrl,report.url))return null;
  const business=purpose.business;
  const apparel=business?.id==='custom_apparel';
  const terms=business?.keywords??[];
  const garments=terms.filter(t=>/복|잠|폼|점퍼|막이|셔츠/.test(t)).slice(0,4);
  const observedActions=(page.siteEditing?.elements||[]).filter(e=>e.kind==='cta'&&e.text.length<=42&&!isSecondarySection(e.heading,e.text,e.href))
    .flatMap(e=>{
      const url=safeHttpUrl(e.href);
      return url&&sameSite(url,page.finalUrl)&&/시안|견적|샘플|주문|예약|상담|신청|구매|수강|접수|다운로드/.test(e.text)?[{label:e.text,url}]:[];
    }).filter((a,i,rows)=>rows.findIndex(b=>b.url===a.url)===i).slice(0,4);
  const excerpt=page.siteEditing?.contentSections?.find(s=>!s.truncated&&s.text.length>=8&&s.text.length<=220&&!isSecondarySection(s.heading,s.text,s.url)&&
    (terms.length?terms.some(term=>s.text.includes(term)):purpose.evidence.some(e=>e.text.includes(s.text))));
  return <section className="industry-original" aria-label="홈페이지 업종 판단 근거">
    {apparel&&<div className="industry-path">
      {garments.length>0&&<article><h3>확인한 의류 품목</h3><p>{garments.join(' · ')}</p></article>}
      {observedActions.length>0&&<article><h3>홈페이지 주문·문의 경로</h3><div className="industry-action-links">{observedActions.map(a=><a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer">{a.label} ↗</a>)}</div></article>}
    </div>}
    <details><summary>업종 판단에 사용한 홈페이지 원문</summary>
      <p className="report-note">이 페이지에 적용한 유형은 <strong>{purpose.sector?.label||purpose.label}</strong>입니다. 아래에서 실제로 읽은 문구를 확인할 수 있습니다.</p>
      <dl>
      {page.title&&<div><dt>페이지 제목</dt><dd>{page.title}{page.metadataTruncated?.title&&<small>저장된 제목 일부</small>}</dd></div>}
      {page.description&&<div><dt>메타 설명</dt><dd>{page.description}{page.metadataTruncated?.description&&<small>저장된 설명 일부</small>}</dd></div>}
      {excerpt&&<div><dt>본문 근거</dt><dd>{excerpt.text}</dd></div>}
    </dl>{linkToPurpose&&<p className="report-related-link"><ReportJumpLink id="report-view-search-scope">페이지 목적과 항목별 판단 근거 보기</ReportJumpLink></p>}</details>
  </section>;
}
