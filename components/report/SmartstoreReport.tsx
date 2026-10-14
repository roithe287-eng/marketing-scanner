"use client";
import React from 'react';
import {SMARTSTORE_NOTICE,SMARTSTORE_EXCLUSIONS,type SmartstoreReport as Report} from '@/lib/smartstore';

export default function SmartstoreReport({report}:{report:Report}) {
  return <section id="report-area" className="smartstore-report" aria-labelledby="smartstore-result-title">
    <header className="report-card smartstore-report-head">
      <span className="smartstore-tag">SMARTSTORE · 제한 분석</span>
      <h1 id="smartstore-result-title">스토어에서 확인한 정보만,<br/>명확하게 보여드립니다.</h1>
      <p className="smartstore-result-url">{report.url}</p>
      <div className="smartstore-notice"><strong>일반 웹사이트와 분석 범위가 다릅니다</strong><p>{SMARTSTORE_NOTICE}</p></div>
      <dl className="smartstore-facts">
        <div><dt>업체 식별자</dt><dd>{report.storeId}</dd></div>
        <div><dt>분석 대상</dt><dd>{report.productId?`상품 ${report.productId}`:'스토어 홈'}</dd></div>
        <div><dt>공개 정보 관측</dt><dd>{report.observations.length}개 항목</dd></div>
      </dl>
      <p className="smartstore-time">확인 시각 · {new Date(report.observedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간)</p>
    </header>
    <article className="report-card">
      <h2>{report.status==='observed'?'공개 페이지에서 확인한 항목':'페이지 콘텐츠 확인이 제한되었습니다'}</h2>
      <p role="status" className="smartstore-reason">{report.reason}</p>
      {report.observations.length>0?<div className="smartstore-observations">{report.observations.map(item=><section key={item.id}><h3>{item.label}</h3><p className="smartstore-value">{item.value}</p><p>{item.note}</p></section>)}</div>:<div className="smartstore-empty"><strong>주소 형식과 업체 식별자만 확인했습니다.</strong><p>스토어가 정상 운영되는지, 상품 내용이 적절한지는 아직 판단하지 않았습니다. 콘텐츠 미확인 결과는 진단 한도에서 차감하지 않습니다.</p></div>}
      <a className="report-secondary-button" href={report.url} target="_blank" rel="noopener noreferrer">입력한 스토어·상품 페이지 열기 ↗</a>
    </article>
    <article className="report-card"><h2>이번 분석에서 평가하지 않는 항목</h2><p className="smartstore-reason">확인 불가능한 항목을 0점이나 개선 필요로 표시하지 않습니다.</p><div className="smartstore-exclusions">{SMARTSTORE_EXCLUSIONS.map(item=><section key={item.label}><h3>{item.label}</h3><p>{item.reason}</p></section>)}</div></article>
    <article className="report-card"><h2>판매자센터에서 이어서 확인하세요</h2><ol className="smartstore-next"><li><strong>등록 정보 확인</strong><p>상품명·카테고리·속성·브랜드·설명을 실제 상품 정보와 대조하세요. 아래 안내는 개별 스토어에서 발견한 오류가 아닌 직접 확인할 목록입니다.</p></li><li><strong>고객이 받는 정보 확인</strong><p>옵션·가격·배송·반품 안내가 상품 상세 화면에서 명확한지 확인하세요.</p></li><li><strong>성과 확인</strong><p>유입·검색·구매 성과는 판매자센터 통계에서 확인하세요. 이번 공개 URL 분석은 계정이나 커머스API를 연결하지 않습니다.</p></li></ol><div className="smartstore-links"><a href="https://sell.smartstore.naver.com/" target="_blank" rel="noopener noreferrer">스마트스토어 판매자센터 ↗</a><a href="https://apicenter.commerce.naver.com/ko" target="_blank" rel="noopener noreferrer">네이버 공식 커머스API 안내 ↗</a></div></article>
    <p className="smartstore-footer">진짜마케팅 · 마케팅스캐너 | 공개 페이지의 제한적 관측이며 검색 순위·노출·매출을 보장하지 않습니다. 외부 배포 금지.</p>
  </section>;
}
