import {refineStoredCompetitionScope,competitionMismatch} from './competitionScope';
import type {MarketingReport} from './reportSchema';
import {unrelatedPageReason} from './competitorRoles';
type Analysis=NonNullable<MarketingReport['competitorAnalysis']>;
type Exclusion=NonNullable<Analysis['filtering']>['excluded'][number];

export function applyCompetitorExclusions(analysis:Analysis,competitors:Analysis['competitors'],removed:Exclusion[]):Analysis {
  if(!removed.length)return analysis;
  const recorded=analysis.filtering?.excluded||[];
  const research=analysis.research;
  const incomplete=research?.selectionStatus==='lookup_unavailable'||research?.selectionStatus==='insufficient_source';
  return {
    ...analysis,overallComparison:undefined,ourPositioning:undefined,
    competitors:competitors.map((candidate,index)=>({...candidate,rank:index+1})),
    filtering:{
      policyVersion:analysis.filtering?.policyVersion??1,
      reviewedCount:analysis.filtering?.reviewedCount??analysis.competitors.length,
      metadataCheckedCount:analysis.filtering?.metadataCheckedCount??analysis.competitors.filter(c=>!!(c.metaTitle||c.metaDescription||c.h1||c.fetchError)).length,
      excluded:[...recorded,...removed.filter(c=>!recorded.some(e=>e.link===c.link))],
    },
    research:research?{...research,selectedCount:competitors.length,...(!incomplete&&{
      selectionStatus:competitors.length?'matched':'no_relevant_candidates',
      selectionMessage:competitors.length?'저장 자료에서 비교 기준에 맞는 후보만 표시합니다.':'저장된 후보 중 현재 비교 기준에 맞는 URL이 없습니다.',
    })}:undefined,
  };
}

export function competitorCollectionState(report:MarketingReport){
  const result=report.competitorStatus?.status;
  const research=report.competitorAnalysis?.research?.selectionStatus;
  if(result==='pending')return {label:'경쟁사 원문 확인 중',state:'진행 중',measured:false};
  if(result==='timeout')return {label:'경쟁사 조회 시간 초과',state:'시간 초과',measured:false};
  if(research==='lookup_unavailable'||result==='error')return {label:'공식 URL 조회 미완료',state:'조회 미완료',measured:false};
  if(research==='insufficient_source')return {label:'비교할 원문 근거 부족',state:'근거 부족',measured:false};
  if(result==='unavailable')return {label:'경쟁사 조회 이용 불가',state:'이용 불가',measured:false};
  const count=report.competitorAnalysis?.competitors.length||0;
  if(count)return {label:`저장 후보 ${count}곳`,state:'저장됨',measured:true};
  if(result==='empty'||research==='no_relevant_candidates')return {label:'비교 후보 0곳',state:'선정 완료',measured:true};
  return {label:'저장된 비교 자료 없음',state:'미확인',measured:false};
}
/** Protect old shared/PDF reports too, without modifying their stored records. */
export function competitorDisplay(analysis:Analysis):Analysis {
  const excluded:{domain:string;link:string;title:string;reason:string}[]=[];
  const own=analysis.ourSite;
  const scope=own?refineStoredCompetitionScope(own.scope,{url:own.url||`https://${own.domain}`,title:own.title,description:own.metaDescription,h1:[own.h1]}):undefined;
  const competitors=analysis.competitors.filter(c=>{
    const candidateScope=refineStoredCompetitionScope(c.scope,{url:c.link,title:c.metaTitle||'',description:c.metaDescription||'',h1:c.h1?[c.h1]:[]});
    const reason=(scope?competitionMismatch(scope,candidateScope,false):undefined)||unrelatedPageReason({domain:c.domain,link:c.link,title:`${c.title} ${c.metaTitle||''}`,description:c.metaDescription||c.description},analysis.searchKeyword,scope?.kind==='content');
    if(reason)excluded.push({domain:c.domain,link:c.link,title:c.title,reason});
    return !reason;
  });
  return applyCompetitorExclusions(analysis,competitors,excluded);
}
