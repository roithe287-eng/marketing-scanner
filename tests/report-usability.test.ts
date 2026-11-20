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
import {CompactText} from '../components/report/ReportVisualSummary';
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
 assert.equal(html('.guide-element blockquote').text(),'항공점퍼');assert.equal(html('.guide-source-context').length,0);
 assert.equal(html('.guide-selector').length,0);assert.ok(html('a').toArray().every(a=>!html(a).attr('href')!.includes(':~:text=')));
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

test('reused result content links to its detail without removing unique copy, limits, or timing',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 const sample={
  ...report,
  exampleCopy:{...report.exampleCopy,heroHeadline:'고객을 위한 단체복 주문 제작',subHeadline:'최소 수량은 디자인별로 확인해 주세요.',ctaText:'제작 견적 요청'},
  criticalIssues:[{title:'문의 버튼 검토',priority:'high' as const,problem:'문의 버튼을 확인했습니다. 구매 화면으로 연결되는지는 별도 확인이 필요합니다.',reason:'문의 버튼을 확인했습니다. 구매 화면으로 연결되는지는 별도 확인이 필요합니다.',recommendation:'실제 문의 양식으로 연결하고 모바일에서 제출까지 확인하세요.'}],
  priorityRoadmap:{immediately:['문의 버튼 확인','완료 화면 직접 검토'],thisWeek:['문의 버튼 확인.','접수 수신 테스트'],thisMonth:[]},
  quickWinsDetailed:[{title:'문의 버튼 확인',steps:['모바일에서 문의 버튼을 누르세요.','완료 화면과 담당자 수신 기록을 대조하세요.']}],
 };
 const before=JSON.stringify(sample);
 const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report:sample})));
 const copy=$('#report-view-actions-copy');
 assert.ok(copy.find('a[href="#report-edit-hero"]').length);
 assert.ok(copy.find('a[href="#report-edit-cta"]').length);
 assert.doesNotMatch(copy.text(),/고객을 위한 단체복 주문 제작|제작 견적 요청/);
 assert.match(copy.text(),/최소 수량은 디자인별로 확인해 주세요/);
 assert.ok($('#report-view-actions-board a[href="#report-issue-0"]').length);
 assert.equal($('#report-issue-0 .report-evidence-flow [data-report-role="review"]').length,0);
 assert.match($('#report-issue-0').text(),/구매 화면으로 연결되는지는 별도 확인이 필요합니다/);
 assert.match($('#report-issue-0').text(),/모바일에서 제출까지 확인/);
 assert.equal($('#report-view-actions-schedule .report-roadmap a[href="#report-quick-win-0"]').length,2);
 assert.match($('#report-quick-win-0').text(),/담당자 수신 기록을 대조/);
 assert.match($('#report-view-actions-schedule .report-roadmap').text(),/접수 수신 테스트/);
 assert.equal(JSON.stringify(sample),before);
});

test('coverage warnings explain the affected result while archived quick wins keep their task title and destination',async t=>{
 const {buildReportDocument}=await import('../lib/reportDocument');
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 const saved={
  ...report,
  analysisWarnings:[{key:'citation',status:'timeout' as const,label:'GEO 답변·출처 관측'},{key:'source',status:'unavailable' as const,label:'입력 페이지의 첫 화면만 수집했습니다.'}],
  quickWins:['모바일에서 버튼을 먼저 확인하세요.'],
  quickWinsDetailed:undefined,
  priorityRoadmap:{immediately:['모바일에서 버튼을 먼저 확인하세요'],thisWeek:[],thisMonth:[]},
 };
 const before=JSON.stringify(saved);
 const $=load(renderToStaticMarkup(React.createElement(ReportLayout,{report:saved})));
 assert.match($('.report-coverage-warnings').text(),/입력 페이지의 첫 화면만 수집했습니다/);
 assert.match($('.report-coverage-warnings').text(),/응답 대기 시간 초과/);
 assert.equal($('.report-coverage-warnings a[href="#report-view-geo-observations"]').length,1);
 assert.match($('.report-roadmap-reference').text(),/모바일에서 버튼을 먼저 확인하세요/);
 assert.equal($('.report-roadmap a[href="#report-quick-win-0"]').length,1);
 assert.match($('#report-quick-win-0').text(),/모바일에서 버튼을 먼저 확인하세요/);
 assert.ok(buildReportDocument(saved).some(block=>block.text.includes('응답 대기 시간 초과')));
 assert.equal(JSON.stringify(saved),before);
});

test('checklist guidance reuses an exact saved issue while keeping different evidence and conditions',t=>{
 const previous=(globalThis as typeof globalThis&{React?:typeof React}).React;
 Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:previous}));
 const repeated='메인에서 문의 양식까지 연결하고 수신 기록을 대조하세요.';
 const sample={...report,criticalIssues:[{title:'상담 경로 보완',problem:'상담 링크가 남아 있습니다.',reason:'연결 주소를 검토하세요.',recommendation:repeated,priority:'high' as const}],checklist:[
  {id:'same-task',label:'첫 화면 버튼',category:'conversion' as const,currentValue:'버튼 원문은 상담 문의입니다.',diagnosis:'클릭 후 목적지는 따로 확인하세요.',guide:repeated.slice(0,-1),status:'warning' as const},
  {id:'different-task',label:'모바일 문의',category:'conversion' as const,currentValue:'모바일 버튼을 수집했습니다.',diagnosis:'수신 기록은 확인이 필요합니다.',guide:`${repeated} 24시간 이내 통지 조건을 확인하세요.`,status:'warning' as const},
 ]};
 const before=JSON.stringify(sample),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report:sample})));
 const rows=$('.report-checklist-rows>article');
 assert.equal(rows.eq(0).find('.report-evidence-flow a[href="#report-issue-0"]').length,1);
 assert.equal(rows.find('.guide-proposal').length,0);
 assert.match(rows.eq(0).text(),/버튼 원문은 상담 문의입니다.*클릭 후 목적지는 따로 확인하세요/);
 assert.equal(rows.eq(1).find('.report-evidence-flow a[href="#report-issue-0"]').length,0);
 assert.match(rows.eq(1).find('.report-evidence-flow').text(),/24시간 이내 통지 조건/);
 assert.ok($('#report-issue-0').text().includes(repeated));
 assert.equal(JSON.stringify(sample),before);
});

test('a long passage exposes a named disclosure and reads each sentence once',()=>{
 const lead='가입 조건을 먼저 확인하세요.';
 const long='지역별 접수 담당자에게 제출할 날짜와 서류를 확인하고 신청 가능한 일정을 기록하세요.';
 const later='단, 승인 시점은 개별 안내에 따릅니다.';
 const text=[lead,...Array.from({length:5},(_,i)=>`${i+1}차는 ${long}`),later].join(' ');
 const $=load(renderToStaticMarkup(React.createElement(CompactText,{text,label:'가입 상세 안내'})));
 const summary=$('summary');
 assert.equal($(`[id="${summary.attr('aria-labelledby')}"]`).text(),'가입 상세 안내');
 assert.equal($(`[id="${summary.attr('aria-describedby')}"]`).text(),lead);
 assert.doesNotMatch($('.reading-body').text(),/가입 조건을 먼저 확인하세요/);
 assert.match($('.reading-body').text(),/5차는 지역별 접수 담당자/);
 assert.match($('.reading-body').text(),/단, 승인 시점은 개별 안내/);
});
