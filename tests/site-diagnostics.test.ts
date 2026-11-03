import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureSiteDiagnosticSeed,buildSiteDiagnosticFindings,inspectCrawlerPolicies} from '../lib/siteDiagnostics';
import {collectSiteDiagnostics,diagnosticPageUrl,inspectSitemapXml} from '../lib/collectSiteDiagnostics';
import {SiteDiagnosticsSchema} from '../lib/siteDiagnosticsSchema';
import {websiteHttp} from '../lib/security/safeFetch';
import {budgetSignal} from '../lib/runtime/budget';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {buildSourceLibrary} from '../lib/reportContent';
import {reportHtml,reportMarkdown,exportReportText} from '../lib/exportReportText';
import SiteDiagnosticsPanel from '../components/report/SiteDiagnosticsPanel';
import {fixture} from './fixtures/report';

const url='https://clinic.example.com/';
const robots=(text='User-agent: *\nAllow: /')=>({url:url+'robots.txt',observedAt:'2026-11-03T00:00:00.000Z',status:'ok' as const,text});
const html=(title='의원 안내',description='기관별 진료 안내',body='')=>`<html><head><title>${title}</title><meta name="description" content="${description}"></head><body>${body}</body></html>`;

test('medical graph references are resolved per entity without fabricating names, credentials or US identifiers',()=>{
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'MedicalClinic','@id':'#clinic',name:'기관 A',url,address:{'@id':'#address'},telephone:'02-123-1234',medicalSpecialty:'https://schema.org/Dermatology'},
    {'@type':'PostalAddress','@id':'#address',streetAddress:'공개된 주소'},
    {'@type':'IndividualPhysician','@id':'#doctor',name:'의료진 B',practicesAt:{'@id':'#clinic'},address:{'@id':'#external-address'}},
    {'@type':'Person',name:'의료진 C',jobTitle:'한의사',worksFor:{'@id':'#clinic'}},
  ]};
  const page=captureSiteDiagnosticSeed(html('의원 안내','',`<script type="application/ld+json">${JSON.stringify(graph)}</script>`),url).page;
  assert.equal(page.medical.length,3);
  assert.ok(page.medical[0].fields.every(f=>f.state==='present'));
  assert.equal(page.medical[1].fields.find(f=>f.label.startsWith('주소'))?.state,'reference');
  assert.equal(page.medical[1].fields.find(f=>f.label.startsWith('소속'))?.state,'present');
  assert.equal(page.medical[2].fields.find(f=>f.label.startsWith('전문직'))?.state,'present');
  const findings=buildSiteDiagnosticFindings([page]);
  assert.match(findings.find(f=>f.id==='medical-0-1')!.evidence,/참조 대상 확인/);
  assert.ok(!JSON.stringify(findings).includes('usNPI'));
  assert.ok(!JSON.stringify(findings).includes('면허 인증 완료'));
});

test('nonmedical pages and PhD titles never receive a medical schema requirement',()=>{
  const page=captureSiteDiagnosticSeed(html('호주 투어 예약','여행 안내','<script type="application/ld+json">{"@type":"Person","name":"연구자","jobTitle":"Doctor of Philosophy"}</script>'),url).page;
  assert.equal(page.medicalRelevant,false);assert.deepEqual(page.medical,[]);
  assert.ok(!buildSiteDiagnosticFindings([page]).some(f=>f.id.startsWith('medical-')));
});

test('duplicate metadata compares distinct observed pages and treats empty metadata separately',()=>{
  const a=captureSiteDiagnosticSeed(html('같은 제목','같은 설명'),url).page;
  const b=captureSiteDiagnosticSeed(html(' 같은 제목 ','같은 설명'),url+'service').page;
  const empty=captureSiteDiagnosticSeed(html('',''),url+'contact').page;
  const findings=buildSiteDiagnosticFindings([a,b,empty]);
  assert.equal(findings.find(f=>f.id==='duplicate-title-0')?.urls.length,2);
  assert.deepEqual(findings.find(f=>f.id==='missing-title')?.urls,[empty.url]);
  assert.equal(buildSiteDiagnosticFindings([a]).find(f=>f.id==='duplicate-title')?.status,'review');
});

test('truncated metadata cannot turn a common prefix into a duplicate finding',()=>{
  const a=captureSiteDiagnosticSeed(html('공통'.repeat(300)+'A','설명'),url).page;
  const b=captureSiteDiagnosticSeed(html('공통'.repeat(300)+'B','설명'),url+'other').page;
  assert.ok(a.titleTruncated);assert.ok(b.titleTruncated);
  assert.ok(!buildSiteDiagnosticFindings([a,b]).some(f=>f.id==='duplicate-title-0'));
  assert.equal(buildSiteDiagnosticFindings([a,b]).find(f=>f.id==='clipped-title')?.status,'review');
});

