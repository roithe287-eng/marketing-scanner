import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import {websiteHttp} from './security/safeFetch';
import {ownPublicUrl} from './productDiscovery';
import {observeRobots} from './observeRobots';
import {evaluateRobots,type RobotsObservation} from './robotsRules';
import {getScannerContactUrl} from './siteConfig';
import {withBudget,budgetSignal} from './runtime/budget';
import {captureSiteDiagnosticSeed,buildSiteDiagnosticFindings,inspectCrawlerPolicies,type SiteDiagnosticSeed} from './siteDiagnostics';
import type {DiagnosticResource,SiteDiagnostics} from './siteDiagnosticsSchema';
import {buildMedicalAudit} from './medicalAudit';
import {medicalSensitiveUrl} from './medicalEvidence';

const UA=`JinjjaScanner/1.0 (+${getScannerContactUrl()})`;
const privateRoute=/\/(?:login|logout|signout|sign[-_]?in|sign[-_]?up|register|write|delete|remove|unsubscribe|payment|pay|download|attachment)(?:[\/._-]|$)/i;
/** Public HTML navigation only: no state-changing routes, tracking parameters, assets or credentials. */
export function diagnosticPageUrl(value:string,base:string):string|null{
  if(!value.trim()||value.startsWith('#'))return null;
  const url=ownPublicUrl(value,base);if(!url||medicalSensitiveUrl(url.href)||privateRoute.test(url.pathname)||/\.(?:xml|txt|json|pdf|zip|png|jpe?g|gif|svg|webp|mp4|css|js|ico|woff2?)$/i.test(url.pathname))return null;
  for(const key of [...url.searchParams.keys()]){
    if(/^(?:utm_.+|fbclid|gclid)$/i.test(key)){url.searchParams.delete(key);continue;}
    if(!/^(?:id|idx|product_no|goodsNo|it_id|cate_no|category_no|cPath|page|lang|locale|menu|menuNo|menuId|page_id|mid|dept|department|branch|location_branch_code)$/i.test(key))return null;
  }
  return url.href;
}

