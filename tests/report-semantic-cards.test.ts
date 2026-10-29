import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {reportRoles,reportFieldRole} from '../lib/reportRoles';
import SourceElementCard from '../components/report/SourceElementCard';
import {Guidebook,SiteGuideProvider} from '../components/report/SiteGuidebook';
import {PageEditPreview} from '../components/report/ExecutionWorkflow';
import {visualReviewReport} from './fixtures/visual-review-report';
import {buildSiteGuide,guideInstruction} from '../lib/siteGuidebook';
import {buildReadingPdfPages,type ReadingSection} from '../lib/reportReadingPdf';
import {PDF_PAGE,type PdfTextStyle} from '../lib/pdfLayout';

function luminance(hex:string){const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const [low,high]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return (high+.05)/(low+.05);}
const measure=(s:string,t:PdfTextStyle)=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.55:1)*t.size,0);

test('all reading roles meet AA text contrast and remain identifiable without color',()=>{
 for(const [role,palette] of Object.entries(reportRoles)){
  assert.ok(contrast(palette.ink,palette.background)>=4.5,`${role}: body`);
  assert.ok(contrast(palette.accent,palette.background)>=4.5,`${role}: label`);
  assert.ok(contrast('#ffffff',palette.accent)>=3,`${role}: icon`);
 }
 const $=load(renderToStaticMarkup(React.createElement(PageEditPreview,{report:visualReviewReport()})));
 assert.match($('.work-before-after [data-report-role=current]').first().text(),/AS-IS/);
 assert.match($('.work-before-after [data-report-role=proposal]').first().text(),/TO-BE · 제안/);
 assert.equal($('.work-before-after>.report-role-box>.report-role-label svg[aria-hidden=true]').length,2);
});

test('source cards show literal text and copy actions without redundant position information',()=>{
 const report=visualReviewReport(),original=JSON.stringify(report),element=report.pageEvidence!.siteEditing!.elements.find(e=>e.kind==='description')!;
 const $=load(renderToStaticMarkup(React.createElement(SourceElementCard,{element,url:report.url,elements:report.pageEvidence!.siteEditing!.elements})));
 assert.equal($('.guide-element blockquote').text(),element.text);
 assert.equal($('.guide-source-context,.guide-selector,[data-report-role=location],details').length,0);
 assert.equal($('.guide-source-graphic[aria-hidden=true]').length,1);
 assert.equal($('.guide-element button').text().trim(),'⧉ 원문 복사');
 assert.doesNotMatch($('.guide-element').text(),/문서 순서|원문이 있는 위치|개발자용/);
 assert.equal(JSON.stringify(report),original);
});

test('editing comparisons preserve exact values, complete instructions, completion conditions and copy text',()=>{
 const report=visualReviewReport(),request={title:'검색 설명',topic:'description' as const,proposal:'수정 제안입니다. '.repeat(35)+'실제 제공 조건을 확인해야 합니다.'};
 const guide=buildSiteGuide(report,request),brief=guideInstruction(guide);
 const $=load(renderToStaticMarkup(React.createElement(SiteGuideProvider,{report,children:React.createElement(Guidebook,request)})));
 for(const [index,field] of guide.fields.entries()){
  const row=$('.guide-field-list article').eq(index);
  for(const [role,value] of [['current',field.before],['proposal',field.action],['verify',field.done]]){
   const content=row.find(`.report-evidence-flow>div[data-report-role=${role}]>dd`);
   assert.equal(content.find('.report-full-text').length?content.find('.report-full-text').text():content.text(),value);
  }
 }
 assert.ok(brief.includes(request.proposal));
 assert.ok($('.guide-proposal').text().includes(request.proposal));
});

test('PDF field roles preserve historical comparisons and exact long original text',()=>{
 assert.equal(reportFieldRole('수정 방법:'),'proposal');assert.equal(reportFieldRole('수정 전후를 검토한 일반 문장'),undefined);
 const text='긴 원문. '.repeat(140),sections:ReadingSection[]=[{id:'test',title:'비교 검증',group:'01 진단',blocks:[{kind:'body',text:'현재: 현재 문구',sourceId:0},{kind:'body',text:'TO-BE: 개선 제안',sourceId:1},{kind:'body',text:'이전: 과거 기록',sourceId:2},{kind:'body',text:'현재: 현재 기록',sourceId:3},{kind:'body',text:'수정 방법: '+text,sourceId:4}]}];
 const pages=buildReadingPdfPages(sections,measure);
 assert.ok(pages.some(p=>p.shapes.some(s=>s.color===reportRoles.proposal.background)));
 assert.ok(pages.some(p=>p.shapes.some(s=>s.color===reportRoles.verify.background)));
 assert.equal(pages.flatMap(p=>p.lines).filter(l=>l.sourceId===4).map(l=>l.text).join('').replace(/\s/g,''),('수정 방법:'+text).replace(/\s/g,''));
 for(const page of pages)for(const line of page.lines){assert.ok(line.x+line.width<=742.01);assert.ok(line.y+line.lineHeight<=PDF_PAGE.contentBottom+.01);}
});

test('all report explanations start open while source lists and exact copy instructions remain available',async t=>{
 const {default:ReportLayout}=await import('../components/report/ReportLayout');
 const prior=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:prior}));
 const report=visualReviewReport(),before=JSON.stringify(report);
 const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
 assert.ok($('details').length>25,'fixture exercises all report chapters');
 assert.equal($('details:not([open])').not('.platform-application details').length,0,'existing explanations stay open; platform application has requested expandable guides');
 assert.equal($('.source-library').length,1);assert.ok($('.source-browser-list button').length<=8);assert.ok($('.source-pagination').length);
 assert.equal($('.guide-source-context,.guide-selector,.guide-source-grid').length,0);
 assert.equal($('.naver-copy-preview,.report-copy-fallback').length,0,'duplicate fallback instructions appear only after a failed copy');
 assert.equal($('.report-chapter-symbol svg').length,5);
 assert.equal(JSON.stringify(report),before);
});
