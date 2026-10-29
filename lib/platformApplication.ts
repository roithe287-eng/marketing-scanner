import type {MarketingReport} from './reportSchema';
import type {PageElement,PlatformId} from './siteEditingSchema';
import {editingEvidence,editingPlatform,editorRoute,PLATFORM_NAMES} from './siteGuidebook';
import {safeHttpUrl} from './citationMeasurement';
import {canonicalPage} from './geoComparison';
import {GUIDE_SOURCES} from './guideKnowledge';
import {SITE_EDITING_SCOPE,APPLICATION_ASSET_SCOPE} from './siteEditingScope';

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
export type ApplicationValues=Record<ApplicationField['id'],string>;
export type ApplicationFaq={id:string;question:string;answer:string;missingFacts:string[];included:boolean;evidence:string[]};
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
export const hasUnfilledFacts=(value:string)=>/\[[^\]\n]+\]|\{\{[^}]+\}\}/.test(value);
export const applicationTextReady=(value:string)=>!!value.trim()&&!hasUnfilledFacts(value);
const htmlEscape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

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
 const faqs:ApplicationFaq[]=(plan?.questions||[]).map(q=>({id:q.id,question:q.question,answer:q.draft||q.template,missingFacts:q.missingFacts,evidence:q.evidence.map(e=>e.text),included:q.status==='supported'&&applicationTextReady(q.question)&&!!q.draft&&q.evidence.some(e=>e.kind==='body')&&!q.missingFacts.length&&!hasUnfilledFacts(q.draft)}));
 const isNamed=APPLICATION_PLATFORMS.some(p=>p.id===detected.platform);
 const initialPlatform:ApplicationPlatform=isNamed?detected.platform as ApplicationPlatform:'other';
 const otherEditor:OtherEditor=['wordpress','shopify','wix'].includes(detected.platform||'')?detected.platform as OtherEditor:detected.platform===undefined?'unknown':'custom';
 return {url:safeHttpUrl(page?.finalUrl||report.url)||'',capturedAt:page?.capturedAt,hasEvidence:!!page,detected,initialPlatform,otherEditor,fields,faqs,ctaUrl:safeHttpUrl(cta?.href||'')||'',signals:page?.siteEditing?.signals||[]};
}
export type PlatformApplication=ReturnType<typeof buildPlatformApplication>;
export function initialApplicationValues(model:PlatformApplication):ApplicationValues {return Object.fromEntries(model.fields.map(f=>[f.id,f.value])) as ApplicationValues;}

export function applicationRoute(model:PlatformApplication,platform:ApplicationPlatform,other:OtherEditor=model.otherEditor){
 const editor:PlatformId|undefined=platform==='other'?(['wordpress','shopify','wix'].includes(other)?other as PlatformId:undefined):platform;
 const titleRoute=editorRoute(editor,'title',model.url);
 const seo={...titleRoute,path:titleRoute.path.map(part=>part==='페이지 제목'?'페이지 제목·설명':part)},hero=editorRoute(editor,'heading',model.url,model.fields.find(f=>f.id==='hero')?.focus),cta=editorRoute(editor,'cta',model.url,model.fields.find(f=>f.id==='cta')?.focus);
 const code=platform==='imweb'?{path:['디자인 모드','해당 페이지','위젯 추가 → 코드','우클릭 → 코드 설정'],instruction:'아래 본문 HTML만 새 코드 위젯에 넣고 미리보기에서 확인하세요. 제목·설명 설정값은 코드 위젯에 넣지 않습니다. 기본 위젯에서 문구만 바꿀 수 있다면 위의 텍스트 수정을 먼저 사용하세요.'}:
 platform==='other'?{path:other==='wordpress'?['해당 페이지 편집','사용 중인 편집기의 HTML 블록 지원 확인']:other==='shopify'?['테마 편집','해당 페이지의 사용자 지정 HTML·Liquid 지원 확인']:other==='wix'?['사이트 에디터','HTML 삽입 기능 지원 확인']:['실제 페이지 편집 방식 확인','본문 HTML 삽입을 지원하는 영역'],instruction:'별도 추가 구역의 예시입니다. 기존 소스 전체 교체본이 아닙니다. Next.js 등 소스 편집 사이트는 담당 저장소·컴포넌트가 확인돼야 정확한 파일 수정본을 만들 수 있습니다. 지원되지 않으면 위의 문구를 기본 편집 요소에 나누어 넣으세요.'}:
 {path:hero.path,instruction:'해당 사이트에서 이용·수정 권한이 있는 스킨의 작업 화면에서 본문 구역을 추가할 때 사용하세요. 유료 스킨의 이용 조건과 기존 권리 표시는 유지합니다. 기존 페이지 전체나 상품·주문 모듈을 덮어쓰지 않습니다. 카페24 모듈·고도몰 치환코드·메이크샵 가상태그는 유지하세요. 별도 모바일 스킨이 있으면 함께 확인합니다.'};
 const sourceIds=[...new Set([...seo.sources,...hero.sources,...cta.sources,...(platform==='imweb'?['imwebCode' as const]:[])])];
 const label=APPLICATION_PLATFORMS.find(p=>p.id===platform)!.label;
 return {label,editor,seo,hero,cta,code,sources:sourceIds.map(id=>GUIDE_SOURCES[id]),scope:platform===model.initialPlatform&&model.detected.platform?`${PLATFORM_NAMES[model.detected.platform]} 흔적을 기준으로 선택했습니다. 실제 사용 플랫폼·스킨은 관리자에서 대조하세요.`:`${label} 이용 시 참고 가이드입니다. 이 버튼 선택으로 진단된 플랫폼이 바뀌지는 않습니다.`,checks:['권한 있는 사이트의 변경 전 문구와 설정을 기록합니다.','해당 URL만 수정했는지 확인하고 PC·모바일 미리보기를 엽니다.','문구·줄바꿈·버튼 연결을 확인한 뒤 게시합니다.','게시한 같은 URL을 재진단해 반영을 확인합니다. 검색·문의 성과는 실제 지표로 따로 비교합니다.']};
}

