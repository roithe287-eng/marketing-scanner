import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './fixtures/report';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReportSummaryPage} from '../lib/reportSummaryPdf';
import {layoutPdfPages,type PdfTextStyle} from '../lib/pdfLayout';
import {REPORT_NOTICE_TITLE,REPORT_NOTICE_LEAD,REPORT_NOTICE_ITEMS,REPORT_NOTICE_END,REPORT_NOTICE_SUMMARY,REPORT_NOTICE_URL} from '../lib/reportNotice';
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);

test('exported detailed reports end with the complete notice including limits on liability exclusions',()=>{
  const blocks=buildReportDocument(fixture),start=blocks.findIndex(b=>b.text===REPORT_NOTICE_TITLE),notice=blocks.slice(start);
  assert.ok(start>0);assert.equal(notice[1].text,REPORT_NOTICE_LEAD);assert.equal(blocks.at(-1)?.text,REPORT_NOTICE_END);
  for(const item of REPORT_NOTICE_ITEMS)assert.ok(notice.some(b=>b.text===item.text));
  assert.ok(notice.some(b=>b.text.includes('고의·중대한 과실')));
  const pages=layoutPdfPages(blocks,measure),text=pages.flatMap(p=>p.lines).map(l=>l.text).join('');
  for(const item of REPORT_NOTICE_ITEMS)assert.ok(text.includes(item.text));
  for(const page of pages)for(const line of page.lines){assert.ok(line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=1039.01);}
});
test('one-page export retains the entire concise notice and a working full-notice link without truncation',()=>{
  const page=buildReportSummaryPage(fixture,measure),text=page.lines.map(l=>l.text).join('');
  assert.ok(text.includes(REPORT_NOTICE_SUMMARY));assert.ok(page.lines.some(l=>l.href===REPORT_NOTICE_URL));
  for(const line of page.lines){assert.ok(line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=1039.01);}
});
