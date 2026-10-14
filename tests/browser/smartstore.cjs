/* Local UI fixtures only. Does not authenticate to production or query NAVER.
   Optional: PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH for a preinstalled Chromium. */
const {spawn,execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {fixture} from './tests/fixtures/report.ts'; console.log(JSON.stringify(fixture))"],{encoding:'utf8'}));
const origin='http://127.0.0.1:3022';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3022'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
(async()=>{let browser;try{
  for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  let fail=false;
  await page.route('**/api/access',route=>route.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/analyze',route=>{
    const {url}=route.request().postDataJSON();requests.push(url);
    if(fail)return route.fulfill({status:503,json:{message:'검수용 일시 오류'}});
    if(!/\b(smartstore|brand)\.naver\.com\//.test(url))return route.fulfill({json:{...fixture,oneLineSummary:'일반 웹사이트 검수 결과',_hasCompetitor:false}});
    const target=new URL(url),parts=target.pathname.split('/'),brand=target.hostname.includes('brand.'),observed=brand||url.includes('products');
    const host=target.hostname.replace(/^m\./,''),storeUrl=`https://${host}/${parts[1]}`,productId=parts[3];
    return route.fulfill({json:{kind:'smartstore',version:1,url:storeUrl+(productId?`/products/${productId}`:''),storeUrl,storeId:parts[1],...(productId?{productId}:{}),observedAt:'2026-10-14T01:00:00Z',status:observed?'observed':'limited',reason:observed?'공개 HTML에서 확인한 정보입니다.':'수집 정책에 따라 페이지 콘텐츠를 수집하지 않았습니다.',observations:observed?[{id:productId?'productName':'title',label:productId?'상품명':'페이지 제목',value:brand?'검수용 브랜드 관측 정보':'검수용 실제 관측 상품명',note:'입력한 페이지의 공개 데이터입니다.'}]:[]}});
  });
  await page.goto(origin);
  const input=page.getByLabel('분석할 웹사이트 URL',{exact:true});
  for(const [host,label] of [['smartstore','스마트스토어'],['brand','브랜드스토어']]){
    await input.fill(`https://${host}.naver.com`);
    await page.getByText(`${label} · 제한 분석 안내`,{exact:true}).waitFor();
    await page.getByRole('button',{name:'스토어 제한 분석 시작',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'업체 식별자가 포함된'}).waitFor();assert.equal(requests.length,0);
  }
  await input.fill('https://smartstore.naver.com/wodkq');
  await page.getByRole('button',{name:'스토어 제한 분석 시작',exact:true}).click();
  await page.getByRole('heading',{name:'페이지 콘텐츠 확인이 제한되었습니다',exact:true}).waitFor();
  assert.equal(await page.locator('.report-chapter').count(),5);assert.equal(await page.locator('.store-unavailable').count(),27);
  assert.equal(await page.getByRole('button',{name:/PDF/}).count(),0);
  assert.equal(await page.locator('.store-example-blur[inert][aria-hidden="true"]').count(),27);
  assert.ok(await page.locator('.store-example-blur').evaluateAll(els=>els.every(el=>getComputedStyle(el).filter==='blur(4px)'&&getComputedStyle(el).pointerEvents==='none')));
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(size.content<=size.width+1,JSON.stringify(size));
    const bounds=await page.locator('.store-unavailable').evaluateAll(els=>els.map(el=>{const box=el.getBoundingClientRect(),overlay=el.querySelector('.store-unavailable-overlay').getBoundingClientRect();return{card:box.width,overlay:overlay.width,bottom:box.bottom,overlayBottom:overlay.bottom};}));
    assert.ok(bounds.every(b=>b.overlay<=b.card&&b.overlayBottom<=b.bottom),`overlay overflow at ${width}`);
  }
  await page.locator('[data-store-section="radar"]').screenshot({path:'/tmp/scanner-store-blur-desktop.png'});
  await page.setViewportSize({width:390,height:900});await page.locator('[data-store-section="keywords"]').screenshot({path:'/tmp/scanner-store-blur-mobile.png'});
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.store-example-blur').first().evaluate(el=>getComputedStyle(el).filter),'blur(4px)');await page.emulateMedia({media:'screen'});
  await page.locator('.report-nav').getByRole('link',{name:/검색·페이지/}).click();assert.equal(new URL(page.url()).hash,'#report-search');
  const goal=page.locator('[data-store-section="goal-calculator"]');
  await goal.getByLabel('현재 방문 횟수',{exact:false}).fill('1000');
  await goal.getByLabel('문의·구매가 완료된 방문 횟수',{exact:false}).fill('20');
  await goal.getByLabel('목표로 하는 완료 방문 횟수',{exact:false}).fill('30');
  await goal.getByRole('heading',{name:'필요한 방문 1,500회'}).waitFor();
  await goal.getByRole('button',{name:'검색 클릭 목표',exact:true}).click();assert.equal(await goal.getByLabel('현재 검색 노출수',{exact:false}).inputValue(),'');
  const budget=page.locator('[data-store-section="budget-calculator"]');
  await budget.getByLabel('동일 기간 광고비 (원)',{exact:true}).fill('100000');await budget.getByLabel('동일 기간 전환 수 (건)',{exact:true}).fill('10');await budget.getByLabel('직접 정한 목표 CPA (원)',{exact:true}).fill('8000');
  await budget.getByText('20,000원',{exact:true}).waitFor();
  async function scan(url){await page.locator('.scanner-retry').evaluate(el=>el.open=true);await input.fill(url);await page.getByRole('button',{name:/\b(smartstore|brand)\.naver\.com/.test(url)?'스토어 제한 분석 시작':'내 사이트 진단 시작',exact:true}).click();}
  await scan('https://brand.naver.com/dongwon');await page.getByText('검수용 브랜드 관측 정보',{exact:true}).waitFor();
  assert.equal(await page.locator('.smartstore-result-url').textContent(),'https://brand.naver.com/dongwon');assert.equal(await page.locator('.smartstore-tag').textContent(),'브랜드스토어 · 제한 분석');
  assert.equal(await page.locator('[data-store-section="budget-calculator"]').getByLabel('동일 기간 광고비 (원)',{exact:true}).inputValue(),'');
  await page.locator('.smartstore-report-head').screenshot({path:'/tmp/scanner-brandstore-mobile.png'});
  await scan('https://m.brand.naver.com/dongwon/products/456?NaPm=secret');await page.getByText('상품 456',{exact:true}).waitFor();assert.equal(await page.locator('.smartstore-result-url').textContent(),'https://brand.naver.com/dongwon/products/456');
  await scan('https://smartstore.naver.com/wodkq/products/123');await page.getByText('검수용 실제 관측 상품명',{exact:true}).waitFor();
  fail=true;await scan('https://smartstore.naver.com/wodkq');await page.getByText('검수용 일시 오류',{exact:true}).waitFor();await page.getByText('검수용 실제 관측 상품명',{exact:true}).waitFor();
  fail=false;await scan('https://example.com');await page.getByText('일반 웹사이트 검수 결과',{exact:true}).waitFor();assert.equal(await page.locator('.smartstore-report').count(),0);assert.equal(await page.locator('#smartstore-url-notice').count(),0);assert.equal(await page.locator('.store-unavailable').count(),0);
  await scan('https://smartstore.naver.com/wodkq');await page.getByRole('heading',{name:'페이지 콘텐츠 확인이 제한되었습니다',exact:true}).waitFor();assert.equal(await page.getByText('일반 웹사이트 검수 결과',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:['Smartstore and Brandstore input notice / missing store validation','five report chapters and 27 inert, blurred example sections','320/390/768/1440px layout and overlays','print keeps blur','chapter navigation','manual goal and budget calculations','Brandstore home and mobile product identities','manual inputs reset between stores','public product observations','failed request preserves last result','store / website transitions'],requests:requests.length,uncaughtBrowserErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill();}})().catch(error=>{console.error(error);server.kill();process.exitCode=1;});
