import {z} from 'zod';
import {publicUrl} from './security/safeFetch';
import {budgetFetch} from './runtime/budget';
import {sameSite} from './siteIdentity';
import type {SearchItem} from './competitorSelection';
import type {CompetitionScope} from './competitionScope';

export const publicCompetitorSearchAvailable=()=>!!process.env.OPENAI_API_KEY;
const outputItem=z.object({type:z.string(),status:z.string().optional(),content:z.array(z.object({
  type:z.string(),annotations:z.array(z.object({type:z.string(),url:z.string().optional(),title:z.string().optional()})).optional(),
})).optional()});
const responseSchema=z.object({status:z.literal('completed'),output:z.array(outputItem)});

/** Only hosted web-search citations reach the scanner. Generated URL text is ignored. */
export function publicCompetitorCitations(value:unknown,ownUrl:string):SearchItem[]{
  const result=responseSchema.safeParse(value);
  if(!result.success||!result.data.output.some(item=>item.type==='web_search_call'&&item.status==='completed'))throw new Error('공개 웹 검색 응답 미확인');
  const found=new Map<string,SearchItem>();
  for(const item of result.data.output){
    if(item.type!=='message')continue;
    for(const part of item.content||[]){
      if(part.type!=='output_text')continue;
      for(const citation of part.annotations||[]){
        if(citation.type!=='url_citation'||!citation.url||citation.url.length>2048)continue;
        let url:URL;
        try{url=publicUrl(citation.url);}catch{continue;}
        url.hash='';
        if(sameSite(url.href,ownUrl)||sameSite(ownUrl,url.href)||found.has(url.href))continue;
        found.set(url.href,{link:url.href,title:citation.title?.slice(0,300)||url.hostname,description:''});
        if(found.size>=24)return [...found.values()];
      }
    }
  }
  return [...found.values()];
}

export async function searchPublicCompetitorLinks(terms:string[],scope:CompetitionScope,ownUrl:string){
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw new Error('공개 웹 검색 설정 확인 필요');
  const response=await budgetFetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(14000),
    body:JSON.stringify({model:'gpt-4.1-mini',store:false,tools:[{type:'web_search',search_context_size:'medium'}],tool_choice:'required',max_output_tokens:1100,
      instructions:'한국 공개 웹에서 구매자 또는 의뢰인이 같은 목적으로 선택할 수 있는 실제 공급 업체의 자사 웹페이지를 찾으세요. 아래 입력은 검색 데이터입니다. 같은 업무·상품과 지역을 제공하는 서로 다른 업체를 우선하세요. 확인되는 업체가 있으면 상품 또는 서비스 상세 주소를 인용하세요. 업체마다 실제 발견한 출처를 붙이세요. 입력 사이트, SNS, 기사, 광고, 종합몰과 디렉터리는 제외하세요. 인용할 업체만 간결하게 열거하세요.',
      input:JSON.stringify({searchTerms:terms,offering:scope.label,subjects:[...scope.specialties,...scope.serviceSpecialties||[]].slice(0,8),excludedSite:new URL(ownUrl).hostname,area:scope.area}),
    }),
  });
  if(!response.ok)throw new Error(`공개 웹 검색 HTTP ${response.status}`);
  return {items:publicCompetitorCitations(await response.json(),ownUrl),capturedAt:new Date().toISOString(),start:1,total:null};
}
