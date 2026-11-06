import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getPrincipal} from '@/lib/saas/auth';
import {getPublicSharedReport,getSharedReport} from '@/lib/shareStore';
import {canReadClinicWebsite} from '@/lib/clinicPlaceInsights';
import SharedReportView from '@/components/SharedReportView';
import {headers} from 'next/headers';
import {captureActivity,targetHost} from '@/lib/saas/activity';
export const dynamic='force-dynamic';
// Never put private customer report information in social/link-preview metadata.
export const metadata:Metadata={title:'보관된 진단 결과 | 마케팅스캐너',description:'공유 링크로 로그인 없이 진단 결과를 열람할 수 있습니다. 보관 기간은 최대 7일입니다.',robots:{index:false,follow:false}};
export default async function SharedReportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const report=await getPublicSharedReport(id);
  if(!report)notFound();
  const principal=await getPrincipal();
  const canSave=!!principal&&(principal.kind==='internal'||principal.account.features.reports)&&!!await getSharedReport(id,principal);
  const h=await headers();
  if(principal?.kind==='account'&&!h.get('next-router-prefetch')&&!/prefetch/i.test(h.get('purpose')||h.get('sec-purpose')||''))
    await captureActivity(principal.account.id,'report_view',h,{reportId:id,target:targetHost(report.url)});
  return <SharedReportView report={report} shareId={id} canSave={canSave} clinicWebAllowed={canReadClinicWebsite(principal)}/>;
}
