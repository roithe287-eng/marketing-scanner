import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from 'cheerio';
import LandingHero from '../components/LandingHero';

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

test('landing examples follow noncommerce, commerce and common order without small shortcuts',()=>{
  const $=render();
  assert.equal($('.scanner-entry-links, .scanner-feature-eyebrow').length,0);
  assert.deepEqual($('.scanner-gate-details>section').toArray().slice(0,3).map(el=>$(el).attr('id')),['scanner-sector-preview','scanner-commerce-preview','scanner-report-features']);
  assert.equal($('.scanner-common-result[open]').length,0);
  assert.equal($('#scanner-report-features #scanner-result-preview').length,1);
  assert.equal($('.scanner-example-title>span').text(),'비커머스커머스공통 적용');
  assert.doesNotMatch($.text(),/FROM SIGNALS TO ACTION|YOUR MARKETING MAP/);
  assert.equal($('.feature-reading').length,6);
  assert.equal($('.feature-reading[open]').length,0);
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
});
