import React from 'react';
import {notFound} from 'next/navigation';
import BrandHeader from '@/components/BrandHeader';
import ReportLayout from '@/components/report/ReportLayout';
import ReportReviewViewport from '@/components/report/ReportReviewViewport';
import {MarketingReportSchema} from '@/lib/reportSchema';
import fixture from '@/tests/fixtures/usability-report.json';
import {answerPlan} from '@/tests/fixtures/answer-content';
export const dynamic='force-dynamic';
export const metadata={title:'화면 검수용 가상 보고서',robots:{index:false,follow:false}};
/** Synthetic evidence only. No account, database, analysis, share or PDF capability. */
export default async function ReviewReport({searchParams}:{searchParams:Promise<{frame?:string}>}){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 if((await searchParams).frame!=='1')return <ReportReviewViewport/>;
 return <main className="report-page"><BrandHeader/><div className="jm-container report-page-content"><aside className="report-empty" role="note">화면 검수용 가상 보고서 · 실제 고객이나 사이트의 분석 결과가 아닙니다. 과잠바 FAQ 영역은 별도 가상 상품 페이지의 예시입니다.</aside><ReportLayout report={MarketingReportSchema.parse({...fixture,answerContentPlan:answerPlan()})}/></div></main>;
}
