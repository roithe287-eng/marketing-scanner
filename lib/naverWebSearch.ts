import {budgetFetch} from './runtime/budget';

/** Search results are for discovery/display. Never forward these snippets to an AI. */
export async function searchNaverWeb(query:string,display=15){
  const clientId=process.env.NAVER_CLIENT_ID,clientSecret=process.env.NAVER_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error('NAVER 환경변수 미설정');
  const res=await budgetFetch(`https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(query)}&display=${display}`,{
    headers:{'X-Naver-Client-Id':clientId,'X-Naver-Client-Secret':clientSecret},signal:AbortSignal.timeout(8000),
  });
  if(!res.ok)throw new Error(`네이버 API HTTP ${res.status}`);
  const data=await res.json();
  if(!Array.isArray(data.items))throw new Error('네이버 검색 응답 형식 오류');
  const items:{title:string;link:string;description:string}[]=data.items.filter((item:unknown):item is {title:string;link:string;description:string}=>!!item&&typeof item==='object'&&'title' in item&&typeof item.title==='string'&&'link' in item&&typeof item.link==='string'&&'description' in item&&typeof item.description==='string').slice(0,display);
  return {items,capturedAt:new Date().toISOString(),start:Number.isInteger(data.start)&&data.start>0?data.start:1,total:Number.isInteger(data.total)&&data.total>=0?data.total:null};
}

/** Shopping search is used for public merchant URL discovery only, never model input. */
export async function searchNaverShop(query:string,display=50){
  const clientId=process.env.NAVER_CLIENT_ID,clientSecret=process.env.NAVER_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error('NAVER 환경변수 미설정');
  const res=await budgetFetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}`,{
    headers:{'X-Naver-Client-Id':clientId,'X-Naver-Client-Secret':clientSecret},signal:AbortSignal.timeout(5000),
  });
  if(!res.ok)throw new Error(`네이버 쇼핑 API HTTP ${res.status}`);
  const data=await res.json();if(!Array.isArray(data.items))throw new Error('네이버 쇼핑 검색 응답 형식 오류');
  const items:{title:string;link:string}[]=data.items.filter((v:unknown):v is {title:string;link:string}=>!!v&&typeof v==='object'&&'title' in v&&typeof v.title==='string'&&'link' in v&&typeof v.link==='string').slice(0,display);
  return {items};
}
