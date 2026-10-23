import * as cheerio from 'cheerio';
import {publicUrl} from './security/safeFetch';
import type {OwnProductSource} from './ownProductSchema';

const clean=(v:unknown,max:number)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const host=(url:URL)=>url.hostname.toLowerCase().replace(/^www\./,'');
const privatePath=/\/(?:auth|admin|api|exec|protected|order|cart|basket|mypage|myshop|account|login|search|careers|jobs|checkout|members?)(?:\/|[._-]|$)/i;

export function ownPublicUrl(value:string,base:string):URL|null{
  try{
    const url=publicUrl(new URL(value,base).href),root=publicUrl(base);
    if(host(url)!==host(root)||url.protocol!==root.protocol||privatePath.test(url.pathname))return null;
    url.hash='';return url;
  }catch{return null;}
}

/** Recognize public detail routes across common stores; list/search/account URLs are never details. */
export function ownProductUrl(value:string,base:string):string|null{
  const url=ownPublicUrl(value,base);if(!url)return null;
  const path=url.pathname;
  if(/\/(?:recent_view_product|wish_list|compare|review|coupon|search)\.(?:html|php)$/i.test(path))return null;
  const keys=['goodsNo','goodsno','it_id','product_no','branduid','index_no','idx','id'];
  const hasId=(names:string[])=>names.some(k=>!!url.searchParams.get(k)?.trim());
  const scripted=/\/(?:goods_view|item|detail|shopdetail|view)\.(?:php|html)$/i.test(path)&&hasId(keys);
  const imweb=/\/shop_view\/?$/i.test(path)&&hasId(['idx']);
  const slug=/\/(?:goods|products?|items?)\/(?!list(?:[./]|$)|(?:goods|product)_list(?:[./]|$)|categor(?:y|ies)(?:[./]|$)|search(?:[./]|$)|bestseller(?:[./]|$)|event(?:[./]|$)|mdpick(?:[./]|$)|detail\.(?:html|php)$)[^/]+/i.test(path);
  if(!scripted&&!imweb&&!slug)return null;
  for(const key of [...url.searchParams.keys()])if(!keys.includes(key))url.searchParams.delete(key);
  return url.href;
}

export type OwnProductSeed={url:string;sources:OwnProductSource[];productLinks:string[];catalogLinks:string[];sparse:boolean;commerce:boolean;brand:string};