test('search, training and user-request declarations remain independent and unmeasured robots stay unknown',()=>{
  const policies=inspectCrawlerPolicies(robots('User-agent: *\nDisallow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: GPTBot\nDisallow: /'),url);
  assert.equal(policies.find(p=>p.agent==='OAI-SearchBot')?.status,'allowed');
  assert.equal(policies.find(p=>p.agent==='GPTBot')?.status,'blocked');
  assert.match(policies.find(p=>p.agent==='GPTBot')!.note,/운영자/);
  assert.match(policies.find(p=>p.agent==='ChatGPT-User')!.note,/실제 접근 판정이 아닙니다/);
  assert.ok(inspectCrawlerPolicies(undefined,url).every(p=>p.status==='unknown'));
});

test('static signals distinguish UA, GA4 and GTM without executing scripts or treating decorative backgrounds as defects',()=>{
  const page=captureSiteDiagnosticSeed(html('상품','설명','<script src="/jquery-3.6.0.min.js"></script><script>gtag("config","UA-12345-1");gtag("config","G-ABC123");var container="GTM-ABC1";</script><div style="background-image:url(a.jpg)"></div><div aria-hidden="true" style="background:url(b.jpg)"></div>'),url).page;
  assert.deepEqual(page.jquery,['3.6.0']);assert.deepEqual(page.analytics,['UA','GA4','GTM']);assert.equal(page.backgroundCandidates,1);
  const findings=buildSiteDiagnosticFindings([page]);
  assert.equal(findings.find(f=>f.id==='background-0')?.status,'review');
  assert.match(findings.find(f=>f.id==='jquery-0')!.action,/취약점을 확정할 수 없습니다/);
});

test('page discovery excludes external/private/state routes and assets while retaining public product identifiers',()=>{
  for(const value of ['/logout','/login','/api/users','/delete.html','/file.pdf','/?action=remove','https://other.example.com/a','http://127.0.0.1/'])assert.equal(diagnosticPageUrl(value,url),null,value);
  assert.equal(diagnosticPageUrl('/product/detail.html?product_no=4&utm_source=ad',url),url+'product/detail.html?product_no=4');
});

test('sitemap observation accepts namespaces and measures calendar dates without stale-date penalties or entity expansion',()=>{
  const result=inspectSitemapXml(`<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"><sm:url><sm:loc>${url}a</sm:loc><sm:lastmod>2000-01-01</sm:lastmod></sm:url><sm:url><sm:loc>${url}b</sm:loc><sm:lastmod>2026-02-31T12:00:00Z</sm:lastmod></sm:url><sm:url><sm:loc>${url}c</sm:loc><sm:lastmod>2099-01-01</sm:lastmod></sm:url></sm:urlset>`,url,Date.parse('2026-11-03'))!;
  assert.equal(result.entries,3);assert.equal(result.lastmod,3);assert.equal(result.invalidDates,1);assert.equal(result.futureDates,1);
  assert.equal(inspectSitemapXml('<!DOCTYPE x [<!ENTITY t SYSTEM "file:///etc/passwd">]><urlset/>',url),null);
  assert.equal(inspectSitemapXml('<html>not a sitemap</html>',url),null);
});

