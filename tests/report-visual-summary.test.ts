import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {reportExcerpt} from '../lib/conciseReport';
import {CompactText,SourceReferenceDiagram} from '../components/report/ReportVisualSummary';
import {SourceDirectory} from '../components/report/InsightPanels';
import {buildReportInsights} from '../lib/reportInsights';
import {buildInsightsPdfPages} from '../lib/reportInsightsPdf';
import {buildReportDocument} from '../lib/reportDocument';
import {visualReviewReport} from './fixtures/visual-review-report';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';

test('condensed explanation preserves numbers, URLs, qualifiers and the full original text',()=>{
 const text='https://example.org/a.b 페이지에서 2.5%를 관측했다는 설명입니다. '+ '확인할 위치와 작업 내용이 이어지는 문장입니다. '.repeat(6)+'실제 전환율을 측정한 결과는 아닙니다.';
 const excerpt=reportExcerpt(text);
 assert.ok(excerpt.startsWith('https://example.org/a.b'));assert.ok(excerpt.includes('2.5%'));
 assert.ok(excerpt.includes('실제 전환율을 측정한 결과는 아닙니다.'));assert.ok(excerpt.length<text.length);
 const $=load(renderToStaticMarkup(React.createElement(CompactText,{text})));
 assert.equal($('.report-full-text').text(),text);assert.equal($('details').attr('open'),undefined);
 assert.equal($('.report-compact-lead').text(),excerpt);
 const steps='원문 확인\n담당자 확인\n사이트 수정\n다시 진단';assert.equal(reportExcerpt(steps),steps);
 const noBoundary='한 문장으로 연결된 긴 설명 '.repeat(30);assert.equal(reportExcerpt(noBoundary),noBoundary.trim());
});

test('external source diagram keeps unverified status and original URLs without mutating data',()=>{
 const report=visualReviewReport(),before=JSON.stringify(report);
 const $=load(renderToStaticMarkup(React.createElement(SourceDirectory,{data:buildReportInsights(report)})));
 assert.equal($('.report-source-patterns>div').length,4);assert.equal($('.report-source-reference .report-visual-steps li').length,3);
 assert.match($('.report-source-rule').text(),/업종이 다르면 비교 제외/);
 assert.match($('.report-visual-caution').text(),/검증한 목록이 아닙니다/);
 assert.ok($('a[href="https://reference.example.org/guide"]').length);
 assert.match($('.report-source-reference details').text(),/실제 페이지를 열어 관련성을 확인/);
 assert.equal(JSON.stringify(report),before);
 const document=buildReportDocument(report).map(b=>b.text).join('\n');assert.ok(document.includes('https://reference.example.org/guide'));
});

test('source visual PDF preserves scope and stays inside the page at realistic Korean text widths',()=>{
 const report=visualReviewReport(),before=JSON.stringify(report);
 const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);
 const pages=buildInsightsPdfPages(report,measure),page=pages.find(p=>p.lines.some(l=>l.text.includes('외부 출처 · 구성만')))!;
 assert.ok(page);assert.ok(page.lines.some(l=>l.text.includes('경쟁사·추천 사례로 검증')));
 for(const line of page.lines){assert.ok(line.x>=48&&line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom);}
 for(const shape of page.shapes)if(shape.kind==='rect'){assert.ok(shape.x>=48&&shape.x+shape.width<=742);assert.ok(shape.y+shape.height<=PDF_PAGE.contentBottom);}
 assert.equal(JSON.stringify(report),before);
});
