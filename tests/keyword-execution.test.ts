import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {MarketingReportSchema,type MarketingReport,type PageEvidence} from '../lib/reportSchema';
import {buildExecutableRewrites,fillRewriteTemplate,rewriteFields,rewriteInstruction} from '../lib/keywordExecution';
import {buildReportDocument} from '../lib/reportDocument';
import {layoutPdfPages,type PdfTextStyle} from '../lib/pdfLayout';
import RewriteExecutionGuide from '../components/report/RewriteExecutionGuide';
const item=(keyword:string)=>({keyword,count:12,density:4,inTitle:false,inMetaDescription:false});
const evidence:PageEvidence={version:1,requestedUrl:fixture.url,finalUrl:fixture.url+'/services',capturedAt:'2026-10-03T04:00:00.000Z',title:'광고 안내',description:'광고 운영 안내',h1:['운영 업무 범위'],h2:['별도 협의 조건'],ctaButtons:['상담 신청'],bodyText:'광고 운영은 월 단위로 진행합니다. 촬영은 운영 범위에서 제외하며 별도 비용이 필요합니다.',bodyTruncated:false};
const report:MarketingReport={...fixture,pageEvidence:evidence,keywordFrequency:{singles:[item('운영'),item('함께'),item('제외')],phrases:[item('운영 범위')],totalTokens:300,uniqueSingles:3,uniquePhrases:1}};
test('same-URL source survives a shared schema roundtrip and guides identify the actual source field',()=>{
 const saved=MarketingReportSchema.parse(JSON.parse(JSON.stringify(report))),plan=buildExecutableRewrites(saved).singles[0];
 assert.deepEqual(saved.pageEvidence,evidence);assert.equal(plan.guide.url,evidence.finalUrl);
 assert.equal(plan.sourceLabel,'H1 제목 1');assert.equal(plan.source,'운영 업무 범위');
 assert.ok(plan.guide.evidence.some(e=>e.text.includes('촬영은 운영 범위에서 제외')));
 assert.equal(plan.guide.steps.length,4);assert.ok(plan.guide.steps[0].detail.includes('“운영”'));
 assert.equal(plan.guide.fields.length,4);assert.match(plan.guide.coverage,/KST/);
});
test('other-page evidence and unsafe URLs cannot be attributed to this report',()=>{
 const changed={...report,url:'javascript:alert(1)',pageEvidence:{...evidence,requestedUrl:'https://competitor.example'}};
 const plan=buildExecutableRewrites(changed).singles[0];
 assert.equal(plan.guide.url,null);assert.equal(plan.source,null);assert.equal(plan.guide.evidence.length,0);
 assert.match(plan.guide.coverage,/원문이 저장되지 않았습니다/);
});
test('legacy OG snapshots and missing phrase locations are described without invented body quotes',()=>{
 const old={...report,pageEvidence:undefined,meta:{siteName:'샘플',ogDescription:'광고 운영을 안내합니다.'}};
 const plans=buildExecutableRewrites(old);
 assert.match(plans.singles[0].sourceLabel,/OG\/검색 설명 구분 없음/);
 assert.match(plans.singles[0].guide.steps[0].detail,/본문 위치를 뜻하지 않습니다/);
 assert.equal(plans.phrases[0].source,null);assert.match(plans.phrases[0].guide.steps[0].detail,/구성 단어도 각각 검색/);
 assert.equal(plans.singles[2].kind,'문맥 검토');assert.match(plans.singles[2].guide.steps[1].detail,/제한 조건/);
});
test('worksheet substitutes literal values safely, preserves unmatched fields and does not mutate the saved report',()=>{
 const before=JSON.stringify(report),plan=buildExecutableRewrites(report).singles[0];
 const values={'[운영 대상]':'메타 광고 $&','[업무 항목]':'캠페인 점검'};
 const preview=fillRewriteTemplate(plan.template,values);
 assert.match(preview,/메타 광고 \$&/);assert.match(preview,/\[주기\]/);assert.equal(rewriteFields(preview).length,2);
 assert.equal(fillRewriteTemplate('[대상] + [대상]',{'[대상]':'실제 대상'}),'실제 대상 + 실제 대상');
 const copied=rewriteInstruction(plan,values);assert.match(copied,/사용자 입력/);assert.match(copied,/남은 괄호 2개/);assert.ok(copied.includes(evidence.finalUrl));assert.equal(JSON.stringify(report),before);
 const html=renderToStaticMarkup(React.createElement(RewriteExecutionGuide,{plan,values:{'[운영 대상]':'<script>alert(1)</script>'},onChange:()=>{}}));
 assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/입력한 초안은 이 화면에서만 유지/);
});
test('full PDF keeps URL source, every step, fill-in guidance and completion checks within page bounds',()=>{
 const blocks=buildReportDocument(report),text=blocks.map(b=>b.text).join('\n');
 for(const p of [...buildExecutableRewrites(report).singles,...buildExecutableRewrites(report).phrases]){
   for(const step of p.guide.steps)assert.ok(text.includes(step.detail));
   for(const field of p.guide.fields)assert.ok(text.includes(field.hint));
   for(const check of p.guide.checks)assert.ok(text.includes(check));
 }
 assert.ok(blocks.some(b=>b.href===evidence.finalUrl));
 const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);
 for(const page of layoutPdfPages(blocks,measure))for(const line of page.lines){assert.ok(line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=1039);}
});
