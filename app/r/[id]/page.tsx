import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {getPrincipal} from '@/lib/saas/auth';
import {getSharedReport} from '@/lib/shareStore';
import SharedReportView from '@/components/SharedReportView';
export const dynamic='force-dynamic';
// Never put private customer report information in social/link-preview metadata.
export const metadata:Metadata={title:'보관된 진단 결과 | 마케팅스캐너',description:'이용 권한 확인 후 진단 결과를 열람할 수 있습니다.',robots:{index:false,follow:false}};
export default async function SharedReportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const principal=await getPrincipal();
  if(!principal)redirect('/login?next='+encodeURIComponent('/r/'+id));
  const report=await getSharedReport(id,principal);
  if(!report)notFound();
  return <SharedReportView report={report} shareId={id}/>;
}
