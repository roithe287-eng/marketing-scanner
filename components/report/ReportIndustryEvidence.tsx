import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import {safeHttpUrl} from '@/lib/citationMeasurement';
import {sameSite} from '@/lib/siteIdentity';
import ReportJumpLink from './ReportJumpLink';
import {INDUSTRY_LABELS} from '@/lib/industryCategory';
import {industryReviewMessage} from '@/lib/industryDecisionSchema';
import {isSecondarySection} from '@/lib/websiteIdentity';
import type {PurposeKind} from '@/lib/websitePurpose';

const fieldNames={title:'페이지 제목',heading:'대표 제목',description:'메타 설명',body:'본문',product:'상품 원문',document:'서비스·이용 안내',action:'전환 동선'};
const typeNames:Record<PurposeKind,string>={commerce:'상품 판매형',service:'서비스·상담형',organization:'기업·기관형',education:'교육·프로그램형',content:'정보·콘텐츠형',public_service:'공공·지원 안내형',mixed:'판매·서비스 혼합형',unknown:'확인 필요'};

export default function ReportIndustryEvidence({report,linkToPurpose=false}:{report:MarketingReport;linkToPurpose?:boolean}){
  const review=report.industryDecision;
  if(review){
    const purpose=report.sitePurpose;
    const confirmed=review.status==='matched';
    const pageType=review.status==='page_type';
    const held=review.status==='review';
    const original=safeHttpUrl(review.sourceUrl);
    const multiple=held&&review.reason==='multiple_offers';
    const offerPages=multiple?review.offerPages?.filter(offer=>sameSite(offer.url,review.sourceUrl))||[]:[];
    return <section className="industry-original" aria-label="업종과 분석 범위">
      <dl className={`industry-decision${confirmed&&purpose?' industry-decision-flow':''}`} data-industry-status={review.status}>
        <div><dt>{pageType?'URL 유형':'업종 판정'}</dt><dd>{held?(multiple?'여러 사업 영역 확인':'업종 확인 필요'):review.label}</dd></div>
        {confirmed&&purpose&&<div><dt>페이지 유형</dt><dd>{typeNames[purpose.kind]}</dd></div>}
        <div><dt>{confirmed?'고객의 다음 행동':'적용 범위'}</dt><dd>{pageType?'콘텐츠·검색 점검':confirmed?(purpose?.goal.label||'업종별 점검'):'공통 페이지 점검'}</dd></div>
      </dl>
      {held&&<p className="industry-review-note">{industryReviewMessage[review.reason]}</p>}
      {!!offerPages.length&&<ul className="industry-offer-pages" aria-label="확인한 사업별 상세 주소">
        {offerPages.map(offer=>{const url=safeHttpUrl(offer.url);return url?<li key={`${offer.category}:${offer.url}`}>
          <a href={url} target="_blank" rel="noopener noreferrer"><strong>{INDUSTRY_LABELS[offer.category]}</strong><span>{offer.title} ↗</span></a>
        </li>:null;})}
      </ul>}
      {confirmed&&!!review.serviceSpecialties?.length&&<p className="industry-review-note"><strong>확인한 세부 서비스</strong> · {review.serviceSpecialties.join(' / ')}</p>}
      {confirmed&&!!review.retailSpecialties?.length&&<p className="industry-review-note"><strong>확인한 상품군</strong> · {review.retailSpecialties.join(' / ')}</p>}
      {confirmed&&!!review.retailItems?.length&&<div className="industry-merchandise"><strong>확인한 판매 품목</strong><ul>{review.retailItems.map(item=><li key={item}>{item}</li>)}</ul></div>}
      {(held&&review.reason==='redirected'&&original)&&<p className="industry-review-note"><a href={original} target="_blank" rel="noopener noreferrer">최종 주소 열기 · {new URL(original).host} ↗</a></p>}
      {review.evidence.length>0&&<details><summary>{confirmed?'업종 판단 근거 보기':pageType?'URL 유형 판정 근거 보기':'수집한 페이지 문구 보기'}</summary>
        <dl>{review.evidence.map(item=>{const url=safeHttpUrl(item.url);return <div key={item.text}>
          <dt>{fieldNames[item.field]}{url&&<a className="industry-evidence-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${fieldNames[item.field]} 원문 열기`}>원문 ↗</a>}</dt><dd>{item.text}</dd>
        </div>;})}</dl>
        {linkToPurpose&&<p className="report-related-link"><ReportJumpLink id="report-view-search-scope">페이지 목적과 항목별 판단 근거 보기</ReportJumpLink></p>}
      </details>}
    </section>;
  }

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
