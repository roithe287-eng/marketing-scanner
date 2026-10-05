import {matchGuideElements,matchingSettings,elementLocation,editFields} from './guideGrounding';
import type {MarketingReport} from './reportSchema';
import type {PageElement,PlatformId} from './siteEditingSchema';
import {canonicalPage} from './geoComparison';
import {safeHttpUrl} from './citationMeasurement';
import {GUIDE_EFFECTS,GUIDE_REVIEWED_AT,GUIDE_SOURCES,type GuideSourceId,type GuideTopic} from './guideKnowledge';

export const PLATFORM_NAMES:Record<PlatformId,string>={imweb:'아임웹',cafe24:'카페24',wordpress:'WordPress',shopify:'Shopify',wix:'Wix',nextjs:'Next.js',cloudflare:'Cloudflare',vercel:'Vercel'};
export type GuideRequest={title:string;proposal?:string;keyword?:string;topic?:GuideTopic;current?:string;evidence?:string;instructions?:string[];selectedKey?:string;scope?:'page'|'account';completion?:string};
export function editingEvidence(report:MarketingReport){const p=report.pageEvidence;return p&&canonicalPage(p.requestedUrl)===canonicalPage(report.url)&&safeHttpUrl(p.finalUrl)?p:undefined;}
export function editingPlatform(report:MarketingReport){
 const candidates=editingEvidence(report)?.siteEditing?.signals.filter(s=>s.kind==='cms')||[];
 return {candidates,platform:candidates.length===1?candidates[0].id:undefined,label:candidates.length===1?`${PLATFORM_NAMES[candidates[0].id]} 흔적 감지`:candidates.length>1?'여러 제작 도구 흔적 · 확인 필요':'제작 도구 미확인'};
}
export function guideTopic(title:string):GuideTopic {
 if(/Open Graph|오픈.?그래프|og[:_]|공유 미리보기/i.test(title))return 'social';
 if(/viewport|뷰포트/i.test(title))return 'viewport';
 if(/canonical|대표 URL|중복 URL/i.test(title))return 'canonical';
 if(/서브 헤드라인/i.test(title))return 'content';
 if(/대표 검색어와 페이지 주제/.test(title))return 'title';
 if(/측정|추적|이벤트|스크립트|태그 매니저|GA4|광고 계정/i.test(title))return 'measurement';
 if(/canonical|robots|사이트맵|색인|수집|대표 URL|내부 링크|접근/i.test(title))return 'crawl';
 if(/구조화|schema|json.ld/i.test(title))return 'schema';
 if(/속도|성능|모바일|CWV|LCP|INP|CLS/i.test(title))return 'speed';
 if(/이미지|\balt\b/i.test(title))return 'image';
 if(/검색 설명|메타 설명|description/i.test(title))return 'description';
 if(/검색 제목|\btitle\b|SEO 제목/i.test(title))return 'title';
 if(/H[1-6]|헤드라인|대표 제목|첫 화면|첫인상/i.test(title))return 'heading';
 if(/입력|제출|폼/i.test(title))return 'form';
 if(/CTA|버튼|전환|문의|구매/i.test(title))return 'cta';
 if(/신뢰|후기|사례|근거|출처|인증/i.test(title))return 'trust';
 if(/GEO|AEO|AI|답변|문답|FAQ/i.test(title))return 'ai';
 return 'content';
}
export function growthGuideTopic(id:string):GuideTopic|undefined {
 const map:Record<string,GuideTopic>={'google-crawl':'crawl','google-snippet':'crawl','naver-crawl':'crawl','title-heading':'title','canonical-links':'canonical','answer-content':'ai','first-party-proof':'trust','structured-data':'schema','google-ai-control':'ai','openai-crawl':'crawl','mobile-performance':'speed','measurement':'measurement','local-commerce':'content','ads-organic':'measurement'};
 return map[id];
}
type Route={path:string[];instruction:string;sources:GuideSourceId[];scope:string};
export function editorRoute(platform:PlatformId|undefined,topic:GuideTopic,url:string):Route {
 const seo=topic==='title'||topic==='description',heading=topic==='heading';
 let pathname='/';try{pathname=new URL(url).pathname;}catch{}
 const scope='공식 도움말 기준 경로입니다. 관리자에 접속해 확인한 값이 아니며 계정 권한·테마·버전에 따라 달라질 수 있습니다.';
 const field=topic==='title'?'페이지 제목':'페이지 설명';
 if(topic==='account')return {path:['담당 운영 계정','원래 진단의 계정별 실행 순서','설정·연동 상태 기록'],instruction:'페이지 편집 작업이 아닙니다. 아래 작업별 계정 화면에서 직접 확인하고 공개 HTML의 단서를 연동 성공으로 해석하지 않습니다.',sources:[],scope:'계정 내부 상태·메뉴는 직접 확인하지 않았습니다. 원래 항목의 공식 절차를 따라 실제 화면과 대조하세요.'};
 if(['crawl','schema','speed','measurement','viewport','canonical','social'].includes(topic))return {path:['해당 URL의 기술·태그 담당자','아래 수집 근거와 원래 작업 지시 확인','관련 CMS·템플릿·서버·분석 계정'],instruction:'아래 선택자는 공개 HTML의 위치입니다. 서버 파일명이나 관리자 메뉴를 뜻하지 않습니다. 실제 운영 구성을 확인한 뒤 원래 작업 지시와 함께 수정하세요.',sources:[],scope:'기술·계정 설정은 공개 HTML만으로 편집 경로를 확인할 수 없습니다.'};
 if(platform==='imweb'&&topic==='form')return {path:['디자인 모드','해당 페이지의 입력폼 위젯','우클릭 → 입력폼 설정','수정할 항목 선택'],instruction:'아래 수집된 항목명을 설정창에서 대조하고 레이블·필수 여부·버튼 텍스트를 수정합니다. 수신된 제출은 컨텐츠 관리 → 입력폼 관리에서 담당자가 확인합니다.',sources:['imwebForm'],scope};
 if(platform==='imweb')return seo?{path:['디자인 모드','메뉴 관리','입력 URL에 해당하는 메뉴의 설정',field],instruction:'공통 사이트 이름·설명보다 먼저 이 URL의 메뉴별 설정을 확인하세요. 입력 URL이 상품 상세라면 관리자 상품 편집의 SEO 제목·메타 설명 항목을 확인하세요.',sources:['imwebSeo'],scope}:{path:['디자인 모드','입력 URL에 해당하는 메뉴',topic==='cta'?'해당 버튼 위젯 → 버튼 추가·관리':'원문과 일치하는 위젯'],instruction:topic==='cta'?'해당 버튼의 문구와 클릭 시 동작을 함께 수정합니다. 전화·모달·링크 중 실제 의도한 동작과 맞추세요.':heading?'텍스트 위젯을 더블 클릭하고 단락 도구에서 적합한 제목 수준을 지정합니다. 글자 크기 변경과 H1 지정은 다릅니다.':topic==='image'?'해당 이미지 위젯의 설명 설정 지원 여부를 확인합니다. 메뉴가 없으면 위젯 종류와 원문 위치를 제작 담당자에게 전달하세요.':'텍스트 위젯이면 더블 클릭하여 원문을 찾습니다. 게시판·상품·폼 위젯이면 연결된 콘텐츠 관리 화면에서 수정해야 할 수 있습니다.',sources:[topic==='cta'?'imwebButton':topic==='image'?'imwebWidget':'imwebText'],scope};
 if(platform==='cafe24')return seo?{path:['쇼핑몰 설정','기본 설정 → 쇼핑몰 정보','검색 엔진 최적화(SEO)',pathname==='/'?'기본설정 → 공통 페이지 SEO 태그':'고급설정 → 개별 페이지 SEO 태그'],instruction:'상품·분류·게시판 URL이면 해당 관리 화면의 SEO 설정을 먼저 확인합니다. 주요·개별 페이지 설정이 공통 설정보다 우선합니다. 여러 URL에 일괄 덮어쓰지 마세요.',sources:['cafe24Seo'],scope}:{path:['디자인','디자인 보관함','적용 중인 디자인 확인 → 편집','해당 URL의 화면·원문 검색'],instruction:'디자인을 복사해 미리 확인하고, 아래 원문·선택자로 대상 모듈을 찾으세요. PC와 모바일 디자인이 별도인지 확인합니다. 파일명을 이 진단으로 확정할 수는 없습니다.',sources:['cafe24Design'],scope};
 if(platform==='wordpress')return {path:seo?['해당 페이지 편집','현재 설치된 SEO 기능·플러그인 확인',field]:['페이지 목록','입력 URL과 일치하는 페이지 편집','목록 보기 → 원문이 있는 블록'],instruction:seo?'SEO 플러그인과 테마를 감지하지 못했으므로 플러그인 이름·메뉴는 특정하지 않습니다. 제목·설명을 출력하는 기능을 담당자와 확인하세요.':heading?'제목 블록의 수준을 확인합니다. 테마가 이미 페이지 제목을 H1으로 출력하면 본문에 H1을 중복 추가하지 마세요.':'블록 편집기 기준 안내입니다. 다른 페이지 빌더가 적용돼 있으면 해당 빌더에서 같은 원문을 찾으세요. 헤더·푸터는 템플릿일 수 있습니다.',sources:seo?[]:[heading?'wordpress':'wordpressBlocks'],scope:seo?'SEO 기능·플러그인은 미확인입니다. 실제 설치된 편집 화면을 먼저 확인하세요.':scope};
 if(platform==='shopify')return seo?{path:pathname==='/'?['Online Store','Preferences','Social sharing image and SEO']:['해당 상품·페이지·컬렉션 관리','Search engine listing','Edit website SEO'],instruction:'홈은 공통 SEO, 개별 URL은 해당 콘텐츠의 검색 목록 항목에서 수정합니다. 페이지별 값이 다른 콘텐츠에 덮어써지지 않는지 확인하세요.',sources:['shopifySeo'],scope}:{path:['Online Store','Themes','테마 편집','페이지 선택 → 해당 섹션·블록'],instruction:'아래 원문이 있는 섹션의 제목·본문·버튼 설정을 찾으세요. 상품 원문은 Products, 일반 페이지 원문은 Pages에서 관리될 수 있습니다. 테마가 지원하지 않는 설정은 개발 담당자에게 전달합니다.',sources:['shopifyTheme'],scope};
 if(platform==='wix')return seo?{path:['사이트 에디터','페이지 및 메뉴','해당 페이지 → SEO basics',field],instruction:'일반 페이지 SEO 기준입니다. 동적 페이지나 상품이면 연결된 콘텐츠의 SEO 패널을 확인하세요.',sources:['wixSeo'],scope}:{path:['사이트 에디터','입력 URL의 페이지','원문과 일치하는 요소 선택'],instruction:'텍스트·버튼·이미지의 해당 속성을 편집하세요. 동적 콘텐츠는 연결된 컬렉션을 확인합니다. 요소별 메뉴와 테마는 실제 에디터에서 확인이 필요합니다.',sources:[],scope:'요소별 편집 경로는 실제 에디터 확인이 필요한 안내입니다. 계정 권한·테마·버전에 따라 달라질 수 있습니다.'};
 return {path:['운영 관리자·제작 담당자에게 해당 URL 전달',seo?'이 URL의 SEO 제목·설명 설정 찾기':'아래 원문·선택자로 콘텐츠 또는 템플릿 검색','해당 항목만 수정 → 미리보기'],instruction:seo?'HTML을 직접 관리한다면 이 URL을 출력하는 head의 title 또는 meta name="description" 값을 수정합니다. CMS 설정이 따로 있다면 코드 중복 삽입보다 기존 설정을 우선하세요.':'제작 도구가 확인되지 않았으므로 특정 관리자 메뉴나 소스 파일명은 제시하지 않습니다. 원문과 HTML 선택자를 전달해 실제 페이지를 출력하는 편집 위치부터 확인하세요.',sources:[],scope:'편집 도구 미확인 · 공개 페이지에서 찾은 위치만 연결합니다.'};
}
export function elementLink(url:string,e:PageElement){const safe=safeHttpUrl(url);if(!safe)return null;const u=new URL(safe);u.hash=e.anchor?encodeURIComponent(e.anchor):e.kind!=='title'&&e.kind!=='description'&&e.text&&!e.truncated?':~:text='+encodeURIComponent(e.text.slice(0,180)):'';return u.href;}
export function buildSiteGuide(report:MarketingReport,request:GuideRequest){
 const page=editingEvidence(report),capture=page?.siteEditing,topic=request.scope==='account'?'account':request.topic||guideTopic(request.title),platform=editingPlatform(report),url=safeHttpUrl(page?.finalUrl||report.url)||'',effect=GUIDE_EFFECTS[topic];
 const candidates=capture?.elements||[],word=request.keyword?.trim().toLowerCase();
 const matched=matchGuideElements(candidates,topic,request),targets=matched.targets,focus=matched.focus,settings=matchingSettings(capture,topic,request.title);
 const missing=!targets.length&&!settings.length;
 const nearby=missing&&['heading','content','trust','ai','cta','form'].includes(topic)?candidates.filter(e=>!['nav','header','footer'].includes(e.region||'')&&(e.kind==='heading'||e.kind==='text')).slice(0,1):[];
 const fields=topic==='account'?[{label:'운영 계정에서 확인할 작업',before:request.evidence||'계정 설정 미확인',action:request.instructions?.join('\n')||request.proposal||'해당 계정에서 원래 진단의 실행 절차를 확인하세요.',done:request.completion||'원래 진단의 완료 조건과 실제 계정 상태 대조'}]:editFields(topic,focus,settings),location=topic==='account'?'담당 운영 계정 · 내부 상태 미확인':focus?elementLocation(focus):settings.length?'페이지의 검색·공유 설정 / HTML 원본':'수정 위치 확인 필요';
 const route=editorRoute(platform.platform,topic,url);
 const technical:Partial<Record<GuideTopic,string>>={
 crawl:'이 URL을 공개할지 먼저 정합니다. 공개 대상의 robots.txt·robots 메타·응답 헤더·대표 URL·내부 링크 중 원래 진단이 지목한 항목만 수정합니다. 관리자·회원 정보의 접근 제한은 유지하고, 재수집 후 관리 도구의 상태를 별도로 확인합니다.',
 schema:'실제 페이지에 보이는 내용과 지원되는 구조화 데이터 유형을 대조합니다. 기존 JSON-LD가 있으면 그 원본을 수정하고 중복 삽입하지 않습니다. 현재 공식 규격과 검사 도구로 오류를 확인한 뒤 게시합니다.',
 speed:'실제 URL을 PageSpeed Insights에서 측정해 큰 이미지·스크립트·폰트 등 보고된 원인을 확인합니다. 원인이 확인된 리소스부터 수정하고 같은 기기 조건에서 다시 측정합니다. 실사용자 데이터와 실험실 결과를 분리합니다.',
 measurement:'원래 개선안의 이벤트를 클릭·입력 시작·완료로 구분하고 태그 담당자와 이름·발생 조건을 정합니다. 실제 페이지에서 테스트한 뒤 해당 계정의 디버그·실시간 화면에서 수신과 중복 발생을 확인합니다.',
 };
 const steps=topic==='account'?[
  {title:'담당 계정과 항목 확인',detail:`진단 대상 ${url||report.url}과 연결된 운영 계정에서 원래 점검 항목을 찾습니다. 스캐너는 해당 계정에 로그인하거나 설정 상태를 확인하지 않았습니다.`},
  {title:'현재 설정 기록',detail:request.evidence||'현재 설정·권한·연동 상태를 담당 계정에서 확인하고 기록하세요.'},
  {title:'계정별 작업 순서',detail:request.instructions?.join('\n')||request.proposal||'원래 진단의 공식 절차에 따라 확인하세요.'},
  {title:'완료 조건 대조',detail:request.completion||'원래 점검 항목의 완료 조건과 계정 화면·처리 결과를 대조하세요.'},
  {title:'검증 기록 남기기',detail:'확인 날짜·대상 계정·성공 또는 실패 상태를 남깁니다. 비밀번호·API 키 등 비밀값은 보고서에 넣지 않습니다.'},
 ]:[
  {title:'대상 페이지와 원문 확인',detail:`${url||report.url}을 열고 ${targets.length?`‘${location}’에서 선택된 원문과 현재 페이지를 대조하세요. 연결된 ${targets.length}개 요소 중 다른 위치를 바꿀 경우 원문 선택을 변경하세요.`:'수정할 위치를 먼저 확인하세요. 수집 범위에 없다는 이유만으로 요소가 없다고 단정하지 않습니다.'}${word?` 페이지 찾기에서 “${request.keyword}”를 검색하세요.`:''}`},
  {title:'수정할 편집 항목 열기',detail:route.path.join(' → ')+'. '+route.instruction},
  {title:'제안 적용 범위 정하기',detail:request.instructions?.length?request.instructions.join('\n'):technical[topic]|| (topic==='heading'?'대표 제목 문구와 실제 태그를 함께 확인합니다. 이미 H1이 있다면 새로 추가하기보다 적절한 기존 제목을 수정하고 하위 제목 관계를 유지하세요.':topic==='cta'?'바꿀 버튼 하나의 문구·목적지를 함께 정하고 다음 화면의 제목·필수 정보와 맞춥니다. 동일한 문구의 모든 버튼을 일괄 변경하지 마세요.':topic==='image'?'이미지를 정보·기능·장식으로 구분하고 그 목적에 맞는 대체 텍스트를 입력합니다. 이미지에 없는 정보나 키워드를 추가하지 마세요.':'아래 제안의 대괄호는 확인된 실제 정보로 채웁니다. 가격·성과·기간·예외 조건을 원문 및 실제 운영 내용과 대조하고 해당 항목에만 반영하세요.')},
  {title:'미리보기 후 게시·재검사',detail:`변경 전 값과 화면을 보관하고 PC·모바일 미리보기에서 내용·줄바꿈·동작을 확인하세요. 게시 후 같은 URL을 다시 열어 ${effect.check}합니다. 문제가 있으면 보관한 값으로 되돌립니다.`},
  {title:'기대효과를 실제 데이터로 확인',detail:`${effect.metric}를 기록합니다. 변경 전후의 기간 길이·URL·유입 채널·기기를 맞추고 광고·프로모션 변화도 메모하세요. 데이터가 부족하거나 비교 조건이 다르면 효과 판정을 보류합니다.`},
 ];
 return {title:request.title,proposal:request.proposal||'',topic,url,capturedAt:page?.capturedAt,platform,route,effect,targets,focus,settings,fields,location,matchMode:matched.mode,matchLabel:topic==='account'?'계정에서 직접 확인':settings.length?'실제 설정값 확인':matched.label,matchReason:topic==='account'?'공개 페이지의 원문 위치로 확인할 수 없는 작업입니다. 아래 계정별 절차를 따르세요.':settings.length?'수집한 설정값과 HTML 선택자를 연결했습니다. 실제 출력을 관리하는 설정 화면은 담당자가 대조해야 합니다.':matched.reason,nearby,missing,hasCapture:!!capture,steps,reviewedAt:GUIDE_REVIEWED_AT};
}
export type SiteGuide=ReturnType<typeof buildSiteGuide>;
export function guideInstruction(g:SiteGuide){return [`URL 맞춤 실행 가이드 · ${g.title}`,`대상: ${g.url||'유효 URL 미확인'}`,`제작 도구: ${g.platform.label}`,g.route.scope,`편집 경로: ${g.route.path.join(' → ')}`,g.route.instruction,`위치 연결: ${g.matchLabel} · ${g.matchReason}`,`선택한 위치: ${g.location}`,`선택한 원문: ${g.focus?.text||'선택 요소 없음'}`,...g.settings.map(s=>`설정 ${s.name}: ${s.value}\n위치 선택자: ${s.selector}`),...g.fields.map(f=>`수정 필드: ${f.label}\n현재: ${f.before}\n작업: ${f.action}\n완료 조건: ${f.done}`),...(g.targets.length>1?[`연결 원문 ${g.targets.length}개 중 기본 또는 선택한 원문을 아래에 표시합니다. 다른 위치를 수정하려면 보고서에서 원문 선택을 변경해 다시 복사하세요.`]:[]),...(g.focus?[g.focus]:[]).map(e=>`원문 (${e.tag}, HTML 순서 ${e.order}): ${e.text}\n위치 선택자: ${e.selector}${e.truncated?'\n발췌된 원문 · 전체 내용은 원문 확인':''}`),...(!g.targets.length&&!g.settings.length&&g.topic!=='account'?['일치하는 수집 요소 미확인 · 실제 페이지에서 위치 확인 후 적용']:[]),...g.steps.map((s,i)=>`${i+1}. ${s.title}\n${s.detail}`),`TO-BE · 적용 전 사실 확인: ${g.proposal||'원래 개선 지시와 실제 원문을 대조하세요.'}`,`공식 근거의 원리: ${g.effect.mechanism}`,`기대효과 · 조건부: ${g.effect.expected}`,`한계: ${g.effect.limit}`,`검증 지표: ${g.effect.metric}`,...[...new Set([...g.effect.sources,...g.route.sources])].map(id=>`${GUIDE_SOURCES[id].title}: ${GUIDE_SOURCES[id].url}`),`공식 문서 검토일: ${g.reviewedAt}`].join('\n\n');}