test('collector respects robots and redirect boundaries, limits HTML samples and preserves traceable evidence in saved reports',async t=>{
  const fetch=websiteHttp.fetch,requested:string[]=[];t.after(()=>websiteHttp.fetch=fetch);
  websiteHttp.fetch=async input=>{
    const target=String(input);requested.push(target);
    if(target===url+'leave')return new Response(null,{status:302,headers:{location:'https://external.example.com/private'}});
    if(target===url+'sitemap.xml')return new Response(`<urlset><url><loc>${url}service</loc></url></urlset>`,{headers:{'content-type':'application/xml'}});
    if(target===url+'llms.txt')return new Response('missing',{status:404});
    return new Response(html('같은 제목','같은 설명'),{headers:{'content-type':'text/html'}});
  };
  const seed=captureSiteDiagnosticSeed(html('같은 제목','같은 설명','<a href="/blocked">차단</a><a href="/login">로그인</a><a href="/leave">외부 이동</a><a href="/service">서비스</a><a href="/extra">추가</a>'),url);
  const audit=await collectSiteDiagnostics(url,{seed,robots:robots('User-agent: *\nAllow: /\nDisallow: /blocked')});
  assert.ok(!requested.some(r=>/blocked|login|external/.test(r)));assert.ok(audit.pages.length<=4);
  assert.ok(audit.attempts.some(a=>a.status==='blocked'));
  assert.equal(audit.llms.status,'missing');assert.equal(audit.sitemap.status,'observed');
  assert.ok(SiteDiagnosticsSchema.safeParse(audit).success);
  const report=MarketingReportSchema.parse({...fixture,siteDiagnostics:audit});
  assert.deepEqual(MarketingReportSchema.parse(JSON.parse(JSON.stringify(report))).siteDiagnostics,audit);
  assert.ok(buildSourceLibrary(report).links.some(l=>l.url===url+'service'));
  assert.match(JSON.stringify(buildReportDocument(report)),/OAI-SearchBot/);
  for(const format of ['html','markdown'] as const)assert.match(exportReportText(report,format).text,/페이지·기술 정밀 점검/);
});

test('restricted collection makes no supplemental requests or invented missing-field judgments',async t=>{
  const fetch=websiteHttp.fetch;t.after(()=>websiteHttp.fetch=fetch);let calls=0;websiteHttp.fetch=async()=>{calls++;throw Error('must not fetch');};
  const audit=await collectSiteDiagnostics(url,{limited:true,robots:robots('User-agent: *\nDisallow: /')});
  assert.equal(calls,0);assert.equal(audit.pages.length,0);assert.ok(audit.findings.every(f=>f.status!=='action'));
  assert.equal(audit.sitemap.status,'blocked');assert.equal(audit.llms.status,'blocked');
});

test('collector deadline aborts downstream work and freezes partial snapshots',async t=>{
  const fetch=websiteHttp.fetch;t.after(()=>websiteHttp.fetch=fetch);let cancelled=false;
  websiteHttp.fetch=async()=>new Promise((_,reject)=>{const signal=budgetSignal()!;signal.addEventListener('abort',()=>{cancelled=true;reject(signal.reason);},{once:true});});
  const seed=captureSiteDiagnosticSeed(html('페이지','설명','<a href="/slow">느린 페이지</a>'),url);
  const audit=await collectSiteDiagnostics(url,{seed,robots:robots(),budgetMs:25});
  const snapshot=JSON.stringify(audit);await new Promise(resolve=>setTimeout(resolve,20));
  assert.ok(cancelled);assert.equal(audit.pages.length,1);assert.equal(JSON.stringify(audit),snapshot);
});

test('HTML and Markdown exports escape hostile text and suppress unsafe links while retaining branding and sources',()=>{
  const blocks=[{kind:'title' as const,text:'<script>alert(1)</script>'},{kind:'body' as const,text:'[link](javascript:alert(1)) <img src=x onerror=alert(1)>',href:'javascript:alert(1)'},{kind:'body' as const,text:'근거',href:url}];
  const output=reportHtml(blocks),$=load(output);
  assert.equal($('script,img,iframe,object').length,0);assert.equal($('a').length,1);assert.equal($('a').attr('href'),url);
  assert.ok($('h1').text().includes('<script>'));assert.match(output,/default-src &#39;none&#39;|default-src 'none'/);
  assert.match(output,/진짜마케팅/);assert.ok(!reportMarkdown(blocks).includes('<script>'));assert.match(reportMarkdown(blocks),/출처:/);
});

test('diagnostic schema rejects executable source URLs and old report snapshots remain valid',async()=>{
  assert.ok(MarketingReportSchema.safeParse(fixture).success);
  const audit=await collectSiteDiagnostics(url,{limited:true});
  assert.equal(SiteDiagnosticsSchema.safeParse({...audit,llms:{...audit.llms,url:'javascript:alert(1)'}}).success,false);
});

test('report panel preserves legacy and limited states and renders source-based diagnostics with escaped page text',async t=>{
  const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
  assert.match(renderToStaticMarkup(React.createElement(SiteDiagnosticsPanel,{})),/다시 진단/);
  const audit=await collectSiteDiagnostics(url,{seed:captureSiteDiagnosticSeed(html('&lt;img src=x&gt;','설명'),url),robots:robots(),limited:true});
  const $=load(renderToStaticMarkup(React.createElement(SiteDiagnosticsPanel,{audit})));
  assert.equal($('img,script').length,0);assert.equal($('tbody tr').length,10);assert.match($.text(),/수집이 제한/);
});
