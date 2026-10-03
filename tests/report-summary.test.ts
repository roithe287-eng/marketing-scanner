import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './fixtures/report';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import type {PdfTextStyle} from '../lib/pdfLayout';
import type {MarketingReport} from '../lib/reportSchema';
import KeywordRewritePanel from '../components/report/KeywordRewritePanel';
import {buildKeywordRewrites} from '../lib/keywordRewrite';
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size*(t.weight>=600?1.06:1),0);
const frequency={totalTokens:400,uniqueSingles:4,uniquePhrases:0,singles:['운영','함께','광고','지원'].map(keyword=>({keyword,count:12,density:3,inTitle:false,inMetaDescription:false})),phrases:[]};
test('one-page brief keeps all eight scores and prioritizes the lowest without altering the snapshot',()=>{
 const r:MarketingReport={...fixture,overallScore:100,keywordFrequency:frequency,diagnosis:{firstView:100,cta:0,copywriting:32,trust:41,conversionFlow:56,adLanding:69,mobileUx:88,seo:99}};
 const before=JSON.stringify(r),page=buildReportSummaryPage(r,measure),text=page.lines.map(l=>l.text).join('\n');
 for(const score of Object.values(r.diagnosis))assert.ok(text.includes(`${score}점`));
 assert.match(text,/01  CTA 명확도 · 0점/);assert.match(text,/02  카피라이팅 · 32점/);assert.match(text,/03  신뢰 요소 · 41점/);
 assert.match(text,/100 \/ 100/);assert.match(text,/운영 · 구체화/);assert.match(text,/함께 · 정리/);assert.match(text,/광고 · 배치/);assert.equal(JSON.stringify(r),before);
});
test('brief stays within the single-page content box even with long Korean and combined emoji',()=>{
 const r={...fixture,url:'https://example.com/'+'길고긴주소'.repeat(90),meta:{siteName:'가족👩‍👩‍👧‍👦브랜드'.repeat(100)},keywordFrequency:{...frequency,singles:[{...frequency.singles[0],keyword:'長文👩‍👩‍👧‍👦'.repeat(100)},...frequency.singles]}};
 const page=buildReportSummaryPage(r,measure);
 for(const line of page.lines){assert.ok(line.x>=48&&line.x+line.width<=742.01,`horizontal ${line.text}`);assert.ok(line.y>=46&&line.y+line.lineHeight<=1039,`vertical ${line.text}`);}
 for(const s of page.shapes){assert.ok(s.x>=48&&s.y>=48);if(s.kind!=='ring')assert.ok(s.x+s.width<=742&&s.y+s.height<=1039);}
 assert.ok(page.lines.some(l=>l.text.endsWith('…')));
});
test('brief names missing word data without inventing TO-BE suggestions',()=>{
 const text=buildReportSummaryPage(fixture,measure).lines.map(l=>l.text).join('');
 assert.match(text,/저장된 반복 표현 제안이 없습니다/);assert.doesNotMatch(text,/운영 · 구체화/);
});
test('template highlighting retains literal wording and offers four accessible placement controls',()=>{
 const r={...fixture,keywordFrequency:frequency},html=renderToStaticMarkup(React.createElement(KeywordRewritePanel,{report:r}));
 assert.match(html,/<mark>\[운영 대상\]<\/mark>/);assert.match(html,/문구 적용 위치 선택/);
 assert.equal((html.match(/class="report-wirezone report-wirezone-/g)||[]).length,4);
 const text=html.replace(/<[^>]+>/g,'');for(const p of buildKeywordRewrites(frequency).singles)assert.ok(text.includes(p.template));
});
