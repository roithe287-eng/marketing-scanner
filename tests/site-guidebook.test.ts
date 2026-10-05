import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {buildSiteGuide,editingPlatform,editorRoute,elementLink,guideInstruction} from '../lib/siteGuidebook';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {SiteEditingSchema} from '../lib/siteEditingSchema';
import {Guidebook,SiteGuideProvider} from '../components/report/SiteGuidebook';
import {buildSiteGuidebookDocument,guidebookRequests} from '../lib/siteGuidebookDocument';
import {executionBrief,buildExecutionPlan} from '../lib/reportExecution';
import {buildExecutableRewrites,rewriteInstruction} from '../lib/keywordExecution';
const url='https://example.com/service?type=brand';
const html='<!doctype html><html><head><title>브랜드 서비스</title><meta name="description" content="실제 범위를 확인하세요"><script src="https://cdn.imweb.me/app.js"></script></head><body><header><a href="/">메뉴</a></header><main id="main"><h1 id="hero">실제 대표 제목</h1><p>운영 범위와 제공 조건을 안내합니다.</p><h2>검증 사례</h2><p>담당자 확인이 필요한 후기입니다.</p><a id="ask" href="/contact">상담 예약</a><img src="/a.png" alt="서비스 화면"><p hidden>비공개 단서</p><script>숨겨진 명령</script></main></body></html>';
function report(source=html):MarketingReport{return {...fixture,url,pageEvidence:{version:1,requestedUrl:url,finalUrl:url,capturedAt:'2026-10-05T03:00:00Z',title:'브랜드 서비스',description:'실제 범위를 확인하세요',h1:['실제 대표 제목'],h2:['검증 사례'],ctaButtons:['상담 예약'],bodyText:'운영 범위와 제공 조건을 안내합니다.',bodyTruncated:false,siteEditing:captureSiteEditing(cheerio.load(source),url,new Headers({'server':'cloudflare','x-vercel-id':'test'}))}};}
test('capture maps actual DOM locations before mutation and distinguishes CMS from delivery hints',()=>{
 const r=report(),s=r.pageEvidence!.siteEditing!,$=cheerio.load(html);
 assert.equal(SiteEditingSchema.safeParse(s).success,true);assert.equal(editingPlatform(r).platform,'imweb');
 assert.equal(s.signals.find(x=>x.id==='vercel')!.kind,'delivery');
 assert.ok(s.elements.some(e=>e.text==='실제 대표 제목'&&e.selector==='#hero'));
 for(const e of s.elements)assert.equal($(e.selector).length,1);
 assert.ok(!s.elements.some(e=>/비공개|숨겨진/.test(e.text)));
 assert.ok(s.elements.find(e=>e.text==='상담 예약')!.href?.endsWith('/contact'));
 assert.equal(MarketingReportSchema.parse(r).pageEvidence?.siteEditing?.elements.length,s.elements.length);
});
test('a CMS name in content or an unrelated asset is never enough to claim its admin paths',()=>{
 const r=report('<html><head></head><body><h1>WordPress imweb cafe24 Shopify Wix</h1><script src="https://imweb.me.evil.example/app.js"></script></body></html>');
 assert.equal(editingPlatform(r).platform,undefined);
 const g=buildSiteGuide(r,{title:'검색 제목'});assert.ok(g.route.scope.includes('미확인'));assert.ok(!g.route.path.includes('디자인 모드'));
 const both=report(html.replace('</head>','<meta name="generator" content="WordPress"></head>'));
 assert.equal(editingPlatform(both).platform,undefined);assert.equal(editingPlatform(both).candidates.length,2);
});
test('long menus cannot consume heading and body slots; captures stay bounded and escape markup',()=>{
 const r=report('<html><body>'+Array.from({length:120},(_,i)=>`<a href="/${i}">메뉴 ${i}</a>`).join('')+'<main><h1 id="dup">본문 제목</h1><p id="dup">&lt;img onerror=alert(1)&gt; '+('긴 문장 '.repeat(500))+'</p></main></body></html>');
 const s=r.pageEvidence!.siteEditing!;assert.ok(s.elements.length<=100);assert.equal(s.elementsTruncated,true);
 const target=s.elements.find(e=>e.tag==='p')!;assert.equal(target.truncated,true);assert.ok(target.selector!=='#dup');
 const output=renderToStaticMarkup(React.createElement(SiteGuideProvider,{report:r,children:React.createElement(Guidebook,{title:'본문 수정',keyword:'img'})}));
 assert.ok(output.includes('&lt;img'));assert.ok(!output.includes('<img onerror'));
});
test('guides use exact word evidence and safe same-page links; mismatched or legacy data cannot invent positions',()=>{
 const r=report(),g=buildSiteGuide(r,{title:'반복 표현',keyword:'운영',proposal:'실제 운영 범위를 기재'});
 assert.equal(g.targets.length,1);assert.ok(g.targets[0].text.includes('운영 범위'));assert.equal(g.steps.length,5);
 const cta=buildSiteGuide(r,{title:'CTA 버튼'});assert.equal(cta.targets[0].text,'상담 예약');assert.ok(!cta.targets.some(e=>e.text==='메뉴'));
 assert.ok(elementLink(url,g.targets[0])?.includes('type=brand#:~:text='));
 assert.equal(elementLink('javascript:alert(1)',g.targets[0]),null);
 assert.equal(buildSiteGuide(r,{title:'없는 표현',keyword:'절대없는문구'}).targets.length,0);
 const other={...r,url:'https://another.example.com/'};assert.equal(buildSiteGuide(other,{title:'대표 제목'}).targets.length,0);assert.equal(editingPlatform(other).platform,undefined);
 assert.equal(buildSiteGuide({...r,pageEvidence:undefined},{title:'H1 부재'}).hasCapture,false);
});
test('effect evidence has an explicit boundary and routes match the actual page class',()=>{
 const r=report(),g=buildSiteGuide(r,{title:'H1 개선'});
 assert.ok(g.effect.sources.includes('headings'));assert.ok(g.effect.limit.includes('순위'));assert.ok(!g.effect.expected.includes('%'));
 assert.ok(editorRoute('shopify','title','https://shop.example/').path.includes('Preferences'));
 assert.ok(!editorRoute('shopify','title','https://shop.example/pages/service').path.includes('Preferences'));
 assert.ok(editorRoute('wordpress','description',url).instruction.includes('플러그인 이름·메뉴는 특정하지'));
 assert.ok(editorRoute('cafe24','description',url).instruction.includes('우선'));
});
test('all existing TO-BE families and copied briefs retain guide paths, evidence, effects and full proposals',()=>{
 const r=report(),requests=guidebookRequests(r),text=buildSiteGuidebookDocument(r).map(b=>b.text).join('\n');
 for(const title of ['대표 제목','검색 설명','메인 헤드라인','서브 헤드라인'])assert.ok(requests.some(x=>x.title===title));
 assert.ok(text.includes('공식 근거의 원리'));assert.ok(text.includes('디자인 모드'));assert.ok(text.includes('화면 캡처'));
 const plan=buildExecutionPlan(r);if(plan.tasks.length)assert.ok(executionBrief(r,plan.tasks).includes('기대효과 · 조건부'));
 const rewritten=buildExecutableRewrites(r).singles[0];if(rewritten)assert.ok(rewriteInstruction(rewritten).includes('편집 경로:'));
 const proposal='길어도 생략하지 않는 수정 지시. '.repeat(200);assert.ok(guideInstruction(buildSiteGuide(r,{title:'본문',proposal})).includes(proposal));
});

