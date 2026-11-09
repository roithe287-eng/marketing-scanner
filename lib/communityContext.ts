import {z} from 'zod';
import type {CheerioAPI} from 'cheerio';
import type {WebsitePurpose} from './websitePurpose';
import {pageRegion} from './pageRegions';

const clean=(s:string,max=600)=>s.replace(/\s+/g,' ').trim().slice(0,max);
const publicLink=z.string().max(2048).url().refine(value=>{try{const u=new URL(value);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password;}catch{return false;}});
const evidence=z.object({text:z.string().max(600),locator:z.string().max(1000)});
const link=z.object({label:z.string().max(120),url:publicLink,role:z.enum(['board','discussion','join','participate','subscribe','secondary']),targetObserved:z.boolean().optional()});
export const CommunityPageSchema=z.object({
  url:publicLink,title:z.string().max(300),pageType:z.enum(['home','board','discussion']),
  description:z.string().max(600),headings:z.array(z.string().max(180)).max(5),
  authorObserved:z.boolean(),dateObserved:z.boolean(),discussionObserved:z.boolean(),
  schemaTypes:z.array(z.string().max(80)).max(12),capturedAt:z.string().datetime(),
});
export const CommunityContextSchema=z.object({
  version:z.literal(1),pageType:z.enum(['home','board','discussion']),
  evidence:z.array(evidence).max(6),navigation:z.array(link).max(18),
  pages:z.array(CommunityPageSchema).max(4),
  attempts:z.array(z.object({url:publicLink,status:z.enum(['observed','blocked','unavailable']),note:z.string().max(300)})).max(3),
  note:z.string().max(1000),
});
export type CommunityContext=z.infer<typeof CommunityContextSchema>;
export type CommunityPage=z.infer<typeof CommunityPageSchema>;
const boardLabel=/^(?:커뮤니티|포럼|자유게시판|게시판|정보공유|질문\s*(?:답변|게시판)|질문과\s*답변|Q\s*&\s*A|forum|community|discussions?|questions?)(?:\s*(?:새글|더보기))?$/i;
const joinLabel=/^(?:무료\s*)?(?:회원\s*가입|가입\s*하기|가입|sign\s*up|join(?:\s+(?:us|now))?)$/i;
const participateLabel=/^(?:질문|답변|댓글|글)\s*(?:쓰기|작성|등록|남기기|하기)|^(?:질문하기|글쓰기|새\s*글\s*쓰기|post\s+(?:a\s+)?(?:question|reply)|reply)$/i;
const subscribeLabel=/^(?:.{0,12}\s)?(?:뉴스레터\s*)?구독(?:하기|\s*신청)?$|^subscribe$/i;
const secondaryLabel=/^(?:마케팅\s*)?(?:교육|강의|대행\s*의뢰|대행의뢰|의뢰하기|광고\s*문의|광고상품|채용|온라인\s*교육|오프라인\s*교육)(?:\s*신청)?$/;
const discussionPath=/\/(?:ab-\d+-\d+|(?:posts?|topics?|threads?|questions?|discussions?)\/[^/]+|t\/[^/]+\/\d+)\/?$/i;
const boardPath=/\/(?:ab-\d+|(?:forum|community|boards?|bbs|questions|discussions)(?:\/[^/?]+)?)\/?$/i;
export function isDiscussionUrl(value:string){try{const u=new URL(value);return discussionPath.test(u.pathname)||['wr_id','article_no','post_id','topic_id','document_srl'].some(k=>u.searchParams.has(k));}catch{return false;}}

