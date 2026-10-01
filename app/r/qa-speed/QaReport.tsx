'use client';
import {useState} from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import SharedReportView from '@/components/SharedReportView';
import ShareButton from '@/components/ShareButton';

export default function QaReport({report:initial}:{report:MarketingReport}) {
  const [report,setReport]=useState(initial);
  return <>
    <div className="jm-container py-4 flex flex-wrap gap-4">
      <button type="button" onClick={()=>setReport({...report,oneLineSummary:'검증 결과 v2 · 갱신된 결과입니다',competitorStatus:{status:'timeout',message:'검증용: 경쟁사 응답 시간이 초과되었습니다.'}})}>새 결과 적용</button>
      <button type="button" onClick={()=>setReport({...initial,llmCitationTest:null})}>GEO 없는 결과 보기</button>
      <button type="button" onClick={()=>setReport({...initial,llmCitationTest:{overallScore:25,citationRate:25,totalTests:8,totalCited:2,summary:'구버전 검증',results:[{engine:'chatgpt',question:'구버전 질문입니다',questionType:'brand',cited:true}],engineScores:{chatgpt:25,gemini:25}}})}>구버전 결과 보기</button>
      <a href="/r/qa-mobile">모바일 검증 화면</a>
      <ShareButton report={report} />
    </div>
    <SharedReportView report={report} shareId="local-qa" />
  </>;
}
