// Run after building the app: node --import tsx tests/browser/scan-recovery.cjs
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {createServer}=require('node:net');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const {fixture}=require('../fixtures/report.ts');

const secondUrl='https://second.example/catalogue';
const peer={rank:1,title:'부분가발 전문몰',description:'인모 부분가발 판매',link:'https://peer.example/',domain:'peer.example',metaTitle:'부분가발 상품 안내'};
const good={searchKeyword:'부분가발',competitors:[peer]};
const hold=()=>{let resolve;const wait=new Promise(done=>resolve=done);return {wait,resolve};};
const pause=ms=>new Promise(done=>setTimeout(done,ms));
const viewport={width:390,height:844};
async function loopback(){
  const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});
  const origin='http://127.0.0.1:'+port;let log='';
  server.stdout.on('data',data=>log+=data);server.stderr.on('data',data=>log+=data);
  for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)return {server,origin};}catch{}await pause(100);}
  server.kill();throw new Error(log);
}

async function partialActivity(browser,origin,errors){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-11-25T04:00:00Z')});
  const review={id:'review-0',kind:'review',title:'원문 비교',text:'표본에서 읽은 내용입니다.',byline:'테스트'};
  let reads=0;
  await page.route('**/api/access',route=>route.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/landing-activity',route=>{
    reads++;
    return route.fulfill({json:reads===1?{activity:{requested:10,completed:3}}:reads===2?{reviews:[review]}:{activity:{requested:18,completed:4},reviews:[]}});
  });
  await page.goto(origin);await page.locator('#scanner-url').waitFor();
  const count=page.locator('.scanner-live-totals dd strong').first();
  await count.filter({hasText:/^10$/}).waitFor();
  await page.clock.fastForward(60_500);await page.getByText('직전에 확인한 누적 집계입니다.').waitFor();
  assert.equal(await count.textContent(),'10');assert.equal(await page.locator('#scanner-carousel-title').textContent(),'업종별 이용 후기');
  await page.clock.fastForward(300_500);await count.filter({hasText:/^18$/}).waitFor();
  assert.equal(reads,3);assert.equal(await page.getByText('직전에 확인한 누적 집계입니다.').count(),0);
  assert.equal(await page.locator('#scanner-carousel-title').textContent(),'업종별 이용 후기 예시');
  await page.close();
}

