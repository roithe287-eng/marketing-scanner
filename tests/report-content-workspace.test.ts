import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import {captureSiteEditing} from '../lib/captureSiteEditing';
import {buildSourceLibrary,buildContentFacets,sourcePageUrl} from '../lib/reportContent';
import {answerSources} from '../lib/answerContent';
import {fixture} from './fixtures/report';
import {serviceReviewReport} from './fixtures/service-review-report';
import ReportLayout from '../components/report/ReportLayout';
import ReportSourceLibrary from '../components/report/ReportSourceLibrary';
import SiteContentOverview from '../components/report/SiteContentOverview';

const url='https://education.example.org/';
test('late service paragraphs and linked reviews survive large menus, while hidden controls do not become evidence',()=>{
 const paragraph='해외 진학 프로그램은 학생의 목표와 준비 상황에 따라 상담과 학교 지원 절차를 안내합니다.';
 const review='고등학교 진학을 준비하며 상담을 통해 학교별 지원 조건과 준비 서류를 확인했습니다. 후기 원문에서 당시 조건을 함께 안내합니다.';
 const $=load(`<body><div class="gnb_wrap">${Array.from({length:150},(_,i)=>`<p>메뉴 ${i} 국가별 프로그램 안내</p>`).join('')}</div><main><h2>진학 프로그램</h2><p>${paragraph}</p><div class="rev"><dl><dd><a href="/reviews/one?idx=7">${review}</a></dd></dl></div><p>18년 평균상담경력</p><div hidden><p>비공개 안내가 본문 근거로 들어가면 안 됩니다.</p></div><div style="display: none"><p>숨겨진 팝업 문구도 수집하지 않습니다.</p></div><a href="javascript:void(0)">신청하기</a><a>상담하기</a></main></body>`);
 const captured=captureSiteEditing($,url,new Headers()),sections=captured.contentSections!;
 assert.ok(sections.some(s=>s.text===paragraph));assert.ok(sections.some(s=>s.text===review&&s.url===url+'reviews/one?idx=7'));assert.ok(sections.some(s=>s.text==='18년 평균상담경력'));
 assert.equal(sections.filter(s=>s.text===review).length,1);assert.ok(!sections.some(s=>/메뉴|비공개|숨겨진/.test(s.text)));
 assert.ok(captured.elements.filter(e=>['신청하기','상담하기'].includes(e.text)).every(e=>!e.href));
 const pool=answerSources({url,finalUrl:url,title:'진학 프로그램',description:'',ogDescription:'',h1:[],h2:[],bodyText:'메뉴뿐인 이전 본문',siteEditing:captured,isJsHeavy:false});
 assert.ok(pool.some(s=>paragraph.includes(s.text)&&s.kind==='body'));assert.ok(pool.some(s=>s.text.includes('후기 원문')));
});

test('source grouping deduplicates copy and tracking URLs without merging different functional destinations',()=>{
 const report=serviceReviewReport(),before=JSON.stringify(report),library=buildSourceLibrary(report);
 const duplicate=library.groups.find(g=>g.text==='초특가 어학연수')!;assert.equal(duplicate.occurrences,3);
 assert.equal(library.links.filter(l=>l.url===url+'consult?type=language').length,1);
 assert.ok(library.links.some(l=>l.url===url+'consult?type=degree'));
 assert.equal(library.links.filter(l=>l.category==='page').length,1);
 assert.equal(sourcePageUrl('https://x.example/a?idx=3&utm_source=naver#:~:text=copy'),'https://x.example/a?idx=3');
 assert.equal(sourcePageUrl('https://x.example/a#apply'),'https://x.example/a#apply');
 assert.equal(sourcePageUrl('https://x.example/a#'),'https://x.example/a');
 assert.equal(sourcePageUrl('https://x.example/a#apply:~:text=copy'),'https://x.example/a#apply');
 assert.equal(sourcePageUrl('https://x.example/#/courses/1'),'https://x.example/#/courses/1');
 assert.equal(sourcePageUrl('javascript:alert(1)'),null);assert.equal(sourcePageUrl('https://user:secret@x.example/'),null);
 assert.equal(JSON.stringify(report),before);
 const overlap=structuredClone(report),node=overlap.pageEvidence.siteEditing.elements.find(e=>e.kind==='text'&&e.text.length>24)!;
 overlap.pageEvidence.siteEditing.contentSections=[{id:'overlap',heading:'서비스 본문',text:node.text,truncated:false,url:url+'detail?idx=2#conditions'}];
 const merged=buildSourceLibrary(overlap),group=merged.groups.find(g=>g.text===node.text)!;
 assert.ok(group.linkIds.some(id=>merged.links.some(l=>l.id===id&&l.url===url+'detail?idx=2#conditions')),'duplicate inventories retain the actual source destination');
});

