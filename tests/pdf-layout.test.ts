import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutPdfPages, PDF_PAGE, wrapPdfText, type PdfTextStyle } from '../lib/pdfLayout';
import { buildReportDocument, type ReportBlock } from '../lib/reportDocument';
import { fixture } from './fixtures/report';
import { MarketingReportSchema } from '../lib/reportSchema';

const style:PdfTextStyle={size:14,weight:400,color:'#111827',lineHeight:23.1};
const measure=(text:string,s:PdfTextStyle)=>Array.from(text).reduce((sum,char)=>sum+(/[ -~]/.test(char)?0.5:1)*s.size,0);

test('long Korean, whitespace and combined Unicode survive every wrap boundary',()=>{
  const text=('한글  두 칸 · café e\u0301 👨‍👩‍👧‍👦 🔎 🏳️‍🌈 공백없는문자열'.repeat(80)+'\n\n다음 문단\n');
  const lines=wrapPdfText(text,style,measure,230);
  assert.equal(lines.map(line=>line.text+(line.newlineAfter?'\n':'')).join(''),text);
  for(const line of lines) assert.ok(measure(line.text,style)<=230);
  assert.ok(lines.some(line=>line.text.includes('👨‍👩‍👧‍👦')));
});

test('all long report text and clickable sources stay inside page and footer boundaries',()=>{
  const text='한국어경계검증문구'.repeat(800);
  const blocks:ReportBlock[]=[{kind:'heading',text:'질문별 답변'}, {kind:'body',text}, {kind:'body',text:'https://example.com/'+ 'very-long-source-'.repeat(70),href:'https://example.com/source'}, {kind:'heading',text:'마지막 절'}, {kind:'body',text:'마지막 상세도 반드시 포함'}];
  const pages=layoutPdfPages(blocks,measure);
  assert.ok(pages.length>2);
  const lines=pages.flatMap(page=>page.lines);
  assert.equal(lines.map(line=>line.text).join(''),blocks.map(block=>block.text).join(''));
  for(const line of lines) {assert.ok(line.y>=PDF_PAGE.padding);assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom+0.01);assert.ok(line.x+line.width<=PDF_PAGE.padding+PDF_PAGE.contentWidth+0.01);}
  assert.ok(lines.filter(line=>line.href).length>1);
  assert.ok(lines.filter(line=>line.href).every(line=>line.href==='https://example.com/source'));
  const ending=pages.find(page=>page.lines.some(line=>line.text==='마지막 절'))!;
  assert.ok(ending.lines.some(line=>line.text==='마지막 상세도 반드시 포함'));
});

test('competitor failure remains explicit in shared data and the complete PDF document',()=>{
  const report=MarketingReportSchema.parse({...fixture,competitorStatus:{status:'timeout',message:'경쟁사 비교 응답 시간이 초과되었습니다.'}});
  const restored=MarketingReportSchema.parse(JSON.parse(JSON.stringify(report)));
  assert.deepEqual(restored.competitorStatus,report.competitorStatus);
  const text=buildReportDocument(restored).map(block=>block.text).join('\n');
  assert.match(text,/경쟁사 분석 상태/);assert.match(text,/시간 초과/);assert.match(text,/경쟁사 비교 응답 시간이 초과되었습니다/);
  assert.match(text,/마지막 페이지 확인 문구/);
});
