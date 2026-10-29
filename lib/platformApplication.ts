import type {MarketingReport} from './reportSchema';
import type {PageElement,PlatformId} from './siteEditingSchema';
import {editingEvidence,editingPlatform,editorRoute,PLATFORM_NAMES} from './siteGuidebook';
import {safeHttpUrl} from './citationMeasurement';
import {canonicalPage} from './geoComparison';
import {GUIDE_SOURCES} from './guideKnowledge';

export const APPLICATION_REVIEWED_AT='2026-10-29';
export const APPLICATION_PLATFORMS=[
 {id:'cafe24',label:'카페24',icon:'C24'},
 {id:'godomall',label:'고도몰',icon:'G'},
 {id:'makeshop',label:'메이크샵',icon:'M'},
 {id:'imweb',label:'아임웹',icon:'im'},
 {id:'other',label:'기타·독립몰',icon:'</>'},
] as const;
export type ApplicationPlatform=typeof APPLICATION_PLATFORMS[number]['id'];
export type OtherEditor='unknown'|'wordpress'|'shopify'|'wix'|'custom';
export type ApplicationField={id:'title'|'description'|'hero'|'intro'|'cta';label:string;before:string;value:string;basis:string;check:string;focus?:PageElement};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
export const hasUnfilledFacts=(value:string)=>/\[[^\]\n]+\]|\{\{[^}]+\}\}/.test(value);
export const applicationTextReady=(value:string)=>!!value.trim()&&!hasUnfilledFacts(value);

function intendedAction(text:string):RegExp|undefined{
 // "신청" alone cannot distinguish an appointment from a tax-document request.
 // Prefer the final specific action (e.g. 구매 조건 문의 → 문의) before generic 신청.
 const actions=[...text.matchAll(/예약|접수|상담|문의|견적|구매|결제|장바구니|다운로드|구독|contact|consult|book|checkout|buy|download|subscribe/gi)];
 const action=actions.at(-1)?.[0]||'';
 if(/예약|접수|book/i.test(action))return /예약|접수|book/i;
 if(/상담|문의|견적|contact|consult/i.test(action))return /상담|문의|견적|contact|consult/i;
 if(/구매|결제|장바구니|checkout|buy/i.test(action))return /구매|결제|장바구니|checkout|buy|cart/i;
 if(/다운로드|download/i.test(action))return /다운로드|download/i;
 if(/구독|subscribe/i.test(action))return /구독|subscribe/i;
 if(/신청|청약|지원|apply|enroll/i.test(text))return /신청|청약|지원|apply|enroll/i;
 return undefined;
}

