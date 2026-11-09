import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {middleware, config} from '../middleware';
import robots from '../app/robots';
import {isRestrictedAiCollector} from '../lib/security/aiCollection';
import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server';

const request = (path:string, ua?:string) => new NextRequest(`https://mktscanner.com${path}`, {headers:ua?{'user-agent':ua}:{}});

test('training and user-request AI fetches get a non-cacheable 403 before page or API content', () => {
  const agents = [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    'ClaudeBot/1.0', 'Claude-User/1.0', 'Perplexity-User/1.0', 'CCBot/2.0',
    'meta-externalagent/1.1', 'meta-externalfetch/1.0', 'Bytespider', 'gptbot/1.4',
  ];
  for(const ua of agents) for(const path of ['/', '/pricing', '/r/example', '/api/share?id=example']) {
    const res=middleware(request(path,ua));
    assert.equal(res.status,403,`${ua} ${path}`);
    assert.match(res.headers.get('Cache-Control')||'',/no-store/);
    assert.equal(res.headers.get('Vercel-CDN-Cache-Control'),'no-store');
    assert.equal(res.headers.get('x-middleware-next'),null);
  }
});

test('ordinary browsers, search, advertising, previews and monitoring are not newly blocked', () => {
  for(const ua of [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/156.0.0.0 Safari/537.36',
    'Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'bingbot/2.0', 'Applebot/0.1', 'OAI-SearchBot/1.3', 'Claude-SearchBot/1.0',
    'PerplexityBot/1.0', 'AdsBot-Google', 'OAI-AdsBot/1.0', 'facebookexternalhit/1.1',
    'kakaotalk-scrap/1.0', 'UptimeRobot/2.0', 'curl/8.0', '',
  ]) {
    assert.equal(middleware(request('/',ua)).headers.get('x-middleware-next'),'1',ua);
  }
  assert.equal(isRestrictedAiCollector('MyGPTBotHelper/1.0'),false);
  assert.equal(isRestrictedAiCollector('GPTBot-Preview/1.0'),false);
});

test('robots policy is readable to blocked collectors while protected paths retain no-store/noindex', () => {
  assert.equal(middleware(request('/robots.txt','GPTBot/1.4')).headers.get('x-middleware-next'),'1');
  for(const path of ['/api/access','/r/example','/account','/manage','/setup','/activate','/login']) {
    const res=middleware(request(path,'Googlebot/2.1'));
    assert.equal(res.headers.get('x-middleware-next'),'1');
    assert.match(res.headers.get('Cache-Control')||'',/no-store/);
    assert.match(res.headers.get('X-Robots-Tag')||'',/noindex/);
  }
});

test('middleware covers documents, RSC, shared reports and APIs without changing static asset handling', () => {
  for(const url of ['/', '/?__rsc=test', '/r/example', '/api/share', '/robots.txt']) {
    assert.equal(unstable_doesMiddlewareMatch({config,url}),true,url);
  }
  for(const url of ['/_next/static/chunks/main.js','/_next/image?url=logo.png&w=64&q=75']) {
    assert.equal(unstable_doesMiddlewareMatch({config,url}),false,url);
  }
});

test('robots separates AI collection from search and excludes private report routes', () => {
  const rules=robots().rules;
  assert.ok(Array.isArray(rules));
  const general=rules.find(rule=>rule.userAgent==='*');
  assert.equal(general?.allow,'/');
  assert.ok(general?.disallow?.includes('/r/'));
  const denied=rules.find(rule=>Array.isArray(rule.userAgent)&&rule.userAgent.includes('GPTBot'));
  assert.equal(denied?.disallow,'/');
  for(const agent of ['ChatGPT-User','Google-Extended','Applebot-Extended']) assert.ok(denied?.userAgent.includes(agent));
  for(const agent of ['Googlebot','Yeti','Bingbot','OAI-SearchBot','Claude-SearchBot','PerplexityBot']) assert.equal(denied?.userAgent.includes(agent),false);
});
