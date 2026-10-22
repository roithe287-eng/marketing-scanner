import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {websiteHttp,publicUrl} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {withBudget} from './runtime/budget';
import {getScannerContactUrl} from './siteConfig';
import {searchNaverWeb,searchNaverShop} from './naverWebSearch';
import {OWN_PRODUCT_NOTE,type OwnProductContext,type OwnProductSource} from './ownProductSchema';

const UA=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
const clean=(v:unknown,max:number)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const host=(u:URL)=>u.hostname.toLowerCase().replace(/^www\./,'');
export function ownProductUrl(value:string,base:string):string|null{
  try{
    const url=publicUrl(new URL(value,base).href),root=publicUrl(base);
    if(host(url)!==host(root)||url.protocol!==root.protocol)return null;
    // Keep only observed public product routes, never account/cart/admin/search pages.
    if(/\/(?:auth|admin|api|order|cart|mypage|account|login|search|careers|jobs)(?:\/|$)/i.test(url.pathname))return null;
    const product=/\/(?:goods|products?|items?)\/(?!list(?:\/|$)|category(?:\/|$)|search(?:\/|$)|bestseller(?:\/|$)|event(?:\/|$)|mdpick(?:\/|$))[^/]+/i.test(url.pathname)
      ||/\/(?:goods_view|item|detail)\.(?:php|html)$/i.test(url.pathname)&&['goodsNo','goodsno','it_id','product_no'].some(k=>url.searchParams.has(k));
    if(!product)return null;
    url.hash='';
    for(const key of [...url.searchParams.keys()])if(!['goodsNo','goodsno','it_id','product_no','id'].includes(key))url.searchParams.delete(key);
    return url.href;
  }catch{return null;}
}

/** Read only product fields from public JSON-LD/hydration JSON; never execute scripts or retain customer state. */
export function productSourcesFromHtml(html:string,url:string):OwnProductSource[]{
  const $=cheerio.load(html),sources:OwnProductSource[]=[],seen=new Set<string>();
  const add=(name:unknown,description:unknown,category:unknown,kind:OwnProductSource['kind'])=>{
    const value=clean(name,300);if(value.length<2||seen.has(value)||sources.length>=12)return;
    const categories=(Array.isArray(category)?category:[category]).map(c=>clean(c,100)).filter(Boolean).slice(0,8);
    sources.push({url,name:value,description:clean(description,1200),categories,kind});seen.add(value);
  };
  let visited=0;
  const walk=(value:unknown,depth=0)=>{
    if(!value||typeof value!=='object'||depth>18||visited++>6000||sources.length>=12)return;
    if(Array.isArray(value)){for(const v of value.slice(0,100))walk(v,depth+1);return;}
    const obj=value as Record<string,unknown>,types=[obj['@type']].flat();
    if(types.includes('Product'))add(obj.name,obj.description,obj.category,'structured_product');
    else if(obj.goodsName||obj.goodsNm||obj.productName||obj.product_name||obj.goods_name)
      add(obj.goodsName||obj.goodsNm||obj.productName||obj.product_name||obj.goods_name,obj.description||obj.shortDescription||obj.goodsDescription,obj.categoryName||obj.category_name||obj.category,'structured_product');
    for(const [key,v] of Object.entries(obj))if(!/cookie|user|customer|member|session|token|review|recommend|related|cart|order|purchase|checkout|payment|history|wishlist/i.test(key))walk(v,depth+1);
  };
  $('script[type="application/ld+json"],script[type="application/json"]#__NEXT_DATA__,script[type="application/json"][data-product]').slice(0,10).each((_,el)=>{
    const raw=$(el).text();if(raw.length>1_000_000)return;
    try{walk(JSON.parse(raw));}catch{/* Unparseable scripts are not executable data. */}
  });
  // Product pages may have no Product schema. Require commerce UI as well as a product route.
  if(!sources.length&&ownProductUrl(url,url)){
    const body=$('body').clone();body.find('script,style,nav,header,footer,aside').remove();
    const text=body.text();
    if(/장바구니|구매하기|바로구매|add to cart|buy now/i.test(text)&&/배송|상품정보|product|shipping/i.test(text)){
      const title=$('meta[property="og:title"]').attr('content')||$('title').text();
      add($('h1').first().text()||title,$('meta[name="description"]').attr('content')||$('meta[property="og:description"]').attr('content'),$('[itemprop="category"]').map((_,el)=>$(el).text()).get(),'product_page');
    }
  }
  return sources;
}