/** Parse declarative product data only. Customer, order, review and recommendation state is excluded. */
export function productSourcesFromHtml(html:string,url:string):OwnProductSource[]{
  const $=cheerio.load(html),sources:OwnProductSource[]=[],seen=new Set<string>();
  const add=(name:unknown,description:unknown,category:unknown,kind:OwnProductSource['kind'],link?:unknown)=>{
    const value=clean(name,300),sourceUrl=typeof link==='string'&&ownProductUrl(link,url)||url;
    const key=kind==='catalog_product'?sourceUrl:sourceUrl+'\n'+value;
    if(value.length<2||seen.has(key)||sources.length>=12)return;
    const categories=(Array.isArray(category)?category:[category]).map(c=>clean(c,100)).filter(Boolean).slice(0,8);
    sources.push({url:sourceUrl,name:value,description:clean(description,1200),categories,kind});seen.add(key);
  };
  let visited=0;
  const walk=(value:unknown,depth=0)=>{
    if(!value||typeof value!=='object'||depth>18||visited++>6000||sources.length>=12)return;
    if(Array.isArray(value)){for(const v of value.slice(0,100))walk(v,depth+1);return;}
    const obj=value as Record<string,unknown>,types=[obj['@type']].flat();
    if(types.some(t=>typeof t==='string'&&/(?:^|[\/#])Product$/.test(t)))add(obj.name,obj.description,obj.category,'structured_product',obj.url);
    else if(obj.goodsName||obj.goodsNm||obj.productName||obj.product_name||obj.goods_name)
      add(obj.goodsName||obj.goodsNm||obj.productName||obj.product_name||obj.goods_name,obj.description||obj.shortDescription||obj.goodsDescription,obj.categoryName||obj.category_name||obj.category,'structured_product',obj.url||obj.productUrl);
    for(const [key,v] of Object.entries(obj))if(!/cookie|user|customer|member|session|token|review|recommend|related|cart|order|purchase|checkout|payment|history|wishlist/i.test(key))walk(v,depth+1);
  };
  $('script[type="application/ld+json"],script[type="application/json"]#__NEXT_DATA__,script[type="application/json"][data-product]').slice(0,10).each((_,el)=>{
    const raw=$(el).text();if(raw.length>1_000_000)return;
    try{walk(JSON.parse(raw));}catch{/* Never execute page scripts. */}
  });
  $('[itemscope][itemtype*="schema.org/Product"]').slice(0,12).each((_,el)=>{
    const node=$(el),property=(key:string)=>{const p=node.find(`[itemprop="${key}"]`).first();return p.attr('content')||p.attr('href')||p.text();};
    add(property('name'),property('description'),property('category'),'structured_product',property('url'));
  });
  if(!sources.length&&ownProductUrl(url,url)){
    const body=$('body').clone();body.find('script,style,nav,header,footer,aside').remove();
    const text=body.text();
    if(/장바구니|구매하기|바로구매|add to cart|buy now/i.test(text)&&/배송|상품정보|product|shipping/i.test(text)){
      const title=$('meta[property="og:title"]').attr('content')||$('title').text();
      add($('h1').first().text()||title,$('meta[name="description"]').attr('content')||$('meta[property="og:description"]').attr('content'),$('[itemprop="category"]').map((_,el)=>$(el).text()).get(),'product_page');
    }
  }
  // Visible product cards are public catalog evidence, not detail-page or pricing observations.
  $('a[href]').slice(0,500).each((_,el)=>{
    const a=$(el),link=ownProductUrl(a.attr('href')||'',url);
    if(!link||sources.some(p=>p.url===link)||a.closest('nav,header,footer,aside,[hidden],[aria-hidden="true"]').length)return;
    const card=a.closest('li,article,[class*="product"],[class*="goods"],[class*="item"]');
    const name=clean(a.find('[itemprop="name"],.name,.prdName,.goods_name,.product-name,h2,h3').first().text()||a.attr('title')||a.find('img[alt]').first().attr('alt')||a.text(),300);
    if(!name||/^(?:자세히|상세보기|바로가기|구매하기|view|more|상품|product)$/i.test(name)||name.length>200)return;
    if(!a.find('img').length&&!card.find('img').length&&!/장바구니|구매|배송|[\d,]+\s*원|add to cart/i.test(card.text()))return;
    add(name,'',[],'catalog_product',link);
  });
  return sources;
}

/** Small, public-only seed reused by the main diagnosis; the original HTML is never retained. */
export function captureProductSeed(html:string,url:string):OwnProductSeed{
  const $=cheerio.load(html),sources=productSourcesFromHtml(html,url),productLinks:string[]=[],catalogLinks:string[]=[];
  $('a[href]').slice(0,500).each((_,el)=>{
    const value=$(el).attr('href')||'',detail=ownProductUrl(value,url);
    if(detail){productLinks.push(detail);return;}
    const target=ownPublicUrl(value,url);if(!target)return;
    if(/\/(?:collections?|categor(?:y|ies)|goods_list|product_list|shop|products?|goods)(?:[/.]|$)/i.test(target.pathname)&&!/(?:notice|review|board|event)/i.test(target.pathname)){
      for(const key of [...target.searchParams.keys()])if(!['cate_no','cateCd','category','category_no','cate','id'].includes(key))target.searchParams.delete(key);
      catalogLinks.push(target.href);
    }
  });
  const body=$('body').clone();body.find('script,style,nav,header,footer,aside').remove();
  const text=clean(body.text(),12000);
  return {url,sources,productLinks:[...new Set(productLinks)].slice(0,40),catalogLinks:[...new Set(catalogLinks)].slice(0,2),sparse:text.length<300,
    commerce:sources.some(p=>p.kind!=='structured_product'||!!ownProductUrl(p.url,url))||productLinks.length>0||/장바구니|구매하기|바로구매|add to cart|buy now/i.test(text),
    brand:clean($('meta[property="og:site_name"]').attr('content')||$('title').text().split(/[|·:–—]/)[0],80)};
}

/** URLs in sitemaps are discovery hints only and cannot become product evidence. */
export function productSitemapLinks(xml:string,base:string):{products:string[];sitemaps:string[]}{
  if(xml.length>2_000_000)return {products:[],sitemaps:[]};
  const $=cheerio.load(xml,{xmlMode:true});
  if(!$('urlset,sitemapindex').length)return {products:[],sitemaps:[]};
  const products=$('url > loc').slice(0,3000).map((_,el)=>ownProductUrl($(el).text().trim(),base)).get().filter((s):s is string=>!!s);
  const sitemaps=$('sitemap > loc').slice(0,100).map((_,el)=>ownPublicUrl($(el).text().trim(),base)?.href).get().filter((s):s is string=>!!s);
  sitemaps.sort((a,b)=>Number(/product|goods|item/i.test(b))-Number(/product|goods|item/i.test(a)));
  return {products:[...new Set(products)].slice(0,40),sitemaps:[...new Set(sitemaps)].slice(0,2)};
}
