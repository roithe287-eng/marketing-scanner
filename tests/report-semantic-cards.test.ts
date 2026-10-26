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

test('raw-source cards separate literal text, location and verification without inventing a TO-BE',()=>{
 const report=visualReviewReport(),original=JSON.stringify(report),element=report.pageEvidence!.siteEditing!.elements.find(e=>e.kind==='description')!;
 const $=load(renderToStaticMarkup(React.createElement(SourceElementCard,{element,url:report.url,elements:report.pageEvidence!.siteEditing!.elements})));
 assert.equal($('.guide-source-grid blockquote').text(),element.text);
 assert.ok($('.guide-source-grid [data-report-role=location]').length);
 assert.ok($('.guide-element>.report-role-box[data-report-role=verify]').length);
 assert.equal($('.guide-element [data-report-role=proposal]').length,0);
 assert.ok($('.report-full-text').text().includes('검색 제목·설명은 본문에 표시되지 않습니다.'));
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