/** Bounded recovery for a sparse storefront. Naver data discovers URLs only; evidence is fetched from the merchant itself. */
export async function collectOwnProductContext(url:string):Promise<OwnProductContext>{
  const context:OwnProductContext={status:'not_observed',discovery:'input_page',attemptedPages:0,sources:[],note:OWN_PRODUCT_NOTE};
  try{await withBudget(12_000,async()=>{
    const base=publicUrl(url),robots=new Map<string,Promise<RobotsObservation>>();
    const allowed=async(u:URL)=>{
      if(host(u)!==host(base)||u.protocol!==base.protocol)return false;
      if(!robots.has(u.origin))robots.set(u.origin,observeRobots(u.href,UA));
      const rules=await robots.get(u.origin)!;
      if(rules.status==='missing')return true;
      if(rules.status!=='ok'){context.status='unavailable';return false;}
      const result=evaluateRobots(rules.text||'','JinjjaScanner',u.pathname+u.search);
      if(result.allowed!==true){context.status='blocked';return false;}
      return true;
    };
    const page=async(value:string)=>{
      let target=publicUrl(value);
      for(let hop=0;hop<3;hop++){
        if(!await allowed(target))return null;
        const res=await websiteHttp.fetch(target.href,{headers:{'User-Agent':UA,Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(3500),redirect:'manual'});
        const location=res.headers.get('location');
        if(res.status>=300&&res.status<400&&location){target=publicUrl(new URL(location,target).href);continue;}
        if(!res.ok){if(res.status!==404)context.status='unavailable';return null;}
        if(!/text\/html|application\/xhtml/i.test(res.headers.get('content-type')||''))return null;
        const bytes=Buffer.from(await res.arrayBuffer());
        const charset=(res.headers.get('content-type')?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]||'utf-8').replace(/^(ks_c_5601-1987|ksc5601)$/i,'cp949');
        return {html:iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf-8'),url:target.href};
      }
      return null;
    };
    context.attemptedPages++;
    const input=await page(url);
    if(!input)return;
    context.sources=productSourcesFromHtml(input.html,input.url);
    if(context.sources.length)return;
    const $=cheerio.load(input.html),links=$('a[href]').map((_,el)=>ownProductUrl($(el).attr('href')||'',input.url)).get().filter((v):v is string=>!!v);
    let candidates=[...new Set(links)];
    if(candidates.length)context.discovery='public_links';
    else{
      context.discovery='naver_web';
      const discover=async(provider:'naver_web'|'naver_shop',query:string)=>{
        try{
          const results=await (provider==='naver_web'?searchNaverWeb(query,30):searchNaverShop(query));
          const items=results.items.filter(item=>!!ownProductUrl(item.link,input.url));
          (context.discoveryAttempts??=[]).push({provider,status:'ok',returnedCount:results.items.length,productLinkCount:items.length});
          return items;
        }catch{
          (context.discoveryAttempts??=[]).push({provider,status:'unavailable',returnedCount:0,productLinkCount:0});return [];
        }
      };
      let items=await discover('naver_web',`site:${host(base)}`);
      const brand=$('meta[property="og:site_name"]').attr('content')||$('title').text().split(/[|·:–—]/)[0].trim().slice(0,80);
      if(!items.length&&brand.length>=2){
        const [web,shop]=await Promise.all([discover('naver_web',brand),discover('naver_shop',brand)]);
        items=[...web,...shop];if(shop.length)context.discovery='naver_shop';
      }
      // API titles only diversify URL selection. They are never evidence or AI input.
      const groups=new Set<string>();
      candidates=items.flatMap(item=>{
        const own=ownProductUrl(item.link,input.url);if(!own)return [];
        const text=cheerio.load(item.title).text().replaceAll($('title').text().trim(),'').replace(/^[\s|–-]+|[\s|–-]+$/g,'');
        const key=(text.match(/[가-힣a-zA-Z]{2,}/g)||[]).slice(0,2).join(' ').toLowerCase();
        if(key&&groups.has(key))return [];if(key)groups.add(key);return [own];
      });
    }
    candidates=[...new Set(candidates)].slice(0,4);
    context.attemptedPages+=candidates.length;
    const pages=await Promise.allSettled(candidates.map(async link=>{const p=await page(link);return p?productSourcesFromHtml(p.html,p.url):[];}));
    context.sources=pages.flatMap(p=>p.status==='fulfilled'?p.value:[]).slice(0,12);
    if(!context.sources.length&&pages.some(p=>p.status==='rejected')&&context.status!=='blocked')context.status='unavailable';
  });}catch{if(context.status!=='blocked')context.status='unavailable';}
  if(context.sources.length)context.status='observed';
  return {...context,sources:[...context.sources]};
}
