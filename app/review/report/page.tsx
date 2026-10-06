import React from 'react';
import {notFound} from 'next/navigation';
import BrandHeader from '@/components/BrandHeader';
import ReportLayout from '@/components/report/ReportLayout';
import {MarketingReportSchema} from '@/lib/reportSchema';
import fixture from '@/tests/fixtures/usability-report.json';
export const dynamic='force-dynamic';
export const metadata={title:'화면 검수용 가상 보고서',robots:{index:false,follow:false}};
/** Synthetic evidence only. No account, database, analysis, share or PDF capability. */
export default function ReviewReport(){
 if(process.env.VERCEL_ENV!=='preview')notFound();
 return <main className="report-page"><BrandHeader/><div className="jm-container report-page-content"><aside className="report-empty" role="note">화면 검수용 가상 보고서 · 실제 고객이나 사이트의 분석 결과가 아닙니다.</aside><ReportLayout report={MarketingReportSchema.parse(fixture)}/></div></main>;
}
