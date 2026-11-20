import React from 'react';
import {notFound} from 'next/navigation';
import BrandHeader from '@/components/BrandHeader';
import ReportLayout from '@/components/report/ReportLayout';
import ReportReviewViewport from '@/components/report/ReportReviewViewport';
import ContentProtection from '@/components/ContentProtection';
import {hospitalPlaceReport} from '@/tests/fixtures/hospital-place-report';
import {serviceReviewReport} from '@/tests/fixtures/service-review-report';
import {visualReviewReport} from '@/tests/fixtures/visual-review-report';
import {platformReviewReport} from '@/tests/fixtures/platform-review-report';
import {radarReviewReport} from '@/tests/fixtures/radar-review-report';
import {nonCommerceGoalCases,nonCommerceGoalReport,type NonCommerceGoalSample} from '@/tests/fixtures/noncommerce-goal-report';
export const dynamic='force-dynamic';
export const metadata={title:'화면 검수용 가상 보고서',robots:{index:false,follow:false}};
/** Synthetic evidence only. No account, database, analysis, share or PDF capability. */
export default async function ReviewReport({searchParams}:{searchParams:Promise<{frame?:string;sample?:string;shared?:string}>}){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 const {sample,frame,shared}=await searchParams;
 const goalSample=sample&&Object.hasOwn(nonCommerceGoalCases,sample)?sample as NonCommerceGoalSample:undefined;
 if(frame!=='1')return <ReportReviewViewport clinic={sample==='hospital-place'} sample={goalSample}/>;
 const report=goalSample?nonCommerceGoalReport(goalSample):sample==='hospital-place'?hospitalPlaceReport():sample==='radar-review'?radarReviewReport():sample==='platform'?platformReviewReport():sample==='service'?serviceReviewReport():visualReviewReport();
 return <main className="report-page">{shared==='1'&&<ContentProtection/>}<BrandHeader/><div className="jm-container report-page-content"><aside className="report-empty" role="note">화면 검수용 가상 보고서 · 실제 고객이나 사이트의 분석 결과가 아닙니다. 내용·수치·외부 출처는 UI 검증을 위한 가상 자료입니다.</aside><ReportLayout clinicWebAllowed={shared!=='1'} report={report}/></div></main>;
}
