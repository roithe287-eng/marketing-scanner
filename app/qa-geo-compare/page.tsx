import {notFound} from 'next/navigation';
import GeoComparisonPanel from '@/components/GeoComparisonPanel';
import {fixture} from '@/tests/fixtures/report';
import type {MarketingReport} from '@/lib/reportSchema';
export default async function Page({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  if (process.env.VERCEL_ENV!=='preview') notFound();
  const {mode}=await searchParams;
  if (!mode) return <main><h1>합성 데이터 비교 화면 검증</h1><iframe title="390px 비교 화면" width="390" height="1100" src="/qa-geo-compare?mode=valid"/><iframe title="390px 실패 화면" width="390" height="1100" src="/qa-geo-compare?mode=failed"/></main>;
  const old={...fixture.llmCitationTest!,measurementProtocol:'geo-compare-v1' as const,targetUrl:fixture.url,brandName:'테스트',cacheHit:false,measuredAt:'2026-10-01T00:00:00Z',results:fixture.llmCitationTest!.results.map(r=>({...r,model:'model-test',requestFingerprint:'a'.repeat(24),measuredAt:'2026-10-01T00:00:00Z',cited:false,sources:[]}))};
  const current={...old,measuredAt:'2026-10-02T00:00:00Z',results:old.results.map(r=>({...r,measuredAt:'2026-10-02T00:00:00Z',cited:mode!=='failed',status:mode==='failed'?'error' as const:'ok' as const,responseText:mode==='failed'?undefined:'현재 답변에서 자사 출처를 확인했습니다.',errorMessage:mode==='failed'?'HTTP 429 · 할당량 제한':undefined,sources:mode==='failed'?[]:[{url:'https://example.com/faq',title:'자사 FAQ',ownership:'own' as const}]}))};
  const report:MarketingReport={...fixture,llmCitationTest:current,geoBaseline:{reportId:'test1234',url:fixture.url,citation:old}};
  return <main className="p-3"><p>합성 검증 데이터</p><GeoComparisonPanel report={report}/></main>;
}
