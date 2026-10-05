/* Local-only UI fixtures; no production access controls or external providers are bypassed.
 * Run after npm run build: node tests/browser/web-stability.cjs
 * Requires Playwright and PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH (or an installed browser). */
const {spawn,execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {fixture} from './tests/fixtures/report.ts'; console.log(JSON.stringify(fixture))"],{encoding:'utf8'}));
const origin='http://127.0.0.1:3018';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3018'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',data=>logs+=data);server.stderr.on('data',data=>logs+=data);
const hold=()=>{let release;const wait=new Promise(resolve=>release=resolve);return {wait,release};};
const competitor={searchKeyword:'테스트 업종',ourSite:{url:fixture.url,domain:'example.com',title:'테스트 사이트',metaDescription:'설명',h1:'테스트'},competitors:[{rank:1,title:'첫 번째 비교 후보',link:'https://first.example',description:'서비스',domain:'first.example'},{rank:2,title:'두 번째 비교 후보',link:'https://second.example',description:'서비스',domain:'second.example'}]};
const warnings=[{key:'citation',label:'GEO 답변·출처 관측',status:'timeout'}];
(async()=>{let browser;
try{
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===149)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[],checks=[];
 page.on('pageerror',error=>errors.push(error.message));
 let accessMode='internal',mode='first',count=0,shareCalls=0,deepMode='invalid',saved;
 const first=hold(),oldCompetitor=hold();let oldStarted=false;
 await page.route('**/api/access',route=>route.fulfill({json:accessMode==='internal'?{kind:'internal'}:{kind:'account'}}));
 await page.route('**/api/analyze',async route=>{
   ++count;
   if(mode==='first'){await first.wait;return route.fulfill({json:{...fixture,oneLineSummary:'안정성 첫 결과',analysisWarnings:warnings,_hasCompetitor:true,_websiteHints:{}}});}
   if(mode==='invalid')return route.fulfill({json:{url:fixture.url,diagnosis:{seo:70}}});
   if(mode==='gateway')return route.fulfill({status:502,contentType:'text/html',body:'Gateway failure'});
   return route.fulfill({json:{...fixture,oneLineSummary:'안정성 새 결과',overallScore:80,analysisWarnings:warnings,_hasCompetitor:true,_websiteHints:{}}});
 });
 await page.route('**/api/competitor',async route=>{
   if(!oldStarted){oldStarted=true;await oldCompetitor.wait;try{await route.fulfill({json:{competitorAnalysis:{...competitor,searchKeyword:'덮어쓰면 안 되는 이전 응답'}}});}catch{}return;}
   return route.fulfill({json:{competitorAnalysis:competitor}});
 });
 await page.route('**/api/share',route=>{
   saved=JSON.parse(route.request().postData()).report;++shareCalls;
   return route.fulfill(shareCalls===1?{status:503,json:{message:'저장 서비스 일시 지연 · 다시 시도해 주세요.'}}:{json:{id:'stable123'}});
 });
 await page.route('**/api/deepdive',route=>{
   if(deepMode==='invalid')return route.fulfill({json:{copyStrategy:{keyMessages:'malformed'}}});
   const target=JSON.parse(route.request().postData()).targetUrl;
   return route.fulfill({json:{domain:new URL(target).hostname,targetUrl:target,fetchedAt:new Date().toISOString(),copyStrategy:{keyMessages:['검증된 상세 응답'],repeatedPhrases:[],toneStyle:'설명'},ctaStyle:{ctaTexts:[],ctaCount:0,analysis:'기본 CTA'},performance:{hasJsonLd:false},trustElements:{hasReview:false,hasContact:true,trustSignals:[]},winPoints:[],summary:'새 경쟁사 상세 결과'}});
 });
 await page.goto(origin);await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);
 await page.locator('.scanner-url-form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await page.getByText('사이트를 분석 중입니다',{exact:true}).waitFor();assert.equal(count,1);first.release();
 await page.getByText('안정성 첫 결과',{exact:true}).waitFor();await page.getByText('핵심 진단은 완료했고, 일부 추가 항목은 확인이 필요합니다',{exact:true}).waitFor();checks.push('duplicate submission blocked; valid report and partial-observation notice rendered');
 async function scan(next){mode=next;await page.locator('.scanner-retry').evaluate(element=>element.open=true);await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill('https://next.example');await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();}
 await scan('invalid');await page.getByText('이전에 완료한 진단 결과는 아래에 유지됩니다.',{exact:true}).waitFor();await page.getByText('안정성 첫 결과',{exact:true}).waitFor();oldCompetitor.release();
 await page.getByText('새 진단을 시작해 이전 경쟁사 분석을 중단했습니다.',{exact:true}).waitFor();assert.equal(await page.getByText('덮어쓰면 안 되는 이전 응답',{exact:true}).count(),0);checks.push('invalid report rejected; previous result survives; obsolete competitor request cancelled');
 await scan('gateway');await page.getByText('서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',{exact:true}).waitFor();await page.getByText('안정성 첫 결과',{exact:true}).waitFor();checks.push('HTML gateway failure explained without losing last result');
 await scan('new');await page.getByText('안정성 새 결과',{exact:true}).waitFor();await page.getByRole('button',{name:'결과 보관·링크 복사',exact:true}).waitFor({state:'visible'});
 await page.getByRole('button',{name:'결과 보관·링크 복사',exact:true}).click();await page.getByText('저장 서비스 일시 지연 · 다시 시도해 주세요.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'결과 보관·링크 복사',exact:true}).click();await page.getByRole('link',{name:origin+'/r/stable123',exact:true}).waitFor();assert.equal(saved.oneLineSummary,'안정성 새 결과');checks.push('share failure is retryable; saved snapshot matches current report');
 await page.getByText('경쟁사 페이지 원문과 상세 분석',{exact:true}).click();await page.getByRole('button',{name:/딥다이브 분석/}).first().click();
 await page.getByText('경쟁사 상세 결과 형식을 확인하지 못했습니다. 다시 시도해 주세요.',{exact:true}).waitFor();await page.getByLabel('닫기',{exact:true}).click();deepMode='valid';
 await page.getByRole('button',{name:/딥다이브 분석/}).nth(1).click();await page.getByText('새 경쟁사 상세 결과',{exact:true}).waitFor();assert.ok((await page.getByRole('dialog').innerText()).includes('second.example'));await page.getByLabel('닫기',{exact:true}).click();checks.push('malformed competitor detail handled; a different competitor opens correctly');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});const measurement=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(measurement.content<=width+1,JSON.stringify(measurement));}checks.push('report and new notice fit 320/390/768/1440px viewports');
 accessMode='malformed';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('접근 권한을 확인하지 못했습니다. 새로고침해 주세요.',{exact:true}).waitFor();checks.push('malformed access response fails closed');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,uncaughtBrowserErrors:errors,analysisRequests:count,shareAttempts:shareCalls},null,2));
}finally{if(browser)await browser.close();server.kill();}
})().catch(error=>{console.error(error);server.kill();process.exitCode=1;});
