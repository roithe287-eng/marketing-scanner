"use client";
import {useState} from 'react';
import ShareButton from './ShareButton';
import type {MarketingReport} from '@/lib/reportSchema';
import BrandHeader from '@/components/BrandHeader';
import DownloadReportButton from '@/components/DownloadReportButton';
import ContentProtection from '@/components/ContentProtection';
import ReportLayout from '@/components/report/ReportLayout';
export default function SharedReportView({report,canSave=false}:{report:MarketingReport;shareId:string;canSave?:boolean}) {
  const [viewReport,setViewReport]=useState(report);
  return <main className="report-page"><ContentProtection/><BrandHeader lockHome/><div className="jm-container report-page-content"><ReportLayout report={viewReport} onComparisonChange={baseline=>setViewReport(prev=>({...prev,diagnosisBaseline:baseline}))} actions={<><DownloadReportButton targetId="report-area" report={viewReport} direct/>{canSave&&viewReport!==report&&<ShareButton report={viewReport}/>}</>}/></div><footer className="report-footer">© {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너</footer></main>;
}
