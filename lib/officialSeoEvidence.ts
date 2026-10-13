import type {CheerioAPI} from 'cheerio';

/** Bounded observations from the already fetched document. No additional crawl. */
export type OfficialSeoEvidence = {
  baseUrl:string;
  links:{crawlable:number;withoutHref:number;javascript:number;hashRoutes:number;emptyText:number;insecureInternal:number;sponsored:number;ugc:number;nofollow:number};
  resources:{url:string;kind:'script'|'style'|'image'|'icon'}[];
  resourceCount:number;
  icons:{href:string;rel:string;sizes:string}[];
  alternates:{language:string;href:string}[];
  alternateCount:number;
  imagesWithoutSrc:number;
  dataNosnippetCount:number;
  videoCount:number;
  amp:boolean;
  metaRefresh:string[];
  canonicalHeader:string;
  headCanonicals:string[];
  canonicalOutsideHead:number;
  titleInHeadCount:number;
  descriptionInHeadCount:number;
  allRobotsMeta:{agent:string;content:string}[];
};

export function collectOfficialSeoEvidence($:CheerioAPI,finalUrl:string,headers:Headers):OfficialSeoEvidence {
  let baseUrl=finalUrl;
  const resolve=(value:string)=>{if(!value.trim())return '';try{const u=new URL(value,baseUrl);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const base=$('head base[href]').first().attr('href');
  if(base)baseUrl=resolve(base)||finalUrl;
  const links={crawlable:0,withoutHref:0,javascript:0,hashRoutes:0,emptyText:0,insecureInternal:0,sponsored:0,ugc:0,nofollow:0};
  const origin=new URL(finalUrl);
  $('a').each((_,el)=>{
    const a=$(el),href=(a.attr('href')||'').trim(),rel=(a.attr('rel')||'').toLowerCase().split(/\s+/);
    if(!href)links.withoutHref++;
    else if(/^javascript:/i.test(href))links.javascript++;
    else if(/^#(?:!|\/)/.test(href))links.hashRoutes++;
    else if(!href.startsWith('#')){
      const url=resolve(href);
      if(url){
        links.crawlable++;
        if(!a.text().trim()&&!a.attr('title')?.trim()&&!a.find('img[alt]').toArray().some(img=>$(img).attr('alt')?.trim()))links.emptyText++;
        const target=new URL(url);
        if(origin.protocol==='https:'&&target.hostname===origin.hostname&&target.protocol==='http:')links.insecureInternal++;
      }
    }
    for(const key of ['sponsored','ugc','nofollow'] as const)if(rel.includes(key))links[key]++;
  });
  const resources:OfficialSeoEvidence['resources']=[];let resourceCount=0;
  $('script[src],link[rel~="stylesheet" i],img[src],link[rel~="icon" i],link[rel="apple-touch-icon" i]').each((_,el)=>{
    const item=$(el),url=resolve(item.attr('src')||item.attr('href')||'');if(!url)return;
    resourceCount++;
    if(resources.length<100)resources.push({url:url.slice(0,4000),kind:el.tagName==='script'?'script':el.tagName==='img'?'image':(item.attr('rel')||'').toLowerCase().includes('stylesheet')?'style':'icon'});
  });
  const icons=$('head link[rel~="icon" i],head link[rel="apple-touch-icon" i],head link[rel="apple-touch-icon-precomposed" i]').slice(0,20).map((_,el)=>({href:($(el).attr('href')||'').slice(0,4000),rel:($(el).attr('rel')||'').toLowerCase(),sizes:($(el).attr('sizes')||'').slice(0,200)})).get();
  const alternatives=$('link[rel~="alternate" i][hreflang]');
  return {baseUrl,links,resources,resourceCount,icons,
    alternates:alternatives.slice(0,100).map((_,el)=>({language:($(el).attr('hreflang')||'').slice(0,100),href:($(el).attr('href')||'').slice(0,4000)})).get(),alternateCount:alternatives.length,
    imagesWithoutSrc:$('img').filter((_,el)=>!($(el).attr('src')||'').trim()).length,
    dataNosnippetCount:$('[data-nosnippet]').length,videoCount:$('video').length,
    amp:$('html[amp],html[⚡],link[rel="amphtml"]').length>0,
    metaRefresh:$('meta[http-equiv="refresh" i]').slice(0,5).map((_,el)=>($(el).attr('content')||'').slice(0,500)).get(),
    canonicalHeader:(headers.get('link')||'').slice(0,16000),
    headCanonicals:$('head link[rel~="canonical" i]').slice(0,20).map((_,el)=>($(el).attr('href')||'').slice(0,4000)).get(),
    canonicalOutsideHead:$('link[rel~="canonical" i]').filter((_,el)=>$(el).parents('head').length===0).length,
    titleInHeadCount:$('head title').length,descriptionInHeadCount:$('head meta[name="description" i]').length,
    allRobotsMeta:$('meta[name]').map((_,el)=>({agent:($(el).attr('name')||'').toLowerCase(),content:($(el).attr('content')||'').slice(0,2000)})).get().filter(m=>['robots','googlebot','googlebot-news','yeti'].includes(m.agent)).slice(0,100),
  };
}