export function inspectSitemapXml(text:string,url:string,now=Date.now()){
  if(text.length>1_000_000||/<!DOCTYPE|<!ENTITY/i.test(text))return null;
  const $=cheerio.load(text,{xml:true}),root=$.root().children().first()[0];
  if(!root||!('name' in root))return null;
  const local=(name:string)=>name.split(':').pop();
  const kind=local(root.name);if(kind!=='urlset'&&kind!=='sitemapindex')return null;
  const entries=$(root).children().filter((_,e)=>'name' in e&&local(e.name)===(kind==='urlset'?'url':'sitemap'));
  let lastmod=0,invalidDates=0,futureDates=0;
  const urls:string[]=[];
  entries.slice(0,1500).each((_,el)=>{
    const node=$(el),field=(name:string)=>node.children().filter((_,e)=>'name' in e&&local(e.name)===name).first().text().trim();
    const loc=field('loc');try{const parsed=new URL(loc);if(/^https?:$/.test(parsed.protocol))urls.push(parsed.href);}catch{/* Relative/malformed sitemap entries are not followed. */}
    const date=field('lastmod');if(!date)return;lastmod++;
    // W3C date or datetime. No arbitrary "old sitemap" penalty: lastmod describes real changes.
    const timestamp=Date.parse(date),day=date.slice(0,10);
    const calendar=Date.parse(`${day}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(date)||!Number.isFinite(timestamp)||!Number.isFinite(calendar)||new Date(calendar).toISOString().slice(0,10)!==day)invalidDates++;
    else if(timestamp>now+86_400_000)futureDates++;
  });
  return {kind,urls,entries:Math.min(entries.length,1500),lastmod,invalidDates,futureDates,sampled:entries.length>1500};
}

/** Bounded public samples: 3 supplemental HTML pages, or 7 for medical facilities; same deadline. */
export async function collectSiteDiagnostics(url:string,options:{seed?:SiteDiagnosticSeed;robots?:RobotsObservation;limited?:boolean;budgetMs?:number}={}):Promise<SiteDiagnostics>{
  const medical=!!options.seed?.page.medicalEvidence?.facilityCandidate,pageLimit=medical?7:3;
  const observedAt=new Date().toISOString(),pages=options.seed?[options.seed.page]:[],attempts:DiagnosticResource[]=[];
  const base=new URL(url),robots=options.robots;
  const declared=(robots?.status==='ok'?robots.text||'':'').split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*sitemap\s*:\s*(https?:\/\/[^\s#]+)/i);return m?[m[1]]:[];});
  const mapUrl=declared.map(v=>ownPublicUrl(v,url)?.href).find(Boolean)||new URL('/sitemap.xml',url).href;
  let sitemap:SiteDiagnostics['sitemap']={url:mapUrl,status:'unavailable',note:'미수집',declared:declared.includes(mapUrl),entries:0,lastmod:0,invalidDates:0,futureDates:0,sampled:false};
  let llms:DiagnosticResource={url:new URL('/llms.txt',url).href,status:'unavailable',note:'미수집 · 선택 파일'};
  const visited=new Set([url]),rules=new Map<string,Promise<RobotsObservation>>();
  if(robots)rules.set(base.origin,Promise.resolve(robots));
  const read=async(value:string,kind:'html'|'xml'|'text'):Promise<{resource:DiagnosticResource;text?:string;headers?:Headers}>=>{
    let target=ownPublicUrl(value,url);if(!target)return {resource:{url:value,status:'unsupported',note:'동일 사이트의 공개 URL만 수집합니다.'}};
    try{for(let hop=0;hop<3;hop++){
      budgetSignal()?.throwIfAborted();
      if(!rules.has(target.origin))rules.set(target.origin,observeRobots(target.href,UA));
      const policy=await rules.get(target.origin)!;
      if(policy.status!=='missing'&&(policy.status!=='ok'||evaluateRobots(policy.text||'','JinjjaScanner',target.pathname+target.search).allowed!==true))return {resource:{url:target.href,status:'blocked',note:'스캐너 수집 정책상 접근하지 않았습니다. robots.txt 차단 또는 규칙 미확인.'}};
      const res=await websiteHttp.fetch(target.href,{headers:{'User-Agent':UA,Accept:kind==='html'?'text/html,application/xhtml+xml':kind==='xml'?'application/xml,text/xml,text/plain':'text/plain,text/markdown'},signal:AbortSignal.timeout(2300),redirect:'manual',cache:'no-store'});
      const loc=res.headers.get('location');
      if(res.status>=300&&res.status<400&&loc){await res.body?.cancel();const next=ownPublicUrl(loc,target.href);if(!next||(kind==='html'&&!diagnosticPageUrl(next.href,url)))return {resource:{url:target.href,status:'unsupported',note:'외부·비공개·검사 대상 외 경로로 이동하여 중단했습니다.'}};target=next;continue;}
      const resource:DiagnosticResource={url:target.href,status:res.ok?'observed':[404,410].includes(res.status)?'missing':'unavailable',note:`HTTP ${res.status}`};
      if(!res.ok){await res.body?.cancel();return {resource};}
      const ct=res.headers.get('content-type')||'';
      if(kind==='html'&&!/text\/html|application\/xhtml/i.test(ct)||kind!=='html'&&/html/i.test(ct)){await res.body?.cancel();return {resource:{...resource,status:'unsupported',note:'요청한 문서 형식이 아닙니다.'}};}
      const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>1_000_000)return {resource:{...resource,status:'unsupported',note:'보조 문서 검사 크기 제한을 초과했습니다.'}};
      const charset=(ct.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]||'utf-8').replace(/^(ks_c_5601-1987|ksc5601)$/i,'cp949');
      const text=iconv.decode(bytes,iconv.encodingExists(charset)?charset:'utf-8');
      if(kind==='text'&&(!text.trim()||/^\s*<(?:!doctype|html)/i.test(text)))return {resource:{...resource,status:'unsupported',note:'비어 있거나 HTML을 반환해 텍스트 파일로 확인하지 못했습니다.'}};
      return {resource,text,headers:res.headers};
    }}catch{/* A failed sample is never called an absent tag or a zero score. */}
    return {resource:{url:target.href,status:'unavailable',note:'응답·시간 제한으로 확인하지 못했습니다.'}};
  };
  const collectPages=async(candidates:string[],limit:number)=>{
    const selected=candidates.map(v=>diagnosticPageUrl(v,url)).filter((v):v is string=>!!v&&!visited.has(v)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,limit);
    selected.forEach(v=>visited.add(v));
    await Promise.allSettled(selected.map(async v=>{const result=await read(v,'html');attempts.push(result.resource);if(result.text!==undefined){const page=captureSiteDiagnosticSeed(result.text,result.resource.url).page;if(/(?:^|[\s,:])(?:noindex|none)(?:$|[\s,])/i.test(result.headers?.get('x-robots-tag')||''))page.noindex=true;if(!pages.some(p=>p.url===page.url))pages.push(page);}}));
  };
  if(!options.limited)try{await withBudget(options.budgetMs??6000,async()=>{
    await Promise.allSettled([
      collectPages([...(options.seed?.medicalLinks||[]),...(options.seed?.links||[])],pageLimit),
      (async()=>{const result=await read(mapUrl,'xml');sitemap={...sitemap,...result.resource};if(result.text===undefined)return;let parsed=inspectSitemapXml(result.text,result.resource.url);if(!parsed){sitemap.status='unsupported';sitemap.note='XML urlset 또는 sitemapindex를 확인하지 못했습니다. 다른 형식은 직접 확인합니다.';return;}
        if(parsed.kind==='sitemapindex'){
          sitemap.note=`사이트맵 인덱스 ${parsed.entries}개 중 하위 문서 최대 1개 표본 검사`;
          const child=parsed.urls.find(v=>!!ownPublicUrl(v,url));sitemap.sampled=true;if(!child)return;
          const childResult=await read(child,'xml');attempts.push(childResult.resource);if(childResult.text===undefined)return;
          parsed=inspectSitemapXml(childResult.text,childResult.resource.url);if(!parsed||parsed.kind!=='urlset'){sitemap.note+=' · 하위 URL 목록 미확인';return;}
        }
        sitemap={...sitemap,entries:parsed.entries,lastmod:parsed.lastmod,invalidDates:parsed.invalidDates,futureDates:parsed.futureDates,sampled:sitemap.sampled||parsed.sampled,note:sitemap.note==='HTTP 200'?'XML URL 목록 관측':sitemap.note};
        if(visited.size===1)await collectPages(parsed.urls,pageLimit);
      })(),
      (async()=>{const result=await read(llms.url,'text');llms={...result.resource,note:result.resource.status==='observed'?'텍스트 응답 관측 · 내용 품질·표준 준수는 미검증. Google 검색 필수 파일이 아닙니다.':result.resource.note+' · 선택 파일이며 미감지에 감점하지 않습니다.'};})(),
    ]);
  });}catch{/* Keep completed observations; the deadline cancels downstream sockets. */}
  const limited=!!options.limited;
  if(limited){sitemap={...sitemap,status:'blocked',note:'원문 수집 제한으로 추가 요청을 하지 않았습니다.'};llms={...llms,status:'blocked',note:'원문 수집 제한으로 추가 요청을 하지 않았습니다.'};}
  const snapshot=pages.slice(0,pageLimit+1).sort((a,b)=>a.url===url?-1:b.url===url?1:a.url.localeCompare(b.url));
  const findings=buildSiteDiagnosticFindings(snapshot);
  const medicalAudit=buildMedicalAudit(snapshot,limited);
  if(sitemap.invalidDates||sitemap.futureDates)findings.push({id:'sitemap-dates',title:'사이트맵 변경일 확인',status:'review',evidence:`검사 표본 ${sitemap.entries}개 · lastmod ${sitemap.lastmod}개 · 형식·날짜 이상 ${sitemap.invalidDates}개 · 미래 날짜 ${sitemap.futureDates}개`,action:'실제 주요 콘텐츠가 변경된 날짜만 반영합니다. 모든 페이지를 오늘 날짜로 바꾸거나 오래되었다는 이유만으로 갱신하지 않습니다.',urls:[sitemap.url]});
  return {version:1,observedAt,targetUrl:url,limited,scopeNote:limited?'원문 수집이 제한되어 추가 페이지 검사를 수행하지 않았습니다. 미측정을 결함·0점으로 표시하지 않습니다.':`입력 페이지와 내부 링크·사이트맵에서 선택한 최대 ${pageLimit}개 HTML을 비교합니다. 현재 ${snapshot.length}개 수집. 전체 사이트, 브라우저 렌더링, 외부 CSS, 실제 태그 전송·보안 취약점·면허는 검사하지 않습니다. 사이트맵은 최대 2개 문서·URL 1,500개 표본입니다.`,pages:snapshot,attempts:attempts.slice(0,medical?14:8),sitemap:{...sitemap},llms:{...llms},crawlers:inspectCrawlerPolicies(robots,url),findings:findings.slice(0,50),...(medicalAudit?{medicalAudit}:{})};
}
