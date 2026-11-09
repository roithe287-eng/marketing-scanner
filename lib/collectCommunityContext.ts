import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {websiteHttp} from './security/safeFetch';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {budgetSignal,withBudget} from './runtime/budget';
import {getScannerContactUrl} from './siteConfig';
import {captureCommunityPage,communityPageUrl,type CommunityContext} from './communityContext';

/** At most three public samples; no login, form submission, external hosts or unlimited crawling. */
export async function collectCommunityContext(url:string,seed:CommunityContext|undefined,robots?:RobotsObservation,budgetMs=5500):Promise<CommunityContext|undefined>{
  if(!seed)return;
  const pages=[...seed.pages],attempts:CommunityContext['attempts']=[];
  const boards=seed.navigation.filter(l=>l.role==='board').sort((a,b)=>Number(/질문|Q.?A/i.test(b.label))-Number(/질문|Q.?A/i.test(a.label)));
  const candidates=[...boards.slice(0,2),...seed.navigation.filter(l=>l.role==='discussion').slice(0,1)].map(l=>communityPageUrl(l.url,url)).filter((v):v is string=>!!v&&v!==url).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);
  const UA=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`,rules=new Map<string,Promise<RobotsObservation>>();
  if(robots)rules.set(new URL(url).origin,Promise.resolve(robots));
  const outcomes=new Map<string,{page?:ReturnType<typeof captureCommunityPage>;attempt:CommunityContext['attempts'][number]}>();
  try{await withBudget(budgetMs,async()=>{
    await Promise.allSettled(candidates.map(async candidate=>{
      let current=candidate;
      const finish=(status:CommunityContext['attempts'][number]['status'],note:string,page?:ReturnType<typeof captureCommunityPage>)=>{if(!budgetSignal()?.aborted)outcomes.set(candidate,{attempt:{url:current,status,note},page});};
      try{for(let hop=0;hop<3;hop++){
        budgetSignal()?.throwIfAborted();const u=new URL(current);
        if(!rules.has(u.origin))rules.set(u.origin,observeRobots(current,UA));
        const policy=await rules.get(u.origin)!;
        if(policy.status!=='missing'&&(policy.status!=='ok'||evaluateRobots(policy.text||'','JinjjaScanner',u.pathname+u.search).allowed!==true)){finish('blocked','robots.txt 차단 또는 규칙 미확인으로 접근하지 않았습니다.');return;}
        const response=await websiteHttp.fetch(current,{headers:{'User-Agent':UA,Accept:'text/html,application/xhtml+xml'},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(3500)});
        if(response.status>=300&&response.status<400&&response.headers.get('location')){await response.body?.cancel();const next=communityPageUrl(response.headers.get('location')!,current);if(!next){finish('blocked','외부·로그인·쓰기 등 수집 대상 외 경로로 이동하여 중단했습니다.');return;}current=next;continue;}
        const type=response.headers.get('content-type')||'';
        if(!response.ok||!/text\/html|application\/xhtml/i.test(type)){await response.body?.cancel();finish('unavailable',`HTTP ${response.status} · 공개 HTML 미확인`);return;}
        const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>1_000_000){finish('unavailable','보조 문서 크기 제한 초과');return;}
        const charset=(type.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]||'utf-8').replace(/^(ks_c_5601-1987|ksc5601)$/i,'cp949');
        const $=cheerio.load(iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf-8'));
        const page=captureCommunityPage($,current);
        if(/로그인|접근\s*제한|access denied|just a moment|captcha|sign in/i.test(page.title)||!page.title){finish('blocked','로그인·접근 제한 응답이어서 본문 근거로 사용하지 않았습니다.');return;}
        finish('observed','공개 HTML 표본 · 실제 기능과 본문 사실성은 미검증',page);return;
      }finish('unavailable','리다이렉트 제한 초과');}catch{finish('unavailable','응답·시간 제한으로 미확인');}
    }));
  });}catch{/* Preserve completed observations; a missing sample is not a site defect. */}
  for(const candidate of candidates){const result=outcomes.get(candidate);attempts.push(result?.attempt||{url:candidate,status:'unavailable',note:'수집 시간 제한으로 미확인'});if(result?.page&&!pages.some(p=>p.url===result.page!.url))pages.push(result.page);}
  return {...seed,pages:pages.slice(0,4),attempts,note:seed.note+` 입력 페이지 외 공개 표본 ${pages.length-1}개 확인 / ${attempts.length}개 시도. 보완 페이지의 제목·메타·CTA는 입력 페이지의 점수·개수에 합산하지 않습니다.`};
}
