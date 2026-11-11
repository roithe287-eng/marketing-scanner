import * as cheerio from 'cheerio';
import {evaluateRobots,type RobotsAgent,type RobotsObservation} from './robotsRules';
import type {DiagnosticPage,DiagnosticFinding,SiteDiagnostics} from './siteDiagnosticsSchema';
import {analyzeNonCommerceSector} from './nonCommerceSectors';
import {captureMedicalEvidence} from './medicalEvidence';
import {captureLocalPlaceEvidence} from './localPlaceEvidence';

const clean=(v:unknown,max=500)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const types=(v:unknown):string[]=>Array.isArray(v)?v.flatMap(types):typeof v==='string'?[v.replace(/^https?:\/\/schema.org\//,'')]:[];
const MEDICAL=new Set(['MedicalClinic','Hospital','Dentist','Physician','PhysiciansOffice','IndividualPhysician']);
export type SiteDiagnosticSeed={page:DiagnosticPage;links:string[];medicalLinks?:string[];localLinks?:string[]};

/** Parse declarations only. No script execution, external CSS/JS requests, or inferred tracking delivery. */
export function captureSiteDiagnosticSeed(html:string,url:string,hospitalContext=false):SiteDiagnosticSeed{
  const $=cheerio.load(html);
  const headTitle=$('head > title').first().text().replace(/\s+/g,' ').trim();
  const headDescription=($('head meta[name="description" i]').first().attr('content')||'').replace(/\s+/g,' ').trim();
  // Next.js can stream metadata after </head>. SVG accessibility titles are never page titles.
  const rawTitle=headTitle||$('title').filter((_,el)=>!$(el).closest('svg').length).first().text().replace(/\s+/g,' ').trim();
  const rawDescription=headDescription||($('meta[name="description" i]').first().attr('content')||'').replace(/\s+/g,' ').trim();
  const title=clean(rawTitle);
  const objects:Record<string,unknown>[]=[],ids=new Map<string,Record<string,unknown>>();
  const idKey=(id:string)=>{try{return new URL(id,url).href;}catch{return id;}};
  const walk=(v:unknown,depth=0)=>{if(depth>12||objects.length>=1500||!v||typeof v!=='object')return;if(Array.isArray(v)){v.slice(0,200).forEach(x=>walk(x,depth+1));return;}const o=v as Record<string,unknown>;objects.push(o);if(typeof o['@id']==='string'){const key=idKey(o['@id']),previous=ids.get(key);if(!previous||Object.keys(o).length>Object.keys(previous).length)ids.set(key,o);}Object.values(o).forEach(x=>walk(x,depth+1));};
  $('script[type="application/ld+json"]').slice(0,30).each((_,el)=>{const raw=$(el).text();if(raw.length>200000)return;try{walk(JSON.parse(raw));}catch{/* JSON syntax errors are reported by the existing core audit. */}});
  const present=(v:unknown):boolean=>v!==null&&v!==undefined&&(typeof v!=='string'||!!v.trim())&&(!Array.isArray(v)||v.some(present))&&(typeof v!=='object'||Array.isArray(v)||Object.keys(v as object).length>0);
  const state=(v:unknown):'present'|'missing'|'reference'=>{
    if(!present(v))return 'missing';
    if(Array.isArray(v)){const states=v.map(state);return states.includes('present')?'present':states.includes('reference')?'reference':'missing';}
    if(v&&typeof v==='object'&&typeof (v as Record<string,unknown>)['@id']==='string'){
      const o=v as Record<string,unknown>,resolved=ids.get(idKey(o['@id'] as string));
      return Object.keys(resolved||o).some(k=>!['@id','@type','@context'].includes(k))?'present':'reference';
    }
    return 'present';
  };
  const seen=new Set<string>();
  const medical:DiagnosticPage['medical']=[];
  for(const o of objects){
    const ts=types(o['@type']),type=ts.find(t=>MEDICAL.has(t))||(ts.includes('Person')&&/의사|한의사|치과의사|\b(?:medical doctor|doctor of medicine|physician|dentist)\b/i.test(clean(o.jobTitle))?'Person':undefined);if(!type)continue;
    const id=clean(o['@id'],2048),key=id?idKey(id):JSON.stringify(o);if(seen.has(key))continue;seen.add(key);
    const node=id?ids.get(idKey(id))||o:o;
    const fields:[string,unknown][]=[['이름 · name',node.name],['홈페이지 식별 · url / @id',node.url||node['@id']],['주소 · address',node.address],['연락처 · telephone',node.telephone],['진료 분야 · medicalSpecialty',node.medicalSpecialty]];
    if(type==='Physician'||type==='IndividualPhysician'||type==='Person')fields.push(['소속 연결 · practicesAt / hospitalAffiliation / worksFor',node.practicesAt||node.hospitalAffiliation||node.worksFor||node.affiliation]);
    if(type==='Person')fields.push(['전문직 표기 · jobTitle',node.jobTitle],['공개 자격 연결 · hasCredential',node.hasCredential]);
    medical.push({type,name:clean(node.name,300),id,fields:fields.map(([label,v])=>({label,state:state(v)}))});if(medical.length>=20)break;
  }
  const jquery=new Set<string>(),analytics=new Set<'UA'|'GA4'|'GTM'>();
  $('script').slice(0,500).each((_,el)=>{
    const src=$(el).attr('src')||'',code=$(el).text(),text=src+' '+code;
    if(/jquery/i.test(src)){const version=src.match(/jquery[\/@._-](\d+\.\d+(?:\.\d+)?)(?=[/._?-]|$)/i)?.[1]||src.match(/\/jquery\/(\d+\.\d+(?:\.\d+)?)\//i)?.[1];jquery.add(version||'버전 미표기');}
    if(/\bUA-\d+-\d+\b/.test(text)||/google-analytics\.com\/(?:analytics|ga)\.js/.test(src))analytics.add('UA');
    if(/\bG-[A-Z0-9]{4,}\b/.test(text))analytics.add('GA4');
    if(/\bGTM-[A-Z0-9]+\b/.test(text)||/googletagmanager\.com\/gtm\.js/.test(src))analytics.add('GTM');
  });
  let backgroundCandidates=0;
  $('[style]').each((_,el)=>{const node=$(el);if(/background(?:-image)?\s*:[^;]*url\s*\(/i.test(node.attr('style')||'')&&!clean(node.text())&&!clean(node.attr('aria-label'))&&node.attr('aria-hidden')!=='true'&&node.attr('role')!=='presentation')backgroundCandidates++;});
  const heading=clean($('h1').map((_,e)=>$(e).text()).get().join(' '),1000);
  const provider=analyzeNonCommerceSector([{text:title,locator:'head > title'},{text:clean(rawDescription,600),locator:'meta[name="description"]'},...$('h1').slice(0,4).toArray().map(el=>({text:clean($(el).text(),600),locator:'h1'}))],[])?.id==='medical_consulting';
  const page:DiagnosticPage={url,title,description:clean(rawDescription,1500),canonicals:$('head link[rel~="canonical" i]').slice(0,5).map((_,e)=>clean($(e).attr('href'),2048)).get(),noindex:$('meta[name="robots" i],meta[name="googlebot" i]').toArray().some(e=>/\b(?:noindex|none)\b/i.test($(e).attr('content')||'')),twitterCard:!!$('meta[name="twitter:card" i]').attr('content'),jquery:[...jquery].slice(0,5),analytics:[...analytics],backgroundCandidates,medicalRelevant:medical.length>0||(!provider&&/병원|의원|한의원|치과|\b(?:hospital|clinic|dentist)\b/i.test(title+' '+heading)),medical};
  page.titleTruncated=rawTitle.length>500;page.descriptionTruncated=rawDescription.length>1500;
  const localPlaceEvidence=captureLocalPlaceEvidence(html,url);
  if(localPlaceEvidence)page.localPlaceEvidence=localPlaceEvidence;
  page.metadataOutsideHead=!!(!headTitle&&rawTitle||!headDescription&&rawDescription);
  page.metadataDeferred=(!rawTitle||!rawDescription)&&($('script[src*="/_next/"]').length>0||$('script').toArray().some(el=>/\b__next_f\b/.test($(el).text())));
  const medicalEvidence=captureMedicalEvidence(html,url,provider,hospitalContext);
  if(page.medicalRelevant||medicalEvidence.facilityCandidate||medicalEvidence.place){page.medicalEvidence=medicalEvidence;page.medicalRelevant=true;}
  const links=$('a[href]').slice(0,400).map((_,e)=>$(e).attr('href')||'').get();
  const groups=new Map<string,string[]>();
  if(medicalEvidence.facilityCandidate)$('a[href]').slice(0,400).each((_,e)=>{
    const a=$(e),text=clean(a.text())+' '+(a.attr('href')||'');
    const group=/의료진|원장\s*(?:소개|약력)|doctor|staff/i.test(text)?'doctors':/진료\s*시간|오시는\s*길|주차|location|contact/i.test(text)?'visit':/비급여|진료비|비용|price/i.test(text)?'cost':/진료\s*(?:안내|과목|분야)|시술|검사|치료|treatment|service/i.test(text)?'services':null;
    if(group)groups.set(group,[...groups.get(group)||[],a.attr('href')||'']);
  });
  const medicalLinks=[...groups.values()].flatMap(g=>g.slice(0,1)).concat([...groups.values()].flatMap(g=>g.slice(1,3)));
  const localLinks=localPlaceEvidence?$('a[href]').slice(0,400).toArray().filter(e=>/시즌|렌탈|대여|강습|체험|픽업|반납|패키지|메뉴|가격|요금|서비스|취급|오시는\s*길|주차|매장|지점|이용\s*안내|menu|price|service|location|contact/i.test($(e).text()+' '+($(e).attr('href')||''))).map(e=>$(e).attr('href')||'').slice(0,12):[];
  return {page,links,...(medicalLinks.length?{medicalLinks}: {}),...(localLinks.length?{localLinks}:{})};
}

const BOT_SOURCES={google:'https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers',openai:'https://developers.openai.com/api/docs/bots',anthropic:'https://privacy.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',perplexity:'https://docs.perplexity.ai/docs/resources/perplexity-crawlers'};
const bots:{agent:RobotsAgent;role:string;source:string;note:string}[]=[
  {agent:'Googlebot',role:'Google 검색 수집',source:BOT_SOURCES.google,note:'Google 검색의 AI 기능도 Googlebot 접근과 색인 조건을 확인합니다.'},
  {agent:'Google-Extended',role:'Gemini 학습·일부 그라운딩 사용 제어',source:BOT_SOURCES.google,note:'Google 검색 포함 여부·순위 신호와 별개입니다.'},
  {agent:'OAI-SearchBot',role:'ChatGPT 검색 수집',source:BOT_SOURCES.openai,note:'검색 노출을 원할 때 해당 경로의 허용 정책을 검토합니다.'},
  {agent:'GPTBot',role:'OpenAI 모델 학습',source:BOT_SOURCES.openai,note:'학습 허용은 운영자 선택입니다. 차단을 결함으로 판정하지 않습니다.'},
  {agent:'ChatGPT-User',role:'사용자 요청에 따른 페이지 방문',source:BOT_SOURCES.openai,note:'robots.txt가 적용되지 않을 수 있습니다. 아래 값은 선언된 규칙이며 실제 접근 판정이 아닙니다.'},
  {agent:'Claude-SearchBot',role:'Claude 검색 수집',source:BOT_SOURCES.anthropic,note:'검색 수집과 학습 정책을 구분해 검토합니다.'},
  {agent:'ClaudeBot',role:'Anthropic 모델 학습',source:BOT_SOURCES.anthropic,note:'학습 허용은 운영자 선택입니다. 차단을 결함으로 판정하지 않습니다.'},
  {agent:'Claude-User',role:'Claude 사용자 요청 방문',source:BOT_SOURCES.anthropic,note:'사용자 요청 방문에 대한 선언입니다. 실제 접근은 별도 확인합니다.'},
  {agent:'PerplexityBot',role:'Perplexity 검색 수집',source:BOT_SOURCES.perplexity,note:'기반 모델 학습용 봇이 아닙니다.'},
  {agent:'Perplexity-User',role:'Perplexity 사용자 요청 방문',source:BOT_SOURCES.perplexity,note:'일반적으로 robots.txt를 무시하는 사용자 요청 방문입니다. 아래 값은 규칙 선언만 표시합니다.'},
];
export function inspectCrawlerPolicies(robots:RobotsObservation|undefined,url:string):SiteDiagnostics['crawlers']{
  const path=new URL(url).pathname+new URL(url).search;
  return bots.map(bot=>{const result=robots?.status==='ok'?evaluateRobots(robots.text||'',bot.agent,path):null;return {...bot,status:result?.allowed===true?'allowed':result?.allowed===false?'blocked':'unknown',rule:result?.rule.slice(0,600)||`robots.txt ${robots?.status||'미수집'} · 규칙 판정 보류`};});
}

/** No score is assigned: these are sample observations, not a whole-site or medical quality rating. */
export function buildSiteDiagnosticFindings(pages:DiagnosticPage[]):DiagnosticFinding[]{
  const findings:DiagnosticFinding[]=[];
  const add=(id:string,title:string,status:DiagnosticFinding['status'],evidence:string,action:string,urls:string[])=>findings.push({id,title,status,evidence:evidence.slice(0,2500),action,urls:urls.slice(0,8)});
  for(const field of ['title','description'] as const){
    const groups=new Map<string,DiagnosticPage[]>();for(const p of pages){if(p[field==='title'?'titleTruncated':'descriptionTruncated'])continue;const value=p[field].normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase();if(value)groups.set(value,[...groups.get(value)||[],p]);}
    const clipped=pages.filter(p=>p[field==='title'?'titleTruncated':'descriptionTruncated']);
    if(clipped.length)add(`clipped-${field}`,field==='title'?'긴 제목의 중복 비교 보류':'긴 설명의 중복 비교 보류','review','보관 길이를 초과해 일부만 저장한 값을 동일성 비교에서 제외했습니다.','원문 전체 값으로 중복을 직접 확인합니다.',clipped.map(p=>p.url));
    const duplicates=[...groups.values()].filter(g=>g.length>1);
    const comparable=pages.filter(p=>p[field]&&!p[field==='title'?'titleTruncated':'descriptionTruncated']).length;
    if(comparable<2)add(`duplicate-${field}`,field==='title'?'페이지별 제목 중복':'페이지별 설명 중복','review',`전체 값을 비교할 수 있는 페이지가 ${comparable}개로 2개 미만입니다.`,'추가 페이지를 수집할 수 있을 때 다시 비교합니다.',pages.map(p=>p.url));
    else if(duplicates.length)for(const [i,g] of duplicates.entries())add(`duplicate-${field}-${i}`,field==='title'?'중복 제목 발견':'중복 설명 발견','action',`${g.length}개 표본의 ${field==='title'?'제목':'메타 설명'}이 같습니다: ${g[0][field].slice(0,500)}`,'같은 문서의 별칭 URL인지 canonical을 먼저 확인한 뒤, 서로 다른 서비스·상품 페이지라면 각 페이지의 내용을 구체적으로 작성합니다.',g.map(p=>p.url));
    else add(`duplicate-${field}`,field==='title'?'제목 중복 비교':'설명 중복 비교','observed',`${pages.length}개 표본 중 전체 값을 보관한 비어 있지 않은 ${field==='title'?'제목':'설명'}에서 동일값 중복이 발견되지 않았습니다.`,'검사한 표본에 한정한 결과입니다. 비어 있거나 부분 저장한 값은 각 페이지에서 따로 확인합니다.',pages.map(p=>p.url));
    const empty=pages.filter(p=>!p[field]);
    for(const deferred of [false,true]){const group=empty.filter(p=>!!p.metadataDeferred===deferred);if(group.length)add(`missing-${field}${deferred?'-deferred':''}`,field==='title'?'제목 미감지 페이지':'메타 설명 미감지 페이지',deferred?'review':'action',`${group.length}개 수집 HTML에서 ${field==='title'?'HTML title':'meta description'} 값이 미감지되었습니다.${deferred?' 동적 렌더링·스트리밍 가능성이 있어 실제 누락 판정을 보류합니다.':''}`,deferred?'렌더링한 페이지의 head와 검색엔진 URL 검사 결과를 확인합니다. 전달 시점 차이를 태그 부재로 단정하지 않습니다.':'원문 HTML을 확인하고 검색에 공개할 페이지별 설명을 작성합니다. JavaScript 주입 여부도 확인합니다.',group.map(p=>p.url));}
  }
  for(const [i,p] of pages.entries()){
    if(p.metadataOutsideHead)add(`streamed-metadata-${i}`,'head 밖에서 전달된 메타 정보','review','수집 HTML의 head 밖에서 제목 또는 설명 값을 관측했습니다. 해당 값을 보존해 중복 비교에 사용했습니다.','프레임워크의 메타데이터 스트리밍 여부와 렌더링 후 head, 검색엔진 URL 검사 결과를 확인합니다. SVG title은 페이지 제목에서 제외합니다.',[p.url]);
    const canonicals=p.canonicals.map(c=>{try{return new URL(c,p.url).href;}catch{return '';}});
    if(canonicals.length>1||canonicals.some(c=>!c))add(`canonical-${i}`,'대표 URL 선언 확인','action',`canonical ${p.canonicals.length}개: ${p.canonicals.join(' · ').slice(0,800)}`,'문서 head에 유효한 대표 URL을 일관되게 선언합니다.',[p.url]);
    else if(canonicals[0]&&canonicals[0].replace(/#.*$/,'')!==p.url.replace(/#.*$/,''))add(`canonical-target-${i}`,'다른 URL을 대표로 선언','review',`수집 URL ${p.url} → canonical ${canonicals[0]}`,'의도한 중복 문서 통합인지 확인합니다. 외부 도메인·홈페이지로 향한다고 자동 오류로 판정하지 않습니다.',[p.url]);
    if(p.noindex)add(`noindex-${i}`,'색인 제외 선언','review','수집 HTML의 robots/googlebot 메타에서 noindex 또는 none을 관측했습니다.','검색에 공개할 페이지인지 운영 의도를 확인합니다. 비공개·광고 전용 페이지라면 유지할 수 있습니다.',[p.url]);
    if(!p.twitterCard)add(`twitter-${i}`,'소셜 카드 선언 확인','review','수집 HTML에서 twitter:card 값을 감지하지 못했습니다.','X 공유를 사용할 때 카드 유형과 제목·이미지를 확인합니다. 검색 순위의 필수 조건으로 보지 않습니다.',[p.url]);
    if(p.jquery.length)add(`jquery-${i}`,'jQuery 선언 버전','review',`스크립트 URL 관측: ${p.jquery.join(' · ')}`,'운영자가 사용 중인 플러그인 호환성과 공식 보안 공지를 확인합니다. URL만으로 실제 실행 버전·취약점을 확정할 수 없습니다.',[p.url]);
    if(p.analytics.length)add(`analytics-${i}`,'분석 태그 선언','review',`${p.analytics.join(' · ')} 식별 신호 관측. ${p.analytics.includes('UA')?'Universal Analytics 흔적이 남아 있습니다. ':''}태그 설치·실제 이벤트 전송 성공은 별도입니다.`,'동의 설정과 GA4 DebugView·실시간 보고서에서 방문·전환 이벤트를 확인합니다. GTM 컨테이너 내부 태그는 이 검사로 알 수 없습니다.',[p.url]);
    if(p.backgroundCandidates)add(`background-${i}`,'배경 이미지의 정보 전달 확인','review',`인라인 배경 이미지 중 자체 텍스트·aria-label이 없는 요소 ${p.backgroundCandidates}개. 외부 CSS는 검사하지 않았습니다.`,'장식 이미지라면 조치가 필요하지 않습니다. 진료·상품 설명이 이미지에만 있다면 같은 내용을 접근 가능한 본문으로 제공합니다.',[p.url]);
    if(p.medicalRelevant&&!p.medical.length&&!p.medicalEvidence?.entities.length)add(`medical-missing-${i}`,'의료기관 엔터티 검토','review','제목·H1 또는 기관 정보에서 의료기관 관련 표현을 관측했지만 이 HTML에서 해당 시설·의료인 엔터티를 감지하지 못했습니다.','실제 의료기관 사이트인지 먼저 확인합니다. 해당할 때 공개된 기관·의료진 정보에 맞는 Schema.org 유형을 적용합니다. 다른 페이지의 선언·렌더링 후 내용은 별도 확인합니다.',[p.url]);
    for(const [j,m] of p.medical.entries()){
      const missing=m.fields.filter(f=>f.state==='missing').map(f=>f.label),refs=m.fields.filter(f=>f.state==='reference').map(f=>f.label);
      add(`medical-${i}-${j}`,`${m.type} · ${m.name||'이름 미감지'}`,missing.length||refs.length?'review':'observed',`기관·의료진 식별 속성 관측. ${missing.length?`미감지: ${missing.join(', ')}. `:''}${refs.length?`참조 대상 확인 필요: ${refs.join(', ')}.`:''}${!missing.length&&!refs.length?'점검한 식별 속성을 모두 감지했습니다.':''}`,'이 목록은 정보 연결을 위한 보완 후보이며 모든 속성이 Schema.org 필수값이라는 뜻은 아닙니다. 원문과 일치하는 이름·주소·연락처·진료 분야만 기재하고, 의료진 직함·소속·자격은 실제 공개 근거로 연결합니다. 한의사·의사 구분, 진료 사실·면허는 운영자가 검증합니다.',[p.url]);
    }
  }
  return findings.slice(0,50);
}
