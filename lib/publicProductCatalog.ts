import {websiteHttp} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots} from './robotsRules';
import {getScannerContactUrl} from './siteConfig';
import type {OwnProductSource} from './ownProductSchema';

/** The storefront's published OpenMain GET, used by its public main-page brand section.
 * An explicit adapter, not arbitrary endpoint guessing. No cookies, bearer tokens or writes.
 * Only the product fields displayed on the public storefront are retained.
 */
export async function loadPublicProductCatalog(input:string):Promise<OwnProductSource[]>{
  const base=new URL(input);
  if(base.protocol!=='https:'||!['onnuristore.com','www.onnuristore.com'].includes(base.hostname))return [];
  const endpoint='https://api.onnuristore.com/api/v1/open/main/brand-pages';
  const ua=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
  try{
    const robots=await observeRobots(endpoint,ua);
    if(robots.status!=='missing'&&(robots.status!=='ok'||evaluateRobots(robots.text||'','JinjjaScanner',new URL(endpoint).pathname).allowed!==true))return [];
    const res=await websiteHttp.fetch(endpoint,{headers:{'User-Agent':ua,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(3500)});
    if(!res.ok||!/application\/json/i.test(res.headers.get('content-type')||''))return [];
    const json:unknown=await res.json();
    if(!json||typeof json!=='object'||!('data' in json)||!Array.isArray(json.data))return [];
    const sources:OwnProductSource[]=[];
    // One displayed product per main-page brand avoids one brand's size/quantity variants dominating.
    for(const brand of json.data.slice(0,40)){
      if(!brand||typeof brand!=='object'||!Array.isArray(brand.mainDisplayProductItems))continue;
      const item=brand.mainDisplayProductItems.find((p:unknown)=>p&&typeof p==='object'&&'productItemId' in p&&Number.isSafeInteger(p.productItemId)&&Number(p.productItemId)>0&&'displayName' in p&&typeof p.displayName==='string'&&p.displayName.trim().length>=2&&(!('isDisplay' in p)||p.isDisplay!==false)&&(!('isActive' in p)||p.isActive!==false));
      if(!item)continue;
      sources.push({url:new URL(`/goods/${item.productItemId}`,base).href,name:item.displayName.replace(/\s+/g,' ').trim().slice(0,300),description:'',categories:[],kind:'catalog_product'});
      if(sources.length>=12)break;
    }
    return sources;
  }catch{return [];}
}
