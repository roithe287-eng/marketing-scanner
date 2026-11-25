import React from 'react';
import type {MarketingReport} from '@/lib/reportSchema';
import type {ReportInsights} from '@/lib/reportInsights';
import DiagnosisIcon from './DiagnosisIcon';
import ReportMeasureTrack from './ReportMeasureTrack';

function CountPair({items,unit}:{items:{label:string;count:number}[];unit:'개'|'곳'}){
  return <span className="report-outcome-counts">{items.map(({label,count})=><span key={label}>
    <strong>{count}<span>{unit}</span></strong><small>{label}</small>
  </span>)}</span>;
}

function ObservationBars({data}:{data:ReportInsights}){
  if(!data.obs?.total)return <span className="report-outcome-empty">AI 답변 관측 자료 없음</span>;
  const {mentionCount,mentionTotal,sourceCount,sourceTotal}=data.obs;
  return <span className="report-outcome-bars">
    {[{label:'브랜드 언급',count:mentionCount,total:mentionTotal},{label:'자사 인용',count:sourceCount,total:sourceTotal}].map(({label,count,total})=><span key={label}>
      <span className="report-outcome-bar-label"><span>{label}</span><b>{total>0?`${total}건 중 ${count}건`:'판정 자료 없음'}</b></span>
      <ReportMeasureTrack count={count} total={total}/>
    </span>)}
  </span>;
}

export default function ReportOutcomeVisuals({report,data,firstTaskCount}:{report:MarketingReport;data:ReportInsights;firstTaskCount:number}){
  const audit=report.siteDiagnostics;
  const status=report.competitorAnalysis?.research?.selectionStatus;
  const pending=report.competitorStatus?.status==='pending';
  const checked=!pending&&status!=='lookup_unavailable'&&status!=='insufficient_source'?report.competitorAnalysis?.filtering?.metadataCheckedCount:undefined;
  const competitorNotice=pending?'경쟁사 원문 확인 중':status==='lookup_unavailable'?'공식 URL 조회 미완료':status==='insufficient_source'?'비교할 원문 근거 부족':
    data.competitorCount>0?`저장 후보 ${data.competitorCount}곳`:'저장된 비교 자료 없음';
  const schedules=[
    ['즉시',report.priorityRoadmap.immediately.length],
    ['이번 주',report.priorityRoadmap.thisWeek.length],
    ['이번 달',report.priorityRoadmap.thisMonth.length],
  ] as const;
  const scheduled=schedules.some(([,count])=>count>0);
  const priorityOnly=!scheduled&&firstTaskCount>0;
  const cards=[
    {id:'geo',target:'report-view-geo-observations',title:'AI 답변',icon:'trust',link:'질문별 답변 보기',content:<ObservationBars data={data}/>},
    {id:'search',target:'report-view-search-technical',title:'페이지·기술 점검',icon:'seo',link:'수집 페이지 보기',content:audit?.pages.length?
      <CountPair unit="개" items={[{label:'수집 페이지',count:audit.pages.length},{label:'기술 점검 결과',count:audit.findings.length}]}/>:<span className="report-outcome-empty">수집한 페이지 자료 없음</span>},
    {id:'competition',target:'report-view-competition-map',title:'경쟁사 URL',icon:'adLanding',link:'공식 URL과 근거 보기',content:checked!==undefined?
      <CountPair unit="곳" items={[{label:'원문 확인 시도',count:checked},{label:'남은 비교 후보',count:data.competitorCount}]}/>:
      <span className="report-outcome-empty">{competitorNotice}</span>},
    {id:'actions',target:priorityOnly?'report-view-overview-priority':'report-view-actions-schedule',title:priorityOnly?'우선 작업':'실행 일정',icon:'conversionFlow',link:priorityOnly?'우선 작업 보기':'시점별 작업 보기',content:scheduled?
      <span className="report-outcome-timeline">{schedules.map(([label,count])=><span key={label} data-assigned={count>0}><small>{label}</small><strong>{count}개</strong></span>)}</span>:
      <span className="report-outcome-empty">{firstTaskCount>0?`우선 확인 작업 ${firstTaskCount}개`:'배정된 일정 없음'}</span>},
  ] as const;
  return <nav className="report-outcome-visuals" aria-label="핵심 진단 결과 바로가기">
    {cards.map(card=><a key={card.id} href={`#${card.target}`} data-outcome={card.id}>
      <span className="report-outcome-visual-heading"><DiagnosisIcon axis={card.icon}/><strong>{card.title}</strong></span>
      {card.content}
      <span className="report-outcome-visual-link">{card.link}<span aria-hidden="true">→</span></span>
    </a>)}
  </nav>;
}
