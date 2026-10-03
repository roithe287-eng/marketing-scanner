import { getOpenAI } from "./openaiClient";
import { ExtractedWebsiteData } from "./extractWebsite";
import {
  KeywordRankTracking,
  KeywordRankItem,
} from "./reportSchema";

// Web-document API observations. Positions are not integrated-search rankings.
const OPENAI_MODEL = "gpt-4o-mini";
const AI_TIMEOUT_MS = 20000;
const NAVER_TIMEOUT_MS = 8000;
const MAX_KEYWORDS = 5;

/**
 * AI가 사이트 특성 기반 핵심 키워드 3~5개 자동 추출
 */
async function generateKeywords(
  data: ExtractedWebsiteData
): Promise<string[]> {
  const bodyPreview = (data.bodyText || "").slice(0, 2000);

  const prompt = `이 사이트가 네이버 검색에서 노출되기를 원할 만한 핵심 키워드 5개를 추출하라.

[사이트 정보]
타이틀: ${data.title}
설명: ${data.description || data.ogDescription || ""}
H1: ${(data.h1 || []).slice(0, 3).join(" | ")}
H2: ${(data.h2 || []).slice(0, 5).join(" | ")}
키워드 메타: ${data.keywords || ""}
본문 발췌: ${bodyPreview}

원칙:
1) 실제 사용자가 네이버에 검색할 만한 자연어 키워드 (예: "강남 마케팅 대행")
2) 너무 짧거나(1글자) 너무 길지 않게 (2~15자)
3) 브랜드명·업종·지역·서비스명 조합 우선
4) 너무 일반적인 단어 (예: "회사", "홈페이지") 제외
5) 각 키워드는 서로 겹치지 않게 다양한 유형

JSON만 응답:
{"keywords":["...","...","...","...","..."]}`;

  try {
    const resp = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "SEO 키워드 추출 도우미. JSON만 응답.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }, {timeout:AI_TIMEOUT_MS,maxRetries:0});

    const content = resp.choices[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
      return [...new Set<string>(parsed.keywords.filter((k:unknown):k is string=>typeof k==="string").map((k:string)=>k.trim()).filter((k:string)=>k.length>=2 && k.length<=30))].slice(0,MAX_KEYWORDS);
    }
  } catch (e) {
    console.warn("[keyword] 키워드 생성 실패:", e);
  }

  // Fallback: 사이트 타이틀·H1에서 단순 추출
  const fallback: string[] = [];
  if (data.title) {
    const t = data.title.split(/[|\-–·]/)[0].trim();
    if (t && t.length <= 30) fallback.push(t);
  }
  if (data.h1 && data.h1[0] && data.h1[0].length <= 30) {
    fallback.push(data.h1[0]);
  }
  return [...new Set(fallback)].slice(0, MAX_KEYWORDS);
}

