"use client";
import React from 'react';
import {SMARTSTORE_NOTICE,storePlatformLabel,type SmartstoreReport as Report} from '@/lib/smartstore';
import {REPORT_CHAPTERS,ReportChapter as Chapter} from './ReportChapter';
import StoreUnavailableSections from './StoreUnavailableSection';
import GrowthKpiPanel from './GrowthKpiPanel';
import AdWasteCalculator from '@/components/AdWasteCalculator';

export default function SmartstoreReport({report}:{report:Report}) {
  const platform=storePlatformLabel(report.url)||'네이버 스토어';
  return <section id="report-area" className="report-v2 smartstore-report" aria-labelledby="smartstore-result-title">
    <header className="report-card smartstore-report-head">
      <span className="smartstore-tag">{platform} · 제한 분석</span>
      <h1 id="smartstore-result-title">확인한 정보는 그대로,<br/>분석 범위는 명확하게.</h1>
      <p className="smartstore-result-url">{report.url}</p>
      <div className="smartstore-notice"><strong><span aria-hidden="true">⚠️ </span>{platform} · 콘텐츠 분석 대부분 제한</strong><p>{SMARTSTORE_NOTICE}</p></div>
      <dl className="smartstore-facts">
        <div><dt>업체 식별자</dt><dd>{report.storeId}</dd></div>
        <div><dt>분석 대상</dt><dd>{report.productId?`상품 ${report.productId}`:'스토어 홈'}</dd></div>
        <div><dt>공개 정보 관측</dt><dd>{report.observations.length}개 항목</dd></div>
      </dl>
      <p className="smartstore-time">확인 시각 · {new Date(report.observedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간)</p>
    </header>
    <aside className="store-report-legend" aria-label="결과 읽는 방법"><span><i className="store-live-dot"/>실제 관측 · 확인한 정보</span><span><i className="store-manual-dot"/>직접 입력 · 계산 도구</span><span><i className="store-locked-dot"/>미적용 · 블러 처리된 예시</span><p>확인 불가능한 항목을 0점이나 개선 필요로 표시하지 않습니다.</p></aside>
    <nav className="report-nav" aria-label="보고서 목차">{REPORT_CHAPTERS.map(([id,label],i)=><a key={id} href={`#report-${id}`}><span>0{i+1}</span>{label}</a>)}</nav>
    <Chapter id="overview" number="01" title="먼저 파악할 핵심" note="입력한 스토어와 실제 확인 범위를 먼저 살펴보세요.">
      <article className="report-card" data-store-section="coverage" data-applicability="observed">
        <span className="store-live-label">수집 범위 확인</span>
        <h3>{report.status==='observed'?'공개 페이지에서 확인한 항목':'페이지 콘텐츠 확인이 제한되었습니다'}</h3>
        <p role="status" className="smartstore-reason">{report.reason}</p>
        {report.observations.length>0?<div className="smartstore-empty"><strong>입력한 페이지에서 {report.observations.length}개 항목을 확인했습니다.</strong><p>제목·설명 등 실제 관측 내용은 ‘검색·페이지’에서 확인하세요. 스토어 전체 상품·후기·화면·매출을 조사한 결과는 아닙니다.</p><a href="#report-search">확인한 정보 보기 ↓</a></div>:<div className="smartstore-empty"><strong>주소 형식과 업체 식별자만 확인했습니다.</strong><p>스토어가 정상 운영되는지, 상품 내용이 적절한지는 아직 판단하지 않았습니다. 콘텐츠 미확인 결과는 진단 한도에서 차감하지 않습니다.</p></div>}
        <a className="report-secondary-button" href={report.url} target="_blank" rel="noopener noreferrer">입력한 스토어·상품 페이지 열기 ↗</a>
      </article>
      <StoreUnavailableSections chapter="overview"/>
    </Chapter>
    <Chapter id="geo" number="02" title="AI가 브랜드를 읽는 방식" note="이번 스토어 URL 진단에서는 AI 답변과 인용을 측정하지 않습니다. 각 화면은 일반 웹사이트 진단 예시입니다."><StoreUnavailableSections chapter="geo"/></Chapter>
    <Chapter id="search" number="03" title="검색과 페이지의 연결" note="공개 페이지에서 확인된 원문을 보여드립니다. 검색 노출·순위나 플랫폼의 기술 SEO를 평가하지 않습니다.">
      <article className="report-card" data-store-section="metadata" data-applicability={report.observations.length?'observed':'unavailable-data'}>
        <span className="store-live-label">{report.observations.length?'실제 관측':'자료 확인 불가'}</span><h3>공개 제목·설명·상품 정보</h3>
        {report.observations.length>0?<div className="smartstore-observations">{report.observations.map(item=><section key={item.id}><h4>{item.label}</h4><p className="smartstore-value">{item.value}</p><p>{item.note}</p></section>)}</div>:<div className="smartstore-empty"><strong>표시할 공개 콘텐츠를 확보하지 못했습니다.</strong><p>제목·설명이 없거나 품질이 낮다는 뜻은 아닙니다. 수집 제한 사유는 ‘핵심 요약’에서 확인할 수 있습니다.</p></div>}
        <p className="smartstore-reason">공유용 정보와 상품 데이터는 입력한 한 페이지의 관측입니다. 실제 검색 결과 화면이나 검색 순위를 의미하지 않습니다.</p>
      </article>
      <article className="report-card" data-store-section="seller-guide" data-applicability="manual"><span className="store-manual-label">직접 확인 안내</span><h3>이 스토어는 어디서 수정할까요?</h3><p className="smartstore-reason">상품명·카테고리·속성·브랜드·설명은 판매자센터의 등록 내용과 대조하세요. 실제 수정 가능 범위는 계정 권한과 제공 메뉴에서 확인할 수 있습니다.</p><a className="report-secondary-button" href="https://sell.smartstore.naver.com/" target="_blank" rel="noopener noreferrer">네이버 판매자센터 열기 ↗</a></article>
      <StoreUnavailableSections chapter="search"/>
    </Chapter>
    <Chapter id="competition" number="04" title="비교 후보에서 찾는 차이" note="경쟁 스토어 자료를 수집하지 않았습니다. 아래 업체·수치는 화면 이해를 돕는 가상 예시입니다."><StoreUnavailableSections chapter="competition"/></Chapter>
    <Chapter id="actions" number="05" title="확인한 내용을 실행으로" note="직접 확인할 목록과 입력형 계산기를 사용할 수 있습니다. 자동 개선안은 이번 진단에 적용하지 않습니다.">
      <article className="report-card" data-store-section="seller-checklist" data-applicability="manual"><span className="store-manual-label">직접 확인 안내</span><h3>판매자센터에서 이어서 확인하세요</h3><p className="smartstore-reason">아래 목록은 이 스토어에서 발견한 오류나 자동 개선안이 아닙니다.</p><ol className="smartstore-next"><li><strong>등록 정보 확인</strong><p>상품명·카테고리·속성·브랜드·설명을 실제 상품 정보와 대조하세요.</p></li><li><strong>고객이 받는 정보 확인</strong><p>옵션·가격·배송·반품 안내가 상품 상세 화면에서 명확한지 확인하세요.</p></li><li><strong>성과 확인</strong><p>유입·검색·구매 성과는 판매자센터 통계에서 확인하세요. 이번 공개 URL 분석은 계정이나 커머스API를 연결하지 않습니다.</p></li></ol></article>
      <div className="store-manual-tool" data-store-section="goal-calculator" data-applicability="manual"><p className="store-tool-note"><span className="store-manual-label">직접 입력 도구</span>자동 분석 결과가 아닙니다. 실제 수치를 직접 입력하면 계산됩니다.</p><GrowthKpiPanel targetUrl={report.url} platform="naver-store"/></div>
      <div className="store-manual-tool" data-store-section="budget-calculator" data-applicability="manual"><p className="store-tool-note"><span className="store-manual-label">직접 입력 도구</span>광고비·전환 수·목표 CPA를 직접 입력하세요.</p><AdWasteCalculator/></div>
      <StoreUnavailableSections chapter="actions"/>
    </Chapter>
    <p className="smartstore-footer">진짜마케팅 · 마케팅스캐너 | 공개 페이지의 제한적 관측이며 검색 순위·노출·매출을 보장하지 않습니다. 블러 화면은 실제 분석값이 아닌 예시입니다. 외부 배포 금지.</p>
  </section>;
}
