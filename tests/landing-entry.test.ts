import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import LandingHero from '../components/LandingHero';
import {firstLandingCard, landingCards, landingCheckWindow} from '../lib/landingActivity';
import {publicLandingReviews} from '../lib/saas/landingActivity';

Object.assign(globalThis,{React});
const render=(props:Partial<React.ComponentProps<typeof LandingHero>>={})=>load(renderToStaticMarkup(
  React.createElement(LandingHero,{onSubmit:()=>{throw new Error('Rendering must not start analysis');},loading:false,...props}),
));

test('entry respects access state without presenting a fake URL input to guests',()=>{
  const guest=render();
  assert.equal(guest('#scanner-start input').length,0);
  assert.equal(guest('#scanner-start a[href="/inquiry"]').length,1);
  assert.equal(guest('#scanner-start a[href="/login"]').length,1);
  const checking=render({checking:true});
  assert.equal(checking('#scanner-start [role="status"]').length,1);
  assert.equal(checking('#scanner-start .scanner-gated-form a, #scanner-start input, #scanner-start button').length,0);
  const allowed=render({allowed:true});
  assert.equal(allowed('#scanner-url').length,1);
  assert.equal(allowed('#scanner-url[required]').length,1);
  assert.equal(allowed('#scanner-url').attr('disabled'),undefined);
  assert.equal(allowed('.scanner-advanced[open]').length,0);
  assert.equal(allowed('#geo-questions').length,1);
  assert.equal(render({allowed:true,loading:true})('#scanner-start button[type="submit"][disabled]').length,1);
});

test('landing examples follow common, noncommerce and commerce order without small shortcuts',()=>{
  const $=render();
  assert.equal($('.scanner-entry-links, .scanner-feature-eyebrow').length,0);
  assert.deepEqual($('.scanner-gate-details>section').toArray().slice(0,3).map(el=>$(el).attr('id')),['scanner-report-features','scanner-sector-preview','scanner-commerce-preview']);
  assert.equal($('.scanner-common-result[open]').length,0);
  assert.equal($('#scanner-report-features #scanner-result-preview').length,1);
  assert.equal($('.scanner-example-title>span').text(),'공통 적용비커머스커머스');
  assert.doesNotMatch($.text(),/FROM SIGNALS TO ACTION|YOUR MARKETING MAP/);
  assert.equal($('.feature-reading').length,6);
  assert.equal($('.feature-reading[open]').length,6);
  assert.equal($('.feature-reading .scanner-feature-description').length,6);
  assert.equal($('.scanner-gate-art img').length,1);
  assert.equal($('.scanner-home-shortcuts, .scanner-entry-intro').length,0);
  assert.equal($('.scanner-industry-options button').length,48);
  const ids=$('[id]').toArray().map(el=>$(el).attr('id'));
  assert.equal(new Set(ids).size,ids.length);
});

test('retry entry retains the real form without duplicating the marketing page',()=>{
  const $=render({allowed:true,compact:true});
  assert.equal($('#scanner-url').length,1);
  assert.equal($('.scanner-gate-details, .scanner-entry-links, .scanner-gate-art, h1').length,0);
  assert.equal($('#scanner-heading').text(),'다른 웹사이트 진단하기');
  assert.equal($('#scanner-live-title').length,0);
});

test('the landing snapshot shows only the cumulative call and completion labels',()=>{
  const $=render();
  const panel=$('[aria-labelledby="scanner-live-title"]');
  assert.equal(panel.find('h2').text(),'누적 진단 현황');
  assert.deepEqual(panel.find('dt').toArray().map(element=>$(element).text()),['URL 호출','진단 완료']);
  assert.doesNotMatch(panel.text(),/자동 확인|최근 3일|실시간/);
});

test('review configuration keeps valid public entries and the next visit starts on another card',()=>{
  const review={title:'보고서 검토',text:'첫 화면에서 바꿀 문장을 정리했습니다.',byline:'공개 승인 별칭',industry:'교육 서비스',sourceUrl:'https://example.com/review'};
  assert.deepEqual(publicLandingReviews('[]'),[]);
  const reviews=publicLandingReviews(JSON.stringify([
    {...review,sourceUrl:'invalid'}, {...review,sourceUrl:'javascript:alert(1)'},
    {...review,sourceUrl:'https://user:pass@example.com/'}, review, review,
  ]));
  assert.deepEqual(reviews,[{...review,id:'review-0',kind:'review'}]);
  const cards=landingCards(reviews);
  assert.equal(cards.length,24);
  assert.equal(firstLandingCard(cards,null,()=>0),cards[0].id);
  assert.equal(firstLandingCard(cards,cards[0].id,()=>0),cards[1].id);
  assert.deepEqual(cards.filter(card=>card.industry==='교육 서비스').map(card=>card.kind),['review','example']);
  const examples=landingCards([]);
  assert.ok(examples.every(card=>card.kind==='example'&&card.industry));
  assert.equal(new Set(examples.map(card=>card.id)).size,24);
  const groups=Object.groupBy(examples,card=>card.industry!);
  assert.equal(Object.keys(groups).length,12);
  assert.ok(Object.values(groups).every(pair=>pair?.length===2));
  const approvedPair=landingCards([...reviews,{...reviews[0],id:'review-1'}]);
  assert.equal(approvedPair.length,24);
  assert.deepEqual(approvedPair.filter(card=>card.industry==='교육 서비스').map(card=>card.kind),['review','review']);
});

test('the landing refresh changes windows at 08:00 Korea time',()=>{
  const today=Date.parse('2026-11-24T08:00:00+09:00');
  const yesterday=Date.parse('2026-11-23T08:00:00+09:00');
  const tomorrow=Date.parse('2026-11-25T08:00:00+09:00');
  assert.deepEqual(landingCheckWindow(today-1),{start:yesterday,next:today});
  assert.deepEqual(landingCheckWindow(today),{start:today,next:tomorrow});
  assert.deepEqual(landingCheckWindow(tomorrow-1),{start:today,next:tomorrow});
});
