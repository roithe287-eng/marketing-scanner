import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {BusinessDocumentSchema,type BusinessDocument} from './businessContext';
import {captureContentSections} from './contentSections';
import {ownPublicUrl} from './productDiscovery';
import {websiteHttp,publicUrl} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {withBudget,budgetSignal} from './runtime/budget';
import {getScannerContactUrl} from './siteConfig';
import {searchNaverWeb} from './naverWebSearch';
import {pageRegion} from './pageRegions';

// Researched public URLs are discovery hints, never pre-written findings or score overrides.
const researchPaths:Record<string,string[]>={
  'sydneydutyfree.com.au':['/ko/pages/faq','/ko/pages/about-us','/ko/blogs/service/free-luggage-storage'],
  'sdfkorea.com':['/shopinfo/guide.html'],
  'pure-australia.com':['/collections/oznex','/pages/ldv20-official-information','/products/ldv20'],
  'tripozzy.com':['/fit/38567','/fit/42511','/fit/40674'],
  'pumyang.com':['/oversea/01/','/oversea/02/','/oversea/03/','/international/01/','/international/02/','/oversea/04/','/customer/07/','/customer/02/'],
};
const UA=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
const host=(u:URL)=>u.hostname.toLowerCase().replace(/^www\./,'');
const clean=(v:unknown,max=600)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
export const hasBusinessResearch=(url:string)=>{try{return !!researchPaths[host(new URL(url))];}catch{return false;}};

/** Only public catalogue fields from a known declarative payload; no general state walk or execution. */
export function captureBusinessDocument(html:string,url:string,capturedAt=new Date().toISOString()):BusinessDocument{
  const $=cheerio.load(html),title=clean($('head > title').first().text(),300);
  const catalog:{heading:string;text:string}[]=[];
  // Public form labels describe the inquiry journey; never capture entered values.
  const formSections:{heading:string;text:string}[]=[];
  $('form').each((_,form)=>{
    if(['nav','header','footer'].includes(pageRegion($,form))||$(form).closest('[hidden],[aria-hidden="true"]').length)return;
    const labels=$(form).find('label,dt').toArray().map(el=>clean($(el).text(),80))
      .filter(text=>text&&text.length<=50&&!/개인정보|동의|약관/.test(text));
    if(labels.length)formSections.push({heading:'공개 상담 양식 · 입력 항목',text:'입력 항목: '+[...new Set(labels)].slice(0,12).join(' · ')});
  });
  const raw=$('script[type="application/json"]#__NEXT_DATA__').text();
  if(raw&&raw.length<1_000_000){try{
    const data=JSON.parse(raw)?.props?.pageProps?.mainData;
    if(Array.isArray(data?.banner_product_list))for(const item of data.banner_product_list.slice(0,30)){
      if(!item||item.tour_type!=='f'||!Number.isSafeInteger(item.id)||item.id<=0)continue;
      const name=clean(item.title,220),description=clean(item.short_description,350);
      if(name)catalog.push({heading:'공개 여행 상품 목록',text:clean(name+(description?' · '+description:''))});
    }
  }catch{/* Invalid catalogue data cannot become evidence. */}}
  // Remove styles/scripts and public reviews before collecting explanatory source text.
  $('script,style,noscript,template,form,blockquote,[class*="review" i],[id*="review" i],[class*="testimonial" i],[class*="comment" i],[id*="comment" i]').remove();
  // Preserve visible line boundaries before the generic section collector collapses spaces.
  $('br').replaceWith('\u001e');
  const sections=captureContentSections($,url).filter(s=>!s.truncated).flatMap(s=>{
    const lines=s.text.split(/\u001e+/u).flatMap(text=>text.split(/(?<=[.!?。])(?:\s+|(?=[-•]))/u));
    return lines.filter(text=>text.trim().length>=12&&text.trim().length<=600).map(text=>({heading:s.heading,text:clean(text)}));
  });
  // Keep multiple decision conditions, rather than the first ten generic introduction lines.
  const useful=(s:{text:string;heading:string})=>{
    const text=s.heading+' '+s.text;
    return (/한국배송|호주배송|개인 통관|통관 가능|배송\s*비용|배송비/i.test(text)?10:0)+(/(?:한국배송|호주배송|통관|배송\s*비용|배송비|집결|취소|환불|여권|항공권|출국|봉인|AUST\s*L|ARTG)/i.test(text)?10:0)+(/포함|불포함|예약|확정|짐보관|수하물|영업시간|Liverpool|Mon\s*-\s*Sun|ingredients|caution|label|해외이사|귀국이사|견적|포장|보험|보상|freight|cargo|customs/i.test(text)?5:0);
  };
  const seen=new Set<string>();
  return BusinessDocumentSchema.parse({url,title,capturedAt,source:'merchant_html',sections:[...formSections.slice(0,2),...catalog.slice(0,6),...sections.sort((a,b)=>useful(b)-useful(a))].filter(s=>{if(seen.has(s.text))return false;seen.add(s.text);return true;}).slice(0,host(new URL(url))==='pumyang.com'?16:10)});
}

