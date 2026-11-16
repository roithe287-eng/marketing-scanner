import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getPrincipal} from '@/lib/saas/auth';
import {getPublicSharedReport,getSharedReport} from '@/lib/shareStore';
import {canReadClinicWebsite} from '@/lib/clinicPlaceInsights';
import SharedReportView from '@/components/SharedReportView';
import {headers} from 'next/headers';
import {captureActivity,targetHost} from '@/lib/saas/activity';
import {canShareReports} from '@/lib/saas/types';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'보관된 진단 결과 | 마케팅스캐너',description:'보관 기간은 최대 7일입니다.',robots:{index:false,follow:false}};
export default async function SharedReportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const principal=await getPrincipal();
  const publicReport=await getPublicSharedReport(id);
  const ownReport=principal?await getSharedReport(id,principal):null;
  const report=publicReport??ownReport;
  if(!report)notFound();
  const canSave=!!publicReport&&!!ownReport&&!!principal&&canShareReports(principal);
  const h=await headers();
  if(principal?.kind==='account'&&!h.get('next-router-prefetch')&&!/prefetch/i.test(h.get('purpose')||h.get('sec-purpose')||''))
    await captureActivity(principal.account.id,'report_view',h,{reportId:id,target:targetHost(report.url)});
  return <SharedReportView report={report} shareId={id} canSave={canSave} privateReport={!publicReport} clinicWebAllowed={canReadClinicWebsite(principal)}/>;
}
