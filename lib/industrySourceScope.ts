import type {BusinessDocument} from './businessContext';
import {sameSite} from './siteIdentity';

const locale=/^(?:ko(?:-kr)?|en(?:-us)?|ja(?:-jp)?|zh(?:-(?:cn|tw))?)$/iu;
const home=/^(?:home|main|index)(?:\.(?:html?|do|asp[x]?|php))?$/iu;
const tracking=/^(?:utm_[a-z0-9_]+|gclid|fbclid|msclkid|n_media|n_query)$/iu;

function pageAddress(value:string){
  try{
    const url=new URL(value);
    if(!/^https?:$/.test(url.protocol)||url.username||url.password)return;
    for(const key of [...url.searchParams.keys()])if(tracking.test(key))url.searchParams.delete(key);
    url.searchParams.sort();
    return {path:url.pathname.replace(/\/+$/u,'')||'/',query:url.search};
  }catch{return;}
}

export function isIndustryOverview(value:string):boolean{
  const page=pageAddress(value);
  if(!page||page.query)return false;
  const segments=page.path.split('/').filter(Boolean);
  if(locale.test(segments[0]||''))segments.shift();
  return segments.length<=2&&segments.every(segment=>home.test(segment));
}

/** A related navigation link alone cannot turn a different service into the submitted page's offering. */
export function industryDocuments(url:string,documents:BusinessDocument[]|undefined):BusinessDocument[]{
  const target=pageAddress(url);
  if(!target)return [];
  const overview=isIndustryOverview(url);
  return (documents||[]).filter(doc=>{
    if(!sameSite(doc.url,url))return false;
    const source=pageAddress(doc.url);
    if(!source)return false;
    if(overview)return true;
    if(source.path===target.path)return source.query===target.query;
    return !target.query&&source.path.startsWith(target.path+'/');
  });
}
