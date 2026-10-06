/* Local synthetic failures only. Never sends provider requests or changes production access. */
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {fixture} from './tests/fixtures/report.ts'; import {citationFailure} from './lib/citationFailure.ts'; import {aggregateCitation} from './lib/citationMeasurement.ts'; const rows=Array.from({length:5},(_,i)=>({...fixture.llmCitationTest.results[0],engine:'chatgpt',question:'비교 질문 '+(i+1),...citationFailure('RATE_LIMITED',429,'RESOURCE_EXHAUSTED'),cited:false,citationVerified:false,responseText:undefined,sources:undefined,model:'gpt-4.1-mini',measuredAt:'2026-10-06T00:00:00Z',diagnosticId:'123e4567-e89b-42d3-a456-42661417400'+i})); fixture.llmCitationTest={...fixture.llmCitationTest,...aggregateCitation(rows),results:[...rows,{...rows[0],engine:'gemini',question:'Gemini 이전 전용 질문',model:'gemini-retired',errorMessage:'Gemini 제거 검증'}]}; console.log(JSON.stringify(fixture));"],{encoding:'utf8'}));
const origin='http://127.0.0.1:3021',server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3021'],{stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
(async()=>{let browser;try{
  for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===99)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
  await page.route('**/api/analyze',r=>r.fulfill({json:{...fixture,_hasCompetitor:false}}));
  await page.goto(origin);await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
  const panel=page.getByLabel('AI 호출 실패 원인과 조치',{exact:true});await panel.waitFor();
  assert.ok((await panel.innerText()).includes('OpenAI · 5건 관측 실패'));await page.getByText('API 할당량 또는 요청 한도에 도달했습니다.',{exact:true}).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/Gemini|gemini|제미나이/);
  const matrix=page.getByLabel('질문별 AI 관측 지도',{exact:true});
  assert.equal(await matrix.locator('.report-question-row').count(),5);
  const widths=[];
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});await matrix.scrollIntoViewIfNeeded();
    const size=await panel.evaluate(e=>({width:innerWidth,content:document.documentElement.scrollWidth,panel:e.getBoundingClientRect().width}));widths.push(size);assert.ok(size.content<=width+1,JSON.stringify(size));
  }
  await matrix.screenshot({path:'/tmp/openai-only-desktop.png'});
  await page.setViewportSize({width:390,height:1000});await panel.getByText('운영자 확인 정보',{exact:true}).click();
  await panel.getByText('측정 모델: gpt-4.1-mini',{exact:true}).waitFor();
  assert.ok((await panel.innerText()).includes('123e4567-e89b-42d3-a456-426614174004'));
  const expanded=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));assert.ok(expanded.content<=expanded.width+1);
  await matrix.screenshot({path:'/tmp/openai-only-mobile.png'});
  await matrix.locator('.report-question-row').first().click();
  await page.getByText('OpenAI · GEO 답변 관측',{exact:false}).waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/Gemini|gemini|제미나이/);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({failureSummary:'visible before question selection',widths,expanded,uncaughtErrors:errors},null,2));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
