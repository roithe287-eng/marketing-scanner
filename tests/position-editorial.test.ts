import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import type {IndustryCategory,MarketingReport} from '../lib/reportSchema';
import {POSITION_INDUSTRIES} from '../lib/industryPositioning';
import {scorePosition,positionCheckDraft,positionCheckNextStep,positionCheckReason,positioningBrief,POSITION_CHECK_SCOPE,POSITION_DRAFT_NOTE} from '../lib/competitorPositioning';
import {buildCompetitorDocument} from '../lib/competitorDocument';
import {reportEmphasisParts} from '../lib/reportEmphasis';
import {reportHtml} from '../lib/exportReportText';
import {buildReadingPdfPages} from '../lib/reportReadingPdf';
import PositionEvidenceReview from '../components/report/PositionEvidenceReview';
import PositionCheckCard from '../components/report/PositionCheckCard';
import {fixture} from './fixtures/report';
const input={id:'own',name:'범양해운',url:'https://www.pumyang.com',own:true,title:'범양해운',description:'범양해운'};
const row=scorePosition(input,'해외이사','logistics');

test('every industry provides four distinct customer questions, editing directions and conditional drafts',()=>{
 for(const category of Object.keys(POSITION_INDUSTRIES) as IndustryCategory[]){
  const r=scorePosition({...input,name:'테스트업체',title:'테스트업체',description:'테스트업체'},'서비스',category);
  for(const values of [r.checks.map(c=>c.editorial.question),r.checks.map(c=>positionCheckNextStep(r,c)),r.checks.map(c=>positionCheckDraft(r,c)?.title),r.checks.map(c=>positionCheckDraft(r,c)?.description),r.checks.map(c=>positionCheckReason(r,c))])assert.equal(new Set(values).size,4,category);
  for(const c of r.checks){const d=positionCheckDraft(r,c)!;assert.ok(d);assert.match(d.title,/^테스트업체 \| \[/);assert.match(d.description,/\[[^\]]+\]/);assert.ok(c.editorial.verify.length>30);}
 }
});

test('logistics proof and process show substantively different guidance with their differences underlined',()=>{
 const [proof,process]=row.checks.slice(2);
 assert.match(positionCheckDraft(row,proof)!.title,/담당 거점·보상 기준/);
 assert.match(positionCheckDraft(row,process)!.title,/상담부터 현지 인도까지/);
 assert.match(positionCheckNextStep(row,proof),/협력사의 역할|약관/);
 assert.match(positionCheckNextStep(row,process),/준비물|일정 확인 창구/);
 for(const check of [proof,process]){
  const $=load(renderToStaticMarkup(React.createElement(PositionCheckCard,{row,check})));
  assert.equal($('.position-check-heading .report-key-emphasis').text(),check.label);
  assert.ok($('.position-rewrite .report-key-emphasis').length>=3);
  assert.equal($('.position-check-detail[open]').length,0);
  assert.equal($('blockquote').length,0);
 }
});

test('one shared source and one shared rule replace four repeated copies without dropping original evidence',()=>{
 const $=load(renderToStaticMarkup(React.createElement(PositionEvidenceReview,{row})));
 assert.equal($('.position-check-card').length,4);assert.equal($('blockquote').length,2);
 assert.deepEqual($('blockquote').map((_,e)=>$(e).text()).get(),[input.title,input.description]);
 assert.equal($.text().split(POSITION_CHECK_SCOPE).length-1,1);assert.equal($.text().split(POSITION_DRAFT_NOTE).length-1,1);
 assert.equal($('.position-rewrite-field').length,8);assert.doesNotMatch($.text(),/반영 가능한 표현 없음/);
});

test('unavailable or explicitly negative evidence does not create positive proposed claims',()=>{
 for(const patch of [{description:''},{fetchError:'HTTP 403'},{title:''}]){
  const r=scorePosition({...input,...patch},'해외이사','logistics');
  assert.ok(r.checks.every(c=>positionCheckDraft(r,c)===null));
  assert.equal(load(renderToStaticMarkup(React.createElement(PositionEvidenceReview,{row:r})))('.position-rewrite').length,0);
 }
 const r=scorePosition({...input,description:'상담 불가, 통관 미제공, 인도 예정'},'해외이사','logistics');
 assert.equal(positionCheckDraft(r,r.checks[3]),null);
 assert.match(renderToStaticMarkup(React.createElement(PositionCheckCard,{row:r,check:r.checks[3]})),/운영 상태를 확인/);
 const candidate=scorePosition({...input,own:false,name:'competitor.example'},'해외이사','logistics');
 assert.match(positionCheckDraft(candidate,candidate.checks[2])!.title,/^\[확인한 업체명\]/);
});

test('exported documents and copied instructions preserve each distinct draft and the shared qualification',()=>{
 const report:MarketingReport={...fixture,url:input.url,meta:{...fixture.meta,siteName:input.name},industryBenchmark:{...fixture.industryBenchmark!,category:'logistics'},competitorAnalysis:{searchKeyword:'해외이사',competitors:[],ourSite:{url:input.url,domain:'pumyang.com',title:input.title,metaDescription:input.description,h1:''}},pageEvidence:undefined};
 const before=JSON.stringify(report),blocks=buildCompetitorDocument(report),text=blocks.map(b=>b.text).join('\n'),brief=positioningBrief(report,row);
 for(const content of [text,brief])for(const check of row.checks){const d=positionCheckDraft(row,check)!;assert.ok(content.includes(d.title));assert.ok(content.includes(d.description));assert.ok(content.includes(check.editorial.verify));}
 assert.equal(text.split(POSITION_DRAFT_NOTE).length-1,1);
 const html=load(reportHtml(blocks));assert.ok(html('strong[style*="underline"]').length>8);assert.equal(JSON.stringify(report),before);
});

test('underline ranges preserve repeated, overlapping and hostile source text without HTML interpretation',()=>{
 const text='<img src=x onerror=alert(1)> 거점·책임·실적 거점';
 const parts=reportEmphasisParts(text,['거점','거점·책임·실적','거점','']);assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.emphasis).map(p=>p.text),['거점·책임·실적','거점']);
 const $=load(reportHtml([{kind:'body',text,emphasis:[text]}]));assert.equal($('img,script').length,0);assert.equal($('main>p').text(),text);
});

test('PDF underlines survive long wrapped fields and page breaks without removing source characters',()=>{
 const focus='[담당 거점·보상 기준과 공개 가능한 실제 운송 사례의 출처]';
 const value=Array.from({length:100},(_,i)=>`${i}. ${focus} 확인 후 작성합니다.`).join('\n');
 const blocks=[{kind:'subheading' as const,text:'거점·책임·실적',sourceId:1,emphasis:['거점·책임·실적']},{kind:'body' as const,text:'메타 설명 제안: '+value,sourceId:2,emphasis:[focus]}];
 const measure=(s:string,t:{size:number})=>Array.from(s).reduce((n,c)=>n+(/[ -~]/.test(c)?.5:1)*t.size,0);
 const pages=buildReadingPdfPages([{id:'test',title:'수정안',group:'테스트',blocks}],measure);
 assert.ok(pages.length>2);
 const marked=pages.flatMap(p=>p.lines).flatMap(l=>(l.emphasis||[]).map(e=>l.text.slice(e.start,e.end))).join('');
 assert.equal(marked,'거점·책임·실적'+focus.repeat(100));
 for(const p of pages)for(const l of p.lines)for(const e of l.emphasis||[]){assert.ok(e.start>=0&&e.end<=l.text.length);assert.ok(l.x+measure(l.text.slice(0,e.end),l)<=742.01);}
});
