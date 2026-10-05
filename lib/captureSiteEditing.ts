import type {CheerioAPI} from 'cheerio';
import type {Element} from 'domhandler';
import type {PageElement,PlatformId,SiteEditing} from './siteEditingSchema';

/** Read the already fetched document; never probe a site's admin or execute its scripts. */
export function captureSiteEditing($:CheerioAPI,finalUrl:string,headers:Headers):SiteEditing {
  const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
  const signals:SiteEditing['signals']=[];
  const add=(id:PlatformId,kind:SiteEditing['signals'][number]['kind'],evidence:string[])=>{if(evidence.length)signals.push({id,kind,evidence:[...new Set(evidence)].slice(0,8)});};
  const generators=$('meta[name="generator" i]').map((_,e)=>$(e).attr('content')||'').get();
  const assets=$('script[src],link[rel="stylesheet"][href],img[src]').toArray().flatMap(e=>{try{return [new URL($(e).attr('src')||$(e).attr('href')||'',finalUrl)];}catch{return [];}});
  const host=(domain:string)=>assets.some(u=>u.hostname===domain||u.hostname.endsWith('.'+domain));
  const generator=(rx:RegExp)=>generators.filter(g=>rx.test(g)).map(g=>`generator: ${g.slice(0,180)}`);
  add('imweb','cms',[...generator(/imweb|아임웹/i),...(host('imweb.me')||host('imweb.me.s3.amazonaws.com')?['아임웹 도메인의 정적 리소스']:[])]);
  add('cafe24','cms',[...generator(/cafe24/i),...(host('echosting.cafe24.com')||host('img.echosting.cafe24.com')?['카페24 echosting 정적 리소스']:[])]);
  add('wordpress','cms',[...generator(/wordpress/i),...(assets.some(u=>/\/wp-(content|includes)\//.test(u.pathname))?['wp-content / wp-includes 리소스 경로']:[])]);
  add('shopify','cms',[...generator(/shopify/i),...(host('cdn.shopify.com')?['cdn.shopify.com 리소스']:[])]);
  add('wix','cms',[...generator(/wix/i),...(host('wixstatic.com')||host('parastorage.com')?['Wix 정적 리소스 도메인']:[])]);
  add('nextjs','framework',assets.some(u=>u.pathname.startsWith('/_next/'))?['/_next/ 프레임워크 리소스']:[]);
  add('cloudflare','delivery',/cloudflare/i.test(headers.get('server')||'')||headers.has('cf-ray')?['Cloudflare 응답 헤더']:[]);
  add('vercel','delivery',headers.has('x-vercel-id')?['Vercel 응답 헤더']:[]);
  const ids=new Map<string,number>();$('[id]').each((_,e)=>{const id=$(e).attr('id')||'';ids.set(id,(ids.get(id)||0)+1);});
  function selector(el:Element):string {
    const parts:string[]=[];let node:Element|undefined=el;
    while(node){const id=$(node).attr('id');if(id&&ids.get(id)===1&&/^[A-Za-z_][\w-]{0,150}$/.test(id)){parts.unshift('#'+id);break;}
      const tag=node.tagName;if(!/^[a-z][a-z0-9-]*$/i.test(tag))break;
      parts.unshift(`${tag}:nth-of-type(${$(node).prevAll(tag).length+1})`);node=$(node).parent().get(0) as Element|undefined;
    }return parts.join(' > ').slice(0,1000);
  }
  const elements:PageElement[]=[];let order=0,lastHeading='',total=0;
  const counts:Record<PageElement['kind'],number>={title:0,description:0,heading:0,text:0,cta:0,image:0,form:0};
  const limits:Record<PageElement['kind'],number>={title:2,description:2,heading:20,text:36,cta:24,image:12,form:4};
  $('head title,head meta[name="description" i],body h1,body h2,body h3,body p,body li,body a,body button,body img,body form').each((_,node)=>{
    const el=node as Element,item=$(node),tag=el.tagName;
    if(item.parents('script,style,noscript,template,[hidden],[aria-hidden="true"]').length||item.is('[hidden],[aria-hidden="true"]'))return;
    const text=clean(tag==='meta'?item.attr('content')||'':tag==='img'?item.attr('alt')||'':tag==='form'?'문의·입력 폼':item.text());
    if(!text&&tag!=='img')return;if(tag==='li'&&item.children('p,ul,ol').length)return;
    if(/^h[1-3]$/.test(tag))lastHeading=text.slice(0,300);
    const kind:PageElement['kind']=tag==='title'?'title':tag==='meta'?'description':/^h[1-3]$/.test(tag)?'heading':tag==='a'||tag==='button'?'cta':tag==='img'?'image':tag==='form'?'form':'text';
    total++;order++;if(elements.length>=100||counts[kind]>=limits[kind])return;counts[kind]++;
    let href:string|undefined;if(tag==='a'){try{const u=new URL(item.attr('href')||'',finalUrl);if(/^https?:$/.test(u.protocol)&&!u.username&&!u.password)href=u.href.slice(0,4000);}catch{}}
    const id=item.attr('id'),anchor=id&&ids.get(id)===1&&id.length<=300?id:undefined;
    elements.push({key:`element-${order}`,kind,tag,selector:selector(el),text:text.slice(0,1400),truncated:text.length>1400,heading:lastHeading,order,anchor,href});
  });
  return {version:1,source:'static-html',signals,elements,elementsTruncated:total>elements.length};
}
