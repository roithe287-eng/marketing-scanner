import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {analyzeWebsitePurpose} from '../lib/websitePurpose';
import {buildNonCommerceSegments} from '../lib/nonCommerceStrategy';
import {actionableGuide,applyActionableGuides} from '../lib/actionableGuides';
import {fixture} from './fixtures/report';
import DraftText from '../components/report/DraftText';
import ReadingDisclosure from '../components/ReadingDisclosure';
import {ReportSections} from '../components/report/ReportWorkspace';

const data={url:'https://example.com/',finalUrl:'https://example.com/',title:'메타한방병원',description:'한의과 진료·예약 안내',h1:['메타한방병원'],h2:[],bodyText:'의료진 소개 진료 과목 진료 예약 비급여 항목과 금액',ctaButtons:['예약하기']};
test('each decision stage has a separate landing structure, CTA and completion metric',()=>{
 const purpose=analyzeWebsitePurpose(data);
 const segments=buildNonCommerceSegments(purpose,[{url:data.url,title:data.title,text:data.bodyText}],data.url,data.title);
 assert.equal(segments.length,3);
 assert.equal(new Set(segments.map(s=>JSON.stringify(s.landingBlocks))).size,3);
 assert.equal(new Set(segments.map(s=>s.cta)).size,3);
 assert.equal(new Set(segments.map(s=>s.metric)).size,3);
 assert.match(segments[0].landingBlocks.join(' '),/첫 화면.*이용 대상/);
 assert.match(segments[1].landingBlocks.join(' '),/비교표.*별도 비용.*원자료/);
 assert.match(segments[2].landingBlocks.join(' '),/준비 체크리스트.*완료 안내/);
 assert.ok(segments.every(s=>s.landingBlocks.every(b=>b.endsWith('야 합니다.'))));
});
test('metadata guides specify fields, observed text and saved-value completion checks',()=>{
 const description=actionableGuide({id:'meta_description',status:'warning'},data)!;
 assert.match(description,/meta\[name="description"\]/);assert.match(description,/한의과 진료·예약 안내/);assert.match(description,/description이 1개/);
 const og=actionableGuide({id:'og_tags',status:'pass'},data)!;
 for(const field of ['og:title','og:description','og:image'])assert.ok(og.includes(field));
 assert.match(og,/현재 태그 존재 기준은 충족/);
 assert.equal(actionableGuide({id:'price_info',status:'not_applicable'},data),undefined);
 const blocked={...fixture,checklist:[{id:'title',label:'제목',category:'seo' as const,diagnosis:'수집 차단',status:'review' as const,currentValue:'HTML 원문 미수집',guide:'수집 허용 후 재진단'}]};
 assert.equal(applyActionableGuides(blocked),blocked);
 assert.equal(applyActionableGuides({...fixture,checklist:undefined}).checklist,undefined);
});
test('draft placeholders are bold without executing markup or changing source text',()=>{
 const text='담당: [실제 확인할 내용] / 링크: [원자료 링크·확인일] <script>x</script>';
 const html=renderToStaticMarkup(React.createElement(DraftText,{text}));
 assert.equal((html.match(/class="report-input-needed"/g)||[]).length,2);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
test('Place questions open initially while other report disclosures keep their prior state',()=>{
 const html=renderToStaticMarkup(React.createElement(ReportSections,{chapter:"overview",briefs:{"overview-questions":"질문 8개","overview-other":"기타"},items:[{id:"overview-questions",label:"플레이스·고객 질문",children:"API 결과"},{id:"overview-other",label:"기타",children:"기타"}]}));
 assert.match(html,/<details open="" class="reading-fold section-reading">/);
 assert.equal((html.match(/<details open/g)||[]).length,1);
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(ReadingDisclosure,{title:"일반",children:"내용"})),/<details open/);
});
