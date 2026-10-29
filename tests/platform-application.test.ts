import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {buildPlatformApplication,applicationRoute,applicationTextReady,platformApplicationBrief,APPLICATION_PLATFORMS} from '../lib/platformApplication';
import {buildPlatformApplicationDocument} from '../lib/platformApplicationDocument';
import {buildReportDocument} from '../lib/reportDocument';
import {buildPageEdits} from '../lib/reportExecution';
import PlatformApplicationPanel from '../components/report/PlatformApplicationPanel';
import {fixture} from './fixtures/report';
import type {AnswerContentPlan} from '../lib/answerContentSchema';
import {readFileSync,readdirSync} from 'node:fs';
import {PDF_FONT} from '../lib/pdfLayout';

const url='https://example.com/service?item=1';
const title='브랜드 · 실제 서비스',description='실제 서비스의 포함 범위와 상담 절차를 안내합니다.';
function makeReport(head=''):MarketingReport{
 const html=`<html><head><title>${title}</title><meta name="description" content="${description}">${head}</head><body><nav><a href="/login">상담 회원 로그인</a></nav><main><section><h1 id="hero">실제 서비스 안내</h1><p>실제 서비스는 제공 범위와 진행 조건을 상담에서 확인합니다.</p><a href="/ask?kind=service" id="ask">상담 신청</a></section></main></body></html>`;
 return {...fixture,url,meta:{siteName:'브랜드'},exampleCopy:{heroHeadline:'고객 상황에 맞는 서비스 범위를 확인하세요',subHeadline:'제공 범위와 조건을 확인하고 상담을 신청하세요.',ctaText:'서비스 상담 신청',currentCtaText:'상담 신청'},pageEvidence:{version:1,requestedUrl:url,finalUrl:url,capturedAt:'2026-10-29T01:00:00Z',title,description,h1:['실제 서비스 안내'],h2:[],ctaButtons:['상담 신청'],bodyText:'실제 서비스는 제공 범위와 진행 조건을 상담에서 확인합니다.',bodyTruncated:false,siteEditing:captureSiteEditing(load(html),url,new Headers({'server':'cloudflare','x-vercel-id':'synthetic'}))}};
}
function answerPlan():AnswerContentPlan{
 const evidence={id:'p1',text:'실제 서비스는 제공 범위와 진행 조건을 상담에서 확인합니다.',kind:'body' as const,location:'본문'};
 return {version:1,source:'own-page',mode:'ai-assisted',targetUrl:url,observedAt:'2026-10-29T01:00:00Z',scope:'submitted-page',coverage:'partial',observation:'not-measured',notice:'가상 검증 자료',primaryKeyword:{term:'실제 서비스',evidence:[{...evidence,kind:'title',text:title}],confidence:'high',reason:'제목 원문'},secondaryKeywords:[],topicScope:'focused',questions:[
  {id:'q1',question:'서비스 범위는 어떻게 확인하나요?',intent:'scope',status:'supported',evidence:[evidence],missingFacts:[],draft:evidence.text,template:'[제공 범위]를 안내합니다.',placement:'본문 아래',steps:[]},
  {id:'q2',question:'서비스 비용은 얼마인가요?',intent:'price',status:'partial',evidence:[evidence],missingFacts:['가격과 적용 조건'],draft:'가격은 [실제 금액]입니다.',template:'[비용]을 확인하세요.',placement:'본문 아래',steps:[]},
 ]};
}
for(const [platform,head] of [
 ['cafe24','<script src="https://img.echosting.cafe24.com/js/app.js"></script>'],
 ['godomall','<script src="/data/skin/front/default/js/gd_common.js"></script>'],
 ['makeshop','<script src="https://www.makeshop.co.kr/js/shop.js"></script>'],
 ['imweb','<script src="https://cdn.imweb.me/app.js"></script>'],
] as const)test(`${platform}: active platform traces select its guide and survive report serialization`,()=>{
 const r=makeReport(head),model=buildPlatformApplication(MarketingReportSchema.parse(r));
 assert.equal(model.detected.platform,platform);assert.equal(model.initialPlatform,platform);
 assert.ok(applicationRoute(model,platform).sources.length);assert.equal(model.signals.find(s=>s.id==='cloudflare')!.kind,'delivery');
});
test('platform names, image hotlinks, lookalike domains and delivery servers do not identify a CMS',()=>{
 const r=makeReport('<meta name="description" content="imweb cafe24 makeshop godomall"><script src="https://makeshop.co.kr.evil.example/a.js"></script><img src="https://cdn.imweb.me/old.jpg"><img src="https://img.echosting.cafe24.com/product.jpg"><img src="https://godo.co.kr/image.jpg"><img src="https://makeshop.co.kr/product.jpg">');
 const model=buildPlatformApplication(r);assert.equal(model.detected.platform,undefined);assert.equal(model.initialPlatform,'other');assert.equal(model.otherEditor,'unknown');
 assert.deepEqual(model.signals.map(s=>s.kind),['delivery','delivery']);
});
test('multiple CMS traces stay uncertain; choosing a guide never rewrites captured detection',()=>{
 const r=makeReport('<meta name="generator" content="Godomall"><script src="https://cdn.imweb.me/app.js"></script>'),before=JSON.stringify(r),model=buildPlatformApplication(r);
 assert.equal(model.detected.candidates.length,2);assert.equal(model.detected.platform,undefined);assert.equal(model.initialPlatform,'other');
 assert.match(applicationRoute(model,'cafe24').scope,/카페24 선택 기준/);assert.equal(JSON.stringify(r),before);
});
test('all five guides provide routes and keep unknown independent editors conditional',()=>{
 const model=buildPlatformApplication(makeReport());
 for(const p of APPLICATION_PLATFORMS){const route=applicationRoute(model,p.id);assert.ok(route.seo.path.length);assert.ok(route.hero.path.length);assert.equal(route.guides.length,5);for(const g of route.guides){assert.ok(g.path.length);assert.equal(g.steps.length,3);assert.ok(g.check);for(const source of g.sources)assert.match(source.url,/^https:\/\//);}}
 const other=applicationRoute(model,'other');assert.equal(other.editor,undefined);assert.match(other.hero.scope,/미확인/);assert.match(other.guides.find(g=>g.id==='verification')!.path.join(' '),/운영 관리자/);
 assert.equal(applicationRoute(model,'other','wordpress').editor,'wordpress');assert.equal(applicationRoute(model,'other','custom').editor,undefined);
 const wp=buildPlatformApplication(makeReport('<meta name="generator" content="WordPress">'));assert.equal(wp.initialPlatform,'other');assert.equal(wp.otherEditor,'wordpress');
 assert.match(applicationRoute(model,'godomall').hero.instruction,/치환코드/);assert.match(applicationRoute(model,'makeshop').hero.instruction,/가상태그/);
});
test('ready SEO values use own-page wording and before values are never generated from example copy',()=>{
 const r={...makeReport(),answerContentPlan:answerPlan()},model=buildPlatformApplication(r),values=Object.fromEntries(model.fields.map(f=>[f.id,f.value]));
 assert.equal(values.title,title);assert.equal(values.description,description);
 const lackingTitle=buildPlatformApplication({...r,pageEvidence:{...r.pageEvidence!,title:'서비스 안내'}});assert.equal(lackingTitle.fields[0].value,'실제 서비스 | 브랜드');
 assert.equal(model.fields.find(f=>f.id==='hero')!.before,'실제 서비스 안내');assert.equal(model.fields.find(f=>f.id==='cta')!.before,'상담 신청');assert.equal(model.ctaUrl,'https://example.com/ask?kind=service');
 assert.equal(buildPageEdits(r)[1].after,values.title);assert.equal(buildPageEdits(r)[2].after,values.description);
});
test('a real booking action in navigation can supply the button URL, while account controls cannot',()=>{
 const r=makeReport('<meta name="generator" content="imweb">');
 r.exampleCopy={...r.exampleCopy,ctaText:'예약 신청하기'};
 r.pageEvidence!.siteEditing=captureSiteEditing(load('<html><body><header><nav><a href="/login">상담 회원 로그인</a><a href="/booking">진료 예약신청</a></nav></header></body></html>'),url,new Headers());
 const model=buildPlatformApplication(r);assert.equal(model.ctaUrl,'https://example.com/booking');assert.equal(model.fields.find(f=>f.id==='cta')!.before,'진료 예약신청');
 assert.ok(applicationRoute(model,'imweb').cta.path.includes('상단 디자인 편집'));
});
test('booking proposals never relabel tax-document requests or trust a mismatched generated current CTA',()=>{
 const r=makeReport();r.exampleCopy={...r.exampleCopy,ctaText:'예약 신청하기',currentCtaText:'연말정산 서류신청'};
 const capture=(body:string)=>captureSiteEditing(load(`<html><body>${body}</body></html>`),url,new Headers());
 r.pageEvidence!.siteEditing=capture('<main><a href="/tax">연말정산 서류신청</a></main><header><nav><a href="/reservation">진료 예약신청</a></nav></header>');
 let model=buildPlatformApplication(r);assert.equal(model.fields.find(f=>f.id==='cta')!.before,'진료 예약신청');assert.equal(model.ctaUrl,'https://example.com/reservation');
 r.pageEvidence!.siteEditing=capture('<main><a href="/tax">연말정산 서류신청</a></main>');r.pageEvidence!.ctaButtons=['연말정산 서류신청','예약신청'];
 model=buildPlatformApplication(r);assert.equal(model.fields.find(f=>f.id==='cta')!.before,'예약신청');assert.equal(model.ctaUrl,'');assert.match(platformApplicationBrief(model,'other'),/현재 버튼의 링크·전화·예약창 동작에서 확인/);
});
test('a consultation about purchase conditions keeps its consultation destination',()=>{
 const r=makeReport();r.exampleCopy={...r.exampleCopy,ctaText:'구매 조건 문의하기'};
 r.pageEvidence!.siteEditing=captureSiteEditing(load('<body><main><a href="/buy">구매하기</a><a href="/contact">문의하기</a></main></body>'),url,new Headers());
 const model=buildPlatformApplication(r);assert.equal(model.ctaUrl,'https://example.com/contact');
});
test('mismatched, legacy and truncated evidence cannot become complete current values or exact source paths',()=>{
 const r=makeReport('<meta name="generator" content="Cafe24">');
 const mismatch=buildPlatformApplication({...r,pageEvidence:{...r.pageEvidence!,requestedUrl:'https://elsewhere.example/'},answerContentPlan:answerPlan()});
 assert.equal(mismatch.hasEvidence,false);assert.equal(mismatch.detected.platform,undefined);assert.ok(mismatch.fields.every(f=>!f.before));assert.equal(mismatch.fields[0].value,'');assert.equal(mismatch.ctaUrl,'');assert.equal('faqs' in mismatch,false);
 const clipped=buildPlatformApplication({...r,pageEvidence:{...r.pageEvidence!,metadataTruncated:{title:true,description:true}}});assert.equal(clipped.fields[0].value,'');assert.notEqual(clipped.fields[1].value,description);
 const legacy=buildPlatformApplication({...fixture,meta:{ogTitle:'다른 OG 제목'}});assert.equal(legacy.fields[0].before,'');assert.equal(legacy.fields[0].value,'');
 const wrongPlan=buildPlatformApplication({...r,answerContentPlan:{...answerPlan(),targetUrl:'https://example.com/another'}});assert.equal(wrongPlan.fields[0].value,title);
});
test('verified installation routes separate page SEO fields from search-tool authentication tags',()=>{
 const model=buildPlatformApplication(makeReport());
 const expected={cafe24:'검색엔진 서비스 연결',godomall:'외부서비스 설정',makeshop:'HEAD 입력란',imweb:'Header Code 상단'};
 for(const [platform,location] of Object.entries(expected)){
  const route=applicationRoute(model,platform as keyof typeof expected),verification=route.guides.find(g=>g.id==='verification')!;
  assert.ok(verification.path.join(' → ').includes(location));assert.match(verification.steps.join(' '),/소유 확인/);
  assert.ok(!route.seo.path.join(' → ').includes(location));
 }
 assert.match(applicationRoute(model,'godomall').guides.find(g=>g.id==='verification')!.steps.join(' '),/PC·모바일/);
 assert.match(applicationRoute(model,'imweb').guides.find(g=>g.id==='verification')!.steps.join(' '),/본문 텍스트 위젯에는 넣지/);
});
test('guidance retains all five expandable platform buttons without a template generator or extra notices',()=>{
 const r=makeReport('<meta name="generator" content="Godomall">'),$=load(renderToStaticMarkup(React.createElement(PlatformApplicationPanel,{report:r})));
 assert.equal($('.apply-platforms>button').length,5);assert.equal($('.apply-platforms>button[aria-expanded="true"]').length,1);assert.match($('.apply-platforms>button[aria-expanded="true"]').text(),/고도몰/);
 const controlled=$('.apply-platforms>button').first().attr('aria-controls')!;assert.equal($(`[id="${controlled}"]`).attr('hidden'),undefined);
 assert.equal($('.apply-setup-card').length,5);assert.equal($('.apply-field').length,5);assert.match($('.apply-value').first().text(),/실제 서비스/);
 assert.equal($('.apply-preview,.apply-code,.apply-faqs,.apply-usage-scope,style,script,iframe').length,0);assert.equal($('textarea').length,0);
 assert.equal($('a[href="#report-view-overview-questions"]').length,1);
});
test('installation instructions escape collected content without replaying its scripts or theme',()=>{
 const r=makeReport('<link rel="stylesheet" href="https://fonts.cafe24.com/source-font.css"><script src="https://third-party.example/paid-theme.js"></script>');
 r.exampleCopy.heroHeadline='<img src=x onerror=alert(1)> 제목';
 const html=renderToStaticMarkup(React.createElement(PlatformApplicationPanel,{report:r})),$=load(html);
 assert.ok(html.includes('&lt;img'));assert.equal($('img,script,iframe,style,link').length,0);assert.ok(!html.includes('source-font.css'));assert.ok(!html.includes('paid-theme.js'));
 assert.equal(applicationTextReady('[실제 내용]을 입력'),false);
});
test('copied instructions and the full PDF retain matching installation steps without exported page HTML',()=>{
 const r=makeReport('<meta name="generator" content="MakeShop">'),model=buildPlatformApplication(r),before=JSON.stringify(r),copy=platformApplicationBrief(model,'makeshop'),doc=buildPlatformApplicationDocument(r).map(b=>b.text).join('\n'),full=buildReportDocument(r).map(b=>b.text).join('\n');
 for(const f of model.fields){assert.ok(copy.includes(f.value));assert.ok(doc.includes(f.value));}
 for(const p of APPLICATION_PLATFORMS){assert.ok(doc.includes(`${p.label} 설정·설치 방법`));for(const g of applicationRoute(model,p.id).guides)for(const step of g.steps)assert.ok(doc.includes(step));}
 for(const g of applicationRoute(model,'makeshop').guides)for(const step of g.steps)assert.ok(copy.includes(step));
 assert.ok(full.includes('호스팅별 설정·설치 방법'));
 for(const text of [copy,doc])assert.doesNotMatch(text,/<section|<style|@font-face|저작권|라이선스|본문 HTML|추가 구역/);
 assert.equal(JSON.stringify(r),before);
});
test('web, Pocket and PDF use system rendering with no bundled or downloaded font dependency',()=>{
 const root=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')),pocket=JSON.parse(readFileSync(new URL('../consumer-app/package.json',import.meta.url),'utf8'));
 assert.ok(!root.dependencies.pretendard);assert.ok(!pocket.dependencies.pretendard);assert.equal(PDF_FONT,'system-ui, sans-serif');assert.ok(readFileSync(new URL('../next.config.js',import.meta.url),'utf8').includes("font-src 'none'"));
 for(const path of ['../app/layout.tsx','../app/globals.css','../tailwind.config.ts','../components/ContentProtection.tsx','../consumer-app/src/main.tsx','../consumer-app/src/style.css','../public/logo.svg']){
  assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),/next\/font|@font-face|fonts\.cafe24|fonts\.google|fonts\.gstatic|[Pp]retendard|\.(woff2?|ttf|otf)\b/);
 }
 const publicFiles=readdirSync(new URL('../public',import.meta.url),{recursive:true});assert.ok(!publicFiles.some(p=>/\.(woff2?|ttf|otf)$/i.test(String(p))));
 assert.doesNotMatch(readFileSync(new URL('../components/CompetitorComparison.tsx',import.meta.url),'utf8'),/getFaviconUrl|google\.com\/s2\/favicons|<img/);
});