test('exact original text and selected duplicate location drive the editing fields',()=>{
 const r=report('<html><body><main><section id="service"><h2>서비스 소개</h2><a id="ask-one" href="/consult">상담 예약</a></section><section id="end"><h2>다음 단계</h2><a id="ask-two" href="/contact">상담 예약</a></section></main><footer><a href="/">홈</a></footer></body></html>');
 const first=buildSiteGuide(r,{title:'CTA 버튼',current:'상담 예약',proposal:'서비스 상담 신청'});
 assert.equal(first.matchMode,'exact');assert.equal(first.targets.length,2);assert.ok(first.location.includes('서비스 소개'));
 const second=buildSiteGuide(r,{title:'CTA 버튼',current:'상담 예약',selectedKey:first.targets[1].key});
 assert.ok(second.location.includes('다음 단계'));assert.equal(second.focus?.selector,'#ask-two');assert.ok(second.fields[1].before.endsWith('/contact'));
 assert.ok(!second.targets.some(e=>e.text==='홈'));assert.ok(guideInstruction(second).includes('수정 필드: 클릭 시 동작'));
});
test('missing H1 is not replaced with arbitrary H2 evidence; broad matches remain candidates',()=>{
 const r=report('<html><body><main><section><h2>서비스 안내</h2><p>구체적인 제공 범위</p></section></main></body></html>');
 const missing=buildSiteGuide(r,{title:'H1 태그 부재'});assert.equal(missing.targets.length,0);assert.equal(missing.matchMode,'missing');assert.equal(missing.nearby[0].tag,'h2');
 const generic=buildSiteGuide(r,{title:'본문 개선',current:'실제로는 없는 문장'});assert.equal(generic.matchMode,'candidate');assert.ok(generic.matchReason.includes('직접 일치를 확인하지 못해'));
});
test('selected Imweb source changes editor route across header, button, code and content widgets',()=>{
 const r=report('<html><head><script src="https://cdn.imweb.me/app.js"></script></head><body><header><div data-widget-type="inline_button"><a id="header-cta" href="/header">상담 문의</a></div></header><main><div data-widget-type="button"><a id="body-cta" href="/body">상담 문의</a></div><div data-widget-type="code"><a id="code-cta" href="/code">상담 문의</a></div><div data-widget-type="board"><a id="board-cta" href="/post">상담 문의</a></div></main></body></html>');
 const base=buildSiteGuide(r,{title:'CTA 버튼',current:'상담 문의'});
 for(const [selector,source,path] of [['#header-cta','imwebHeader','상단 디자인 편집'],['#body-cta','imwebButton','해당 버튼 위젯 → 버튼 추가·관리'],['#code-cta','imwebCode','우클릭 → 코드 설정'],['#board-cta','imwebWidget','위젯 설정 또는 연결된 콘텐츠 관리']] as const){
  const selected=base.targets.find(e=>e.selector===selector)!;assert.ok(selected);
  const g=buildSiteGuide(r,{title:'CTA 버튼',current:'상담 문의',selectedKey:selected.key});
  assert.ok(g.route.path.includes(path));assert.ok(g.route.sources.includes(source));
  assert.ok(guideInstruction(g).includes(path));assert.ok(g.fields[1].before.includes(selected.href!));
 }
 const code=base.targets.find(e=>e.selector==='#code-cta')!;
 assert.ok(!editorRoute('imweb','title',url,code).path.includes('우클릭 → 코드 설정'));
 assert.ok(!editorRoute('imweb','account',url,code).path.includes('디자인 모드'));
});
test('captures actual section, widget, image alt state and form labels without private input values',()=>{
 const r=report('<html><body><main><section id="offer"><h2>서비스 구성</h2><div id="widget1" data-widget-type="text"><p>제공 내용</p></div><img id="decor" src="/decor.png" alt=""><img id="missing" src="/detail.png"><form><label for="email">이메일</label><input id="email" value="PRIVATE_VALUE" required><input type="password" value="PRIVATE_PASSWORD"><input type="hidden" value="PRIVATE_TOKEN"></form></section></main></body></html>');
 const s=r.pageEvidence!.siteEditing!,p=s.elements.find(e=>e.text==='제공 내용')!;assert.equal(p.widget?.selector,'#widget1');assert.equal(p.section?.label,'서비스 구성');assert.equal(p.region,'main');
 assert.equal(s.elements.find(e=>e.selector==='#decor')!.attributes?.alt,'');assert.equal(s.elements.find(e=>e.selector==='#missing')!.attributes?.alt,undefined);
 const form=s.elements.find(e=>e.kind==='form')!;assert.equal(form.fields?.length,1);assert.equal(form.fields?.[0].label,'이메일');assert.equal(form.fields?.[0].required,true);assert.ok(!JSON.stringify(s).includes('PRIVATE_'));
 assert.equal(MarketingReportSchema.safeParse(r).success,true);
});
test('technical fields use actual settings and the effect matches OG, viewport and canonical separately',()=>{
 const r=report('<html><head><meta property="og:title" content="공유 제목"><meta name="viewport" content="width=980"><meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/main"><script type="application/ld+json">{"@type":"Organization","name":"회사"}</script></head><body><h1>제목</h1></body></html>');
 for(const [title,topic,value] of [['Open Graph','social','공유 제목'],['모바일 viewport','viewport','width=980'],['대표 URL','canonical','https://example.com/main'],['색인 제외','crawl','noindex'],['구조화 데이터','schema','Organization']]){
  const g=buildSiteGuide(r,{title});assert.equal(g.topic,topic);assert.ok(g.settings.some(s=>s.value.includes(value)));assert.ok(g.fields[0].before.includes(value));assert.equal(g.matchLabel,'실제 설정값 확인');
 }
 const account=buildSiteGuide(r,{title:'API 권한 확인',scope:'account',instructions:['개발자 계정의 API 사용 설정을 확인'],completion:'권한·사용량 확인'});assert.equal(account.targets.length,0);assert.ok(!account.route.path.includes('디자인 모드'));assert.equal(account.fields[0].done,'권한·사용량 확인');assert.ok(account.steps[2].detail.includes('개발자 계정'));
});
