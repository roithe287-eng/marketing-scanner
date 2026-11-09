import * as cheerio from 'cheerio';
import {searchNaverWeb} from './naverWebSearch';
import {communityPageUrl} from './communityContext';
import {withBudget} from './runtime/budget';
import {RestrictedWebsiteReportSchema,type RestrictedWebsiteReport,type WebsiteCollectionError} from './restrictedWebsite';

/** Public search excerpts are display-only. Never convert them to HTML observations or model input. */
export async function collectRestrictedWebsite(url:string,error:WebsiteCollectionError):Promise<RestrictedWebsiteReport>{
  const result:RestrictedWebsiteReport={kind:'restricted_website',version:1,url,observedAt:new Date().toISOString(),reason:error.reason,...(error.httpStatus?{httpStatus:error.httpStatus}:{}),searchStatus:'unavailable',sources:[],communityCandidate:false};
  const clean=(s:string,max:number)=>cheerio.load(s,null,false).text().replace(/\s+/g,' ').trim().slice(0,max);
  try{
    const response=await withBudget(5000,()=>searchNaverWeb(`site:${new URL(url).hostname.replace(/^www\./,'')}`,30));
    const seen=new Set<string>();
    result.sources=response.items.flatMap(item=>{
      const target=communityPageUrl(item.link,url);if(!target||seen.has(target))return [];seen.add(target);
      return [{url:target,title:clean(item.title,300),description:clean(item.description,600)}];
    }).sort((a,b)=>Number(new URL(b.url).pathname==='/')-Number(new URL(a.url).pathname==='/')).slice(0,5);
    result.searchStatus=result.sources.length?'observed':'empty';
    // An incidental post about communities cannot classify the whole site.
    result.communityCandidate=result.sources.some(s=>new URL(s.url).pathname==='/'&&/커뮤니티|포럼|포털|community|\bforum\b|\bportal\b/i.test(s.title+' '+s.description));
  }catch{/* Search failure does not become a zero score or proof of absence. */}
  return RestrictedWebsiteReportSchema.parse(result);
}
