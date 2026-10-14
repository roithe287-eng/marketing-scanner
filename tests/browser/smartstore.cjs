/* Local UI fixtures only. Does not authenticate to production or query NAVER. */
const {spawn,execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {fixture} from './tests/fixtures/report.ts'; console.log(JSON.stringify(fixture))"],{encoding:'utf8'}));
const origin='http://127.0.0.1:3022';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3022'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
(async()=>{let browser;try{
  for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let fail=false;
  await page.route('**/api/access',route=>route.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/analyze',route=>{
    const {url}=route.request().postDataJSON();requests.push(url);
    if(fail)return route.fulfill({status:503,json:{message:'검수용 일시 오류'}});
    if(!url.includes('smartstore.naver.com'))return route.fulfill({json:{...fixture,oneLineSummary:'일반 웹사이트 검수 결과',_hasCompetitor:false}});
    const observed=url.includes('products');
    return route.fulfill({json:{kind:'smartstore',version:1,url,storeUrl:'https://smartstore.naver.com/wodkq',storeId:'wodkq',...(observed?{productId:'123'}:{}),observedAt:'2026-10-14T01:00:00Z',status:observed?'observed':'limited',reason:observed?'공개 HTML에서 확인한 정보입니다.':'수집 정책에 따라 페이지 콘텐츠를 수집하지 않았습니다.',observations:observed?[{id:'productName',label:'상품명',value:'검수용 실제 관측 상품명',note:'입력한 상품 페이지의 공개 데이터입니다.'}]:[]}});
  });
  await page.goto(origin);
  const input=page.getByLabel('분석할 웹사이트 URL',{exact:true});
  await input.fill('https://smartstore.naver.com');
  await page.getByText('스마트스토어 · 제한 분석 안내',{exact:true}).waitFor();
  await page.getByRole('button',{name:'스토어 제한 분석 시작',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'업체 식별자가 포함된'}).waitFor();assert.equal(requests.length,0);
  await input.fill('https://smartstore.naver.com/wodkq');
  await page.getByRole('button',{name:'스토어 제한 분석 시작',exact:true}).click();
  await page.getByRole('heading',{name:'페이지 콘텐츠 확인이 제한되었습니다',exact:true}).waitFor();
  assert.equal(await page.locator('.recharts-wrapper').count(),0);assert.equal(await page.getByRole('button',{name:/PDF/}).count(),0);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(size.content<=size.width+1,JSON.stringify(size));}
  await page.locator('#report-area').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/scanner-smartstore-desktop.png'});
  await page.setViewportSize({width:390,height:900});await page.locator('#report-area').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/scanner-smartstore-mobile.png'});
  async function scan(url){await page.locator('.scanner-retry').evaluate(el=>el.open=true);await input.fill(url);await page.getByRole('button',{name:url.includes('smartstore.naver.com')?'스토어 제한 분석 시작':'내 사이트 진단 시작',exact:true}).click();}
  await scan('https://smartstore.naver.com/wodkq/products/123');await page.getByText('검수용 실제 관측 상품명',{exact:true}).waitFor();
  fail=true;await scan('https://smartstore.naver.com/wodkq');await page.getByText('검수용 일시 오류',{exact:true}).waitFor();await page.getByText('검수용 실제 관측 상품명',{exact:true}).waitFor();
  fail=false;await scan('https://example.com');await page.getByText('일반 웹사이트 검수 결과',{exact:true}).waitFor();assert.equal(await page.locator('.smartstore-report').count(),0);assert.equal(await page.locator('#smartstore-url-notice').count(),0);
  await scan('https://smartstore.naver.com/wodkq');await page.getByRole('heading',{name:'페이지 콘텐츠 확인이 제한되었습니다',exact:true}).waitFor();assert.equal(await page.getByText('일반 웹사이트 검수 결과',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:['input notice','missing store rejected before request','limited results hide generic scores and exports','320/390/768/1440px no overflow','public product observations','failed request preserves last result','store to website and website to store transitions'],requests:requests.length,uncaughtBrowserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill();}})().catch(error=>{console.error(error);server.kill();process.exitCode=1;});