/** Only read public board/article GET routes; account and write links are observations, never crawl targets. */
export function communityPageUrl(value:string,base:string):string|null{
  if(!value.trim()||value.startsWith('#'))return null;
  let u:URL;try{const root=new URL(base);u=new URL(value,base);if(!/^https?:$/.test(u.protocol)||u.username||u.password||u.protocol!==root.protocol||u.port!==root.port||u.hostname.replace(/^www\./,'')!==root.hostname.replace(/^www\./,''))return null;u.hash='';}catch{return null;}
  if(/(?:^|[\/_.-])(?:auth|api|exec|protected|account|cart|basket|mypage|myshop|order|checkout|login|logout|signout|signup|sign[-_]?in|register|member|write|edit|delete|remove|report|vote|like|download|attachment|unsubscribe|payment|admin)(?:[\/_.-]|$)/i.test(u.pathname))return null;
  if(/\.(?:xml|txt|json|pdf|zip|png|jpe?g|gif|svg|webp|mp4|css|js)$/i.test(u.pathname))return null;
  for(const [key,value] of [...u.searchParams]){
    if(/^(?:utm_.+|fbclid|gclid)$/i.test(key)){u.searchParams.delete(key);continue;}
    if(!/^(?:id|idx|page|bo_table|wr_id|board_no|article_no|post_id|topic_id|document_srl|mid)$/i.test(key)||!/^[\w-]{1,80}$/.test(value))return null;
  }
  return u.href;
}

