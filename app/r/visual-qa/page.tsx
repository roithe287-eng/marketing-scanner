import {notFound} from 'next/navigation';
import LlmCitationCard from '@/components/LlmCitationCard';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import {fixture} from '@/tests/fixtures/report';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}) {
  if(process.env.VERCEL_ENV!=='preview')notFound();
  const {view}=await searchParams;
  if(!view)return <main><h1>모바일 시각화 검증 · 390px</h1><iframe title="390px 실제 보고서" width="390" height="1050" src="/r/TbNJTLnMmA4d"/><iframe title="390px 판정 불가" width="390" height="1050" src="/r/visual-qa?view=failed"/></main>;
  const failed={...fixture.llmCitationTest!,results:fixture.llmCitationTest!.results.map(r=>({...r,status:'error' as const,brandMentioned:undefined,errorMessage:'합성 검증 · HTTP 429',sources:[]}))};
  return <main className="space-y-5 p-3"><p>합성 데이터 · 실패/누락 검증</p><LlmCitationCard citation={failed}/><GeoComparisonPanel report={{...fixture,llmCitationTest:failed,geoBaseline:{reportId:'test1234',url:fixture.url,citation:failed}}}/></main>;
}
