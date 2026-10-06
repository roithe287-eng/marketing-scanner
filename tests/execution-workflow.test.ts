import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {MarketingReportSchema,type MarketingReport} from '../lib/reportSchema';
import {buildExecutionPlan,buildPageEdits,changedText,executionBrief} from '../lib/reportExecution';
import {buildDiagnosisComparison,createDiagnosisBaseline} from '../lib/diagnosisComparison';
import {buildReportDocument} from '../lib/reportDocument';
import {layoutPdfPages,type PdfTextStyle} from '../lib/pdfLayout';
import {PageEditPreview,TodayWork,ExecutionBoard} from '../components/report/ExecutionWorkflow';
const page=(date:string)=>({version:1 as const,requestedUrl:fixture.url,finalUrl:fixture.url,capturedAt:date,title:'서비스 제목',description:'실제 설명',h1:[] as string[],h2:[],ctaButtons:['상담 문의'],bodyText:'실제 본문',bodyTruncated:false});
const before:MarketingReport={...fixture,pageEvidence:page('2026-10-01T01:00:00Z'),diagnosisMethod:'same',checklist:[{id:'old',category:'content',label:'내용 확인',status:'warning',currentValue:'기존의 부족한 설명',diagnosis:'보완',guide:'조건을 추가하세요.'}],criticalIssues:[{title:'사라진 이슈',problem:'이전의 문제',reason:'근거',recommendation:'확인',priority:'high'}]};
const current:MarketingReport={...before,pageEvidence:{...page('2026-10-05T01:00:00Z'),h1:['실제 대표 제목']},criticalIssues:[],checklist:[{...before.checklist![0],id:'new-generated-id',status:'pass',currentValue:'조건 포함'},{...before.checklist![0],id:'another',label:'새로운 점검',currentValue:'새 관측'}],diagnosis:{...fixture.diagnosis,seo:80},diagnosisBaseline:createDiagnosisBaseline(before,'prior123')};
test('same-page comparison distinguishes pass transitions from missing issues and preserves actual scores',()=>{
 const c=buildDiagnosisComparison(current)!;
 assert.equal(c.blocked,'');assert.equal(c.axes.find(a=>a.key==='seo')!.delta,10);
 assert.equal(c.items.find(i=>i.label==='내용 확인')!.group,'resolved');
 assert.equal(c.items.find(i=>i.label==='H1 존재')!.group,'resolved');
 assert.equal(c.items.find(i=>i.label==='새로운 점검')!.group,'new');
 assert.equal(c.items.find(i=>i.label==='사라진 이슈')!.group,'unknown');
 assert.match(c.items.find(i=>i.label==='사라진 이슈')!.reason,/해결 여부 미확인/);
 const saved=MarketingReportSchema.parse(current);assert.deepEqual(saved.diagnosisBaseline,current.diagnosisBaseline);
 const next=createDiagnosisBaseline(saved,'next123');assert.ok(!('diagnosisBaseline' in next));
});
test('different pages, redirects, cached times, duplicate checks and unknown collection times cannot imply a fix',()=>{
 for(const r of [{...current,url:fixture.url+'/other'},{...current,pageEvidence:{...current.pageEvidence!,finalUrl:fixture.url+'/redirect'}},{...current,pageEvidence:before.pageEvidence}])assert.ok(buildDiagnosisComparison(r)!.blocked);
 const duplicate={...current,checklist:[...current.checklist!,current.checklist![0]]};assert.equal(buildDiagnosisComparison(duplicate)!.items.find(i=>i.label==='내용 확인')!.group,'unknown');
 const noTime={...current,diagnosisBaseline:{...current.diagnosisBaseline!,capturedAt:undefined}};assert.ok(buildDiagnosisComparison(noTime)!.items.every(i=>i.group==='unknown'));
 const changedMethod={...current,diagnosisMethod:'other'};assert.equal(buildDiagnosisComparison(changedMethod)!.items.find(i=>i.label==='내용 확인')!.group,'unknown');
});
test('before-after uses same-URL captured originals, never unverified generated current copy or OG as HTML',()=>{
 const r={...before,exampleCopy:{...before.exampleCopy,currentHeroHeadline:'가짜 현재 문구',currentCtaText:'없는 버튼'}};
 const items=buildPageEdits(r);assert.equal(items[0].before,'');assert.equal(items[3].before,'상담 문의');
 for(const e of buildPageEdits({...r,pageEvidence:{...r.pageEvidence!,requestedUrl:'https://elsewhere.example/'}}))assert.equal(e.before,'');
 assert.equal(buildPageEdits({...r,pageEvidence:undefined,meta:{ogTitle:'OG 제목'}})[1].before,'');
 for(const [a,b] of [['기존 서비스 안내','기존 서비스 상담 안내'],['긴 문장 '.repeat(1500),'긴 변경 문장 '.repeat(1500)],['<script>위험</script>','<img src=x> 제안']])assert.equal(changedText(a,b).map(p=>p.text).join(''),b);
});
test('starting tasks deduplicate only the shortlist and role briefs retain every saved evidence row',()=>{
 const r={...before,criticalIssues:[...before.criticalIssues,...before.criticalIssues]};const original=JSON.stringify(r);const p=buildExecutionPlan(r);
 assert.equal(p.tasks.length,3);assert.equal(p.first.length,2);assert.equal(new Set(p.tasks.map(t=>t.anchor)).size,3);
 const text=executionBrief(r,p.tasks);for(const t of p.tasks){assert.ok(text.includes(t.evidence));assert.ok(text.includes(t.action));assert.ok(text.includes(t.completion));}
 assert.equal(JSON.stringify(r),original);
 const headings={...r,criticalIssues:[{...before.criticalIssues[0],title:'H1 태그 부재'}],checklist:[{...before.checklist![0],label:'대표 제목 H1'}]};
 const h=buildExecutionPlan(headings);assert.equal(h.tasks.length,2);assert.equal(h.first.length,1);assert.equal(h.first[0].zone,'hero');assert.equal(h.first[0].owner,'developer');assert.match(h.first[0].location,/대표 제목/);
});
test('workflow HTML and PDF preserve detailed instructions, escape markup and keep all five additions in bounds',()=>{
 const long='고객이 실제 제공 범위와 진행 조건을 확인한 뒤 상담하도록 상세 내용을 설명합니다. '.repeat(60);
 const r:MarketingReport={...current,criticalIssues:[{title:'<script>긴 이슈</script>',problem:long,reason:long,recommendation:long,priority:'high'}],exampleCopy:{...fixture.exampleCopy,heroHeadline:'<img src=x onerror=alert(1)> 제안'}};
 const plan=buildExecutionPlan(r);
 const html=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(TodayWork,{plan}),React.createElement(PageEditPreview,{report:r}),React.createElement(ExecutionBoard,{report:r,plan})));
 assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes(long));
 const blocks=buildReportDocument(r),text=blocks.map(b=>b.text).join('\n');
 for(const title of ['오늘 먼저 할 일','내 페이지 개선 전·후','페이지 수정 위치 안내','재진단 이전·현재 비교','담당별 실행 보드'])assert.ok(text.includes(title));
 assert.ok(text.includes(long));assert.ok(text.includes('이전의 문제'));
 const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);
 for(const p of layoutPdfPages(blocks,measure))for(const l of p.lines){assert.ok(l.x>=48&&l.x+l.width<=742.1);assert.ok(l.y+l.lineHeight<=1039);}
});
test('diagnosis baseline endpoint requires access, supports reports without GEO, and never returns nested prior snapshots',async()=>{
 const {GET}=await import('../app/api/share/route');const {NextRequest}=await import('next/server');
 const keys=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN','VERCEL','ALLOWED_IPS'];const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=globalThis.fetch;
 for(const k of keys)delete process.env[k];
 try{
  assert.equal((await GET(new NextRequest('https://www.mktscanner.com/api/share?id=prior123&mode=diagnosis'))).status,401);
  process.env.VERCEL='1';process.env.ALLOWED_IPS='203.0.113.10';process.env.UPSTASH_REDIS_REST_URL='https://workflow.upstash.io';process.env.UPSTASH_REDIS_REST_TOKEN='test';
  let calls=0;globalThis.fetch=async(input,init)=>{assert.ok(String(input).startsWith('https://workflow.upstash.io/'));calls++;return Response.json(JSON.parse(String(init?.body)).map((command:string[])=>({result:command[0].toLowerCase()==='eval'&&!command[1].includes('local function read(k,depth)')?1:[Buffer.from(JSON.stringify({version:2,ownerId:'internal',createdAt:Date.now(),expiresAt:Date.now()+604800000,report:{...current,llmCitationTest:null}})).toString('base64'),Date.now(),Date.now()+604800000,Buffer.from('internal').toString('base64')]})));};
  const response=await GET(new NextRequest('https://www.mktscanner.com/api/share?id=prior123&mode=diagnosis',{headers:{'x-vercel-forwarded-for':'203.0.113.10'}}));
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control')!,/no-store/);const data=await response.json();assert.equal(data.diagnosisBaseline.reportId,'prior123');assert.equal(data.geoBaseline,undefined);assert.equal(data.diagnosisBaseline.diagnosisBaseline,undefined);assert.ok(calls>0);
 }finally{globalThis.fetch=original;for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
});
