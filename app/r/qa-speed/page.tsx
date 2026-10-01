import { notFound } from 'next/navigation';
import QaReport from './QaReport';
import { fixture } from '@/tests/fixtures/report';
import { MarketingReportSchema } from '@/lib/reportSchema';

export const dynamic='force-dynamic';

export default function QaPage() {
  if (process.env.VERCEL_ENV !== 'preview' || Date.now() > Date.parse('2026-10-01T10:00:00Z')) notFound();
  const longAnswer=Array.from({length:45},(_,i)=>`${i+1}. 검증용 한국어 문단입니다. 고객 질문에 대한 답변과 출처가 공유 결과 및 PDF에 누락 없이 포함되는지 확인합니다. 페이지 아래쪽의 문장이 잘리거나 다음 문장과 겹치지 않아야 합니다.`).join('\n');
  const report=MarketingReportSchema.parse({...fixture,meta:{siteName:'검증용 데이터 · 실제 분석 아님',domain:'example.com'},llmCitationTest:{...fixture.llmCitationTest,results:Array.from({length:10},(_,i)=>({...fixture.llmCitationTest!.results[0],question:`검증 질문 ${i+1}: 고객 여정에서 확인할 점은 무엇인가요?`,responseText:longAnswer+`\n마지막 답변 ${i+1} 확인 문구 🔎 `+'공백없는문자열'.repeat(180)}))}});
  return <QaReport report={report} />;
}
