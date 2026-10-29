import React from 'react';
import {notFound} from 'next/navigation';
import BrandHeader from '@/components/BrandHeader';
import ReportLayout from '@/components/report/ReportLayout';
import ReportReviewViewport from '@/components/report/ReportReviewViewport';
import ContentProtection from '@/components/ContentProtection';
import {serviceReviewReport} from '@/tests/fixtures/service-review-report';
import {visualReviewReport} from '@/tests/fixtures/visual-review-report';
import {platformReviewReport} from '@/tests/fixtures/platform-review-report';
export const dynamic='force-dynamic';
export const metadata={title:'화면 검수용 가상 보고서',robots:{index:false,follow:false}};
/** Synthetic evidence only. No account, database, analysis, share or PDF capability. */
export default async function ReviewReport({searchParams}:{searchParams:Promise<{frame?:string;sample?:string;shared?:string}>}){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 if((await searchParams).frame!=='1')return <ReportReviewViewport/>;
 const sample=(await searchParams).sample;
 return <main className="report-page">{(await searchParams).shared==='1'&&<ContentProtection/>}<BrandHeader/><div className="jm-container report-page-content"><aside className="report-empty" role="note">화면 검수용 가상 보고서 · 실제 고객이나 사이트의 분석 결과가 아닙니다. 내용·수치·외부 출처는 UI 검증을 위한 가상 자료입니다.</aside><ReportLayout report={sample==='platform'?platformReviewReport():sample==='service'?serviceReviewReport():visualReviewReport()}/></div></main>;
}
