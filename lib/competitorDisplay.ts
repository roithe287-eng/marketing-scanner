import type {MarketingReport} from './reportSchema';
import {unrelatedPageReason} from './competitorRoles';
type Analysis=NonNullable<MarketingReport['competitorAnalysis']>;
/** Protect old shared/PDF reports too, without modifying their stored records. */
export function competitorDisplay(analysis:Analysis):Analysis {
  const excluded:{domain:string;link:string;title:string;reason:string}[]=[];
  const competitors=analysis.competitors.filter(c=>{
    const reason=unrelatedPageReason({domain:c.domain,link:c.link,title:`${c.title} ${c.metaTitle||''}`,description:c.metaDescription||c.description},analysis.searchKeyword);
    if(reason)excluded.push({domain:c.domain,link:c.link,title:c.title,reason});
    return !reason;
  });
  if(!excluded.length)return analysis;
  return {...analysis,competitors:competitors.map((c,i)=>({...c,rank:i+1})),filtering:{policyVersion:analysis.filtering?.policyVersion||1,reviewedCount:analysis.filtering?.reviewedCount||0,metadataCheckedCount:analysis.filtering?.metadataCheckedCount||0,excluded:[...analysis.filtering?.excluded||[],...excluded]},
    ...(analysis.research?{research:{...analysis.research,selectedCount:competitors.length}}:{})};
}