/** Search snippets are topic hints only. No request is made to a robots-blocked merchant page. */
export async function collectRestrictedBusinessEvidence(url:string):Promise<BusinessDocument[]>{
  if(!hasBusinessResearch(url)||!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)return [];
  try{
    const result=await searchNaverWeb(`site:${host(publicUrl(url))}`,30);
    const seen=new Set<string>();
    return result.items.flatMap(item=>{
      const target=ownPublicUrl(item.link,url);if(!target||seen.has(target.href))return [];seen.add(target.href);
      return [BusinessDocumentSchema.parse({url:target.href,title:clean(item.title,300),capturedAt:result.capturedAt,source:'search_excerpt',sections:[{heading:'네이버 검색 요약 · 원문 미검증',text:clean(item.description)}]})];
    }).slice(0,4);
  }catch{return [];}
}

/** Same-site, robots-aware, bounded supplemental collection; failures never erase primary observations. */
export async function collectBusinessDocuments(url:string,options:{seed?:BusinessDocument;robots?:RobotsObservation;productLinks?:string[];budgetMs?:number}={}):Promise<BusinessDocument[]>{
  const documents:BusinessDocument[]=options.seed?[options.seed]:[];
  if(!hasBusinessResearch(url))return documents;
  try{await withBudget(options.budgetMs??6000,async()=>{
    const base=publicUrl(url),rules=new Map<string,Promise<RobotsObservation>>();
    if(options.robots)rules.set(base.origin,Promise.resolve(options.robots));
    const read=async(path:string):Promise<BusinessDocument|null>=>{
      try{
        let target=ownPublicUrl(path,url);if(!target)return null;
        for(let hop=0;hop<3;hop++){
          budgetSignal()?.throwIfAborted();
          if(!rules.has(target.origin))rules.set(target.origin,observeRobots(target.href,UA));
          const observed=await rules.get(target.origin)!;
          if(observed.status!=='missing'&&(observed.status!=='ok'||evaluateRobots(observed.text||'','JinjjaScanner',target.pathname+target.search).allowed!==true))return null;
          const res=await websiteHttp.fetch(target.href,{headers:{'User-Agent':UA,Accept:'text/html,application/xhtml+xml','Accept-Language':'ko,en;q=0.8'},signal:AbortSignal.timeout(2800),redirect:'manual'});
          const location=res.headers.get('location');
          if(res.status>=300&&res.status<400&&location){await res.body?.cancel();target=ownPublicUrl(location,target.href);if(!target)return null;continue;}
          if(!res.ok||!/text\/html|application\/xhtml/i.test(res.headers.get('content-type')||''))return null;
          const bytes=Buffer.from(await res.arrayBuffer());
          const charset=(res.headers.get('content-type')?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]||'utf-8').replace(/^(ks_c_5601-1987|ksc5601)$/i,'cp949');
          const doc=captureBusinessDocument(iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf-8'),target.href);
          return doc.sections.length?doc:null;
        }
      }catch{/* Partial research remains usable; an unavailable source is not evidence of absence. */}
      return null;
    };
    let paths=researchPaths[host(base)];
    if(host(base)==='sdfkorea.com')paths=[...paths,...options.productLinks?.slice(0,2)||[]];
    paths=[...new Set(paths)].filter(p=>new URL(p,base).href!==base.href).slice(0,host(base)==='pumyang.com'?8:3);
    // Bound per-site concurrency while keeping the existing overall deadline.
    const pending=[...paths];
    await Promise.all(Array.from({length:Math.min(3,paths.length)},async()=>{
      while(pending.length){budgetSignal()?.throwIfAborted();const path=pending.shift()!;const doc=await read(path);if(doc&&!budgetSignal()?.aborted)documents.push(doc);}
    }));
  });}catch{/* The input document still describes the original collection scope. */}
  return documents.slice(0,host(publicUrl(url))==='pumyang.com'?9:4);
}