test('content explanations are traceable to literal source words and do not turn claims into verified performance',()=>{
 const report=serviceReviewReport(),library=buildSourceLibrary(report),facets=buildContentFacets(library);
 for(const facet of facets){for(const evidence of facet.evidence){assert.ok(library.groups.some(g=>g.text===evidence.text));assert.ok(evidence.text.includes(evidence.excerpt.replace(/^…|…$/g,'')));}if(facet.count)assert.match(facet.why,/원문/);}
 assert.ok(facets.find(f=>f.id==='proof')!.evidence.some(e=>/후기|경력/.test(e.text)));
 const $=load(renderToStaticMarkup(React.createElement(SiteContentOverview,{report})));
 assert.equal($('.content-facet-tabs button').length,6);assert.match($.text(),/외부에서 검증한 결과는 아닙니다/);
 const empty=buildContentFacets(buildSourceLibrary({...fixture,pageEvidence:undefined}));assert.ok(empty.every(f=>f.count===0&&f.evidence.length===0));
});

test('source browser bounds the list, preserves a readable original and centralizes external links',()=>{
 const report=serviceReviewReport(),$=load(renderToStaticMarkup(React.createElement(ReportSourceLibrary,{report})));
 assert.ok($('.source-browser-list button').length<=8);assert.equal($('.source-browser-detail blockquote').length,1);
 assert.equal($('.source-library a[target=_blank]').length,0,'links live in the dedicated link directory, not repeated source cards');
 assert.equal($('.guide-element').length,0);assert.ok($('.source-library-stats').text().includes('건 중복 정리'));
});

test('all report categories read continuously and their menus link to individual section starts',t=>{
 const prior=(globalThis as typeof globalThis&{React?:typeof React}).React;Object.assign(globalThis,{React});t.after(()=>Object.assign(globalThis,{React:prior}));
 const report=serviceReviewReport(),before=JSON.stringify(report),$=load(renderToStaticMarkup(React.createElement(ReportLayout,{report})));
 assert.equal($('.report-chapter:not([hidden])').length,5);
 assert.deepEqual($('.report-chapter').toArray().map(e=>$(e).attr('data-chapter')),['overview','geo','search','competition','actions']);
 for(const chapter of $('.report-chapter').toArray()){
  const panels=$(chapter).find('[data-report-panel]'),links=$(chapter).find('.report-section-nav a');
  assert.ok(panels.length>1);
  assert.equal(panels.filter('[hidden]').length,0,'no category requires selection to reveal its content');
  assert.equal(links.length,panels.length);
  assert.deepEqual(links.toArray().map(e=>$(e).attr('href')),panels.toArray().map(e=>`#${$(e).attr('id')}`));
 }
 assert.equal($('.report-section-nav button').length,0);
 assert.equal($('.keyword-workspace>div[hidden]').length,0);
 assert.equal($('.keyword-workspace-nav a').length,3);
 assert.equal($('.report-nav a[aria-current="location"]').attr('href'),'#report-overview');
 assert.equal($('#report-overview .site-content-overview').length,1);assert.equal($('details:not([open])').length,0);
 for(const group of ['execution-tasks','growth-tasks','answer-questions','naver-checks','official-docs']){
  assert.ok($(`[data-report-item-group="${group}"]`).length>1,group);
  assert.equal($(`[data-report-item-group="${group}"]:not([hidden])`).length,1,`${group} bounds visible detail while retaining every item`);
 }
 const ids=$('[id]').toArray().map(e=>$(e).attr('id'));assert.equal(ids.length,new Set(ids).size);
 for(const link of $('a[href^="#"]').toArray())assert.ok(ids.includes($(link).attr('href')!.slice(1)),$(link).attr('href'));
 assert.equal(JSON.stringify(report),before);
});
