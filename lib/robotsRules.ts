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
