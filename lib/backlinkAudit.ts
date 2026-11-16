import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {diagnosticPageUrl} from './collectSiteDiagnostics';
import {websiteHttp,publicUrl} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {getScannerContactUrl} from './siteConfig';
import {budgetSignal} from './runtime/budget';
import {AccessError} from './security/request';

const agent='JinjjaScanner/1.0 (+'+getScannerContactUrl()+')';
export type BacklinkRow={
  source:string;observedSource:string;
  status:'linked'|'mentioned'|'broken'|'review'|'no_evidence';
  target?:string;destination?:string;http?:number;
  anchor?:string;rel?:string[];note:string;
};
const host=(url:URL)=>url.hostname.toLowerCase().replace(/^www\./,'');
function clean(text:string){return text.replace(/\s+/g,' ').trim().slice(0,160);}
function publicDocument(value:string){
  const url=publicUrl(value);
  // Platform search/account/community data requires its own permitted channel.
  if(/(?:^|\.)(?:naver\.com|naver\.me|daum\.net|instagram\.com|facebook\.com|tiktok\.com|youtube\.com|bing\.com|google\.[a-z.]+)$/i.test(url.hostname))return null;
  return diagnosticPageUrl(url.href,url.href);
}
async function checkPage(url:string, html:boolean, rules:Map<string,Promise<RobotsObservation>>):Promise<{url:string;http?:number;note:string;html?:string}>{
  const original=new URL(url);
  let current=original;
  for(let hop=0;hop<3;hop++){
    budgetSignal()?.throwIfAborted();
    if(!rules.has(current.origin))rules.set(current.origin,observeRobots(current.href,agent,'manual'));
    const policy=await rules.get(current.origin)!;
    if(!(policy.status==='missing'&&[404,410].includes(policy.httpStatus??0))&&
      (policy.status!=='ok'||evaluateRobots(policy.text||'','JinjjaScanner',current.pathname+current.search).allowed!==true))
      return {url:current.href,note:'robots.txt 규칙상 접근 제한 또는 확인 불가'};
    const response=await websiteHttp.fetch(current.href,{headers:{'User-Agent':agent,Accept:'text/html,application/xhtml+xml'},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(3300)});
    const location=response.headers.get('location');
    if(response.status>=300&&response.status<400&&location){
      await response.body?.cancel();
      const next=new URL(location,current);
      const candidate=host(next)===host(original)?publicDocument(next.href):null;
      if(!candidate)return {url:current.href,note:'외부 또는 검사 제외 경로로 연결됩니다.'};
      current=new URL(candidate);continue;
    }
    const observed={url:current.href,http:response.status,note:'HTTP '+response.status};
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!html||!/text\/html|application\/xhtml/i.test(contentType)){
      await response.body?.cancel();
      return observed;
    }
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>1_000_000)return {...observed,note:'문서 크기 제한으로 원문을 확인하지 못했습니다.'};
    const charset=(contentType.match(/charset\s*=\s*["']?([^"';\s]+)/i)?.[1]||'utf-8').toLowerCase().replace(/^(?:euc-kr|ks_c_5601-1987)$/,'cp949');
    return {...observed,html:iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf8')};
  }
  return {url:current.href,note:'이동 횟수 제한으로 응답을 확인하지 못했습니다.'};
}
export async function auditBacklinks(target:string,sources:string[],brand:string):Promise<BacklinkRow[]> {
  const site=publicDocument(target);
  if(!site)throw new AccessError(422,'검사 가능한 내 사이트의 공개 주소를 입력해 주세요.');
  const siteHost=host(new URL(site)),rules=new Map<string,Promise<RobotsObservation>>();
  const destinations=new Map<string,ReturnType<typeof checkPage>>();
  const brandKey=brand.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
  return Promise.all([...new Set(sources)].map(async source=>{
    const base={source,observedSource:source};
    const missing=(note:string):BacklinkRow=>({...base,status:'review',note});
    try{
      const address=publicDocument(source);
      if(!address||host(new URL(address))===siteHost)return missing('외부 공개 원문 주소만 검사합니다. 플랫폼·검색 결과·비공개 경로는 직접 확인해 주세요.');
      const article=await checkPage(address,true,rules);
      if(!article.html)return {...missing(article.note),observedSource:article.url};
      const $=cheerio.load(article.html);
      let linkBase=article.url;
      try{linkBase=new URL($('head base[href]').first().attr('href')||article.url,article.url).href;}catch{/* Use the fetched article. */}
      $('script,style,template,noscript,[hidden],[aria-hidden="true"]').remove();
      const candidates=$('a[href]').slice(0,400).toArray().flatMap(el=>{
        try{
          const a=$(el),href=a.attr('href')?.trim();
          if(!href||href.startsWith('#'))return [];
          const destination=new URL(href,linkBase);
          if(host(destination)!==siteHost)return [];
          const link=publicDocument(destination.href);
          return link?[{target:link,anchor:clean(a.text()||a.attr('aria-label')||a.find('img').first().attr('alt')||''),rel:(a.attr('rel')||'').toLowerCase().split(/\s+/).filter(r=>['nofollow','sponsored','ugc'].includes(r))}]:[];
        }catch{return [];}
      });
      const link=candidates.find(row=>row.target===site)||candidates[0];
      if(!link){
        const content=($('article,main').first().text()||$('body').text()).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
        const mentioned=brandKey.length>=2&&content.includes(brandKey);
        return {...base,observedSource:article.url,status:mentioned?'mentioned':'no_evidence',note:mentioned?'브랜드 표현은 찾았고 대상 사이트의 링크는 수집 HTML에서 찾지 못했습니다.':'수집 HTML에서 브랜드 언급이나 대상 링크를 확인하지 못했습니다.'};
      }
      if(!destinations.has(link.target))destinations.set(link.target,checkPage(link.target,false,rules));
      const landing=await destinations.get(link.target)!;
      const status=landing.http===404||landing.http===410?'broken':landing.http!==undefined&&landing.http>=200&&landing.http<300?'linked':'review';
      return {...base,...link,observedSource:article.url,destination:landing.url,http:landing.http,status,note:'링크 감지 · '+landing.note};
    }catch{return missing('접근 제한·응답 오류·시간 초과로 확인하지 못했습니다.');}
  }));
}