export function applicationHtml(values:ApplicationValues,faqs:ApplicationFaq[],ctaUrl:string){
 const readyFaqs=faqs.filter(q=>q.included&&applicationTextReady(q.question)&&applicationTextReady(q.answer));
 const lines=['<section lang="ko" style="max-width:960px;margin:24px auto;padding:24px;border:1px solid #dce4ee;border-radius:16px;background:#fff;color:#24364a;line-height:1.8;overflow-wrap:anywhere">'];
 // H2 is intentional for an additional section; the original hero's H1 is edited separately.
 if(applicationTextReady(values.hero))lines.push(`  <h2 style="font-size:1.5rem;line-height:1.5;margin:0 0 12px">${htmlEscape(values.hero)}</h2>`);
 if(applicationTextReady(values.intro))lines.push(`  <p style="white-space:pre-line;margin:0 0 16px">${htmlEscape(values.intro)}</p>`);
 if(readyFaqs.length){lines.push('  <h3 style="font-size:1.2rem;margin:24px 0 12px">자주 묻는 질문</h3>');for(const q of readyFaqs)lines.push(`  <details style="padding:12px 0;border-top:1px solid #dce4ee"><summary style="cursor:pointer;font-weight:700">${htmlEscape(q.question)}</summary><p style="white-space:pre-line;margin:12px 0 0">${htmlEscape(q.answer)}</p></details>`);}
 const href=safeHttpUrl(ctaUrl);
 if(href&&applicationTextReady(values.cta))lines.push(`  <a href="${htmlEscape(href)}" style="display:inline-block;max-width:100%;box-sizing:border-box;margin-top:20px;padding:12px 20px;border-radius:10px;background:#174c80;color:#fff;text-decoration:none;font-weight:700">${htmlEscape(values.cta)}</a>`);
 lines.push('</section>');
 return {html:lines.join('\n'),readyFaqs,omittedFaqs:faqs.length-readyFaqs.length,hasContent:applicationTextReady(values.hero)||applicationTextReady(values.intro)||!!readyFaqs.length||!!(href&&applicationTextReady(values.cta)),hasCta:!!(href&&applicationTextReady(values.cta))};
}

export function platformApplicationBrief(model:PlatformApplication,platform:ApplicationPlatform,values=initialApplicationValues(model),faqs=model.faqs,ctaUrl=model.ctaUrl,other=model.otherEditor){
 const route=applicationRoute(model,platform,other),body=applicationHtml(values,faqs,ctaUrl);
 return [`마케팅스캐너 · ${route.label} 적용 패키지`,`대상 URL: ${model.url}`,`감지 결과: ${model.detected.label}`,SITE_EDITING_SCOPE,APPLICATION_ASSET_SCOPE,route.scope,'관리자·스킨 버전에 따라 메뉴가 다를 수 있습니다. 원문과 현재 설정을 보관한 뒤 이 URL에만 적용하세요.',`검색 설정: ${route.seo.path.join(' → ')}\n${route.seo.instruction}`,`첫 화면 편집: ${route.hero.path.join(' → ')}\n${route.hero.instruction}`,`버튼 편집: ${route.cta.path.join(' → ')}\n${route.cta.instruction}`,...model.fields.map(f=>`${f.label} · ${applicationTextReady(values[f.id])?'사실 확인 후 적용':'작성 필요'}\n현재: ${f.before||'수집 원문 미확인'}\n적용 문구: ${values[f.id]||'입력 필요'}\n출처: ${f.value===values[f.id]?f.basis:'직접 다듬은 초안'}\n확인: ${f.check}`),`버튼 연결 주소: ${safeHttpUrl(ctaUrl)||'확인 필요 · HTML에서 버튼 제외'}`,...faqs.map(q=>`FAQ · ${q.included&&applicationTextReady(q.answer)&&applicationTextReady(q.question)?'HTML 포함':'확인 대기 · HTML 제외'}\nQ. ${q.question}\nA. ${q.answer}\n게시 전 확인: ${q.missingFacts.join(' / ')||'원문·현재 조건과 일치 여부'}`),`추가 구역 HTML 적용 위치: ${route.code.path.join(' → ')}\n${route.code.instruction}`,`본문 HTML · 제외된 FAQ ${body.omittedFaqs}개\n${body.hasContent?body.html:'사용할 문구 입력 필요'}`,'게시 후 확인',...route.checks.map(c=>'□ '+c),'문구·FAQ는 검토 초안입니다. 비용·성과·효능·법적 적합성은 자동 검증하지 않았습니다. 원본 파일 전체 교체·자동 설치·게시 완료를 의미하지 않습니다.',...route.sources.map(s=>`${s.title}: ${s.url}`),`플랫폼 가이드 확인일: ${APPLICATION_REVIEWED_AT}`].join('\n\n');
}
