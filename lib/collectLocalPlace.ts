import * as cheerio from 'cheerio';
import {budgetFetch,withBudget} from './runtime/budget';
import {sameSite} from './siteIdentity';
import type {LocalPlaceEvidence,LocalPlaceItem,LocalPlaceLookup} from './localPlaceSchema';
const clean=(v:unknown,max:number)=>typeof v==='string'?cheerio.load(v).text().replace(/\s+/gu,' ').trim().slice(0,max):'';
const key=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/\(주\)|주식회사|[\s\p{P}\p{S}]/gu,'');
function publicLink(value:unknown){try{if(typeof value!=='string'||value.length>2048)return '';const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password&&!u.port?u.href:'';}catch{return '';}}
export const LOCAL_PLACE_SCOPE='네이버 지역 검색 API의 최대 5개 결과 표본입니다. 응답 순서는 플레이스 일반검색 순위가 아닙니다. 전화번호·리뷰·저장수·사진·영업시간·관리자 등록 키워드·AI 브리핑 실제 노출은 이 API로 확인할 수 없습니다.';
/** Fixed credential destination; adapter is never selected by user input. */
export const localPlaceHttp={fetch:budgetFetch};
export function localPlaceQueries(evidence:LocalPlaceEvidence){
  const region=evidence.address.match(/^[가-힣]+\s+[가-힣]+(?:시|군|구)/u)?.[0]||evidence.seasonal?.destinations[0]?.label||'';
  return [...new Set([region?`${evidence.name} ${region}`:evidence.name,evidence.name])].map(q=>q.slice(0,180)).slice(0,2);
}
export function localPlaceItem(raw:unknown,evidence:LocalPlaceEvidence,url:string):LocalPlaceItem|null {
  if(!raw||typeof raw!=='object')return null;
  const item=raw as Record<string,unknown>,name=clean(item.title,200);if(!name)return null;
  const link=publicLink(item.link),address=clean(item.address,300),roadAddress=clean(item.roadAddress,300);
  const nameMatch=key(name)===key(evidence.name);
  const addressMatch=!!evidence.address&&[address,roadAddress].some(a=>key(a).length>=10&&(key(a)===key(evidence.address)||key(evidence.address).includes(key(a))));
  const domainMatch=!!link&&sameSite(link,url);
  const branchMatch=!evidence.branch||key(name).includes(key(evidence.branch));
  const headquarters=evidence.franchise&&!evidence.branch;
  const consistent=nameMatch&&branchMatch&&!headquarters&&(domainMatch||addressMatch);
  const reasons=[...(nameMatch?['홈페이지 업체명과 일치']:['업체명·지점 직접 확인']),...(domainMatch?['홈페이지 도메인 일치']:[]),...(addressMatch?['홈페이지 주소 일치']:[]),...(headquarters?['브랜드 본사·지점 구분 필요']:[])].slice(0,4);
  return {name,category:clean(item.category,200),description:clean(item.description,700),address,roadAddress,link,
    mapUrl:'https://map.naver.com/p/search/'+encodeURIComponent([name,roadAddress||address].filter(Boolean).join(' ').slice(0,170)),match:consistent?'consistent':'candidate',reasons};
}
export async function collectLocalPlace(evidence:LocalPlaceEvidence|undefined,url:string,limited=false):Promise<LocalPlaceLookup|undefined>{
  if(!evidence)return;
  const base={observedAt:new Date().toISOString(),queries:[] as string[],items:[] as LocalPlaceItem[]};
  if(limited)return {...base,status:'limited',note:'홈페이지 수집 제한으로 업체 식별과 API 조회를 보류했습니다.'};
  const id=process.env.NAVER_CLIENT_ID,secret=process.env.NAVER_CLIENT_SECRET;
  if(!id||!secret)return {...base,status:'unavailable',note:'지역 검색 API 연결이 준비되지 않아 업체 정보를 조회하지 못했습니다. 미조회는 미등록을 뜻하지 않습니다.'};
  const queries=localPlaceQueries(evidence);
  const requests=queries.map(async query=>{
    const endpoint=new URL('https://openapi.naver.com/v1/search/local.json');
    endpoint.search=new URLSearchParams({query,display:'5',start:'1',sort:'random'}).toString();
    return withBudget(4500,async()=>{
      const response=await localPlaceHttp.fetch(endpoint,{headers:{'X-Naver-Client-Id':id,'X-Naver-Client-Secret':secret},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4000)});
      if(!response.ok)throw new Error('local-search-unavailable');
      const text=await response.text();if(text.length>100000)throw new Error('local-search-size');
      const data=JSON.parse(text);if(!Array.isArray(data.items))throw new Error('local-search-shape');
      return data.items.slice(0,5).map((v:unknown)=>localPlaceItem(v,evidence,url)).filter((v:LocalPlaceItem|null):v is LocalPlaceItem=>!!v) as LocalPlaceItem[];
    });
  });
  const results=await Promise.allSettled(requests),success=results.filter((r):r is PromiseFulfilledResult<LocalPlaceItem[]>=>r.status==='fulfilled');
  if(!success.length)return {...base,queries,status:'error',note:'API 응답·시간 제한으로 조회하지 못했습니다. 미조회는 미등록을 뜻하지 않습니다.'};
  const unique=new Map<string,LocalPlaceItem>();for(const result of success)for(const item of result.value){const k=key(item.name)+'|'+key(item.roadAddress||item.address);if(!unique.has(k))unique.set(k,item);}
  const items=[...unique.values()].sort((a,b)=>Number(b.match==='consistent')-Number(a.match==='consistent')).slice(0,5);
  return {...base,queries,items,status:items.length?'observed':'empty',note:(items.length?'동일 상호나 다른 지점이 포함될 수 있습니다. 이름·주소·홈페이지를 함께 확인하세요.':'이 검색 표본에서 업체를 찾지 못했습니다. 미등록·미노출로 단정하지 말고 상호·지점명으로 직접 확인하세요.')+(success.length<results.length?' 일부 검색어는 응답을 확인하지 못했습니다.':'')};
}