/** Derived from the frozen report: no extra crawl, admin probing or model call. */
export function buildPlatformApplication(report:MarketingReport){
 const page=editingEvidence(report),detected=editingPlatform(report),elements=page?.siteEditing?.elements||[];
 const plan=page&&report.answerContentPlan&&canonicalPage(report.answerContentPlan.targetUrl)===canonicalPage(page.finalUrl)?report.answerContentPlan:undefined;
 const keyword=plan?.primaryKeyword;
 const groundedKeyword=keyword&&keyword.confidence!=='low'&&!/^(상담|안내|문의|신청|예약|서비스|상품|프로그램)$/.test(keyword.term)&&keyword.evidence.some(e=>e.kind!=='product'&&clean(e.text).includes(clean(keyword.term)))?keyword.term:'';
 const brand=clean(report.meta?.siteName||'');
 const titleComplete=page&&!page.metadataTruncated?.title&&page.title.length<600?clean(page.title):'';
 const descriptionComplete=page&&!page.metadataTruncated?.description&&page.description.length<1600?clean(page.description):'';
 const hasTopicAndBrand=titleComplete&&groundedKeyword&&brand&&titleComplete.includes(groundedKeyword)&&titleComplete.includes(brand);
 const seoTitle=hasTopicAndBrand?titleComplete:groundedKeyword&&brand&&!hasUnfilledFacts(brand)?(groundedKeyword.includes(brand)?groundedKeyword:`${groundedKeyword} | ${brand}`):titleComplete;
 const introSource=elements.find(e=>e.kind==='text'&&!e.truncated&&!['nav','header','footer'].includes(e.region||'')&&e.text.length>=20&&e.text.length<=300);
 const ctas=elements.filter(e=>e.kind==='cta'&&!e.truncated&&e.region!=='footer'&&!/로그인|회원가입|개인정보|이용약관|마이페이지|log.?in|sign.?in/i.test(e.text));
 const intent=intendedAction(report.exampleCopy.ctaText)||intendedAction(report.sitePurpose?.goal.label||'');
 const matchingCtas=intent?ctas.filter(e=>intent.test(e.text)):[];
 const cta=matchingCtas.find(e=>e.text===report.exampleCopy.currentCtaText)||matchingCtas.find(e=>e.region==='main')||matchingCtas[0];
 const capturedCta=cta?.text||(intent?page?.ctaButtons.find(text=>intent.test(text)):'')||'';
 const fields:ApplicationField[]=[
  {id:'title',label:'검색 제목',before:page?.title||'',value:seoTitle,basis:seoTitle&&seoTitle!==titleComplete?'원문에서 확인한 주제·브랜드로 구성':seoTitle?'수집된 검색 제목 유지안':'작성할 원문 확인 필요',check:'이 URL의 주제·브랜드가 맞는지 확인하세요. 상품·개별 페이지 설정을 우선합니다.',focus:elements.find(e=>e.kind==='title')},
  {id:'description',label:'검색 설명',before:page?.description||'',value:descriptionComplete||introSource?.text||'',basis:descriptionComplete?'수집된 검색 설명 유지안':introSource?'수집된 본문 문장으로 구성':'작성할 원문 확인 필요',check:'실제 제공 범위·조건과 맞는지 확인하세요. 검색 결과의 표시 문구는 달라질 수 있습니다.',focus:elements.find(e=>e.kind==='description')},
  {id:'hero',label:'첫 화면 제목',before:page?.h1.join('\n')||'',value:report.exampleCopy.heroHeadline,basis:'진단 보고서의 문구 개선 초안',check:'새 제목을 추가하기보다 해당 대표 제목을 수정하세요. 성과·효능·자격 등 표현의 사실을 확인하세요.',focus:elements.find(e=>e.kind==='heading'&&e.tag==='h1')},
  {id:'intro',label:'첫 화면 소개',before:introSource?.text||'',value:report.exampleCopy.subHeadline,basis:'진단 보고서의 문구 개선 초안',check:'제공 대상과 범위가 실제 서비스와 맞는지 확인하세요. 원문 위치가 다르면 해당 소개 문장을 찾아 적용합니다.',focus:introSource},
  {id:'cta',label:'행동 버튼 문구',before:capturedCta,value:report.exampleCopy.ctaText,basis:'진단 보고서의 버튼 개선 초안',check:'제안한 행동과 목적이 맞는 버튼 하나의 문구·주소를 대조하세요. 예약과 서류 신청처럼 목적이 다르면 바꾸지 않습니다. 맞는 링크를 수집하지 못하면 연결 주소를 직접 확인하세요.',focus:cta},
 ];
 const isNamed=APPLICATION_PLATFORMS.some(p=>p.id===detected.platform);
 const initialPlatform:ApplicationPlatform=isNamed?detected.platform as ApplicationPlatform:'other';
 const otherEditor:OtherEditor=['wordpress','shopify','wix'].includes(detected.platform||'')?detected.platform as OtherEditor:detected.platform===undefined?'unknown':'custom';
 return {url:safeHttpUrl(page?.finalUrl||report.url)||'',capturedAt:page?.capturedAt,hasEvidence:!!page,detected,initialPlatform,otherEditor,fields,ctaUrl:safeHttpUrl(cta?.href||'')||'',signals:page?.siteEditing?.signals||[]};
}
export type PlatformApplication=ReturnType<typeof buildPlatformApplication>;
export type PlatformSetupGuide={id:string;title:string;path:string[];steps:string[];check:string;sources:{title:string;url:string}[]};

