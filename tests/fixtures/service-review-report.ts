import {load} from 'cheerio';
import {captureSiteEditing} from '../../lib/captureSiteEditing';
import {analyzeWebsitePurpose} from '../../lib/websitePurpose';
import {buildAnswerContentPlan} from '../../lib/answerContent';
import {visualReviewReport} from './visual-review-report';

/** Fictional study-abroad site. Used for visual and regression checks, never customer evidence. */
export function serviceReviewReport(){
 const url='https://education.example.org/';
 const title='가상 유학 상담 · 어학연수와 대학 진학';
 const description='학생과 성인을 위한 국가별 어학연수, 대학 진학 프로그램과 상담 절차를 안내합니다.';
 const html=`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body><nav><a href="/">전체 메뉴</a></nav><main>
 <section><h1>목표에 맞는 유학 프로그램을 비교하세요</h1><p>어학연수와 대학 진학 프로그램은 대상, 국가, 학습 목적에 따라 안내합니다. 기본 포함 범위와 추가 준비사항은 상담에서 확인하세요.</p><p>미국·캐나다·호주 과정은 지원 대상과 진행 방식이 다릅니다. 신청 전 각 프로그램의 조건과 안내 자료를 함께 확인하세요.</p></section>
 <section><h2>프로그램과 조건</h2><p>초특가 어학연수</p><p>초특가 어학연수</p><p>초특가 어학연수</p><p>어학연수 비용은 학비와 숙소 유형, 참여 기간에 따라 달라집니다. 포함 비용과 별도 준비 비용을 상담 후 확인하세요.</p>${Array.from({length:18},(_,i)=>`<p>프로그램 ${i+1} 안내 · 대상과 일정은 개별 모집 문서에서 확인하세요.</p>`).join('')}</section>
 <section><h2>상담과 신청</h2><p>상담 신청 후 목표와 준비 상황을 확인하고, 학교별 조건과 준비 서류를 검토합니다. 제출 전 일정과 지원 범위를 다시 확인합니다.</p><a href="/consult?type=language&utm_source=hero">어학연수 상담</a><a href="/consult?type=language&utm_source=footer">어학연수 상담</a><a href="/consult?type=degree">대학 진학 상담</a></section>
 <section><h2>후기와 상담 경험</h2><p>18년 평균상담경력</p><p>가상 후기: 학교별 지원 조건과 준비 자료를 비교한 뒤 상담을 신청했습니다. 후기에는 당시 진행 조건과 작성 시점을 함께 표시합니다.</p><a href="/reviews/1">후기 자세히 보기</a></section>
 <section><h2>출국 전후 지원</h2><p>출국 준비와 현지 적응 안내를 제공합니다. 프로그램별 지원 범위와 기간, 별도 비용이 발생하는 조건은 신청 전에 확인하세요.</p><a href="https://partner.example.org/guide">협력 기관 안내</a></section>
 </main><footer>이용약관</footer></body></html>`;
 const $=load(html),bodyText=$('main').find('p').map((_,e)=>$(e).text()).get().join('\n');
 const data={url,finalUrl:url,title,description,ogDescription:description,h1:['목표에 맞는 유학 프로그램을 비교하세요'],h2:['프로그램과 조건','상담과 신청','후기와 상담 경험','출국 전후 지원'],bodyText,isJsHeavy:false,siteEditing:captureSiteEditing(load(html),url,new Headers())};
 const report=visualReviewReport();
 return {...report,url,meta:{...report.meta,siteName:'가상 유학 상담 · 실제 분석 아님',domain:'education.example.org'},oneLineSummary:'국가·대상·조건과 실제 문구 연결을 확인하는 가상 보고서입니다.',sitePurpose:analyzeWebsitePurpose(data),answerContentPlan:buildAnswerContentPlan(data),pageEvidence:{version:1 as const,requestedUrl:url,finalUrl:url,capturedAt:'2026-10-26T01:00:00.000Z',title,description,h1:data.h1,h2:data.h2,ctaButtons:['어학연수 상담','대학 진학 상담'],bodyText,bodyTruncated:false,siteEditing:data.siteEditing}};
}
