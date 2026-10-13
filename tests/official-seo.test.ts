import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {websiteHttp} from '../lib/security/safeFetch';
import {extractWebsite,type ExtractedWebsiteData} from '../lib/extractWebsite';
import {analyzeOfficialSeo} from '../lib/analyzeOfficialSeo';
import {analyzeNaverOptimization} from '../lib/analyzeNaverOptimization';
import {captureSearchSignals} from '../lib/growthEvidence';
import {OFFICIAL_SEO_GUIDES} from '../lib/officialSeoCatalog';
import {MANUAL_SEO_TOPICS} from '../lib/officialSeoKnowledge';
import {inspectOfficialStructuredData} from '../lib/officialSeoStructuredData';
import {OfficialSeoAuditSchema} from '../lib/officialSeoSchema';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportInsights} from '../lib/reportInsights';
import {buildReportDocument} from '../lib/reportDocument';
import {diagnosisChecks} from '../lib/diagnosisComparison';
import {buildReadingSections,buildReadingPdfPages} from '../lib/reportReadingPdf';
import {buildInsightsPdfPages} from '../lib/reportInsightsPdf';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';
import OfficialSeoPanel from '../components/report/OfficialSeoPanel';
import {fixture} from './fixtures/report';
async function extract(t:TestContext,head='',body='',headers:Record<string,string>={},robots='User-agent: *\nAllow: /'){
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('/robots.txt')?new Response(robots):new Response(`<!doctype html><html lang="ko"><head><title>ACME</title><meta name="description" content="서비스 안내">${head}</head><body><h1>서비스</h1><p>서비스를 확인하고 원하는 상품과 정보를 찾아보세요.</p>${body}</body></html>`,{headers:{'content-type':'text/html',...headers}}));
 t.mock.method(globalThis,'fetch',async()=>new Response(robots));
 return extractWebsite('https://fixture.example/product');
}
const check=(d:ExtractedWebsiteData,id:string)=>analyzeOfficialSeo(d).checks.find(c=>c.id===id)!;
const json=(value:unknown)=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;