async function scanJourney(browser,origin,errors){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(9000);
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
    writeText:link=>{window.copiedLink=link;return new Promise(done=>window.releaseCopy=done);},
  }}));
  const failed=hold(),late=hold();
  let mainCalls=0,competitorCalls=0,detailCalls=0,shareCalls=0;
  await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/landing-activity',r=>r.fulfill({json:{activity:{requested:10,completed:3},reviews:[]}}));
  await page.route('**/api/analyze',async r=>{
    const {url}=r.request().postDataJSON();mainCalls++;
    if(mainCalls===2){await failed.wait;return r.fulfill({status:503,json:{message:'테스트 수집 지연'}});}
    if(mainCalls===5)return r.fulfill({json:{kind:'restricted_website',version:1,url,observedAt:new Date().toISOString(),reason:'browser_check',httpStatus:200,searchStatus:'unavailable',sources:[],communityCandidate:false}});
    if(mainCalls===6)return r.fulfill({json:{kind:'smartstore',version:1,url,storeUrl:url,storeId:'sample',observedAt:new Date().toISOString(),status:'limited',reason:'공개 페이지 수집 제한',observations:[]}});
    return r.fulfill({json:{...fixture,url,meta:{siteName:'진단 표본 '+mainCalls},_hasCompetitor:true,_websiteHints:{title:'부분가발'}}});
  });
  await page.route('**/api/competitor',async r=>{
    competitorCalls++;
    if(competitorCalls===1)return r.fulfill({status:504,json:{message:'경쟁사 조회 시간 초과'}});
    if(competitorCalls===3){await late.wait;try{await r.fulfill({json:{competitorAnalysis:good}});}catch{}return;}
    if(competitorCalls===4)return r.fulfill({json:{competitorAnalysis:null,competitorStatus:{status:'unavailable',message:'현재 외부 경쟁사 조회를 이용할 수 없습니다.'}}});
    return r.fulfill({json:{competitorAnalysis:good}});
  });
  await page.route('**/api/deepdive',r=>{detailCalls++;return r.fulfill(detailCalls===1?{status:503,json:{message:'상세 조회 지연'}}:{status:403,json:{message:'상세 조회 이용 권한을 확인해 주세요.'}});});
  await page.route('**/api/share',r=>{shareCalls++;const now=Date.now();return r.fulfill({json:{id:'sample123',createdAt:now,expiresAt:now+7*86400000}});});
  async function submit(url){
    const retry=page.locator('.scanner-retry');
    if(await retry.count()&&await retry.getAttribute('open')===null)await retry.locator('summary').first().click();
    await page.locator('#scanner-url').fill(url);
    await page.locator('button[type=submit].scanner-submit').click();
  }
  async function section(id){
    // The continuous report keeps its chapter navigation even when the subsection is folded.
    await page.locator('.report-section-nav a[href="#report-view-'+id+'"]').click({force:true});
    const folded=page.locator('#report-view-'+id+' > details.section-reading:not([open]) > summary');
    if(await folded.count())await folded.click();
  }
  const retry=page.getByRole('button',{name:'비교 후보 다시 찾기',includeHidden:true});
  const kpi=page.locator('.simple-kpi-fields input').first();
  await page.goto(origin);await submit(fixture.url);
  await page.locator('[data-outcome="competition"]').filter({hasText:'경쟁사 조회 시간 초과'}).waitFor();
  await section('actions-kpi');await kpi.fill('150');
  await submit(secondUrl);await page.getByText('새 URL을 진단하고 있습니다',{exact:true}).waitFor();
  assert.equal(await page.locator('#report-area').count(),1);assert.equal(await page.locator('#report-area').isVisible(),false);
  failed.resolve();await page.getByText('새 진단을 완료하지 못했습니다',{exact:true}).waitFor();
  assert.equal(await kpi.inputValue(),'150');assert.equal(await retry.count(),1);
  assert.match(await page.locator('.scanner-scan-feedback [href="#report-area"]').innerText(),/example\.com/);
  assert.match(await page.locator('.scanner-feedback-url').innerText(),/second\.example/);
  assert.match(await page.locator('.scanner-retry>summary').innerText(),/이전 진단 결과/);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:850});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow at '+width);
  }
  await section('competition-map');await retry.click();
  await page.locator('[data-outcome="competition"]').filter({hasText:'저장 후보 1곳'}).waitFor();
  assert.equal(mainCalls,2);assert.equal(competitorCalls,2);
  await section('competition-pages');await page.getByRole('button',{name:'peer.example 페이지 상세 분석'}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'이 페이지 다시 분석'}).click();
  await dialog.getByText('상세 조회 이용 권한을 확인해 주세요.').waitFor();
  assert.equal(await dialog.getByRole('button',{name:'이 페이지 다시 분석'}).count(),0);
  await dialog.getByLabel('닫기',{exact:true}).click();
  const share=page.locator('.report-share-button');await share.click();
  await page.waitForFunction(()=>typeof window.releaseCopy==='function');await page.evaluate(()=>window.releaseCopy());
  await page.waitForFunction(()=>!document.querySelector('.report-share-button').disabled);
  assert.equal(shareCalls,1);assert.equal(await page.evaluate(()=>window.copiedLink),origin+'/r/sample123');
  await submit(fixture.url);await page.locator('.report-hero h1').filter({hasText:'진단 표본 3'}).waitFor();
  assert.equal(await kpi.inputValue(),'');assert.equal(await retry.count(),0);assert.equal(await page.evaluate(()=>location.hash),'');
  await page.waitForFunction(()=>document.activeElement?.id==='report-area');
  await submit(secondUrl);await page.locator('[data-outcome="competition"]').filter({hasText:'경쟁사 조회 이용 불가'}).waitFor();
  late.resolve();await pause(100);assert.equal(await page.locator('.report-competitor-list a[href="'+peer.link+'"]').count(),0);
  assert.equal(await retry.count(),0);assert.equal(competitorCalls,4);
  await submit('https://restricted.example/');await page.locator('.scanner-scan-feedback').getByText('사이트 원문을 읽을 수 없습니다').waitFor();
  assert.equal(await page.locator('#report-area.restricted-result').count(),1);
  await submit('https://smartstore.naver.com/sample');await page.locator('#report-area.smartstore-report').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='report-area');
  await page.close();
}

async function singleUse(browser,origin,errors){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.on('pageerror',error=>errors.push(error.message));
  const now=Date.now();
  const account={id:'sample',name:'검수',email:'qa@example.com',company:'표본',role:'customer',status:'approved',plan:'single',expiresAt:now+86400000,
    monthlyLimit:1,version:1,createdAt:now,features:{competitor:false,deepdive:false,reports:false}};
  await page.route('**/api/access',r=>r.fulfill({json:{kind:'account',account,usage:{analyze:0}}}));
  await page.route('**/api/landing-activity',r=>r.fulfill({json:{activity:{requested:0,completed:0},reviews:[]}}));
  let calls=0;await page.route('**/api/analyze',r=>{calls++;return r.fulfill({json:fixture});});
  await page.goto(origin);const input=page.locator('#scanner-url');
  await input.fill('https://brand.naver.com/sample');await page.locator('#smartstore-url-notice').filter({hasText:'1회 진단권'}).waitFor();
  await input.press('Enter');assert.equal(calls,0);assert.ok(await page.locator('.scanner-submit').isDisabled());
  await input.fill(fixture.url);assert.ok(await page.locator('.scanner-submit').isEnabled());await page.locator('.scanner-submit').click();
  await page.locator('#report-area').waitFor();assert.equal(calls,1);await page.close();
}
(async()=>{
  const {server,origin}=await loopback();let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
    const errors=[];
    await partialActivity(browser,origin,errors);console.log('PASS partial activity, old totals, backoff and recovered actual counts');
    await scanJourney(browser,origin,errors);console.log('PASS replacement failure, retained inputs, candidate retry, clipboard, stale response, restricted/store results and four widths');
    await singleUse(browser,origin,errors);console.log('PASS one-time plan rejects store locally and accepts a regular URL');
    assert.deepEqual(errors,[]);console.log('Uncaught browser errors: 0');
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