/** Explain existing admin settings; do not generate a page template or installer. */
export function applicationRoute(model:PlatformApplication,platform:ApplicationPlatform,other:OtherEditor=model.otherEditor){
 const editor:PlatformId|undefined=platform==='other'?(['wordpress','shopify','wix'].includes(other)?other as PlatformId:undefined):platform;
 const titleRoute=editorRoute(editor,'title',model.url),hero=editorRoute(editor,'heading',model.url,model.fields.find(f=>f.id==='hero')?.focus),cta=editorRoute(editor,'cta',model.url,model.fields.find(f=>f.id==='cta')?.focus),faq=editorRoute(editor,'ai',model.url);
 const seo={...titleRoute,path:titleRoute.path.map(part=>part==='페이지 제목'?'페이지 제목·설명':part)};
 const verification:Record<ApplicationPlatform,{path:string[];steps:string[];sources:{title:string;url:string}[]}>= {
  cafe24:{path:['쇼핑몰 설정','기본 설정 → 쇼핑몰 정보','검색 엔진 최적화(SEO)','기본설정 → 검색엔진 서비스 연결'],steps:['Search Console 또는 서치어드바이저에서 해당 도메인을 등록하고 소유 확인 메타 태그를 받습니다.','검색엔진 서비스 연결의 해당 입력란에 발급받은 태그를 입력하고 저장합니다.','발급한 검색도구로 돌아가 소유 확인을 실행합니다.'],sources:[GUIDE_SOURCES.cafe24Seo]},
  godomall:{path:['기본설정','기본정책','외부서비스 설정','외부 스크립트 등록 → 상단 공통 영역'],steps:['검색도구에서 해당 도메인의 소유 확인 메타 태그를 받습니다.','외부 스크립트 등록에서 서비스명을 입력하고, 상단 공통 영역의 PC·모바일 입력란에 태그를 붙여 넣고 저장합니다.','해당 검색도구에서 소유 확인을 실행합니다.'],sources:[{title:'고도몰 · 검색도구 소유 확인',url:'https://godomall-help.nhn-commerce.com/beginner/search_engine/google'}]},
  makeshop:{path:['디자인','디자인 스킨 관리','디자인 편집하기','HEAD 입력란'],steps:['검색도구에서 해당 도메인의 소유 확인 메타 태그를 받습니다.','해당 사이트의 디자인 편집 화면에서 HEAD 입력란의 기존 태그를 확인하고, 발급받은 소유 확인 태그를 추가해 저장합니다.','태그를 발급한 검색도구에서 소유 확인을 실행합니다.'],sources:[GUIDE_SOURCES.makeshopDesign]},
  imweb:{path:['설정','SEO','고급 설정 → 공통 코드 삽입','Header Code 상단'],steps:['검색도구에서 해당 도메인의 소유 확인 메타 태그를 받습니다.','Header Code 상단에 소유 확인 태그를 입력하고 저장합니다. 본문 텍스트 위젯에는 넣지 않습니다.','해당 검색도구에서 소유 확인을 실행합니다.'],sources:[{title:'아임웹 · 공통 코드 입력 위치',url:'https://imweb.me/qna?mode=faq&q=71387'}]},
  other:{path:['현재 사이트의 운영 관리자','사이트 인증·검색도구 연결 설정'],steps:['사용 중인 관리 도구에서 사이트 인증 입력란이 있는지 확인합니다.','입력란이 있으면 검색도구에서 발급받은 태그를 등록합니다. 입력란이 없으면 도메인 관리자의 DNS 인증 방법을 확인합니다.','검색도구의 소유 확인 결과를 확인합니다.'],sources:[{title:'Google · 사이트 소유 확인',url:'https://support.google.com/webmasters/answer/9008080'}]},
 };
 const routeSources=(ids:typeof seo.sources)=>ids.map(id=>GUIDE_SOURCES[id]);
 const guides:PlatformSetupGuide[]=[
  {id:'seo',title:'검색 제목·설명 설정',path:seo.path,steps:['진단한 URL과 같은 페이지의 SEO 설정을 엽니다. 상품 상세라면 해당 상품의 개별 설정을 선택합니다.','아래 수정값의 검색 제목과 설명을 각각 입력하고 저장합니다.',seo.instruction],check:'같은 URL을 다시 열어 제목·설명이 반영됐는지 재진단합니다.',sources:routeSources(seo.sources)},
  {id:'hero',title:'첫 화면 문구 변경',path:hero.path,steps:['해당 URL의 첫 화면에서 현재 제목·소개 문구가 있는 항목을 찾습니다.','아래 수정값 중 첫 화면 제목과 소개를 해당 문구 입력란에 각각 넣습니다.',hero.instruction],check:'PC·모바일 미리보기에서 문구와 줄바꿈을 확인한 뒤 게시합니다.',sources:routeSources(hero.sources)},
  {id:'cta',title:'버튼 문구·연결 설정',path:cta.path,steps:[model.fields.find(f=>f.id==='cta')?.before?`현재 “${model.fields.find(f=>f.id==='cta')!.before}” 버튼의 설정을 엽니다.`:'실제 페이지에서 변경할 버튼 하나를 먼저 선택합니다.','버튼 문구를 입력하고 기존 링크·전화·예약창 연결 중 실제 동작을 대조합니다.',cta.instruction],check:'버튼을 눌러 의도한 화면이나 동작으로 이어지는지 확인합니다.',sources:routeSources(cta.sources)},
  {id:'faq',title:'질문·답변 등록',path:faq.path,steps:['보고서의 고객 질문·답변에서 사용할 내용을 확인합니다.','해당 페이지의 텍스트·FAQ 입력 항목에 질문과 답변을 각각 등록합니다. 비용·조건처럼 빠진 정보는 실제 운영 내용으로 채웁니다.','저장 후 PC·모바일에서 질문과 답변을 읽을 수 있는지 확인하고 게시합니다.'],check:'질문·답변이 실제 페이지 본문에 반영됐는지 확인합니다.',sources:routeSources(faq.sources)},
  {id:'verification',title:'검색도구 인증 태그 설치',...verification[platform],check:'Search Console 또는 서치어드바이저에서 해당 도메인이 소유 확인 완료로 표시되는지 확인합니다.'},
 ];
 const sources=[...new Map(guides.flatMap(g=>g.sources).map(source=>[source.url,source])).values()];
 const label=APPLICATION_PLATFORMS.find(p=>p.id===platform)!.label;
 return {label,editor,seo,hero,cta,faq,guides,sources,scope:platform===model.initialPlatform&&model.detected.platform?`${PLATFORM_NAMES[model.detected.platform]} 감지 기준`:`${label} 선택 기준`,checks:['변경 전 입력값을 기록합니다.','해당 URL에만 적용했는지 확인합니다.','게시 후 같은 URL에서 내용과 동작을 확인하고 재진단합니다.']};
}

export function platformApplicationBrief(model:PlatformApplication,platform:ApplicationPlatform,other=model.otherEditor){
 const route=applicationRoute(model,platform,other);
 return [`마케팅스캐너 · ${route.label} 설정·설치 방법`,`대상 URL: ${model.url}`,`감지 결과: ${model.detected.label}`,route.scope,...route.guides.map(g=>`${g.title}\n입력 위치: ${g.path.join(' → ')}\n${g.steps.map((step,i)=>`${i+1}. ${step}`).join('\n')}\n완료 확인: ${g.check}`),'입력할 수정값',...model.fields.map(f=>`${f.label}\n현재: ${f.before||'실제 화면에서 확인'}\n입력할 값: ${f.value||'실제 내용으로 작성'}\n확인: ${f.check}`),`버튼 연결: ${model.ctaUrl||'현재 버튼의 링크·전화·예약창 동작에서 확인'}`,...route.sources.map(s=>`${s.title}: ${s.url}`)].join('\n\n');
}