test('both captured sidebars are covered; an official English fallback is recorded; unrelated resources are excluded',()=>{
 const manifest=JSON.parse(readFileSync(new URL('./fixtures/official-seo-sidebar-20261013.json',import.meta.url),'utf8'));
 assert.equal(manifest.entries.length,221);assert.equal(new Set(OFFICIAL_SEO_GUIDES.map(g=>g.url)).size,221);
 assert.deepEqual(new Set(OFFICIAL_SEO_GUIDES.map(g=>g.url)),new Set(manifest.entries.map((g:{url:string})=>g.url)));
 assert.equal(OFFICIAL_SEO_GUIDES.filter(g=>g.engine==='naver').length,55);
 assert.equal(OFFICIAL_SEO_GUIDES.filter(g=>g.engine==='google').length,166);
 assert.equal(OFFICIAL_SEO_GUIDES.filter(g=>g.status==='unavailable').length,0);
 assert.ok(OFFICIAL_SEO_GUIDES.find(g=>g.url.includes('3035947'))?.reviewedUrl?.endsWith('?hl=en'));
 for(const g of OFFICIAL_SEO_GUIDES){assert.ok(MANUAL_SEO_TOPICS.some(t=>t.topic===g.topic));assert.ok(g.guidance.length&&g.applicability);assert.match(g.url,/^https:\/\/(searchadvisor.naver.com|developers.google.com|support.google.com)\//);assert.ok(!manifest.excludedResources.some((r:{url:string})=>r.url===g.url));}
});
test('required, optional, alternative and nested schema requirements stay distinct',()=>{
 const find=(id:string)=>OFFICIAL_SEO_GUIDES.find(g=>g.id===id)!;
 for(const type of ['organization','article'])assert.equal(find('google-appearance-structured-data-'+type).properties?.flatMap(p=>p.required).length,0);
 const software=find('google-appearance-structured-data-software-app');assert.ok(!software.properties?.flatMap(p=>p.required).includes('aggregateRating'));assert.ok(software.properties?.some(p=>p.conditional.some(v=>v.includes('또는'))));
 const returns=find('google-appearance-structured-data-return-policy');assert.equal(returns.properties?.flatMap(p=>p.required).length,0);assert.ok(returns.properties?.some(p=>p.conditional.some(v=>v.includes('방식 A'))));
 const naver=find('naver-structured-data-software');assert.deepEqual(naver.properties?.flatMap(p=>p.required),['name','applicationCategory']);
 assert.ok(find('naver-structured-data-video').properties?.some(p=>p.scope==='Channel'&&p.required.includes('mainEntityOfPage.dateCreated')));
});
test('body Googlebot noindex is effective, Googlebot-News/Yeti restrictions are not Google Web restrictions',async(t)=>{
 const d=await extract(t,'<meta name="yeti" content="noindex"><meta name="googlebot-news" content="noindex">','<meta name="googlebot" content="noindex">');
 assert.equal(check(d,'google-index').status,'action');assert.ok(captureSearchSignals(d)?.googleDirectives.includes('noindex'));
 const scoped={...d,officialSeoEvidence:{...d.officialSeoEvidence!,allRobotsMeta:[{agent:'yeti',content:'noindex'},{agent:'googlebot-news',content:'noindex'}]},seoEvidence:{...d.seoEvidence!,xRobotsTag:'bingbot: noindex, nofollow'}};
 assert.equal(check(scoped,'google-index').status,'observed');assert.equal(captureSearchSignals(scoped)?.googleDirectives.length,0);
 const snippets={...scoped,seoEvidence:{...scoped.seoEvidence,xRobotsTag:'googlebot: max-snippet:0, max-image-preview:none'}};
 assert.equal(check(snippets,'google-index').status,'observed');assert.equal(check(snippets,'google-snippet').status,'manual');
});
test('relative canonical is accepted for Google; HTTP conflicts, fragments and body placement are flagged',async(t)=>{
 const d=await extract(t,'<link rel="canonical" href="/product">');assert.equal(check(d,'google-canonical').status,'observed');assert.equal(analyzeNaverOptimization(d).checks.find(c=>c.id==='search-canonical')?.status,'action');
 const conflict={...d,officialSeoEvidence:{...d.officialSeoEvidence!,canonicalHeader:'<https://fixture.example/other>; rel="canonical"'}};assert.equal(check(conflict,'google-canonical').status,'action');
 for(const next of [{headCanonicals:['#fragment']},{canonicalOutsideHead:1}])assert.equal(check({...d,officialSeoEvidence:{...d.officialSeoEvidence!,...next}},'google-canonical').status,'action');
 const absent={...d,officialSeoEvidence:{...d.officialSeoEvidence!,headCanonicals:[]}};assert.equal(check(absent,'google-canonical').status,'manual');
});
test('resource rules use only the same origin, include scripts before removal, and respect bot groups',async(t)=>{
 const d=await extract(t,'<script src="/private/app.js"></script><link rel="stylesheet" href="https://cdn.example/private/style.css">','<img src="http://fixture.example/private/image.jpg" alt="상품">',{},'User-agent: Googlebot\nDisallow: /private\nUser-agent: Yeti\nAllow: /');
 assert.equal(d.officialSeoEvidence?.resources.length,3);assert.equal(check(d,'google-resources').status,'action');assert.match(check(d,'google-resources').evidence,/동일 출처 1개 · 차단 1개/);assert.equal(check(d,'naver-resources').status,'observed');
});
test('decorative alt, no hreflang and relative Google favicon are not blanket failures',async(t)=>{
 const d=await extract(t,'<link rel="icon" href="/favicon.png">','<img src="/decoration.png" alt=""><a href="#section">절</a><a href="/contact"><img src="/logo.png" alt="연락처"></a>');
 assert.equal(check(d,'image-source').status,'observed');assert.equal(check(d,'hreflang').status,'manual');assert.equal(check(d,'google-favicon').status,'manual');assert.equal(check(d,'naver-favicon').status,'action');
 assert.equal(d.officialSeoEvidence?.links.hashRoutes,0);assert.equal(d.officialSeoEvidence?.links.emptyText,0);
});
test('invalid hreflang address and hash routing are observable without inventing reciprocal checks',async(t)=>{
 const d=await extract(t,'<link rel="alternate" hreflang="en" href="/en/product">','<a href="#!/product">상품</a><a href="javascript:openProduct()">상품</a><a href="http://fixture.example/contact">문의</a>');
 assert.equal(check(d,'hreflang').status,'action');assert.equal(check(d,'html-links').status,'action');assert.equal(check(d,'naver-protocol').status,'action');assert.match(check(d,'hreflang').interpretation,/양방향/);
});
test('schema presence checks do not combine different entities or require both alternatives',async(t)=>{
 const d=await extract(t,json({'@graph':[{'@type':'Recipe',name:'요리 A'},{'@type':'Recipe',image:'/food.jpg'},{'@type':'SoftwareApplication',name:'App',offers:[{price:0}],review:{'@type':'Review',reviewRating:{ratingValue:5}}},{'@type':'Organization'}]}));
 const s=inspectOfficialStructuredData(d);assert.equal(s.issues.length,2);assert.ok(s.issues.some(x=>x.includes('image')));assert.ok(s.issues.some(x=>x.includes('name')));assert.ok(!s.issues.some(x=>x.includes('SoftwareApplication')));assert.ok(!s.issues.some(x=>x.includes('Organization')));
});
test('unresolved JSON-LD references defer validation and generic videos do not acquire Naver partner requirements',async(t)=>{
 const d=await extract(t,json({'@graph':[{'@type':'Product',name:'A',offers:{'@id':'#offer'}},{'@type':'VideoObject',name:'Video',thumbnailUrl:'/thumb.jpg',uploadDate:'2026-10-13T09:00:00+09:00'}]}));
 const s=inspectOfficialStructuredData(d);assert.equal(s.issues.length,0);assert.equal(s.partners,0);assert.equal(s.naverIssues.length,0);assert.ok(s.deferred.length);
 assert.equal(check(d,'naver-video-partner').status,'manual');assert.equal(check(d,'google-schema-fields').status,'manual');
});
test('Google 2MB boundary is separate from actual indexing and the snapshot remains bounded',async(t)=>{
 const d=await extract(t);assert.equal(check({...d,pageSizeBytes:2*1024*1024},'google-document-size').status,'observed');assert.equal(check({...d,pageSizeBytes:2*1024*1024+1},'google-document-size').status,'action');
 const audit=OfficialSeoAuditSchema.parse(analyzeOfficialSeo(d));assert.equal(new Set(audit.checks.map(c=>c.id)).size,audit.checks.length);assert.equal(audit.mode,'diagnosis');assert.equal(audit.checks.filter(c=>c.id.startsWith('review-')).length,22);
});
test('stored schema, tasks, comparison, report UI and full PDF preserve the new evidence and legal notice',async(t)=>{
 const d=await extract(t,'<link rel="canonical" href="#wrong">');const audit=analyzeOfficialSeo(d);
 const report=MarketingReportSchema.parse({...fixture,url:d.url,officialSeoAudit:audit});const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(report)));
 assert.deepEqual(restored.officialSeoAudit,audit);assert.ok(buildReportInsights(restored).tasks.some(x=>x.id==='official-google-canonical'));assert.ok(diagnosisChecks(restored).some(c=>c.key.includes('official:2026-10-13:google-canonical')));
 const ui=renderToStaticMarkup(React.createElement(OfficialSeoPanel,{audit,targetUrl:d.url}));assert.match(ui,/공식 검색 기준 재검증/);assert.match(ui,/전체 문서 기준/);assert.match(ui,/Google 대표 URL/);assert.match(ui,/교육 PDF 2종/);
 const text=buildReportDocument(restored).map(b=>b.text).join('\n');assert.match(text,/무료 영상/);assert.match(text,/merchantReturnLink/);assert.match(text,/3035947/);assert.match(text,/마지막 페이지 확인 문구/);assert.match(text,/진단 결과 이용 안내 및 책임 범위/);assert.match(text,/법정 권리/);
 const measure=(s:string,style:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.5:1)*style.size,0);
 const pages=[...buildReadingPdfPages(buildReadingSections(restored),measure),...buildInsightsPdfPages(restored,measure)];
 assert.ok(pages.length>10);for(const p of pages)for(const line of p.lines){assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom+.01);assert.ok(line.x+line.width<=744.01);}
 assert.ok(pages.flatMap(p=>p.lines).some(l=>l.href?.includes('structured-data/return-policy')));
});
test('legacy reports expose a guide, never freshly inferred observed passes',()=>{
 const report=analyzeOfficialSeo(null,fixture.url);assert.equal(report.mode,'guide');assert.ok(report.checks.every(c=>c.status==='manual'));
 const old=MarketingReportSchema.parse(fixture);assert.equal(old.officialSeoAudit,undefined);assert.ok(!diagnosisChecks(old).some(c=>c.key.startsWith('official:')));
});


test('short valid pages remain analyzable while wholly empty responses are rejected',async(t)=>{
 const d=await extract(t);assert.ok(d.bodyTextLength<50);assert.equal(analyzeOfficialSeo(d).mode,'diagnosis');
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('<html><head></head><body></body></html>',{headers:{'content-type':'text/html'}}));
 await assert.rejects(()=>extractWebsite('https://fixture.example/empty'),/콘텐츠를 추출하지 못했습니다/);
 t.mock.method(websiteHttp,'fetch',async(input:string|URL)=>String(input).endsWith('/robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('<h1>짧지만 유효한 안내</h1>',{headers:{'content-type':'text/html'}}));
 const minimal=await extractWebsite('https://fixture.example/minimal');assert.equal(minimal.h1[0],'짧지만 유효한 안내');
});
