/* Local synthetic report. No provider calls or production account changes. */
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {richReport} from './tests/fixtures/rich-report.ts'; console.log(JSON.stringify(await richReport()))"],{encoding:'utf8'}));
const folder='/tmp/scanner-radar-retention';fs.mkdirSync(folder,{recursive:true});
const origin='http://127.0.0.1:3022',server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3022'],{stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
(async()=>{let browser;try{
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
 await page.route('**/api/analyze',r=>r.fulfill({json:{...fixture,_hasCompetitor:false}}));
 const savedAt=Date.now(),savedExpiry=savedAt+604800000,saves=[];
 await page.route('**/api/share',r=>{saves.push(r.request().postDataJSON().report);return r.fulfill({json:{id:'saved123',createdAt:savedAt,expiresAt:savedExpiry}});});
 await page.route('**/api/share?*',r=>r.fulfill({json:{diagnosisBaseline:{version:1,reportId:'prior123',expiresAt:savedExpiry,url:fixture.url,overallScore:fixture.overallScore,diagnosis:fixture.diagnosis,checks:[]}}}));
 await page.goto(origin);
 const preview=page.locator('.scanner-radar-preview');await preview.waitFor();
 await preview.screenshot({path:folder+'/landing-radar-desktop.png'});
 await page.screenshot({path:folder+'/landing-desktop.png',fullPage:true});
 await page.getByText('GEO 질문·이전 보고서 비교',{exact:false}).click();await page.getByText('이전 보고서와 재진단 비교하기',{exact:true}).click();
 await page.getByText('공유 보고서는 최대 7일간 보관됩니다.',{exact:false}).waitFor();
 await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
 await page.getByText(fixture.oneLineSummary,{exact:true}).waitFor();
 assert.doesNotMatch(await page.locator('body').innerText(),/Gemini|gemini|제미나이/);
 const radar=page.locator('.report-radar');
 const directions=[];for(let i=0;i<8;i++){
  await radar.locator('.report-axis-grid button').nth(i).click();
  const checked=await radar.locator('svg.diagnosis-radar-graphic').evaluate(svg=>{
   const arrow=svg.querySelector('[data-radar-arrow]'),bound=svg.querySelector('[data-radar-boundary]');
   const coords=p=>[...p.points].map(v=>({x:v.x,y:v.y}));const shape=coords(bound);
   const inside=p=>shape.every((a,i)=>{const b=shape[(i+1)%shape.length];return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>=-0.1;});
   const points=coords(arrow.querySelector('polygon')),line=arrow.querySelector('line');points.push({x:line.x1.baseVal.value,y:line.y1.baseVal.value},{x:line.x2.baseVal.value,y:line.y2.baseVal.value});
   const labels=[...svg.querySelectorAll('.diagnosis-radar-label')].map(t=>{const a=t.getBBox(),b=t.previousElementSibling.getBBox();return a.x>=b.x-.1&&a.y>=b.y-.1&&a.x+a.width<=b.x+b.width+.1&&a.y+a.height<=b.y+b.height+.1;});
   return {inside:points.every(inside),clip:!!arrow.getAttribute('clip-path'),labelsFit:labels.every(Boolean),diameter:bound.getBBox().width};
  });assert.ok(checked.inside&&checked.clip&&checked.labelsFit,JSON.stringify({i,checked}));assert.equal(checked.diameter,264);directions.push(checked);
 }
 const widths=[];for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1050});await radar.scrollIntoViewIfNeeded();
  const measurement=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(measurement.content<=width+1);widths.push(measurement);
  if(width===390||width===1440){await radar.screenshot({path:folder+`/result-radar-${width}.png`});await page.screenshot({path:folder+`/result-full-${width}.png`,fullPage:true});}
 }
 await page.getByRole('button',{name:'결과 보관·링크 복사',exact:true}).click();await page.getByText('에 자동 만료됩니다.',{exact:false}).waitFor();
 await page.locator('.report-retention-note').getByText('열람 종료',{exact:false}).waitFor();
 assert.equal(saves.length,1);
 await page.getByLabel('이전 보고서 보관 링크 또는 ID',{exact:true}).fill('prior123');
 await page.getByRole('button',{name:'이전 결과 연결',exact:true}).click();
 await page.getByText('이전 결과를 연결했습니다.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'결과 보관·링크 복사',exact:true}).click();await page.getByText('에 자동 만료됩니다.',{exact:false}).waitFor();
 assert.equal(saves.length,2);assert.equal(saves[1].sharedRetention.reportId,'saved123');assert.equal(saves[1].sharedRetention.expiresAt,savedExpiry);
 // Exercise the visible expiry guard without waiting seven days, using Playwright's clock.
 const expiry=Date.now()+2000;fixture.sharedRetention={reportId:'saved123',createdAt:Date.now()-604798000,expiresAt:expiry};
 await page.reload();await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
 await page.getByRole('heading',{name:'보고서 보관 기간이 만료되었습니다',exact:true}).waitFor({timeout:7000});assert.equal(await page.locator('.report-radar').count(),0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({widths,directions:directions.length,labels:'inside compact boxes',arrow:'all 8 directions clipped inside radar',expired:'results unmounted',uncaughtErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
