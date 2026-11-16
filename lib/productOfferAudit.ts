import type {CheerioAPI} from 'cheerio';
import type {ProductOfferAudit} from './searchEvidenceSchema';

function clean(value:unknown){
  return typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,200):typeof value==='number'&&Number.isFinite(value)?String(value):'';
}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const type=(v:unknown,name:string)=>(Array.isArray(v)?v:[v]).some(t=>typeof t==='string'&&t.replace(/^https?:\/\/schema.org\//i,'')===name);
function unique(values:string[]){const options=[...new Set(values.filter(Boolean))];return options.length===1?options[0]:'';}
function normalizeId(id:unknown,url:string){try{return typeof id==='string'?new URL(id,url).href:'';}catch{return '';}}
function priceFromText(text:string){
  const price=text.normalize('NFKC').match(/^(?:₩|KRW\s*|US\$\s*|USD\s*|€\s*|EUR\s*)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(?:원|KRW|USD|EUR)?$/i);
  return price?String(Number(price[1].replace(/,/g,''))):'';
}
function currencyFromText(value:string){
  if(/₩|원$|\bKRW\b/i.test(value))return 'KRW';
  if(/US\$|\bUSD\b/i.test(value))return 'USD';
  if(/€|\bEUR\b/i.test(value))return 'EUR';
  return '';
}
const stocks:Record<string,string>={instock:'판매 중',outofstock:'품절',soldout:'품절',preorder:'예약 판매',backorder:'입고 후 주문',discontinued:'판매 종료'};
const visibleStocks:Record<string,string>={'품절':'품절','일시 품절':'품절','sold out':'품절','out of stock':'품절','in stock':'판매 중','재고 있음':'판매 중','판매 중':'판매 중','예약 판매':'예약 판매','품절 임박':'','preorder':'예약 판매','입고 후 주문':'입고 후 주문','판매 종료':'판매 종료'};

/** Match only unambiguous values of a single product and offer in the sampled page. */
export function auditProductOffer($:CheerioAPI,objects:Record<string,unknown>[],url:string):ProductOfferAudit|undefined{
  const products=objects.filter(o=>type(o['@type'],'Product')&&clean(o.name));
  if(products.length!==1)return;
  const product=products[0];
  const candidates=(Array.isArray(product.offers)?product.offers:[product.offers]).filter(record);
  const findReference=(o:Record<string,unknown>)=>{
    const id=normalizeId(o['@id'],url);
    return id?objects.find(node=>normalizeId(node['@id'],url)===id&&type(node['@type'],'Offer')&&Object.keys(node).length>2)||o:o;
  };
  const offer=candidates.length===1?findReference(candidates[0]):undefined;
  const ambiguous=candidates.length>1 || !!offer&&(
    type(offer['@type'],'AggregateOffer')||Array.isArray(offer.priceSpecification)||
    Object.keys(offer).every(field=>field==='@id'||field==='@type') ||
    !!offer.url&&typeof offer.url==='string'&&normalizeId(offer.url,url).split('#')[0]!==normalizeId(url,url).split('#')[0]
  );
  const priceSpec=record(offer?.priceSpecification)?offer.priceSpecification:undefined;
  const offeredPrice=ambiguous?'':priceFromText(clean(offer?.price??priceSpec?.price));
  const offeredCurrency=ambiguous?'':clean(offer?.priceCurrency??priceSpec?.priceCurrency).toUpperCase();
  const offeredInventory=ambiguous?'':stocks[clean(offer?.availability).split('/').at(-1)?.toLowerCase()||'']||'';
  const visible=(selector:string)=>$(selector).slice(0,100).toArray().flatMap(el=>{
    const node=$(el);
    return node.closest('script,style,template,noscript,head,meta,[hidden],[aria-hidden="true"],del,s,[style*="display:none" i],[style*="display: none" i]').length?[]:[clean(node.text())];
  });
  const prices=visible('[itemprop="price"],[data-product-price],#span_product_price_text,#product_price_text,.product-price,.sale-price,.price-sale,.current-price,.selling-price,.sale_price');
  const inventory=visible('[itemprop="availability"],[data-stock-status],.stock-status,.inventory-status,.soldout,.sold-out');
  const fields=[
    {id:'price',label:'판매가',page:unique(prices.map(priceFromText)),markup:offeredPrice},
    {id:'currency',label:'통화',page:unique(prices.map(currencyFromText)),markup:/^[A-Z]{3}$/.test(offeredCurrency)?offeredCurrency:''},
    {id:'inventory',label:'재고',page:unique(inventory.map(x=>visibleStocks[x.toLowerCase()]||'')),markup:offeredInventory},
  ] as const;
  return {product:clean(product.name),fields:fields.map(field=>{
    const state=ambiguous||!field.page?'review':!field.markup?'missing':field.page===field.markup?'match':'mismatch';
    return {...field,state};
  })};
}
