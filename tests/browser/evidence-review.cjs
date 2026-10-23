/* Local production-build check using synthetic API responses; never contacts live accounts/providers. */
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {evidenceReport} from './tests/fixtures/evidence-report.ts'; console.log(JSON.stringify(await evidenceReport()))"],{encoding:'utf8'}));
const folder=process.env.EVIDENCE_QA_DIR||'/tmp/scanner-evidence-browser';fs.mkdirSync(folder,{recursive:true});
const origin='http://127.0.0.1:3029';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3029'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
(async()=>{let browser;try{
  for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===149)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
  const runtime=process.env.EVIDENCE_CHROMIUM_MODULE?(await import(process.env.EVIDENCE_CHROMIUM_MODULE)).default:null;
  browser=await chromium.launch({headless:true,args:runtime?runtime.args:['--no-sandbox'],...(runtime?{executablePath:await runtime.executablePath()}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[],pdfEvents=[];
  // Exercise the anchor-download fallback used on browsers without a native save picker.
  await page.addInitScript(()=>{window.showSaveFilePicker=undefined;});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/analyze',r=>r.fulfill({json:{...fixture,_hasCompetitor:true,_websiteHints:{}}}));
  await page.route('**/api/competitor',r=>r.fulfill({json:{competitorAnalysis:fixture.competitorAnalysis}}));
  await page.route('**/api/activity',async r=>{const body=r.request().postDataJSON();pdfEvents.push(body);await r.fulfill({json:body.action==='pdf_start'?{ticket:'synthetic-pdf-ticket'}:{ok:true}});});
  await page.goto(origin);await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
  await page.getByText(fixture.oneLineSummary,{exact:true}).waitFor();
  assert.match(await page.locator('.report-hero-score').innerText(),/HTML 기본 항목 충족/);
  const panel=page.getByRole('region',{name:'8개 영역 근거와 측정 범위'});await panel.scrollIntoViewIfNeeded();
  assert.equal(await panel.getByText('미측정',{exact:true}).count(),4);
  await page.screenshot({path:folder+'/review-desktop.png'});
  await panel.getByText('HTML 항목 충족률의 산식과 원문 근거',{exact:true}).click();
  assert.match(await panel.innerText(),/충족 항목 ÷ 판정 가능한 항목/);
  await panel.getByText('HTML 항목 충족률의 산식과 원문 근거',{exact:true}).click();
  const observation=page.getByLabel('GEO 관측 요약 차트',{exact:true});await observation.scrollIntoViewIfNeeded();
  assert.match(await observation.innerText(),/브랜드 미포함 질문/);assert.match(await observation.innerText(),/브랜드 포함 질문/);
  await page.screenshot({path:folder+'/citation-desktop.png'});
  const widths=[];for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1100});const result=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));widths.push(result);assert.ok(result.content<=width+1,JSON.stringify(result));}
  await page.setViewportSize({width:390,height:1100});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/review-mobile.png'});
  await page.getByRole('button',{name:'한 장 요약',exact:true}).click();await page.getByRole('button',{name:'PDF 리포트 다운로드',exact:true}).click();
  await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).waitFor({timeout:60000});
  const summaryDownload=page.waitForEvent('download');await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).click();await (await summaryDownload).saveAs(folder+'/summary.pdf');
  await page.getByRole('button',{name:'전체 상세',exact:true}).click();await page.getByRole('button',{name:'PDF 리포트 다운로드',exact:true}).click();
  await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).waitFor({timeout:90000});
  const detailDownload=page.waitForEvent('download');await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).click();await (await detailDownload).saveAs(folder+'/detail.pdf');
  const metrics=pdfEvents.filter(e=>e.action==='pdf_event'&&e.phase==='ready').map(e=>e.metrics);
  assert.equal(metrics.length,2);assert.equal(metrics[0].pages,1);assert.ok(metrics[1].pages<180,JSON.stringify(metrics));
  assert.deepEqual(errors,[]);
  const result={synthetic:true,widths,uncaughtErrors:errors,pdf:metrics};fs.writeFileSync(folder+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
