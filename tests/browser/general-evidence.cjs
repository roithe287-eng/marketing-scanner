/* Uses reports exported by the isolated API integration test. All account/API responses are synthetic. */
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const input=process.env.GENERAL_EVIDENCE_QA_DIR;if(!input)throw Error('Set GENERAL_EVIDENCE_QA_DIR to the exported integration-test directory.');
const cases=fs.readdirSync(input).filter(f=>f.endsWith('.json')).sort().map(f=>({id:f.slice(0,-5),report:JSON.parse(fs.readFileSync(path.join(input,f),'utf8'))}));
assert.equal(cases.length,8,'the API matrix must export all eight page shapes');
const folder=process.env.EVIDENCE_QA_DIR||'/tmp/scanner-general-browser';fs.mkdirSync(folder,{recursive:true});
const pdfCases=(process.env.EVIDENCE_PDF_CASES||'commerce,long-html').split(',');
const origin=process.env.EVIDENCE_TEST_ORIGIN||'http://127.0.0.1:3031';
const server=process.env.EVIDENCE_TEST_ORIGIN?null:spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3031'],{stdio:'ignore'});
(async()=>{let browser;try{
  for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===149)throw Error('Test server did not become available');await new Promise(r=>setTimeout(r,100));}
  const runtime=process.env.EVIDENCE_CHROMIUM_MODULE?(await import(process.env.EVIDENCE_CHROMIUM_MODULE)).default:null;
  let proxy;if(process.env.EVIDENCE_USE_PROXY==='1'){const u=new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);proxy={server:u.protocol+'//'+u.host,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
  browser=await chromium.launch({headless:true,...(proxy?{proxy}:{}),args:runtime?runtime.args:['--no-sandbox'],...(runtime?{executablePath:await runtime.executablePath()}:{})});
  const page=await browser.newPage({ignoreHTTPSErrors:!!proxy,viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[],pdfEvents=[],results=[];
  await page.addInitScript(()=>{window.showSaveFilePicker=undefined;});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/analyze',r=>{const url=new URL(r.request().postDataJSON().url).href,found=cases.find(c=>new URL(c.report.url).href===url);assert.ok(found,url);return r.fulfill({json:{...found.report,_hasCompetitor:false}});});
  await page.route('**/api/activity',async r=>{const b=r.request().postDataJSON();pdfEvents.push(b);await r.fulfill({json:b.action==='pdf_start'?{ticket:'synthetic-general-pdf-ticket'}:{ok:true}});});
  await page.goto(origin);
  for(const site of cases){
    if(await page.locator('.scanner-retry').count())await page.locator('.scanner-retry > summary').click();
    await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(site.report.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
    await page.waitForFunction(url=>document.querySelector('.report-domain')?.textContent.includes(url),site.report.url);
    const panel=page.getByRole('region',{name:'8개 영역 근거와 측정 범위'});await panel.waitFor();
    if(site.report.sitePurpose){
      const purpose=page.getByRole('region',{name:'페이지 목적별 분석'});await purpose.waitFor();assert.ok((await purpose.innerText()).includes(site.report.sitePurpose.label));assert.ok((await purpose.innerText()).includes(site.report.sitePurpose.goal.label));
      await purpose.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(folder,site.id+'-purpose.png')});
      if(!['commerce','mixed','unknown'].includes(site.report.sitePurpose.kind))assert.equal(await page.getByRole('region',{name:'상품 정보 보완',exact:true}).count(),0);
    }
    assert.equal(await panel.getByText('미측정',{exact:true}).count(),4);
    await panel.getByText('HTML 항목 충족률의 산식과 원문 근거',{exact:true}).click();
    assert.equal(new URL(await panel.getByRole('link',{name:'수집 페이지 확인 ↗'}).getAttribute('href')).href,new URL(site.report.evidenceReview.sourceUrl).href);
    const widths=[];for(const width of [320,390,1440]){await page.setViewportSize({width,height:1100});const v=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(v.content<=width+1,site.id+JSON.stringify(v));widths.push(v);}
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(folder,site.id+'.png')});
    if(pdfCases.includes(site.id)){
      await page.getByRole('button',{name:'전체 상세',exact:true}).click();await page.getByRole('button',{name:'PDF 리포트 다운로드',exact:true}).click();
      await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).waitFor({timeout:90000});
      const download=page.waitForEvent('download');await page.getByRole('button',{name:'PDF 파일 저장',exact:true}).click();await (await download).saveAs(path.join(folder,site.id+'.pdf'));
    }
    results.push({id:site.id,widths,sourceUrl:site.report.evidenceReview.sourceUrl});
  }
  assert.deepEqual(errors,[]);const pdf=pdfEvents.filter(e=>e.action==='pdf_event'&&e.phase==='ready').map(e=>e.metrics);assert.equal(pdf.length,pdfCases.length);
  const result={synthetic:true,origin,results,uncaughtErrors:errors,pdf};fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