export type NaverSearchResponse={status:'ok';items:{title:string;link:string;description:string}[];total:number;start:number;requestedCount:number;observedAt:string}|{status:'error'|'unavailable';message:string;requestedCount:number;observedAt:string};
export async function searchNaverWeb(query:string):Promise<NaverSearchResponse> {
  const requestedCount=15,observedAt=new Date().toISOString();
  const clientId=process.env.NAVER_CLIENT_ID,clientSecret=process.env.NAVER_CLIENT_SECRET;
  if(!clientId||!clientSecret)return {status:'unavailable',message:'검색 API 자격 정보 미설정',requestedCount,observedAt};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),NAVER_TIMEOUT_MS);
  try {
    const res=await fetch(`https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(query)}&display=${requestedCount}&start=1`,{headers:{'X-Naver-Client-Id':clientId,'X-Naver-Client-Secret':clientSecret},signal:controller.signal,cache:'no-store'});
    if(!res.ok)return {status:'error',message:`API HTTP ${res.status}${res.status===429?' · 호출 한도 확인':res.status===401||res.status===403?' · 권한 확인':''}`,requestedCount,observedAt};
    const payload=await res.json();
    if(!Array.isArray(payload.items)||!Number.isInteger(payload.total)||payload.total<0||!Number.isInteger(payload.start)||payload.start<1||payload.items.some((v:unknown)=>!v||typeof v!=='object'||typeof (v as Record<string,unknown>).link!=='string'))return {status:'error',message:'API 응답 형식 확인 필요',requestedCount,observedAt};
    return {status:'ok',items:payload.items,total:payload.total,start:payload.start,requestedCount,observedAt};
  } catch {return {status:'error',message:controller.signal.aborted?'API 응답 시간 초과':'API 요청 또는 응답 읽기 실패',requestedCount,observedAt};}
  finally {clearTimeout(timer);}
}
/** Exact host identity, with store/blog tenancy kept separate. No parent-host fallback. */
export function matchesNaverTarget(link:string,target:string):boolean {
  try {
    const a=new URL(link),b=new URL(target);
    if(!/^https?:$/.test(a.protocol)||a.username||a.password)return false;
    const host=(u:URL)=>u.hostname.toLowerCase().replace(/^www\./,'').replace(/^(?:m\.)?(blog\.naver\.com)$/,'$1');
    if(host(a)!==host(b))return false;
    if(['smartstore.naver.com','brand.naver.com','blog.naver.com','cafe.naver.com'].includes(host(b))) {
      const tenant=(u:URL)=>host(u)==='blog.naver.com'?(u.searchParams.get('blogId')||u.pathname.split('/').filter(Boolean)[0]):u.pathname.split('/').filter(Boolean)[0];
      const aTenant=tenant(a),bTenant=tenant(b);
      return !!aTenant&&!!bTenant&&aTenant.toLowerCase()===bTenant.toLowerCase()&&!/\.naver$/i.test(bTenant);
    }
    if(host(b)==='place.naver.com'||host(b).endsWith('.place.naver.com')) {
      const id=(u:URL)=>u.pathname.match(/\/(\d+)(?:\/|$)/)?.[1];return !!id(a)&&id(a)===id(b);
    }
    return true;
  } catch {return false;}
}
export function keywordObservation(keyword:string,target:string,response:NaverSearchResponse):KeywordRankItem {
  const base={keyword,naverWebRank:null,status:'none' as const,requestedCount:response.requestedCount,observedAt:response.observedAt};
  if(response.status!=='ok')return {...base,observationStatus:response.status,errorMessage:response.message};
  const index=response.items.findIndex(item=>matchesNaverTarget(item.link,target));
  const position=index<0?null:response.start+index;
  return {...base,naverWebRank:position,status:position===null?'none':position<=5?'top':position<=10?'mid':'low',observationStatus:position===null?'not_found':'found',totalResults:response.total,returnedCount:response.items.length,apiStart:response.start,matchedUrl:index<0?undefined:response.items[index].link};
}
export function aggregateKeywordObservations(keywords:KeywordRankItem[]):KeywordRankTracking {
  const valid=keywords.filter(k=>k.observationStatus==='found'||k.observationStatus==='not_found');
  const found=valid.filter(k=>k.observationStatus==='found'&&k.naverWebRank!==null);
  const notFound=valid.filter(k=>k.observationStatus==='not_found');
  const failedCount=keywords.length-valid.length;
  return {measurementVersion:2,totalKeywords:keywords.length,validCount:valid.length,failedCount,visibleCount:found.length,hiddenCount:notFound.length,topFiveCount:found.filter(k=>k.naverWebRank!<=5).length,averageRank:found.length?Math.round(found.reduce((sum,k)=>sum+k.naverWebRank!,0)/found.length*10)/10:null,summary:`웹문서 API 정상 ${valid.length}건 중 대상 ${found.length}건 발견 · 응답 범위 내 미발견 ${notFound.length}건 · 오류/미설정 ${failedCount}건. 실제 통합검색 순위·방문 유입을 측정한 값이 아닙니다.`,keywords,priorityActions:[...(failedCount?['오류·미설정 건은 인증·권한·호출 한도·네트워크를 확인한 뒤 재관측합니다.']:[]),...(notFound.length?['미발견 검색어의 의도와 대상 페이지를 대조하고 실제 검색 화면·서치어드바이저 결과를 함께 확인합니다.']:[])]};
}
export async function analyzeKeywordRank(data:ExtractedWebsiteData):Promise<KeywordRankTracking|null> {
  if(!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)return null;
  const keywords=await generateKeywords(data);if(!keywords.length)return null;
  const results=await Promise.all(keywords.map(async keyword=>keywordObservation(keyword,data.finalUrl||data.url,await searchNaverWeb(keyword))));
  return aggregateKeywordObservations(results);
}
