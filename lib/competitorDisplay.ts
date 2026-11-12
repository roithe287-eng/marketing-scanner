import {refineStoredCompetitionScope,competitionMismatch} from './competitionScope';
import type {MarketingReport} from './reportSchema';
import {unrelatedPageReason} from './competitorRoles';
type Analysis=NonNullable<MarketingReport['competitorAnalysis']>;
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
  if(!excluded.length)return analysis;
  return {...analysis,overallComparison:undefined,ourPositioning:undefined,competitors:competitors.map((c,i)=>({...c,rank:i+1})),filtering:{policyVersion:analysis.filtering?.policyVersion||1,reviewedCount:analysis.filtering?.reviewedCount||0,metadataCheckedCount:analysis.filtering?.metadataCheckedCount||0,excluded:[...analysis.filtering?.excluded||[],...excluded]},
    ...(analysis.research?{research:{...analysis.research,selectedCount:competitors.length,selectionStatus:competitors.length?'matched' as const:'no_relevant_candidates' as const,selectionMessage:competitors.length?'원문에서 제공 업무가 맞는 비교 후보입니다.':'저장 원문에서 제공 업무가 다른 후보를 제외했습니다. URL을 다시 분석하면 현재 후보를 조회합니다.'}}:{})};
}
