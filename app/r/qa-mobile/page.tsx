import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default function QaMobile() {
  if(process.env.VERCEL_ENV!=='preview' || Date.now()>Date.parse('2026-10-01T10:00:00Z')) notFound();
  return <div><h1>390px 모바일 검증</h1><iframe title="모바일 보고서" src="/qa-mobile-report" style={{width:390,height:1000,border:'1px solid #ddd'}} /></div>;
}
