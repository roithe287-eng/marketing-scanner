"use client";
import type {MarketingReport} from '@/lib/reportSchema';
import BrandHeader from '@/components/BrandHeader';
import DownloadReportButton from '@/components/DownloadReportButton';
import ContentProtection from '@/components/ContentProtection';
import ReportLayout from '@/components/report/ReportLayout';
export default function SharedReportView({report}:{report:MarketingReport;shareId:string}) {
  return <main className="report-page"><ContentProtection/><BrandHeader lockHome/><div className="jm-container report-page-content"><ReportLayout report={report} actions={<DownloadReportButton targetId="report-area" report={report} direct/>}/></div><footer className="report-footer">© {new Date().getFullYear()} 진짜마케팅 · 마케팅스캐너</footer></main>;
}
