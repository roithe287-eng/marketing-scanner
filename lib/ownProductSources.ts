import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {websiteHttp,publicUrl} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {withBudget,budgetSignal} from './runtime/budget';
import {getScannerContactUrl} from './siteConfig';
import {searchNaverWeb,searchNaverShop} from './naverWebSearch';
import {loadPublicProductCatalog} from './publicProductCatalog';
import {OWN_PRODUCT_NOTE,type OwnProductContext} from './ownProductSchema';
import {captureProductSeed,ownProductUrl,ownPublicUrl,productSourcesFromHtml,productSitemapLinks,type OwnProductSeed} from './productDiscovery';
export {ownProductUrl,productSourcesFromHtml} from './productDiscovery';
const UA=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
const host=(u:URL)=>u.hostname.toLowerCase().replace(/^www\./,'');

/** Bounded public recovery for every domain. Search/sitemap entries discover URLs; only merchant content is evidence. */
export async function collectOwnProductContext(url:string,options:{seed?:OwnProductSeed;robots?:RobotsObservation;budgetMs?:number}={}):Promise<OwnProductContext>{
  const context:OwnProductContext={status:'not_observed',discovery:'input_page',attemptedPages:0,sources:[],note:OWN_PRODUCT_NOTE};
  try{await withBudget(options.budgetMs??12_000,async()=>{
    const base=publicUrl(url),robots=new Map<string,Promise<RobotsObservation>>();
    if(options.robots)robots.set(base.origin,Promise.resolve(options.robots));
    const allowed=async(u:URL)=>{
      budgetSignal()?.throwIfAborted();
      if(host(u)!==host(base)||u.protocol!==base.protocol)return false;
      if(!robots.has(u.origin))robots.set(u.origin,observeRobots(u.href,UA));
      const rules=await robots.get(u.origin)!;
      if(rules.status==='missing')return true;
      if(rules.status!=='ok'){context.status='unavailable';return false;}
      const result=evaluateRobots(rules.text||'','JinjjaScanner',u.pathname+u.search);
      if(result.allowed!==true){context.status='blocked';return false;}
      return true;
    };
    const page=async(value:string,xml=false)=>{
      try{
      let target=publicUrl(value);
      for(let hop=0;hop<3;hop++){
        if(!await allowed(target))return null;
        if(hop===0){if(context.attemptedPages>=9)return null;context.attemptedPages++;}
        const res=await websiteHttp.fetch(target.href,{headers:{'User-Agent':UA,Accept:xml?'application/xml,text/xml':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(2500),redirect:'manual'});
        const location=res.headers.get('location');
        if(res.status>=300&&res.status<400&&location){target=publicUrl(new URL(location,target).href);continue;}
        if(!res.ok){if(res.status!==404)context.status='unavailable';return null;}
        if(!(xml?/xml/i:/text\/html|application\/xhtml/i).test(res.headers.get('content-type')||''))return null;
        const bytes=Buffer.from(await res.arrayBuffer());
        const charset=(res.headers.get('content-type')?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]||'utf-8').replace(/^(ks_c_5601-1987|ksc5601)$/i,'cp949');
        return {html:iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf-8'),url:target.href};
      }
      return null;
      }catch{if(context.status!=='blocked')context.status='unavailable';return null;}
    };
    let seed=options.seed;
    if(!seed||seed.url!==url){const input=await page(url);if(!input)return;seed=captureProductSeed(input.html,input.url);}
    const input=seed;
    context.sources=[...input.sources];
    context.commerce=input.commerce;
    // A later collection limitation stops new requests without erasing the original HTML evidence.
    if(options.seed&&options.seed.url===url&&!await allowed(base))return;
    if(context.sources.some(p=>p.kind!=='catalog_product'))return;
    let candidates=[...input.productLinks];
    if(candidates.length)context.discovery='public_links';
    if(!candidates.length&&!context.sources.length){
      const catalog=await loadPublicProductCatalog(input.url);
      if(catalog.length){context.discovery='public_catalog';context.commerce=true;context.sources=catalog;candidates=catalog.map(p=>p.url);}
    }
    // Follow only observed public category links; never guess arbitrary API endpoints.
    if(!candidates.length&&!context.sources.length&&input.catalogLinks.length){
      const lists=await Promise.allSettled(input.catalogLinks.slice(0,2).map(link=>page(link)));
      for(const list of lists)if(list.status==='fulfilled'&&list.value){
        const found=captureProductSeed(list.value.html,list.value.url);
        candidates.push(...found.productLinks);context.sources.push(...found.sources);
      }
      if(candidates.length||context.sources.length)context.discovery='public_categories';
    }
    if(!candidates.length&&!context.sources.length&&(input.sparse||input.commerce)){
      const rules=await robots.get(base.origin);
      const declared=rules?.text?.split(/\r?\n/).flatMap(line=>{
        const match=line.match(/^\s*Sitemap:\s*(\S+)/i);const u=match&&ownPublicUrl(match[1],base.href);return u?[u.href]:[];
      })||[];
      let queue=[...new Set([...declared,new URL('/sitemap.xml',base).href])],visited=new Set<string>();
      for(let count=0;count<2&&queue.length&&!candidates.length;count++){
        const link=queue.shift()!;if(visited.has(link))continue;visited.add(link);
        const document=await page(link,true);if(!document)continue;
        const found=productSitemapLinks(document.html,input.url);candidates.push(...found.products);
        queue=[...found.sitemaps,...queue].filter(v=>!visited.has(v));
      }
      if(candidates.length)context.discovery='public_sitemap';
    }
    if(!candidates.length&&!context.sources.length&&(input.sparse||input.commerce)){
      context.discovery='naver_web';
      const discover=async(provider:'naver_web'|'naver_shop',query:string)=>{
        budgetSignal()?.throwIfAborted();
        try{
          const results=await (provider==='naver_web'?searchNaverWeb(query,30):searchNaverShop(query));
          const items=results.items.filter(item=>!!ownProductUrl(item.link,input.url));
          (context.discoveryAttempts??=[]).push({provider,status:'ok',returnedCount:results.items.length,productLinkCount:items.length});return items;
        }catch{(context.discoveryAttempts??=[]).push({provider,status:'unavailable',returnedCount:0,productLinkCount:0});return [];}
      };
      let items=await discover('naver_web',`site:${host(base)}`);
      if(!items.length&&input.brand.length>=2){
        const [web,shop]=await Promise.all([discover('naver_web',input.brand),discover('naver_shop',input.brand)]);
        items=[...web,...shop];if(shop.length)context.discovery='naver_shop';
      }
      const groups=new Set<string>();
      candidates=items.flatMap(item=>{
        const own=ownProductUrl(item.link,input.url);if(!own)return [];
        const text=cheerio.load(item.title).text().replaceAll(input.brand,'').replace(/^[\s|–-]+|[\s|–-]+$/g,'');
        const key=(text.match(/[가-힣a-zA-Z]{2,}/g)||[]).slice(0,2).join(' ').toLowerCase();
        if(key&&groups.has(key))return [];if(key)groups.add(key);return [own];
      });
    }
    candidates=[...new Set(candidates)];
    // Spread four detail requests across the catalog instead of one brand's first variants.
    candidates=Array.from({length:Math.min(4,candidates.length)},(_,i)=>candidates[Math.floor(i*(candidates.length-1)/Math.max(1,Math.min(4,candidates.length)-1))]);
    const pages=await Promise.allSettled(candidates.map(async link=>{const p=await page(link);return p?productSourcesFromHtml(p.html,p.url):[];}));
    const collected=pages.flatMap(p=>p.status==='fulfilled'?p.value:[]),seen=new Set<string>();
    context.sources=[...collected,...context.sources].filter(p=>{const key=ownProductUrl(p.url,input.url)||p.url+'\n'+p.name;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,12);
    if(context.sources.some(p=>!!ownProductUrl(p.url,input.url)))context.commerce=true;
    if(!context.sources.length&&pages.some(p=>p.status==='rejected')&&context.status!=='blocked')context.status='unavailable';
  });}catch{if(context.status!=='blocked')context.status='unavailable';}
  // Deadline/early-return paths must retain the same bounds as completed detail fetches.
  const returned=new Set<string>();
  context.sources=context.sources.filter(p=>{const key=ownProductUrl(p.url,url)||p.url+'\n'+p.name;if(returned.has(key))return false;returned.add(key);return true;}).slice(0,12);
  if(context.sources.length)context.status='observed';
  if(!context.sources.length)context.note='입력 페이지와 허용된 공개 경로에서 상품 원문을 확인하지 못했습니다. 상품 부재나 사이트 전체 정보 부족을 뜻하지 않습니다. 서비스형 사이트는 수집한 서비스 본문을 사용하며, 동적 로딩·접근 제한으로 미수집된 항목은 실제 화면과 대조해야 합니다.';
  return {...context,sources:[...context.sources],...(context.discoveryAttempts?{discoveryAttempts:context.discoveryAttempts.map(a=>({...a}))}:{})};
}
