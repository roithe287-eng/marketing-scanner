import {notFound} from 'next/navigation';
import GeoFocusPanel from '@/components/GeoFocusPanel';
import CompetitorComparison from '@/components/CompetitorComparison';
import {fixture} from '@/tests/fixtures/report';

export const dynamic = 'force-dynamic';
export default async function QaNext({searchParams}: {searchParams: Promise<{panel?: string}>}) {
  if (process.env.VERCEL_ENV !== 'preview') notFound();
  const {panel} = await searchParams;
  if (!panel) return <main className="p-4"><h1>임시 검증 화면 · 실제 분석 데이터 아님</h1><iframe title="390px 검증" src="/qa-next?panel=mobile" width="390" height="1100" className="mt-4 border"/><iframe title="전체 실패 검증" src="/qa-next?panel=failed" width="800" height="500" className="mt-4 border"/></main>;
  const report = panel === 'failed' ? {...fixture, llmCitationTest:{...fixture.llmCitationTest!, results:fixture.llmCitationTest!.results.map(r=>({...r,status:'error' as const,searchUsed:false,citationVerified:false,sources:[]}))}} : fixture;
  const comparison = {searchKeyword:'광고대행',competitors:[{domain:'agency.example',title:'광고대행 서비스',link:'https://agency.example',description:'광고대행',rank:1,searchRank:2,relevance:'needs_review' as const,selectionEvidence:'페이지 수집에 실패해 서비스 관련성은 확인이 필요합니다.',fetchError:'검증용 수집 실패'}],filtering:{policyVersion:1 as const,reviewedCount:2,metadataCheckedCount:1,excluded:[{domain:'humetro.busan.kr',title:'광고문의 > 정보공개 > 부산교통공사',link:'https://humetro.busan.kr',reason:'대행 서비스가 아닌 공공기관의 광고 매체·시설 문의 페이지'}]}};
  return <main className="p-3"><p className="text-sm">임시 검증 샘플</p><GeoFocusPanel report={report}/>{panel !== 'failed' && <CompetitorComparison ourUrl={fixture.url} competitorAnalysis={comparison}/>}</main>;
}