function schemaTypes($:CheerioAPI){
  const result=new Set<string>();
  const walk=(value:unknown,depth=0)=>{if(depth>12||result.size>=12||!value||typeof value!=='object')return;if(Array.isArray(value)){value.slice(0,100).forEach(v=>walk(v,depth+1));return;}const obj=value as Record<string,unknown>;for(const t of [obj['@type']].flat())if(typeof t==='string')result.add(t.replace(/^https?:\/\/schema.org\//,'').slice(0,80));Object.values(obj).forEach(v=>walk(v,depth+1));};
  $('script[type="application/ld+json"]').slice(0,20).each((_,e)=>{const text=$(e).text();if(text.length>150000)return;try{walk(JSON.parse(text));}catch{/* Existing SEO audit reports syntax errors. */}});
  return [...result].slice(0,12);
}

export function captureCommunityPage($:CheerioAPI,url:string):CommunityPage{
  const types=schemaTypes($);
  const root=$('main,[role="main"],#container,#content').first();
  const body=(root.length?root:$('body')).clone();body.find('nav,header,footer,script,style,noscript,form').remove();
  const headings=body.find('h1,h2').toArray().map(e=>clean($(e).text(),180)).filter(Boolean).slice(0,5);
  const text=body.text();
  return CommunityPageSchema.parse({url,title:clean($('head > title').first().text(),300),description:clean($('meta[name="description" i]').attr('content')||$('meta[property="og:description"]').attr('content')||''),headings,
    pageType:isDiscussionUrl(url)||types.some(t=>/^(?:DiscussionForumPosting|QAPage)$/.test(t))?'discussion':new URL(url).pathname==='/'?'home':'board',
    authorObserved:body.find('[itemprop="author"],[rel="author"],.author,.writer,.nickname,.nick_name').length>0||/작성자|글쓴이/.test(text),
    dateObserved:body.find('time[datetime],[itemprop="datePublished"],[itemprop="dateModified"]').length>0||/20\d{2}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}/.test(text),
    discussionObserved:types.some(t=>/^(?:DiscussionForumPosting|QAPage|Comment|Answer)$/.test(t))||/댓글|답변|추천\s*수|조회\s*수/.test(text),schemaTypes:types,capturedAt:new Date().toISOString()});
}

/** Site identity + independent board structure, never an allowlist of brand domains. */
export function captureCommunityContext($:CheerioAPI,url:string):CommunityContext|undefined{
  const page=captureCommunityPage($,url);
  const h1=$('h1').map((_,e)=>clean($(e).text())).get();
  const primary=[page.title,page.description,...h1].join(' ');
  const identity=/커뮤니티|포럼|포털|community|\bforum\b|\bportal\b/i.test(primary);
  const titleFocus=[page.title,...h1].join(' ');
  const specificPage=/수강\s*신청|교육\s*과정|커리큘럼|상품\s*상세|강의\s*신청/.test(titleFocus)||(!identity&&page.schemaTypes.some(t=>/^(?:Course|Product|EducationalOccupationalProgram)$/.test(t)));
  if(specificPage)return;
  const links:CommunityContext['navigation']=[];
  $('a,button,[role="button"]').slice(0,2500).each((_,el)=>{
    const a=$(el);if(a.closest('[hidden],[aria-hidden="true"],template,noscript').length)return;
    const label=clean(a.text()||a.attr('aria-label')||'',120);if(!label)return;
    const actionOnly=joinLabel.test(label)||participateLabel.test(label)||subscribeLabel.test(label);
    let target:URL,targetObserved=true;try{const href=a.attr('href');if(!href||/^(?:javascript:|#)/i.test(href))throw new Error('control');target=new URL(href,url);if(!/^https?:$/.test(target.protocol)||target.username||target.password||target.href.length>2048)return;}catch{if(!actionOnly)return;target=new URL(url);targetObserved=false;}
    target.hash='';
    const chrome=['header','nav','footer'].includes(pageRegion($,el));
    const role=joinLabel.test(label)?'join':participateLabel.test(label)?'participate':subscribeLabel.test(label)?'subscribe':boardLabel.test(label)?'board':secondaryLabel.test(label)?'secondary':!chrome&&isDiscussionUrl(target.href)&&label.length>=14?'discussion':undefined;
    if(role&&!links.some(l=>l.url===target.href&&l.role===role))links.push({label,url:target.href,role,targetObserved});
  });
  const boards=links.filter(l=>l.role==='board'&&communityPageUrl(l.url,url));
  const posts=links.filter(l=>l.role==='discussion'&&communityPageUrl(l.url,url));
  const own=(l:CommunityContext['navigation'][number])=>new URL(l.url).hostname.replace(/^www\./,'')===new URL(url).hostname.replace(/^www\./,'');
  const participation=links.filter(l=>['join','participate'].includes(l.role)&&own(l));
  const declared=page.schemaTypes.some(t=>/^(?:DiscussionForumPosting|QAPage)$/.test(t));
  const structural=boards.length>=2&&posts.length>=3&&participation.length>0;
  const ownBoard=(boardPath.test(new URL(url).pathname)||isDiscussionUrl(url))&&boards.length>=2&&posts.length>=3;
  if(!declared&&!(identity&&structural)&&!(ownBoard&&participation.length&&/게시판|질문\s*답변|커뮤니티|포럼/.test(titleFocus)))return;
  const evidenceUnits=[{text:page.title,locator:'head > title'},{text:page.description,locator:'meta[name="description"]'},...h1.map(text=>({text,locator:'h1'}))].filter(e=>e.text).slice(0,6);
  const navigation=[...boards.slice(0,6),...participation.slice(0,3),...links.filter(l=>l.role==='subscribe').slice(0,2),...links.filter(l=>l.role==='secondary').filter((l,i,a)=>a.findIndex(x=>x.label===l.label)===i).slice(0,4),...posts.slice(0,3)].slice(0,18);
  return CommunityContextSchema.parse({version:1,pageType:page.pageType,evidence:evidenceUnits,navigation,pages:[page],attempts:[],note:'사이트 소개와 게시판·회원 참여 링크를 함께 확인한 커뮤니티 분류입니다. 게시글·광고·입점업체의 문구와 금액을 운영사의 상품·서비스로 해석하지 않습니다. 공개 페이지 표본만 확인하며 로그인 이후 기능, 회원 수·가입률·재방문율은 측정하지 않았습니다.'});
}

export function communityChecks(context:CommunityContext):WebsitePurpose['checks']{
  const observed=(roles:CommunityContext['navigation'][number]['role'][])=>context.navigation.filter(l=>roles.includes(l.role)).slice(0,3).map(l=>({text:l.label+(l.targetObserved===false?' · 문구 관측, 연결 URL 미확인':''),locator:l.url}));
  const docs=context.pages.filter(p=>p.pageType==='discussion');
  const checks:WebsitePurpose['checks']=[
    {id:'audience',label:'커뮤니티 대상·제공 가치',status:'observed',evidence:context.evidence.slice(0,3),guide:'운영사의 소개와 게시글 주제를 구분하세요. 첫 방문자가 어떤 정보를 찾고 누구와 교류하는 공간인지 대표 소개에서 이해할 수 있는지 확인하세요.'},
    {id:'navigation',label:'게시판 탐색·질문답변 연결',status:observed(['board']).length?'observed':'review',evidence:observed(['board']),guide:'주제별 게시판→글 상세→관련 글·질문답변 이동을 확인하세요. 전체검색·게시판 검색·정렬·페이지 이동은 PC·모바일에서 별도로 실행하고 검색 결과 클릭률을 측정하세요.'},
    {id:'participation',label:'회원가입·글쓰기·구독 동선',status:observed(['join','participate','subscribe']).length?'observed':'review',evidence:observed(['join','participate','subscribe']),guide:'비회원 열람→가입→첫 글·질문·댓글→재방문을 단계별로 점검하세요. 링크 감지를 가입 완료로 취급하지 말고 가입 완료·첫 참여·구독 완료를 별도 이벤트로 측정하세요. 게시글 제목 속 문의·신청은 운영사의 CTA가 아닙니다.'},
    {id:'source',label:'글 상세의 작성자·작성일·답변 구조',status:docs.length?'observed':'review',evidence:docs.slice(0,3).map(p=>({text:`${p.title} · 작성자 표시 ${p.authorObserved?'신호 확인':'미확인'} · 날짜 ${p.dateObserved?'신호 확인':'미확인'} · 댓글·답변 ${p.discussionObserved?'신호 확인':'미확인'} · JSON-LD ${p.schemaTypes.join(', ')||'미감지'}`,locator:p.url})),guide:'공개 글 상세에서 작성자·작성/수정일·원출처와 질문·답변·댓글의 구분을 대조하세요. 회원 작성 토론 글은 DiscussionForumPosting, 하나의 질문에 사용자가 답변을 추가할 수 있는 상세는 QAPage를 검토하세요. 운영사 칼럼·교육·목록에는 일괄 강제하지 않습니다. 표본 미확인은 사이트 전체의 부재를 뜻하지 않습니다.'},
    {id:'secondary',label:'교육·광고·대행 의뢰의 별도 전환',status:observed(['secondary']).length?'observed':'review',evidence:observed(['secondary']),guide:'교육 신청·광고 문의·대행 의뢰·채용은 커뮤니티 참여와 분리해서 목적·도착 URL·완료 이벤트를 관리하세요. 외부 교육 사이트나 입점업체 안내를 이 페이지의 자체 상품 판매로 합치지 않습니다.'},
    {id:'price',label:'커뮤니티와 유료 서비스의 적용 범위',status:'not_applicable',evidence:[],guide:'커뮤니티 메인에 상품 가격·배송·장바구니를 필수로 요구하지 않습니다. 교육비·광고비·입점 서비스 금액은 해당 서비스 상세에서 별도로 확인하세요.'},
    {id:'goal',label:'다음 행동 · 게시글 탐색·회원 참여',status:observed(['board','join','participate']).length?'observed':'review',evidence:observed(['board','join','participate']),guide:'게시판→글 열람→회원가입→질문·댓글 참여→재방문 흐름을 확인하세요. 회원가입 완료율·첫 참여율·재방문율은 실제 분석 계정에서 측정하고 페이지 점수로 추정하지 않습니다.'},
  ];
  return checks;
}

export const communityAnalysisText=(context:CommunityContext)=>[
  ...context.evidence.map(e=>e.text),
  ...context.navigation.filter(l=>l.role!=='discussion').map(l=>`${l.role}: ${l.label} · ${l.url}`),
  '공개 글 표본은 게시글 제목·작성자/날짜 표시·답변 구조만 관측합니다. 내용의 사실성·작성자 전문성은 미검증입니다.',
  ...context.pages.slice(1).map(p=>`${p.url} · ${p.title} · ${p.pageType}`),
].join('\n');
