import {notFound} from 'next/navigation';
import SharedReportView from '@/components/SharedReportView';
import {fixture} from '@/tests/fixtures/report';
export const dynamic='force-dynamic';
export default async function Quality({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  if(process.env.VERCEL_ENV!=='preview' || process.env.VERCEL_GIT_COMMIT_REF!=='feat/geo-report-quality-20261001')notFound();
  const {mode}=await searchParams;
  if(mode==='mobile')return <main><h1>모바일 390px 검증</h1><iframe title="모바일 리포트" src="/quality?mode=long" width="390" height="900" style={{border:0}} /></main>;
  const report=structuredClone(fixture);
  report.meta={siteName:'품질 검증용 가상 데이터'};
  if(mode==='long') {
    report.llmCitationTest!.results[0].responseText=Array.from({length:100},(_,i)=>`${i+1}. 긴 한국어 문단입니다. 고객이 비용과 계약 범위를 묻는 질문에 정확한 근거를 제공해야 합니다. 조건과 예외를 함께 표시하고 최신 정보를 확인합니다.`).join('\n');
    report.llmCitationTest!.actionPlan![0].nextStep+='가로넘침검증'.repeat(100);
  }
  if(mode==='legacy')delete report.llmCitationTest!.measurementVersion;
  if(mode==='empty')report.llmCitationTest=null;
  return <SharedReportView report={report} shareId="qualitytest" />;
}
