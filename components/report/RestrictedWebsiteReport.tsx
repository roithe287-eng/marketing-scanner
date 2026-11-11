import React from 'react';
import {COMMUNITY_REVIEW_AREAS,type RestrictedWebsiteReport} from '@/lib/restrictedWebsite';

export default function RestrictedWebsiteReportView({report}:{report:RestrictedWebsiteReport}){
  const reason=report.reason==='robots'?'사이트의 robots.txt 수집 규칙':report.reason==='rate_limited'?'사이트의 요청 빈도 제한':report.reason==='not_acceptable'?'사이트가 수집 요청 형식을 허용하지 않는 응답':'사이트 서버의 접근 제한';
  return <div id="report-area" className="space-y-6 pt-8" aria-label="원문 수집 제한 안내">
    <section className="jm-card p-6 md:p-10">
      <p className="report-eyebrow">COLLECTION STATUS</p>
      <h1 className="mt-3 text-2xl font-black md:text-3xl">원문 수집이 제한되어<br/>{report.sources.length?'공개 검색자료를 확인했습니다.':'전체 진단을 보류했습니다.'}</h1>
      <a href={report.url} target="_blank" rel="noopener noreferrer" className="mt-4 block break-all text-sm font-bold underline underline-offset-4">{report.url} ↗</a>
      <p className="mt-5 text-sm leading-7 text-jm-gray">{reason}{report.httpStatus?` (HTTP ${report.httpStatus})`:''}으로 페이지 HTML을 읽지 못했습니다. 검색 요약은 참고자료이며 현재 화면·버튼·회원가입 동작을 검증한 결과가 아닙니다.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{['종합·SEO 점수 산정 안 함','미확인 기능 감점 안 함','정상 진단 이용 횟수 차감 안 함'].map(text=><p key={text} className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold">{text}</p>)}</div>
    </section>
    <section className="jm-card p-6 md:p-10" aria-label="공개 검색자료">
      <p className="report-eyebrow">PUBLIC SEARCH</p>
      <h2 className="mt-2 text-xl font-black">같은 사이트의 공개 검색자료</h2>
      <p className="mt-2 text-sm leading-7 text-jm-gray">네이버 검색에 표시된 제목·요약입니다. 수집 시각 {new Date(report.observedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간) · 원문 미검증</p>
      {report.sources.length?<ul className="mt-6 space-y-5">{report.sources.map(source=><li key={source.url} className="border-t border-slate-200 pt-5">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">{source.title||source.url} ↗</a>
        {source.description&&<p className="mt-2 text-sm leading-7 text-jm-gray">{source.description}</p>}
        <p className="mt-2 break-all text-xs text-jm-gray">{source.url}</p>
      </li>)}</ul>:<p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm leading-7">{report.searchStatus==='empty'?'검색 응답에서 표시할 동일 사이트 자료를 찾지 못했습니다. 검색 색인 전체의 부재를 뜻하지 않습니다.':'공개 검색자료도 현재 가져오지 못했습니다. 사이트의 콘텐츠나 기능이 없다는 의미는 아닙니다.'}</p>}
    </section>
    {report.communityCandidate&&<section className="jm-card p-6 md:p-10" aria-label="커뮤니티 분석 범위 안내">
      <p className="report-eyebrow">COMMUNITY REVIEW</p>
      <h2 className="mt-2 text-xl font-black">커뮤니티·정보 포털 분석 범위</h2>
      <p className="mt-2 text-sm leading-7 text-jm-gray">메인 검색 요약에서 커뮤니티·포털 성격을 확인했습니다. 아래는 원문을 읽을 수 있을 때 적용할 점검 기준이며, 현재 기능의 유무는 미확인입니다.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{COMMUNITY_REVIEW_AREAS.map((item,index)=><div key={item.title} className="rounded-xl border border-slate-200 p-5"><p className="text-xs font-bold text-jm-gray">0{index+1} · 미확인</p><h3 className="mt-2 font-bold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-jm-gray">{item.detail}</p></div>)}</div>
    </section>}
    <section className="jm-card p-6 md:p-10">
      <h2 className="text-xl font-black">전체 진단을 진행하려면</h2>
      <p className="mt-3 text-sm leading-7 text-jm-gray">{report.reason==='rate_limited'?'사이트의 요청 제한이 해제된 후 다시 진단해 주세요.':'사이트 운영자가 공개 페이지에 대한 JinjjaScanner 수집을 허용해야 합니다. 사이트의 robots.txt와 방화벽 접근 정책을 확인한 뒤 같은 URL을 다시 진단해 주세요.'} 원문 접근이 가능하면 게시판·글 상세와 실제 관측 근거를 포함한 보고서를 생성합니다.</p>
    </section>
  </div>;
}
