/** Inspect the wildcard user-agent group only; a blocked /admin path is not a site-wide block. */
export function blocksAllCrawling(text:string):boolean {
  const groups:{agents:string[];allow:string[];disallow:string[]}[]=[];
  let current:{agents:string[];allow:string[];disallow:string[]}|null=null;
  let hasRule=false;
  for(const raw of text.split(/\r?\n/)) {
    const line=raw.replace(/#.*/,'').trim();
    const colon=line.indexOf(':');if(colon<0)continue;
    const key=line.slice(0,colon).toLowerCase().trim(),value=line.slice(colon+1).trim();
    if(key==='user-agent') {
      if(!current || hasRule) {current={agents:[],allow:[],disallow:[]};groups.push(current);hasRule=false;}
      current.agents.push(value.toLowerCase());
    } else if(current && (key==='allow' || key==='disallow')) {current[key].push(value);hasRule=true;}
  }
  return groups.some(group => group.agents.includes('*') && group.disallow.includes('/') && !group.allow.includes('/'));
}

export type RobotsObservation = {
  url:string; observedAt:string; httpStatus?:number;
  status:'ok'|'missing'|'http_error'|'unavailable'|'non_text'|'too_large'; text?:string;
};
type Rule={allow:boolean;path:string};
export type RobotsAgent='Yeti'|'Ads-Naver'|'Googlebot'|'OAI-SearchBot'|'JinjjaScanner'|'Google-Extended'|'GPTBot'|'ChatGPT-User'|'Claude-SearchBot'|'ClaudeBot'|'Claude-User'|'PerplexityBot'|'Perplexity-User';
/** Evaluate the requested path, preserving case. Specific agent groups override '*'.
 * Ads-Naver intentionally ignores the general wildcard group (NAVER advertising FAQ).
 * Unsupported percent-encoded rules are left for manual inspection rather than guessed.
 */
export function evaluateRobots(text:string,agent:RobotsAgent,path:string):{allowed:boolean|null;rule:string;explicit:boolean} {
  const groups:{agents:string[];rules:Rule[]}[]=[];
  let group:{agents:string[];rules:Rule[]}|undefined;
  let directives=false;
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n/)) {
    const line=raw.replace(/#.*/,'').trim();const colon=line.indexOf(':');if(colon<0)continue;
    const key=line.slice(0,colon).trim().toLowerCase(),value=line.slice(colon+1).trim();
    if(key==='user-agent') {
      if(!group||directives){group={agents:[],rules:[]};groups.push(group);directives=false;}
      group.agents.push(value.toLowerCase());
    } else if(group&&(key==='allow'||key==='disallow')) {directives=true;if(value)group.rules.push({allow:key==='allow',path:value});}
  }
  const specific=groups.filter(g=>g.agents.includes(agent.toLowerCase()));
  const selected=specific.length?specific:agent==='Ads-Naver'?[]:groups.filter(g=>g.agents.includes('*'));
  const rules=selected.flatMap(g=>g.rules).map(r=>({...r,path:r.path.replace(/%([0-9a-f]{2})/gi,(match,hex)=>{const c=String.fromCharCode(parseInt(hex,16));return /[A-Za-z0-9._~-]/.test(c)?c:match.toUpperCase();})}));
  // Unrelated Shopify %2B filter rules cannot make every ASCII product/page unknown.
  // Non-ASCII rules and encoded requested paths retain the prior conservative review state.
  if(rules.some(r=>/%(?:[89a-f][0-9a-f])|[^\x20-\x7e]/i.test(r.path))||/%[0-9a-f]{2}|[^\x20-\x7e]/i.test(path)) return {allowed:null,rule:'인코딩 경로는 관리 도구에서 확인',explicit:specific.length>0};
  const matching=rules.filter(r=>{
    const end=r.path.endsWith('$');const raw=end?r.path.slice(0,-1):r.path;
    const pattern=raw.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
    return new RegExp(`^${pattern}${end?'$':''}`).test(path);
  }).sort((a,b)=>b.path.replace(/[*$]/g,'').length-a.path.replace(/[*$]/g,'').length||Number(b.allow)-Number(a.allow));
  const winner=matching[0];
  return {allowed:!winner||winner.allow,rule:winner?`${winner.allow?'Allow':'Disallow'}: ${winner.path}`:'대상 경로에 적용되는 차단 규칙 없음',explicit:specific.length>0};
}
