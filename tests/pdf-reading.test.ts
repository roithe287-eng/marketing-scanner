import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {MarketingReportSchema} from '../lib/reportSchema';
import {buildReportDocument} from '../lib/reportDocument';
import {buildReadingSections,buildReadingPdfPages,buildReadingContents,type ReadingSection} from '../lib/reportReadingPdf';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';
import {fixture} from './fixtures/report';
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.5:1)*t.size*(t.weight>=600?1.04:1),0);
const normalize=(s:string)=>s.replace(/\s/g,'');
const value=(s:string)=>s.match(/^[^\n:：]{1,32}[:：]([\s\S]*)$/)?.[1].trim()||s.trim();
const report=MarketingReportSchema.parse(JSON.parse(readFileSync(new URL('./fixtures/usability-report.json',import.meta.url),'utf8')));

test('detailed PDF keeps every distinct result, source, and instruction; only exact repetitions become links',()=>{
  const original=JSON.stringify(report),source=buildReportDocument(report),sections=buildReadingSections(report),blocks=sections.flatMap(s=>s.blocks);
  const pages=buildReadingPdfPages(sections,measure),lines=pages.flatMap(p=>p.lines),all=normalize(lines.map(l=>l.text).join(''));
  const displayed=new Map<number,string>();for(const line of lines)if(line.sourceId!==undefined)displayed.set(line.sourceId,(displayed.get(line.sourceId)||'')+line.text);
  for(const b of blocks){
    if(b.sourceId===undefined||b.kind==='heading')continue;
    assert.equal(normalize(displayed.get(b.sourceId)||''),normalize(b.text),`all literal glyphs: ${b.text.slice(0,90)}`);
    if(b.originalText){const target=blocks.find(t=>t.anchor===b.targetId);assert.ok(target);assert.equal(value(target.text),value(b.originalText),'references require exact equality, never semantic summarization');}
  }
  for(const [i,b] of source.entries()){
    const direct=blocks.find(v=>v.sourceId===i);
    if(direct)continue;
    assert.ok(blocks.some(v=>v.text===b.text&&v.href===b.href),'shared instructions retain complete wording: '+b.text.slice(0,70));
  }
  for(const b of source.filter(b=>b.href))assert.ok(lines.some(l=>l.href===b.href),'source URL retained');
  assert.ok(all.includes(normalize('마지막 페이지 확인 문구')));
  assert.ok(blocks.some(b=>b.references?.length));assert.ok(blocks.some(b=>b.originalText));
  assert.equal(JSON.stringify(report),original,'the saved report is never changed by presentation');
});

test('contents and common-guide links resolve to real pages with matching printed page numbers',()=>{
  const sections=buildReadingSections(report),pages=buildReadingPdfPages(sections,measure),contents=buildReadingContents(sections,pages,measure,10);
  const ids=new Map<string,number>();pages.forEach((p,i)=>p.anchors?.forEach(id=>ids.set(id,i)));
  for(const line of [...contents,...pages].flatMap(p=>p.lines))if(line.targetId&&line.targetId!=='visual-report-start')assert.ok(ids.has(line.targetId),line.targetId);
  for(const section of sections){
    const number=String(10+contents.length+ids.get(section.id)!+1);
    assert.ok(contents.some(p=>p.lines.some(l=>l.targetId===section.id&&l.text===number)),section.title);
  }
  assert.ok(contents.some(p=>p.lines.some(l=>l.targetId==='visual-report-start')));
});

test('visual detail rows, comparison cards and contents respect page and column boundaries',()=>{
  const sections=buildReadingSections(report),pages=buildReadingPdfPages(sections,measure),contents=buildReadingContents(sections,pages,measure,10);
  for(const [i,p] of [...contents,...pages].entries()){
    for(const l of p.lines){assert.ok(l.x>=48&&l.x+l.width<=744.01,`horizontal page ${i}: ${l.text}`);assert.ok(l.y>=46&&l.y+l.lineHeight<=PDF_PAGE.contentBottom+.01,`vertical page ${i}: ${l.text}`);}
    for(const s of p.shapes)if(s.kind==='rect'){assert.ok(s.x>=48&&s.x+s.width<=744.01);assert.ok(s.y>=48&&s.y+s.height<=PDF_PAGE.contentBottom+.01);}
  }
  const pair=pages.find(p=>p.lines.some(l=>l.text==='현재:')&&p.lines.some(l=>l.text==='제안·작성 틀:'));
  assert.ok(pair);const before=pair.lines.find(l=>l.text==='현재:')!,after=pair.lines.find(l=>l.text==='제안·작성 틀:')!;
  assert.equal(before.y,after.y);assert.ok(after.x>before.x+300);
  assert.ok(pages.some(p=>p.shapes.filter(s=>s.kind==='rect'&&s.color==='#2442b5'&&s.height===4).length===8),'all eight scores have proportional bars');
  const score=sections.find(s=>s.title==='영역별 점수')!;
  const nearBottom=buildReadingPdfPages([{id:'preceding',title:'앞선 내용',group:score.group,blocks:[{kind:'body',text:Array(28).fill('앞선 진단 내용').join('\n')}]},score],measure);
  const scorePage=nearBottom.find(p=>p.anchors?.includes(score.id))!;
  assert.equal(scorePage.shapes.filter(s=>s.kind==='rect'&&s.color==='#2442b5'&&s.height===4).length,8,'score directory anchor, heading and complete card grid stay together');
});

test('very long Unicode paragraphs continue without losing text or orphaning the next subsection heading',()=>{
  const long='긴원문 👨‍👩‍👧‍👦 e\u0301  확인 '.repeat(800);
  const section:ReadingSection={id:'stress',title:'긴 원문 검증',group:'01  진단 결과·확인 근거',blocks:[
    {kind:'subheading',text:'긴 문단',sourceId:0},{kind:'body',text:'근거: '+long,sourceId:1},
    {kind:'subheading',text:'다음 실행',sourceId:2},{kind:'body',text:'실행: '+'마지막 문장 확인 '.repeat(30),sourceId:3},
  ]};
  const pages=buildReadingPdfPages([section],measure),printed=pages.flatMap(p=>p.lines).filter(l=>l.sourceId===1).map(l=>l.text).join('');
  assert.equal(normalize(printed),normalize(section.blocks[1].text));assert.ok(pages.length>3);
  const last=pages.find(p=>p.lines.some(l=>l.sourceId===2))!;assert.ok(last.lines.some(l=>l.sourceId===3));
  for(const p of pages)for(const l of p.lines)assert.ok(l.y+l.lineHeight<=PDF_PAGE.contentBottom+.01);
});

test('basic reports keep the same data and useful navigation without invented observations',()=>{
  const sections=buildReadingSections(fixture),pages=buildReadingPdfPages(sections,measure);
  assert.ok(pages.length);assert.ok(sections.some(s=>s.title==='분석 대상과 결과'));
  assert.ok(pages.flatMap(p=>p.lines).some(l=>l.text.includes('측정 불가')||l.text.includes('미확인')));
});
