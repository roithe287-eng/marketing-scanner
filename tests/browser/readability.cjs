/* Synthetic report only. Run against the local production build; no live providers or accounts. */
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const fixture=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',"import {richReport} from './tests/fixtures/rich-report.ts'; console.log(JSON.stringify(await richReport()))"],{encoding:'utf8'}));
const baseline=process.env.READABILITY_BASELINE==='1';if(baseline)fixture.llmCitationTest.measurementProtocol='geo-compare-v2';
const folder='/tmp/readability-'+(baseline?'before':'after');fs.mkdirSync(folder,{recursive:true});
const origin='http://127.0.0.1:3019',server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3019'],{stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
(async()=>{let browser;try{
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===149)throw Error(logs);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/access',r=>r.fulfill({json:{kind:'internal'}}));
 await page.route('**/api/analyze',r=>r.fulfill({json:{...fixture,_hasCompetitor:true,_websiteHints:{}}}));
 await page.route('**/api/competitor',r=>r.fulfill({json:{competitorAnalysis:fixture.competitorAnalysis}}));
 await page.goto(origin);await page.getByLabel('분석할 웹사이트 URL',{exact:true}).fill(fixture.url);await page.getByRole('button',{name:'내 사이트 진단 시작',exact:true}).click();
 await page.getByText(fixture.oneLineSummary,{exact:true}).waitFor();
 if(!baseline)await page.locator('.report-evidence-guide').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-100));await page.screenshot({path:folder+'/evidence-desktop.png'});
 await page.getByText('핵심 이슈와 개선 예시',{exact:true}).click();await page.getByText('전체 키워드 빈도',{exact:true}).click();
 await page.locator('.report-issue').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-170));await page.screenshot({path:folder+'/issue-desktop.png'});
 await page.locator('.report-radar').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-170));await page.screenshot({path:folder+'/radar-desktop.png'});
 await page.locator('.report-readiness').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-170));await page.screenshot({path:folder+'/readiness-desktop.png'});
 const contrasts=await page.locator('.report-v2').evaluate(root=>{
   const result=[],small=[];const rgba=s=>{const m=s.match(/^rgba?\(([^)]+)\)$/);if(!m)return null;const a=m[1].split(/[, /]+/).filter(Boolean).map(Number);return [a[0],a[1],a[2],a[3]??1];};
   const blend=(f,b)=>f.slice(0,3).map((c,i)=>c*f[3]+b[i]*(1-f[3]));
   const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){if(!node.textContent.trim())continue;const e=node.parentElement,r=document.createRange();r.selectNodeContents(node);if(!e.checkVisibility({contentVisibilityAuto:true,visibilityProperty:true,opacityProperty:true})||!r.getBoundingClientRect().width||e.closest('svg,button:disabled,[aria-hidden=true]'))continue;
    const cs=getComputedStyle(e);if(cs.visibility==='hidden')continue;const size=parseFloat(cs.fontSize),fg=rgba(cs.color);if(size<14)small.push({text:node.textContent.trim().slice(0,45),size,element:e.tagName+'.'+e.className,parent:e.parentElement?.className});if(!fg)continue;
    let bg=[255,255,255],skip=false;const ancestors=[];for(let el=e;el;el=el.parentElement)ancestors.push(el);
    for(const el of ancestors.reverse()){const style=getComputedStyle(el);if(style.backgroundImage!=='none')skip=true;const color=rgba(style.backgroundColor);if(color)bg=blend(color,bg);}if(skip)continue;
    const front=blend(fg,bg),l=[luminance(front),luminance(bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05),min=size>=24||(size>=18.66&&Number(cs.fontWeight)>=700)?3:4.5;
    if(ratio<min-.01)result.push({text:node.textContent.trim().slice(0,60),ratio:Math.round(ratio*100)/100,size,color:cs.color});
   }return {lowContrast:result,smallText:small};
 });
 fs.writeFileSync(folder+'/contrast.json',JSON.stringify(contrasts,null,2));
 const widths=[];for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});const size=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));widths.push(size);if(!baseline)assert.ok(size.content<=width+1,JSON.stringify(size));}
 await page.setViewportSize({width:390,height:1000});await page.locator('.report-issue').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-170));await page.screenshot({path:folder+'/issue-mobile.png'});
 await page.getByRole('button',{name:'연속어구 단위',exact:true}).click();await page.locator('.keyword-frequency, .report-disclosure').filter({has:page.getByRole('heading',{name:'키워드 분포 리포트',exact:true})}).last().evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-100));await page.screenshot({path:folder+'/keywords-mobile.png'});
 const issue=await page.locator('.report-issue').innerText();assert.ok(issue.includes(fixture.criticalIssues[0].problem));
 let expandedResult=null;
 if(!baseline){
  await page.getByRole('heading',{name:'수집 관측',exact:true}).waitFor();
  await page.getByText('— 미설정',{exact:true}).first().waitFor();
  // Double text sizes with original line-height ratios retained, revealing fixed-box clipping.
  await page.locator('.report-v2').evaluate(root=>{const rows=[root,...root.querySelectorAll('*')].filter(e=>!(e instanceof SVGElement)).map(e=>{const s=getComputedStyle(e);return {e,size:parseFloat(s.fontSize),line:parseFloat(s.lineHeight)};});for(const {e,size,line} of rows){e.style.setProperty('font-size',size*2+'px','important');if(Number.isFinite(line))e.style.setProperty('line-height',line*2+'px','important');}});
  await page.locator('.keyword-frequency').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-70));await page.screenshot({path:folder+'/text-200-mobile.png'});
  const expanded=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.report-v2 *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,20).map(e=>({class:e.className,text:e.textContent.slice(0,60),width:e.getBoundingClientRect().width}))}));assert.ok(expanded.content<=expanded.width+1,'200% text reflow: '+JSON.stringify(expanded));expandedResult={width:expanded.width,content:expanded.content};
 }
 if(!baseline)assert.equal(contrasts.lowContrast.length,0,'Visible HTML text contrast below target: '+JSON.stringify(contrasts.lowContrast));
 assert.deepEqual(errors,[]);const output={baseline,widths,text200Percent:expandedResult,uncaughtErrors:errors,lowContrastCount:contrasts.lowContrast.length,smallTextCount:contrasts.smallText.length,...contrasts};fs.writeFileSync(folder+'/checks.json',JSON.stringify(output,null,2));console.log(JSON.stringify({...output,lowContrast:contrasts.lowContrast.slice(0,14),smallText:contrasts.smallText.slice(0,8)},null,2));
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
