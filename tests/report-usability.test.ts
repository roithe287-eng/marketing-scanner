import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {elementLink,buildSiteGuide} from '../lib/siteGuidebook';
import {calculateSimpleGoal} from '../lib/growthKpi';
import {scorePosition,buildCompetitorPositioning} from '../lib/competitorPositioning';
import {POSITION_INDUSTRIES,positionProfile} from '../lib/industryPositioning';
import {GUIDE_EFFECTS,naverGuideCondition} from '../lib/guideKnowledge';
import {buildExecutionPlan} from '../lib/reportExecution';
import {fixture} from './fixtures/report';
import SourceElementCard from '../components/report/SourceElementCard';
import ReportLayout from '../components/report/ReportLayout';
import type {IndustryCategory} from '../lib/reportSchema';
const url='https://example.com/catalog?category=outer';
const captured=captureSiteEditing(load('<html><head><title>예시 쇼핑몰</title></head><body><main><section id="outer"><h2>아우터 안내</h2><p>사이즈별 실측과 소재를 확인하세요.</p><a id="first" href="/size">상담 문의</a></section><section id="delivery"><h2>배송 안내</h2><a id="second" href="/shipping">상담 문의</a><img src="/outer.jpg" alt="항공점퍼"><p>배송비와 교환-반품 조건을 확인하세요.</p></section></main></body></html>'),url,new Headers());
const report={...fixture,url,pageEvidence:{version:1 as const,requestedUrl:url,finalUrl:url,capturedAt:'2026-10-06T03:00:00.000Z',title:'예시 쇼핑몰',description:'의류 안내',h1:[],h2:[],ctaButtons:['상담 문의'],bodyText:'사이즈별 실측',bodyTruncated:false,siteEditing:captured}};
test('original-location links never pretend that image alt or metadata is visible page text',()=>{
 const img=captured.elements.find(e=>e.kind==='image')!,title=captured.elements.find(e=>e.kind==='title')!,text=captured.elements.find(e=>e.text.includes('교환-반품'))!;
 assert.equal(elementLink(url,img),null);assert.equal(elementLink(url,title),null);
 assert.equal(elementLink('javascript:alert(1)',text),null);
 const link=elementLink(url,text)!;assert.ok(link.includes('/catalog?category=outer#:~:text='));assert.ok(link.includes('%2D'));
 const html=load(renderToStaticMarkup(React.createElement(SourceElementCard,{element:img,url,elements:captured.elements})));
 assert.equal(html('.guide-source-context li[aria-current=true]').length,1);assert.equal(html('.guide-source-context li[aria-current=true]').text().includes('항공점퍼'),true);
 assert.ok(html('.guide-selector').text().includes('/outer.jpg'));assert.ok(html('a').toArray().every(a=>!html(a).attr('href')!.includes(':~:text=')));
});
test('selecting duplicate original copy changes selector, section and real destination together',()=>{
 const first=buildSiteGuide(report,{title:'CTA 버튼',current:'상담 문의'}),last=first.targets.at(-1)!;
 const changed=buildSiteGuide(report,{title:'CTA 버튼',current:'상담 문의',selectedKey:last.key});
 assert.equal(first.focus?.selector,'#first');assert.equal(changed.focus?.selector,'#second');assert.match(changed.location,/배송 안내/);assert.ok(changed.fields.some(f=>f.before.includes('/shipping')));
 const other=buildSiteGuide(report,{title:'본문 수정',topic:'content',selectedKey:last.key});assert.notEqual(other.focus?.key,last.key);
});
test('source selectors uniquely identify repeated menu items and do not duplicate a link parent',()=>{
 const $=load('<body><ul><li><a href="/a">전체</a></li><li><a href="/b">전체</a></li></ul></body>'),site=captureSiteEditing($,url,new Headers());
 assert.equal(site.elements.length,2);for(const e of site.elements)assert.equal($(e.selector).length,1);assert.notEqual(site.elements[0].selector,site.elements[1].selector);assert.equal(elementLink(url,site.elements[0]),null);
});
test('simple goal handles empty, zero, impossible and rounding cases without inventing a rate',()=>{
 assert.equal(calculateSimpleGoal({opportunities:'',completed:'',targetCompleted:''}).required,null);
 assert.equal(calculateSimpleGoal({opportunities:'0',completed:'0',targetCompleted:'30'}).rate,null);
 assert.equal(calculateSimpleGoal({opportunities:'1000',completed:'0',targetCompleted:'30'}).required,null);
 const valid=calculateSimpleGoal({opportunities:'1000',completed:'20',targetCompleted:'30'});assert.equal(valid.rate,.02);assert.equal(valid.required,1500);assert.equal(valid.additional,500);
 assert.equal(calculateSimpleGoal({opportunities:'10',completed:'3',targetCompleted:'4'}).required,14);
 for(const d of [{opportunities:'-1'},{opportunities:'NaN'},{completed:'1001'},{targetCompleted:'1e309'},{completed:'1.5'}])assert.ok(Object.keys(calculateSimpleGoal({opportunities:'1000',completed:'20',targetCompleted:'30',...d}).errors).length);
});
test('industry criteria change evidence-based positions and sizes without changing or padding the source',()=>{
 const input={id:'own',name:'예시',url,own:true,title:'의류 쇼핑몰 사이즈 소재',description:'실측 착용 리뷰와 교환 반품 안내 · 주문 배송'};
 const clothing=scorePosition(input,'의류','ecommerce'),medical=scorePosition(input,'의류','medical');
 assert.ok(clothing.x!>medical.x!);assert.ok(clothing.signalCount!>medical.signalCount!);assert.notDeepEqual([clothing.x,clothing.y],[medical.x,medical.y]);
 assert.equal(scorePosition({...input,description:input.description.repeat(30)},'의류','ecommerce').signalCount,clothing.signalCount);
 for(const category of Object.keys(POSITION_INDUSTRIES) as IndustryCategory[]){assert.equal(positionProfile(category).criteria.length,4);assert.equal(scorePosition({...input,description:''},'의류',category).x,null);}
 const model=buildCompetitorPositioning({...report,competitorAnalysis:{searchKeyword:'의류',ourSite:{url,domain:'example.com',title:input.title,metaDescription:input.description,h1:''},competitors:[]}})!;assert.equal(model.profile.id,'ecommerce');
});
test('Naver conditions are topic-specific and do not turn Google AI eligibility into a Naver promise',()=>{
 assert.ok(GUIDE_EFFECTS.content.sources.includes('naverContent'));assert.ok(GUIDE_EFFECTS.crawl.sources.includes('naverCrawl'));
 assert.match(naverGuideCondition('ai')!,/AI 브리핑 인용 자격을 확인한 것은 아닙니다/);assert.equal(naverGuideCondition('form'),undefined);
});
test('report links have real targets, one execution board and no repeated comparison form or top-only chapter buttons',t=>{
 const prior=(globalThis as typeof globalThis & {React?:typeof React}).React;Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:prior}));
 const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
 assert.equal($('#report-recheck').length,0);assert.equal($('.report-chapter-heading>a').length,0);assert.equal($('#report-execution-board').length,1);
 for(const a of $('a[href^="#"]').toArray()){const hash=$(a).attr('href')!.slice(1);assert.ok($(`[id="${hash}"]`).length,`missing destination ${hash}`);}
 const plan=buildExecutionPlan(report);for(const task of plan.first)assert.equal($(`[id="${task.anchor}"]`).length,1);
});
