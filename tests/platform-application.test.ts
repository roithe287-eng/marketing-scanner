import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {buildPlatformApplication,initialApplicationValues,applicationRoute,applicationHtml,platformApplicationBrief,APPLICATION_PLATFORMS} from '../lib/platformApplication';
import {buildPlatformApplicationDocument} from '../lib/platformApplicationDocument';
import {buildReportDocument} from '../lib/reportDocument';
import {buildPageEdits} from '../lib/reportExecution';
import PlatformApplicationPanel from '../components/report/PlatformApplicationPanel';
import {fixture} from './fixtures/report';
import type {AnswerContentPlan} from '../lib/answerContentSchema';
import {SITE_EDITING_SCOPE,APPLICATION_ASSET_SCOPE} from '../lib/siteEditingScope';

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
 assert.match(applicationRoute(model,'cafe24').scope,/참고 가이드/);assert.equal(JSON.stringify(r),before);
});
test('all five guides provide routes and keep unknown independent editors conditional',()=>{
 const model=buildPlatformApplication(makeReport());
 for(const p of APPLICATION_PLATFORMS){const route=applicationRoute(model,p.id);assert.ok(route.seo.path.length);assert.ok(route.hero.path.length);assert.ok(route.code.instruction);}
 const other=applicationRoute(model,'other');assert.equal(other.editor,undefined);assert.match(other.hero.scope,/미확인/);assert.match(other.code.instruction,/저장소·컴포넌트가 확인/);
 assert.equal(applicationRoute(model,'other','wordpress').editor,'wordpress');assert.equal(applicationRoute(model,'other','custom').editor,undefined);
 const wp=buildPlatformApplication(makeReport('<meta name="generator" content="WordPress">'));assert.equal(wp.initialPlatform,'other');assert.equal(wp.otherEditor,'wordpress');
 assert.match(applicationRoute(model,'godomall').hero.instruction,/치환코드/);assert.match(applicationRoute(model,'makeshop').hero.instruction,/가상태그/);
});
test('ready SEO values use own-page wording and before values are never generated from example copy',()=>{
 const r={...makeReport(),answerContentPlan:answerPlan()},model=buildPlatformApplication(r),values=initialApplicationValues(model);
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
 model=buildPlatformApplication(r);assert.equal(model.fields.find(f=>f.id==='cta')!.before,'예약신청');assert.equal(model.ctaUrl,'');assert.equal(applicationHtml(initialApplicationValues(model),[],model.ctaUrl).hasCta,false);
});
test('a consultation about purchase conditions keeps its consultation destination',()=>{
 const r=makeReport();r.exampleCopy={...r.exampleCopy,ctaText:'구매 조건 문의하기'};
 r.pageEvidence!.siteEditing=captureSiteEditing(load('<body><main><a href="/buy">구매하기</a><a href="/contact">문의하기</a></main></body>'),url,new Headers());
 const model=buildPlatformApplication(r);assert.equal(model.ctaUrl,'https://example.com/contact');
});
test('mismatched, legacy and truncated evidence cannot become complete current values or exact source paths',()=>{
 const r=makeReport('<meta name="generator" content="Cafe24">');
 const mismatch=buildPlatformApplication({...r,pageEvidence:{...r.pageEvidence!,requestedUrl:'https://elsewhere.example/'},answerContentPlan:answerPlan()});
 assert.equal(mismatch.hasEvidence,false);assert.equal(mismatch.detected.platform,undefined);assert.ok(mismatch.fields.every(f=>!f.before));assert.equal(mismatch.fields[0].value,'');assert.equal(mismatch.ctaUrl,'');assert.equal(mismatch.faqs.length,0);
 const clipped=buildPlatformApplication({...r,pageEvidence:{...r.pageEvidence!,metadataTruncated:{title:true,description:true}}});assert.equal(clipped.fields[0].value,'');assert.notEqual(clipped.fields[1].value,description);
 const legacy=buildPlatformApplication({...fixture,meta:{ogTitle:'다른 OG 제목'}});assert.equal(legacy.fields[0].before,'');assert.equal(legacy.fields[0].value,'');
 const wrongPlan=buildPlatformApplication({...r,answerContentPlan:{...answerPlan(),targetUrl:'https://example.com/another'}});assert.equal(wrongPlan.faqs.length,0);
});
test('only supported, sourced FAQ answers start included; unfilled and pending answers stay out of HTML',()=>{
 const model=buildPlatformApplication({...makeReport(),answerContentPlan:answerPlan()}),values=initialApplicationValues(model);
 assert.deepEqual(model.faqs.map(q=>q.included),[true,false]);const body=applicationHtml(values,model.faqs,model.ctaUrl);
 assert.equal(body.readyFaqs.length,1);assert.equal(body.omittedFaqs,1);assert.ok(!body.html.includes('실제 금액'));assert.ok(!body.html.includes('서비스 비용은'));
 assert.equal(applicationHtml(values,model.faqs.map(q=>({...q,included:true})),model.ctaUrl).readyFaqs.length,1);
 const noSource=answerPlan();noSource.questions[0].evidence=[];assert.equal(buildPlatformApplication({...makeReport(),answerContentPlan:noSource}).faqs[0].included,false);
});
test('portable HTML escapes every text/attribute, rejects active URLs and omits unresolved facts',()=>{
 const model=buildPlatformApplication(makeReport()),values={...initialApplicationValues(model),hero:'<img src=x onerror=alert(1)> & "제목"',intro:'[고객 정보]를 입력',cta:'안내 <script>문구</script>'};
 const body=applicationHtml(values,[], 'javascript:alert(1)');assert.match(body.html,/&lt;img/);assert.ok(!body.html.includes('<img'));assert.ok(!body.html.includes('onerror=alert(1)>'));assert.ok(!body.html.includes('<script>'));assert.ok(!body.html.includes('[고객 정보]'));assert.equal(body.hasCta,false);assert.equal(load(body.html)('h1').length,0);assert.equal(load(body.html)('script,form,iframe').length,0);
 const safe=applicationHtml({...values,intro:'설명'},[],'https://example.com/ask?a=1&b="two"');assert.equal(safe.hasCta,true);assert.ok(safe.html.includes('&amp;b='));assert.equal(applicationHtml(values,[],'https://user:secret@example.com/').hasCta,false);
});
test('icon buttons expose expansion state and the selected guide contains editable values and fallback copy controls',()=>{
 const r=makeReport('<meta name="generator" content="Godomall">'),$=load(renderToStaticMarkup(React.createElement(PlatformApplicationPanel,{report:r})));
 assert.equal($('.apply-platforms>button').length,5);assert.equal($('.apply-platforms>button[aria-expanded="true"]').length,1);assert.match($('.apply-platforms>button[aria-expanded="true"]').text(),/고도몰/);
 const controlled=$('.apply-platforms>button').first().attr('aria-controls')!;assert.equal($(`[id="${controlled}"]`).attr('hidden'),undefined);
 assert.equal($('.apply-fields textarea').length,5);assert.ok($('.apply-fields textarea').first().text().includes('실제 서비스'));assert.match($('.apply-finish').text(),/자동 저장되지/);
});
test('copy packages, document export and report PDF include the same default values and all platform guides',()=>{
 const r={...makeReport('<meta name="generator" content="MakeShop">'),answerContentPlan:answerPlan()},model=buildPlatformApplication(r),before=JSON.stringify(r),copy=platformApplicationBrief(model,'makeshop'),doc=buildPlatformApplicationDocument(r).map(b=>b.text).join('\n'),full=buildReportDocument(r).map(b=>b.text).join('\n');
 for(const f of model.fields){assert.ok(copy.includes(f.value));assert.ok(doc.includes(f.value));}
 for(const platform of APPLICATION_PLATFORMS)assert.ok(doc.includes(`${platform.label} 적용 가이드`));
 assert.ok(full.includes('플랫폼별 적용 패키지'));assert.ok(doc.includes(applicationHtml(initialApplicationValues(model),model.faqs,model.ctaUrl).html));assert.ok(copy.includes('확인 대기 · HTML 제외'));assert.equal(JSON.stringify(r),before);
});
test('application guidance limits reuse to authorized sites and its HTML never imports source theme assets',()=>{
 const r=makeReport('<link rel="stylesheet" href="https://fonts.cafe24.com/source-font.css"><script src="https://third-party.example/paid-theme.js"></script>'),model=buildPlatformApplication(r);
 const body=applicationHtml(initialApplicationValues(model),[],model.ctaUrl),$=load(body.html);
 assert.equal($('link,script,img,iframe,object,embed,source,video,audio').length,0);assert.ok(!body.html.includes('fonts.cafe24.com'));assert.ok(!body.html.includes('paid-theme.js'));assert.ok(!body.html.includes('@font-face'));
 const ui=renderToStaticMarkup(React.createElement(PlatformApplicationPanel,{report:r})),copy=platformApplicationBrief(model,'cafe24'),doc=buildPlatformApplicationDocument(r).map(b=>b.text).join('\n');
 for(const text of [ui,copy,doc]){assert.ok(text.includes(SITE_EDITING_SCOPE));assert.ok(text.includes(APPLICATION_ASSET_SCOPE));}
 for(const platform of ['cafe24','godomall','makeshop'] as const)assert.match(applicationRoute(model,platform).code.instruction,/이용·수정 권한/);
 assert.ok(!copy.includes('디자인을 복사해'));assert.ok(!copy.includes('스킨을 복사해'));
});
