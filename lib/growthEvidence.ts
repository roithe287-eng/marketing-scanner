import type {ExtractedWebsiteData} from './extractWebsite';
import {evaluateRobots} from './robotsRules';
import type {SearchSignals} from './growthSchema';

/** Apply only generic/Googlebot directives; another bot's exclusions are not Google's. */
export function googleDirectives(meta:{agent:string;content:string}[],header:string):string[] {
  const values=meta.filter(m=>['robots','googlebot'].includes(m.agent.toLowerCase())).map(m=>m.content);
  let scope='';
  const valued=new Set(['max-snippet','max-image-preview','max-video-preview','unavailable_after']);
  for(const part of header.toLowerCase().split(',')) {
    const token=part.trim();const match=token.match(/^([\w*-]+)\s*:\s*(.*)$/);
    if(match&&!valued.has(match[1])) {scope=match[1];if(scope==='googlebot'||scope==='*')values.push(match[2]);}
    else if(!scope||scope==='googlebot'||scope==='*')values.push(token);
  }
  return [...new Set(values.flatMap(v=>v.toLowerCase().split(',').map(s=>s.trim().replace(/\s*:\s*/g,':')).filter(Boolean)))].slice(0,40).map(v=>v.slice(0,300));
}
export function captureSearchSignals(d:ExtractedWebsiteData):SearchSignals|undefined {
  const e=d.seoEvidence;if(!e)return undefined;
  const u=new URL(d.finalUrl||d.url),path=u.pathname+u.search,r=e.robots;
  const crawlers=(['Googlebot','Yeti','OAI-SearchBot'] as const).map(agent=>{
    if(r.status!=='ok')return {agent,allowed:null,detail:`robots.txt ${r.httpStatus?`HTTP ${r.httpStatus}`:r.status} · 실제 봇 접근과 이전 규칙은 관리 도구에서 확인`};
    const result=evaluateRobots(r.text||'',agent,path);
    return {agent,allowed:result.allowed,detail:`${path} · ${result.rule}`.slice(0,1200)};
  });
  return {version:1,httpStatus:e.httpStatus,titleCount:e.titleCount,descriptionCount:e.descriptionCount,
    canonicals:e.canonicals.slice(0,8).map(s=>s.slice(0,4000)),googleDirectives:googleDirectives(e.robotsMeta,e.xRobotsTag),crawlers,
    schemaTypes:[...new Set(d.schemaTypes)].slice(0,40).map(s=>s.slice(0,150)),jsonLdErrors:e.jsonLdErrors,
    internalLinkCount:d.internalLinkCount,isJsHeavy:d.isJsHeavy,bodyTextLength:d.bodyTextLength};
}
